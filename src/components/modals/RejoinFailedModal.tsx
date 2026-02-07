import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface RejoinFailedModalProps {
  open: boolean;
  onClose: () => void;
}

export function RejoinFailedModal({ open, onClose }: RejoinFailedModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sala não disponível</AlertDialogTitle>
          <AlertDialogDescription>
            A sala anterior não foi encontrada ou a partida já encerrou. Você pode criar ou entrar em outra sala.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>Entendi</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
