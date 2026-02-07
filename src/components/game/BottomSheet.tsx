import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function BottomSheet({ isOpen, onClose, title, children, className }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-40"
          />
          
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className={cn('bottom-sheet', className)}
          >
            {/* Handle */}
            <div className="flex justify-center mb-4">
              <div className="w-12 h-1.5 bg-border rounded-full" />
            </div>
            
            {/* Header */}
            {title && (
              <div className="flex items-center justify-between gap-3 shrink-0 mb-3 sm:mb-4">
                <h2 className="font-display text-lg sm:text-xl font-bold truncate">{title}</h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors shrink-0 touch-manipulation"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            
            {/* Content: scroll em telas pequenas */}
            <div className="bottom-sheet-content">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
