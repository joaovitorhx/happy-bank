import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { BottomSheet } from '@/components/game/BottomSheet';
import { GameButton } from '@/components/game/GameButton';
import { PlayerCard } from '@/components/game/PlayerCard';
import { NumericKeypad } from '@/components/game/NumericKeypad';
import { Player } from '@/types/game';
import { formatCurrency } from '@/lib/formatters';
import { useGameStore } from '@/store/gameStore';
import { playSendSound, triggerConfirmHaptic } from '@/lib/sounds';
import { getSettingsAnimations } from '@/lib/storage';
import { Check, ArrowRight } from 'lucide-react';

export interface TransferPreselect {
  playerId: string;
  amount?: number;
  note?: string;
}

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  currentPlayer: Player;
  /** Quando definido, abre já com jogador/valor/nota preenchidos (ex.: após escanear QR). */
  initialPreselect?: TransferPreselect | null;
}

export function TransferModal({ isOpen, onClose, players, currentPlayer, initialPreselect }: TransferModalProps) {
  const transferToPlayer = useGameStore((state) => state.transferToPlayer);

  const [step, setStep] = useState<'select' | 'amount' | 'confirm' | 'success'>('select');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const wasOpenRef = useRef(false);

  // Só aplica preselect ou reset quando o modal abre; não reseta quando realtime atualiza players
  React.useEffect(() => {
    if (!isOpen) {
      wasOpenRef.current = false;
      return;
    }
    if (initialPreselect && players.length) {
      const player = players.find((p) => p.id === initialPreselect.playerId);
      if (player) {
        setSelectedPlayer(player);
        setAmount(initialPreselect.amount != null ? String(initialPreselect.amount) : '');
        setNote(initialPreselect.note ?? '');
        setStep(initialPreselect.amount != null && initialPreselect.amount > 0 ? 'confirm' : 'amount');
        wasOpenRef.current = true;
        return;
      }
    }
    if (!wasOpenRef.current) {
      setStep('select');
      setSelectedPlayer(null);
      setAmount('');
      setNote('');
    }
    wasOpenRef.current = true;
  }, [isOpen, initialPreselect?.playerId, initialPreselect?.amount, initialPreselect?.note, players]);

  const handleClose = () => {
    setStep('select');
    setSelectedPlayer(null);
    setAmount('');
    setNote('');
    onClose();
  };

  const handleConfirm = async () => {
    if (!selectedPlayer || !amount) return;
    triggerConfirmHaptic();
    setLoading(true);
    try {
      await transferToPlayer(selectedPlayer.id, parseInt(amount), note || undefined);
      playSendSound();
      toast.success('Transferência enviada!');
      setTimeout(() => handleClose(), 500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Transferência falhou');
    } finally {
      setLoading(false);
    }
  };

  const numAmount = parseInt(amount) || 0;
  const canAfford = numAmount <= currentPlayer.balance;

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="Transferir dinheiro">
      <AnimatePresence mode="wait">
        {step === 'select' && (
          <motion.div
            key="select"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-3 pb-2"
          >
            <p className="text-muted-foreground font-display text-sm sm:text-base text-center mb-3">
              Para quem você quer transferir?
            </p>
            <div className="max-h-[45vh] sm:max-h-[50vh] overflow-y-auto overflow-x-hidden space-y-2 pr-1 -mr-1">
              {players.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  showBalance
                  onClick={() => {
                    setSelectedPlayer(player);
                    setStep('amount');
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        {step === 'amount' && selectedPlayer && (
          <motion.div
            key="amount"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-3 sm:space-y-4 pb-2"
          >
            {/* Recipient */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/10 border-2 border-primary shrink-0">
              <div className="player-avatar w-12 h-12 text-xl sm:w-14 sm:h-14 sm:text-2xl flex shrink-0 items-center justify-center rounded-full border-2 border-primary bg-card">
                {selectedPlayer.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Enviando para</p>
                <p className="font-display font-semibold truncate">{selectedPlayer.name}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-primary shrink-0" />
            </div>

            {/* Saldo */}
            <div className="flex justify-between text-sm font-display shrink-0">
              <span className="text-muted-foreground">Seu saldo:</span>
              <span className={numAmount > currentPlayer.balance ? 'text-destructive font-semibold' : 'text-primary font-semibold'}>
                {formatCurrency(currentPlayer.balance)}
              </span>
            </div>

            <NumericKeypad value={amount} onChange={setAmount} compact className="space-y-2 sm:space-y-3" />

            {numAmount > 0 && !canAfford && (
              <p className="text-destructive text-center font-display text-sm">
                Saldo insuficiente!
              </p>
            )}

            <div>
              <label className="block font-display text-sm text-muted-foreground mb-1">Motivo (opcional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ex: Aluguel"
                className="w-full p-3 rounded-xl bg-muted border-2 border-border focus:border-primary outline-none font-display text-sm touch-manipulation"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-3 sm:mt-4">
              <GameButton
                variant="outline"
                onClick={() => {
                  setStep('select');
                  setAmount('');
                  setNote('');
                }}
                className="touch-manipulation"
              >
                Voltar
              </GameButton>
              <GameButton
                variant="primary"
                onClick={() => setStep('confirm')}
                disabled={!amount || numAmount <= 0 || !canAfford}
                className="touch-manipulation"
              >
                Continuar
              </GameButton>
            </div>
          </motion.div>
        )}

        {step === 'confirm' && selectedPlayer && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4 text-center pb-2"
          >
            <div className="py-4 sm:py-6">
              <p className="text-muted-foreground font-display text-sm sm:text-base mb-1">Você está enviando</p>
              <p className="balance-display text-primary mb-3 sm:mb-4 text-2xl sm:text-4xl">
                {formatCurrency(numAmount)}
              </p>
              <p className="text-muted-foreground font-display text-sm">para</p>
              <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
                <span className="text-3xl sm:text-4xl">{selectedPlayer.avatar}</span>
                <span className="font-display font-bold text-lg sm:text-xl">{selectedPlayer.name}</span>
              </div>
              {note && (
                <p className="text-sm text-muted-foreground mt-2">Motivo: {note}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <GameButton variant="outline" onClick={() => setStep('amount')} disabled={loading} className="touch-manipulation">
                Voltar
              </GameButton>
              <GameButton variant="primary" onClick={handleConfirm} disabled={loading} className="touch-manipulation">
                {loading ? 'Aguarde...' : 'Confirmar'}
              </GameButton>
            </div>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`py-8 sm:py-12 text-center ${getSettingsAnimations() ? 'animate-money-fly-in' : ''}`}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 10 }}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-success mx-auto flex items-center justify-center mb-3 sm:mb-4"
            >
              <Check className="w-8 h-8 sm:w-10 sm:h-10 text-success-foreground" />
            </motion.div>
            <p className="font-display text-lg sm:text-xl font-bold text-success">
              Transferência realizada!
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </BottomSheet>
  );
}
