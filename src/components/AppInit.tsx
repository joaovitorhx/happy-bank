import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getStoredRoomCode, clearStoredRoomCode } from '@/lib/storage';
import { initAnonymousSession } from '@/lib/auth';
import * as api from '@/lib/gameApi';
import { useGameStore } from '@/store/gameStore';
import { RejoinFailedModal } from '@/components/modals/RejoinFailedModal';

interface AppInitProps {
  children: React.ReactNode;
}

/** Mensagens que indicam que a sala realmente não está disponível (mostrar modal). */
function isRoomUnavailableError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('não encontrada') ||
    m.includes('não está no lobby') ||
    m.includes('já iniciada') ||
    m.includes('já encerrada') ||
    m.includes('partida já encerrou')
  );
}

/** Inicializa sessão anônima e tenta reentrar na última sala ao abrir o app. */
export function AppInit({ children }: AppInitProps) {
  const navigate = useNavigate();
  const setRoomFromRejoin = useGameStore((s) => s.setRoomFromRejoin);
  const [rejoinFailed, setRejoinFailed] = useState(false);
  const [ready, setReady] = useState(!isSupabaseConfigured());
  const rejoinAttemptedRef = useRef(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setReady(true);
      return;
    }
    if (rejoinAttemptedRef.current) {
      setReady(true);
      return;
    }

    let cancelled = false;
    rejoinAttemptedRef.current = true;

    (async () => {
      try {
        await initAnonymousSession();
        if (cancelled) return;

        const code = getStoredRoomCode();
        if (!code || code.length !== 6) {
          setReady(true);
          return;
        }

        const data = await api.tryRejoinByCode(code);
        if (cancelled) return;

        setRoomFromRejoin(data);
        navigate(data.room.isStarted ? '/game' : '/lobby', { replace: true });
      } catch (err) {
        if (!cancelled) {
          clearStoredRoomCode();
          const message = err instanceof Error ? err.message : String(err);
          if (isRoomUnavailableError(message)) setRejoinFailed(true);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, setRoomFromRejoin]);

  const handleRejoinModalClose = () => {
    setRejoinFailed(false);
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground font-display">Carregando...</p>
      </div>
    );
  }

  return (
    <>
      {children}
      <RejoinFailedModal open={rejoinFailed} onClose={handleRejoinModalClose} />
    </>
  );
}
