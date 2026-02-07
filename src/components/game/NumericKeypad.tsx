import React from 'react';
import { motion } from 'framer-motion';
import { Delete } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QUICK_AMOUNTS } from '@/types/game';
import { getAmountLabel, formatCurrency } from '@/lib/formatters';

interface NumericKeypadProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  className?: string;
  /** Reduz tamanho de display, chips e teclas para caber em modais (ex.: transferir). */
  compact?: boolean;
}

export function NumericKeypad({ value, onChange, maxLength = 10, className, compact }: NumericKeypadProps) {
  const numericValue = parseInt(value) || 0;
  const amountLabel = getAmountLabel(numericValue);

  const handleDigit = (digit: string) => {
    if (value.length < maxLength) {
      onChange(value + digit);
    }
  };

  const handleDelete = () => {
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    onChange('');
  };

  const handleQuickAmount = (amount: number) => {
    const newValue = numericValue + amount;
    onChange(newValue.toString());
  };

  const keys = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    'C', '0', 'DEL',
  ];

  return (
    <div className={cn(compact ? 'keypad-compact space-y-2' : 'space-y-4', className)}>
      {/* Display */}
      <div className="game-card text-center py-4">
        <div className="balance-display text-primary">
          {numericValue > 0 ? formatCurrency(numericValue) : 'R$ 0'}
        </div>
        {amountLabel && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-muted-foreground font-display text-sm mt-1"
          >
            {amountLabel}
          </motion.p>
        )}
      </div>

      {/* Quick Amount Chips */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
        {QUICK_AMOUNTS.map(({ value: chipValue, label }) => (
          <motion.button
            key={chipValue}
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => handleQuickAmount(chipValue)}
            className="money-chip bg-secondary/20 text-secondary-foreground hover:bg-secondary/30"
          >
            {label}
          </motion.button>
        ))}
      </div>

      {/* Keypad Grid */}
      <div className="grid grid-cols-3 gap-2">
        {keys.map((key) => (
          <motion.button
            key={key}
            type="button"
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (key === 'C') handleClear();
              else if (key === 'DEL') handleDelete();
              else handleDigit(key);
            }}
            className={cn(
              'keypad-btn',
              key === 'C' && 'bg-accent/20 text-accent',
              key === 'DEL' && 'bg-muted text-muted-foreground',
              key !== 'C' && key !== 'DEL' && 'bg-card text-foreground border-2 border-border'
            )}
          >
            {key === 'DEL' ? <Delete className={compact ? 'w-4 h-4' : 'w-6 h-6'} /> : key}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
