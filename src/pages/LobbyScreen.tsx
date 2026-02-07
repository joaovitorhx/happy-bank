import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { GameButton } from '@/components/game/GameButton';
import { PlayerCard } from '@/components/game/PlayerCard';
import { RoomCodeDisplay } from '@/components/game/RoomCodeDisplay';
import { useGameStore } from '@/store/gameStore';
import { useRoomRealtime } from '@/hooks/useRoomRealtime';
import { isSupabaseConfigured } from '@/lib/supabase';
import { leaveRoom as leaveRoomRpc } from '@/lib/gameApi';
import { ArrowLeft, LogOut, Play } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

export default function LobbyScreen() {
  const navigate = useNavigate();
  const { room, currentPlayer, leaveRoom, startGame } = useGameStore();
  const [starting, setStarting] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useRoomRealtime(room?.id);

  // Quando o host inicia o jogo, realtime atualiza room.isStarted; redireciona para o jogo
  useEffect(() => {
    if (room?.isStarted) navigate('/game');
  }, [room?.isStarted, navigate]);

  // Sem sala: mostra tela amigável e redireciona para escolher sala (evita lobby vazio)
  if (!room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground font-display text-center mb-4">
          Você não está em nenhuma sala.
        </p>
        <GameButton
          variant="primary"
          size="lg"
          onClick={() => navigate('/rooms')}
          className="w-full max-w-xs"
        >
          Escolher ou criar sala
        </GameButton>
      </div>
    );
  }

  const handleLeave = async () => {
    setLeaving(true);
    try {
      if (isSupabaseConfigured()) await leaveRoomRpc(room.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível sair da sala');
      setLeaving(false);
      return;
    }
    leaveRoom();
    navigate('/rooms');
    setLeaving(false);
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      await startGame();
      navigate('/game');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível iniciar o jogo');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-3 mb-6"
      >
        <button
          onClick={handleLeave}
          className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-bold">{room.name}</h1>
          <p className="text-sm text-muted-foreground">
            Aguardando jogadores...
          </p>
        </div>
      </motion.div>

      {/* Room Code */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <RoomCodeDisplay code={room.code} />
      </motion.div>

      {/* Game Settings */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="game-card mb-6"
      >
        <h3 className="font-display font-semibold mb-3">⚙️ Configurações</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Dinheiro inicial</p>
            <p className="font-display font-bold text-primary">
              {formatCurrency(room.initialMoney)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Máx. jogadores</p>
            <p className="font-display font-bold">
              {room.maxPlayers} jogadores
            </p>
          </div>
        </div>
      </motion.div>

      {/* Players List */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex-1"
      >
        <h3 className="section-header">
          👥 Jogadores ({room.players.length}/{room.maxPlayers})
        </h3>
        <div className="space-y-2">
          {room.players.map((player, index) => (
            <motion.div
              key={player.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 + index * 0.1 }}
            >
              <PlayerCard player={player} />
            </motion.div>
          ))}

          {/* Empty slots */}
          {Array.from({ length: room.maxPlayers - room.players.length }).map((_, i) => (
            <motion.div
              key={`empty-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.05 }}
              className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-border"
            >
              <div className="w-14 h-14 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                <span className="text-muted-foreground/50 text-2xl">?</span>
              </div>
              <p className="text-muted-foreground font-display">
                Aguardando jogador...
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="space-y-3 mt-6"
      >
        {currentPlayer?.isHost && (
          <GameButton
            variant="primary"
            size="lg"
            onClick={handleStart}
            disabled={room.players.length < 2 || starting}
            className="w-full"
            icon={<Play className="w-6 h-6" />}
          >
            {starting ? 'Iniciando...' : 'INICIAR JOGO'}
          </GameButton>
        )}

        <GameButton
          variant="accent"
          size="md"
          onClick={handleLeave}
          disabled={leaving}
          className="w-full"
          icon={<LogOut className="w-5 h-5" />}
        >
          {leaving ? 'Saindo...' : 'Sair da Sala'}
        </GameButton>
      </motion.div>
    </div>
  );
}
