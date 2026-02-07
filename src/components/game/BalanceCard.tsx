import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { formatCurrency, formatCurrencyCompact } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface BalanceCardProps {
  balance: number;
  playerName?: string;
  className?: string;
  /** Animação de mola: 'in' = dinheiro entrando, 'out' = saindo. */
  pulse?: 'in' | 'out' | null;
}

export function BalanceCard({ balance, playerName, className, pulse }: BalanceCardProps) {
  const [isHidden, setIsHidden] = useState(false);

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'game-card relative overflow-hidden',
        className
      )}
    >
      {/* Decorative coin icons */}
      <div className="absolute -right-4 -top-4 text-6xl opacity-20 rotate-12">
        💰
      </div>
      <div className="absolute -left-2 -bottom-2 text-4xl opacity-15 -rotate-12">
        🪙
      </div>

      <div className="relative z-10">
        {playerName && (
          <p className="text-muted-foreground font-display text-sm mb-1">
            Seu saldo
          </p>
        )}
        
        <div className="flex items-center justify-between">
          <div>
            <motion.div
              key={`${isHidden ? 'hidden' : 'visible'}-${balance}`}
              initial={pulse === 'in' ? { scale: 0.85, y: 8 } : pulse === 'out' ? { scale: 1.08, y: -4 } : false}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className={cn(
                'balance-display text-primary',
                pulse === 'in' && 'text-success',
                pulse === 'out' && 'text-accent'
              )}
            >
              {isHidden ? '••••••' : formatCurrency(balance)}
            </motion.div>
            {!isHidden && balance >= 1000 && (
              <p className="text-muted-foreground text-sm font-display mt-1">
                {formatCurrencyCompact(balance)}
              </p>
            )}
          </div>
          
          <button
            onClick={() => setIsHidden(!isHidden)}
            className="p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
          >
            {isHidden ? (
              <EyeOff className="w-6 h-6 text-muted-foreground" />
            ) : (
              <Eye className="w-6 h-6 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
