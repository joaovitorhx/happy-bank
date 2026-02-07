import React from 'react';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BankAvatarProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-14 h-14',
};

export function BankAvatar({ className, size = 'md' }: BankAvatarProps) {
  return (
    <div
      className={cn(
        'rounded-full bg-bank flex items-center justify-center text-bank-foreground flex-shrink-0',
        sizeClasses[size],
        className
      )}
    >
      <Building2 className={size === 'sm' ? 'w-4 h-4' : size === 'md' ? 'w-6 h-6' : 'w-7 h-7'} />
    </div>
  );
}
