import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AVATARS } from '@/types/game';

interface AvatarPickerProps {
  selected: string;
  onSelect: (avatar: string) => void;
  className?: string;
}

export function AvatarPicker({ selected, onSelect, className }: AvatarPickerProps) {
  return (
    <div className={cn('grid grid-cols-6 gap-3', className)}>
      {AVATARS.map((avatar) => (
        <motion.button
          key={avatar}
          whileTap={{ scale: 0.9 }}
          onClick={() => onSelect(avatar)}
          className={cn(
            'aspect-square rounded-2xl text-3xl flex items-center justify-center transition-all border-4',
            selected === avatar
              ? 'bg-primary/10 border-primary shadow-game-sm scale-110'
              : 'bg-card border-border hover:border-primary/50'
          )}
        >
          {avatar}
        </motion.button>
      ))}
    </div>
  );
}
