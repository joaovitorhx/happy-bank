import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { Player } from '@/types/game';

interface PlayerCardProps {
  player: Player;
  showBalance?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  rank?: number;
  className?: string;
}

export function PlayerCard({
  player,
  showBalance = false,
  isSelected = false,
  onClick,
  rank,
  className,
}: PlayerCardProps) {
  return (
    <motion.div
      whileTap={onClick ? { scale: 0.98 } : undefined}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl transition-all',
        onClick && 'cursor-pointer',
        player.isMe && 'bg-secondary/20 border-2 border-secondary',
        isSelected && 'bg-primary/10 border-2 border-primary ring-2 ring-primary/30',
        !player.isMe && !isSelected && 'bg-card/50 border-2 border-transparent',
        className
      )}
    >
      {rank !== undefined && (
        <div className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-sm',
          rank === 1 && 'bg-secondary text-secondary-foreground',
          rank === 2 && 'bg-muted text-muted-foreground',
          rank === 3 && 'bg-accent/20 text-accent',
          rank > 3 && 'bg-muted/50 text-muted-foreground'
        )}>
          {rank}º
        </div>
      )}
      
      <div className="player-avatar">
        {player.avatar}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-display font-semibold truncate">
            {player.name}
          </p>
          {player.isMe && (
            <span className="text-xs bg-secondary/30 text-secondary-foreground px-2 py-0.5 rounded-full font-display">
              Você
            </span>
          )}
          {player.isHost && (
            <span className="text-xs">👑</span>
          )}
        </div>
        {showBalance && (
          <p className="text-sm text-primary font-display font-semibold">
            {formatCurrency(player.balance)}
          </p>
        )}
      </div>
    </motion.div>
  );
}
