import React from 'react';
import { Copy, Share2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RoomCodeDisplayProps {
  code: string;
  className?: string;
}

export function RoomCodeDisplay({ code, className }: RoomCodeDisplayProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Código copiado!');
    } catch {
      toast.error('Não foi possível copiar. Tente novamente.');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Entre na minha sala!',
          text: `Use o código ${code} para entrar na minha sala do Banco Divertido!`,
        });
        toast.success('Compartilhado!');
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          toast.error('Não foi possível compartilhar.');
        }
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className={cn('game-card', className)}>
      <p className="text-sm text-muted-foreground font-display mb-2 text-center">
        Código da Sala
      </p>
      
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="room-code">{code}</span>
      </div>

      <div className="flex gap-2 justify-center">
        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors font-display text-sm"
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.span
                key="check"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Check className="w-4 h-4 text-success" />
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Copy className="w-4 h-4" />
              </motion.span>
            )}
          </AnimatePresence>
          {copied ? 'Copiado!' : 'Copiar'}
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.95 }}
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-display text-sm"
        >
          <Share2 className="w-4 h-4" />
          Compartilhar
        </motion.button>
      </div>
    </div>
  );
}
