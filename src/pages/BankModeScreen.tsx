import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ArrowDownToLine, ArrowUpFromLine, Trophy, History } from 'lucide-react';
import { GameButton } from '@/components/game/GameButton';
import { PlayerCard } from '@/components/game/PlayerCard';
import { TransactionList } from '@/components/game/TransactionList';
import { BottomSheet } from '@/components/game/BottomSheet';
import { NumericKeypad } from '@/components/game/NumericKeypad';
import { TransactionDetailModal } from '@/components/modals/TransactionDetailModal';
import { useGameStore } from '@/store/gameStore';
import { useRoomRealtime } from '@/hooks/useRoomRealtime';
import { Player, TransactionFilter, Transaction } from '@/types/game';
import { formatCurrency } from '@/lib/formatters';

export default function BankModeScreen() {
  const navigate = useNavigate();
  const { room, currentPlayer, transactions, bankPayToPlayer, bankReceiveFromPlayer } = useGameStore();

  useRoomRealtime(room?.id);
  
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('bank');
  const [mode, setMode] = useState<'pay' | 'receive' | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [amount, setAmount] = useState('');
  const [step, setStep] = useState<'select' | 'amount' | 'confirm'>('select');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  if (!room) {
    navigate('/rooms');
    return null;
  }

  const sortedPlayers = [...room.players].sort((a, b) => b.balance - a.balance);

  const handleSelectPlayer = (player: Player) => {
    setSelectedPlayer(player);
    setStep('amount');
  };

  const handleConfirm = async () => {
    if (!selectedPlayer || !amount) return;

    const numAmount = parseInt(amount);
    try {
      if (mode === 'pay') {
        await bankPayToPlayer(selectedPlayer.id, numAmount, 'Pagamento do Banco');
      } else {
        await bankReceiveFromPlayer(selectedPlayer.id, numAmount, 'Pagamento ao Banco');
      }
      setMode(null);
      setSelectedPlayer(null);
      setAmount('');
      setStep('select');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Operação falhou');
    }
  };

  const closeModal = () => {
    setMode(null);
    setSelectedPlayer(null);
    setAmount('');
    setStep('select');
  };

  return (
    <div className="min-h-screen flex flex-col pb-6">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-30 bg-bank text-bank-foreground border-b-4 border-bank p-4"
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/game')}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-display text-xl font-bold flex items-center gap-2">
              🏦 Modo Banco
            </h1>
            <p className="text-sm opacity-80">
              Gerencie pagamentos do banco
            </p>
          </div>
        </div>
      </motion.header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Bank Actions */}
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="grid grid-cols-2 gap-3">
            <GameButton
              variant="primary"
              size="lg"
              onClick={() => {
                setMode('pay');
                setStep('select');
              }}
              icon={<ArrowDownToLine className="w-6 h-6" />}
              className="flex-col h-auto py-6"
            >
              <span className="text-base">PAGAR PARA</span>
              <span className="text-base">JOGADOR</span>
            </GameButton>
            
            <GameButton
              variant="accent"
              size="lg"
              onClick={() => {
                setMode('receive');
                setStep('select');
              }}
              icon={<ArrowUpFromLine className="w-6 h-6" />}
              className="flex-col h-auto py-6"
            >
              <span className="text-base">RECEBER DE</span>
              <span className="text-base">JOGADOR</span>
            </GameButton>
          </div>
        </motion.section>

        {/* Leaderboard */}
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="section-header">
            <Trophy className="w-5 h-5 text-secondary" />
            Saldo dos Jogadores
          </h3>
          <div className="game-card space-y-2">
            {sortedPlayers.map((player, index) => (
              <PlayerCard
                key={player.id}
                player={player}
                rank={index + 1}
                showBalance
              />
            ))}
          </div>
        </motion.section>

        {/* Transaction Feed */}
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="section-header">
            <History className="w-5 h-5 text-bank" />
            Transações do Banco
          </h3>
          <div className="game-card">
            <TransactionList
              transactions={transactions}
              filter={transactionFilter}
              onFilterChange={setTransactionFilter}
              currentPlayerId={currentPlayer?.id}
              onTransactionClick={setSelectedTransaction}
            />
          </div>
        </motion.section>
      </div>

      {/* Bank Operation Modal */}
      <BottomSheet
        isOpen={mode !== null}
        onClose={closeModal}
        title={mode === 'pay' ? 'Pagar para Jogador' : 'Receber de Jogador'}
      >
        {step === 'select' && (
          <div className="space-y-3">
            <p className="text-muted-foreground font-display text-center mb-4">
              Selecione o jogador
            </p>
            {room.players.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                showBalance
                onClick={() => handleSelectPlayer(player)}
              />
            ))}
          </div>
        )}

        {step === 'amount' && selectedPlayer && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
              <div className="player-avatar">{selectedPlayer.avatar}</div>
              <div>
                <p className="font-display font-semibold">{selectedPlayer.name}</p>
                <p className="text-sm text-muted-foreground">
                  Saldo: {formatCurrency(selectedPlayer.balance)}
                </p>
              </div>
            </div>

            <NumericKeypad value={amount} onChange={setAmount} compact />

            <div className="grid grid-cols-2 gap-3 mt-4">
              <GameButton
                variant="outline"
                onClick={() => {
                  setStep('select');
                  setAmount('');
                }}
              >
                Voltar
              </GameButton>
              <GameButton
                variant={mode === 'pay' ? 'primary' : 'accent'}
                onClick={() => setStep('confirm')}
                disabled={!amount || parseInt(amount) <= 0}
              >
                Continuar
              </GameButton>
            </div>
          </div>
        )}

        {step === 'confirm' && selectedPlayer && amount && (
          <div className="space-y-4 text-center">
            <div className="py-6">
              <p className="text-muted-foreground font-display mb-2">
                {mode === 'pay' ? 'O banco vai pagar' : 'O banco vai receber'}
              </p>
              <p className="balance-display text-primary mb-4">
                {formatCurrency(parseInt(amount))}
              </p>
              <p className="text-muted-foreground font-display">
                {mode === 'pay' ? 'para' : 'de'}
              </p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-4xl">{selectedPlayer.avatar}</span>
                <span className="font-display font-bold text-xl">{selectedPlayer.name}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <GameButton
                variant="outline"
                onClick={() => setStep('amount')}
              >
                Voltar
              </GameButton>
              <GameButton
                variant={mode === 'pay' ? 'primary' : 'accent'}
                onClick={handleConfirm}
              >
                Confirmar
              </GameButton>
            </div>
          </div>
        )}
      </BottomSheet>

      <TransactionDetailModal
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        transaction={selectedTransaction}
      />
    </div>
  );
}
