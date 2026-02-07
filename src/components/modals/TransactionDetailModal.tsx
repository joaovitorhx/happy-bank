import React from 'react';
import { BottomSheet } from '@/components/game/BottomSheet';
import { GameButton } from '@/components/game/GameButton';
import { Transaction } from '@/types/game';
import { formatCurrency, formatTime } from '@/lib/formatters';
import { BANK_LABEL } from '@/constants/bank';
import { BankAvatar } from '@/components/game/BankAvatar';
import { cn } from '@/lib/utils';
import { ArrowRight, RotateCcw } from 'lucide-react';

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export function TransactionDetailModal({ isOpen, onClose, transaction }: TransactionDetailModalProps) {
  if (!transaction) return null;

  const isBank = transaction.fromId === 'BANCO' || transaction.toId === 'BANCO';

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Detalhes da Transação">
      <div className="space-y-6">
        {/* Amount */}
        <div className="text-center py-4">
          <p className="text-muted-foreground font-display text-sm mb-1">Valor</p>
          <p className="balance-display text-primary">
            {formatCurrency(transaction.amount)}
          </p>
        </div>

        {/* From/To */}
        <div className="game-card flex items-center justify-between p-4">
          <div className="text-center flex items-center flex-col">
            {transaction.fromId === 'BANCO' ? (
              <BankAvatar size="lg" className="mx-auto mb-2" />
            ) : (
              <div className="player-avatar mx-auto mb-2">💰</div>
            )}
            <p className={cn(
              'font-display font-semibold text-sm',
              transaction.fromId === 'BANCO' && 'uppercase text-bank'
            )}>
              {transaction.fromId === 'BANCO' ? BANK_LABEL : transaction.fromName}
            </p>
          </div>

          <ArrowRight className="w-8 h-8 text-muted-foreground" />

          <div className="text-center flex items-center flex-col">
            {transaction.toId === 'BANCO' ? (
              <BankAvatar size="lg" className="mx-auto mb-2" />
            ) : (
              <div className="player-avatar mx-auto mb-2">💰</div>
            )}
            <p className={cn(
              'font-display font-semibold text-sm',
              transaction.toId === 'BANCO' && 'uppercase text-bank'
            )}>
              {transaction.toId === 'BANCO' ? BANK_LABEL : transaction.toName}
            </p>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground font-display">Horário</span>
            <span className="font-display font-semibold">
              {formatTime(transaction.timestamp)}
            </span>
          </div>

          {transaction.note && (
            <div className="flex justify-between">
              <span className="text-muted-foreground font-display">Motivo</span>
              <span className="font-display font-semibold">{transaction.note}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span className="text-muted-foreground font-display">Tipo</span>
            <span className={`font-display font-semibold ${isBank ? 'text-bank' : ''}`}>
              {transaction.type === 'player-to-player' && 'Entre jogadores'}
              {transaction.type === 'player-to-bank' && `Pagamento ao ${BANK_LABEL}`}
              {transaction.type === 'bank-to-player' && `Recebido do ${BANK_LABEL}`}
            </span>
          </div>
        </div>

        {/* Repeat Button */}
        <GameButton
          variant="outline"
          size="md"
          icon={<RotateCcw className="w-5 h-5" />}
          className="w-full"
          onClick={() => {
            // Would open transfer modal with pre-filled values
            onClose();
          }}
        >
          Repetir Transação
        </GameButton>
      </div>
    </BottomSheet>
  );
}
