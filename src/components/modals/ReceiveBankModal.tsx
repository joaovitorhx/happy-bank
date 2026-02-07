import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { BottomSheet } from '@/components/game/BottomSheet';
import { GameButton } from '@/components/game/GameButton';
import { NumericKeypad } from '@/components/game/NumericKeypad';
import { Player } from '@/types/game';
import { formatCurrency } from '@/lib/formatters';
import { useGameStore } from '@/store/gameStore';
import { triggerConfirmHaptic } from '@/lib/sounds';
import { Check, Building2 } from 'lucide-react';

interface ReceiveBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlayer: Player;
}

const NOTE_PRESETS = [
  'Salário',
  'Bônus',
  'Prêmio',
  'Venda de propriedade',
  'Sorteio',
];

export function ReceiveBankModal({ isOpen, onClose, currentPlayer }: ReceiveBankModalProps) {
  const receiveFromBank = useGameStore((state) => state.receiveFromBank);
  
  const [step, setStep] = useState<'amount' | 'confirm' | 'success'>('amount');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setStep('amount');
    setAmount('');
    setNote('');
    onClose();
  };

  const handleConfirm = async () => {
    if (!amount) return;
    triggerConfirmHaptic();
    setLoading(true);
    try {
      await receiveFromBank(parseInt(amount), note || undefined);
      toast.success('Recebido do banco!');
      setTimeout(handleClose, 500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Recebimento falhou');
    } finally {
      setLoading(false);
    }
  };

  const numAmount = parseInt(amount) || 0;

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} title="Receber do Banco">
      <AnimatePresence mode="wait">
        {step === 'amount' && (
          <motion.div
            key="amount"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {/* Bank Info */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-success/10 border-2 border-success">
              <div className="w-14 h-14 rounded-full bg-bank flex items-center justify-center">
                <Building2 className="w-7 h-7 text-bank-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Recebendo do</p>
                <p className="font-display font-semibold">Banco</p>
              </div>
            </div>

            {/* Current Balance Info */}
            <div className="flex justify-between text-sm font-display">
              <span className="text-muted-foreground">Seu saldo atual:</span>
              <span className="text-primary">{formatCurrency(currentPlayer.balance)}</span>
            </div>

            <NumericKeypad value={amount} onChange={setAmount} compact className="space-y-2 sm:space-y-3" />

            {/* Note Presets */}
            <div>
              <p className="text-sm font-display text-muted-foreground mb-2">Motivo (opcional)</p>
              <div className="flex flex-wrap gap-2">
                {NOTE_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setNote(note === preset ? '' : preset)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-display transition-all ${
                      note === preset
                        ? 'bg-success text-success-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <GameButton
              variant="secondary"
              size="lg"
              onClick={() => setStep('confirm')}
              disabled={!amount || numAmount <= 0}
              className="w-full mt-4"
            >
              Continuar
            </GameButton>
          </motion.div>
        )}

        {step === 'confirm' && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4 text-center"
          >
            <div className="py-6">
              <p className="text-muted-foreground font-display mb-2">Você vai receber</p>
              <p className="balance-display text-success mb-4">
                +{formatCurrency(numAmount)}
              </p>
              <p className="text-muted-foreground font-display">do</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Building2 className="w-8 h-8 text-bank" />
                <span className="font-display font-bold text-xl">Banco</span>
              </div>
              {note && (
                <p className="text-sm text-muted-foreground mt-3">
                  Motivo: {note}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <GameButton variant="outline" onClick={() => setStep('amount')} disabled={loading}>
                Voltar
              </GameButton>
              <GameButton variant="secondary" onClick={handleConfirm} disabled={loading}>
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
            className="py-12 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 10 }}
              className="w-20 h-20 rounded-full bg-success mx-auto flex items-center justify-center mb-4"
            >
              <Check className="w-10 h-10 text-success-foreground" />
            </motion.div>
            <p className="font-display text-xl font-bold text-success">
              Recebido com sucesso!
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </BottomSheet>
  );
}
