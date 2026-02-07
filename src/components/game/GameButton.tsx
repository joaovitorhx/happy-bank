import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface GameButtonProps {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'bank';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export function GameButton({
  className,
  variant = 'primary',
  size = 'md',
  icon,
  children,
  onClick,
  disabled,
  type = 'button',
}: GameButtonProps) {
  const baseStyles = 'relative font-display font-bold rounded-2xl transition-all duration-150 flex items-center justify-center gap-2 active:translate-y-1 disabled:opacity-50 disabled:pointer-events-none';
  
  const variants = {
    primary: 'text-primary-foreground bg-gradient-to-b from-[hsl(152,50%,40%)] to-[hsl(152,55%,28%)] shadow-game active:shadow-game-pressed',
    secondary: 'text-secondary-foreground bg-gradient-to-b from-[hsl(45,90%,60%)] to-[hsl(38,85%,50%)] shadow-game active:shadow-game-pressed',
    accent: 'text-accent-foreground bg-gradient-to-b from-[hsl(0,60%,55%)] to-[hsl(0,65%,45%)] shadow-game active:shadow-game-pressed',
    outline: 'bg-card text-foreground border-4 border-border shadow-game active:shadow-game-pressed',
    bank: 'text-bank-foreground bg-gradient-to-b from-[hsl(220,55%,55%)] to-[hsl(220,60%,45%)] shadow-game active:shadow-game-pressed',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-4 text-lg',
    lg: 'px-8 py-5 text-xl',
  };

  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
    >
      {icon && <span className="text-2xl">{icon}</span>}
      {children}
    </motion.button>
  );
}
