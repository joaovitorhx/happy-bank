import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Transaction, TransactionFilter } from '@/types/game';
import { formatCurrency, formatTime } from '@/lib/formatters';
import { BANK_LABEL } from '@/constants/bank';

interface TransactionItemProps {
  transaction: Transaction;
  currentPlayerId?: string;
  onClick?: () => void;
}

export function TransactionItem({ transaction, currentPlayerId, onClick }: TransactionItemProps) {
  const isOutgoing = transaction.fromId === currentPlayerId;
  const isIncoming = transaction.toId === currentPlayerId;
  const isBank = transaction.fromId === 'BANCO' || transaction.toId === 'BANCO';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className={cn(
        'transaction-item cursor-pointer hover:bg-card transition-colors',
        isBank && 'border-l-4 border-l-bank'
      )}
    >
      <div className="text-xs text-muted-foreground font-display w-12">
        {formatTime(transaction.timestamp)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 text-sm">
          <span className={cn(
            'font-semibold truncate',
            transaction.fromId === 'BANCO' && 'uppercase text-bank'
          )}>
            {transaction.fromId === 'BANCO' ? BANK_LABEL : transaction.fromName}
          </span>
          <span className="text-muted-foreground">→</span>
          <span className={cn(
            'font-semibold truncate',
            transaction.toId === 'BANCO' && 'uppercase text-bank'
          )}>
            {transaction.toId === 'BANCO' ? BANK_LABEL : transaction.toName}
          </span>
        </div>
        {transaction.note && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {transaction.note}
          </p>
        )}
      </div>

      {/* Amount */}
      <div className={cn(
        'font-display font-bold text-sm',
        isIncoming && 'text-success',
        isOutgoing && 'text-accent',
        !isIncoming && !isOutgoing && 'text-foreground'
      )}>
        {isIncoming && '+'}{isOutgoing && '-'}{formatCurrency(transaction.amount)}
      </div>
    </motion.div>
  );
}

interface TransactionListProps {
  transactions: Transaction[];
  filter: TransactionFilter;
  onFilterChange: (filter: TransactionFilter) => void;
  currentPlayerId?: string;
  onTransactionClick?: (transaction: Transaction) => void;
}

export function TransactionList({
  transactions,
  filter,
  onFilterChange,
  currentPlayerId,
  onTransactionClick,
}: TransactionListProps) {
  const filters: { key: TransactionFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'players', label: 'Jogadores' },
    { key: 'bank', label: 'Banco' },
  ];

  const filteredTransactions = transactions.filter(t => {
    if (filter === 'all') return true;
    if (filter === 'bank') return t.fromId === 'BANCO' || t.toId === 'BANCO'; // BANK_LABEL id
    if (filter === 'players') return t.fromId !== 'BANCO' && t.toId !== 'BANCO';
    return true;
  });

  return (
    <div className="space-y-3">
      {/* Filter Pills */}
      <div className="flex gap-2">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onFilterChange(key)}
            className={filter === key ? 'filter-pill-active' : 'filter-pill-inactive'}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filteredTransactions.length === 0 ? (
          <p className="text-center text-muted-foreground py-4 font-display">
            Nenhuma transação ainda
          </p>
        ) : (
          filteredTransactions.map((transaction) => (
            <TransactionItem
              key={transaction.id}
              transaction={transaction}
              currentPlayerId={currentPlayerId}
              onClick={() => onTransactionClick?.(transaction)}
            />
          ))
        )}
      </div>
    </div>
  );
}
