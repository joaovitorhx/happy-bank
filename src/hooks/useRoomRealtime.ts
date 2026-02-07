import { useEffect } from 'react';
import { subscribeToRoom } from '@/lib/gameApi';
import { useGameStore } from '@/store/gameStore';
import { isSupabaseConfigured } from '@/lib/supabase';

/** Inscreve em mudanças da sala (jogadores e transações) e atualiza a store. */
export function useRoomRealtime(roomId: string | undefined) {
  const refreshRoomAndTransactions = useGameStore((s) => s.refreshRoomAndTransactions);

  useEffect(() => {
    if (!roomId || !isSupabaseConfigured()) return;

    const unsubscribe = subscribeToRoom(roomId, {
      onRoom: refreshRoomAndTransactions,
      onPlayers: refreshRoomAndTransactions,
      onTransactions: refreshRoomAndTransactions,
    });

    return () => unsubscribe();
  }, [roomId, refreshRoomAndTransactions]);
}
