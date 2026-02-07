import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Página de fallback HTTPS para links de pagamento QR.
 * Redireciona para o app com o mesmo payload (bankgame:// ou /game?pay=...).
 */
export default function PayRedirect() {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const v = searchParams.get('v');
    const room = searchParams.get('room');
    const to = searchParams.get('to');
    const amount = searchParams.get('amount');
    const note = searchParams.get('note');
    const params = new URLSearchParams();
    if (v) params.set('v', v);
    if (room) params.set('room', room);
    if (to) params.set('to', to);
    if (amount) params.set('amount', amount);
    if (note) params.set('note', note);
    const qs = params.toString();
    // Redireciona para a tela do jogo com query pay; o app pode abrir o modal de transferência
    window.location.replace(qs ? `/game?pay=1&${qs}` : '/rooms');
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground font-display">Redirecionando...</p>
    </div>
  );
}
