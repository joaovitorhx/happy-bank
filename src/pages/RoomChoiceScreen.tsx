import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { GameButton } from '@/components/game/GameButton';
import { BottomSheet } from '@/components/game/BottomSheet';
import { useGameStore } from '@/store/gameStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getCurrentProfile } from '@/lib/gameApi';
import { ArrowLeft, Plus, Hash } from 'lucide-react';

function profileToAvatar(avatarUrl: string | null): string {
  if (!avatarUrl) return '👤';
  if (avatarUrl.startsWith('http')) return '👤';
  return avatarUrl;
}

export default function RoomChoiceScreen() {
  const navigate = useNavigate();
  const { createRoom, joinRoom, currentPlayer, setCurrentPlayerFromProfile } = useGameStore();

  useEffect(() => {
    if (!isSupabaseConfigured() || currentPlayer?.id) return;
    getCurrentProfile().then((profile) => {
      if (profile)
        setCurrentPlayerFromProfile({
          id: profile.id,
          name: profile.name,
          avatar: profileToAvatar(profile.avatar_url),
        });
    });
  }, [currentPlayer?.id, setCurrentPlayerFromProfile]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const [roomName, setRoomName] = useState('');
  const [initialMoney, setInitialMoney] = useState('15000');
  const [maxPlayers, setMaxPlayers] = useState('8');
  const [roomCode, setRoomCode] = useState('');

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomName.trim() || !initialMoney) return;
    setLoading(true);
    try {
      await createRoom(roomName.trim(), parseInt(initialMoney), parseInt(maxPlayers));
      navigate('/lobby');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível criar a sala');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.length !== 6) return;
    setLoading(true);
    try {
      await joinRoom(roomCode);
      navigate('/lobby');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível entrar na sala');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6">
      {!isSupabaseConfigured() ? (
        <div className="mb-4 p-3 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-800 dark:text-amber-200 text-sm font-display">
          <strong>Modo demonstração:</strong> as salas não são salvas. Configure <code className="bg-black/10 px-1 rounded">VITE_SUPABASE_URL</code> e <code className="bg-black/10 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> no <code className="bg-black/10 px-1 rounded">.env</code> e reinicie o app para usar o Supabase.
          <br />
          <span className="opacity-90">Se o .env já existe, pare o servidor (Ctrl+C) e rode <code className="bg-black/10 px-1 rounded">npm run dev</code> de novo.</span>
        </div>
      ) : (
        <div className="mb-4 p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 text-xs font-display">
          ✓ Supabase conectado — salas são salvas no banco
        </div>
      )}
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-3 mb-8"
      >
        <button
          onClick={() => navigate('/profile')}
          className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display text-2xl font-bold">Escolher Sala</h1>
          {currentPlayer && (
            <p className="text-sm text-muted-foreground">
              Olá, {currentPlayer.avatar} {currentPlayer.name}!
            </p>
          )}
        </div>
      </motion.div>

      {/* Room Options */}
      <div className="flex-1 flex flex-col justify-center gap-6 max-w-md mx-auto w-full">
        {/* Create Room Card */}
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          onClick={() => setShowCreateModal(true)}
          className="game-card cursor-pointer hover:scale-[1.02] transition-transform p-6"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Plus className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">Criar Sala</h2>
              <p className="text-muted-foreground">Seja o anfitrião do jogo</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-display">
              🎮 Você será o Banco
            </span>
            <span className="text-xs bg-secondary/20 text-secondary-foreground px-3 py-1 rounded-full font-display">
              💰 Defina valores
            </span>
          </div>
        </motion.div>

        {/* Join Room Card */}
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          onClick={() => setShowJoinModal(true)}
          className="game-card cursor-pointer hover:scale-[1.02] transition-transform p-6"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-secondary/20 flex items-center justify-center">
              <Hash className="w-8 h-8 text-secondary" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold">Entrar com Código</h2>
              <p className="text-muted-foreground">Entre numa sala existente</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs bg-secondary/10 text-secondary-foreground px-3 py-1 rounded-full font-display">
              📱 Código de 6 dígitos
            </span>
          </div>
        </motion.div>
      </div>

      {/* Create Room Modal */}
      <BottomSheet
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Criar Sala"
      >
        <form onSubmit={handleCreateRoom} className="space-y-4">
          <div>
            <label className="block font-display font-semibold mb-2">
              Nome da sala
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Ex: Jogo de Domingo"
              maxLength={30}
              className="w-full p-4 rounded-2xl bg-muted border-4 border-border focus:border-primary outline-none font-display transition-colors"
            />
          </div>

          <div>
            <label className="block font-display font-semibold mb-2">
              Dinheiro inicial (R$)
            </label>
            <input
              type="number"
              value={initialMoney}
              onChange={(e) => setInitialMoney(e.target.value)}
              placeholder="15000"
              min="1000"
              max="1000000000"
              className="w-full p-4 rounded-2xl bg-muted border-4 border-border focus:border-primary outline-none font-display transition-colors"
            />
          </div>

          <div>
            <label className="block font-display font-semibold mb-2">
              Máximo de jogadores
            </label>
            <select
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(e.target.value)}
              className="w-full p-4 rounded-2xl bg-muted border-4 border-border focus:border-primary outline-none font-display transition-colors"
            >
              {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n} jogadores
                </option>
              ))}
            </select>
          </div>

          <GameButton
            type="submit"
            variant="primary"
            size="lg"
            disabled={!roomName.trim() || !initialMoney || loading}
            className="w-full mt-4"
            icon={<span>🎲</span>}
          >
            {loading ? 'Criando...' : 'CRIAR SALA'}
          </GameButton>
        </form>
      </BottomSheet>

      {/* Join Room Modal */}
      <BottomSheet
        isOpen={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        title="Entrar com Código"
      >
        <form onSubmit={handleJoinRoom} className="space-y-4">
          <div>
            <label className="block font-display font-semibold mb-2">
              Código da sala
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABC123"
              maxLength={6}
              className="w-full p-4 rounded-2xl bg-muted border-4 border-border focus:border-primary outline-none font-display text-2xl text-center tracking-[0.3em] uppercase transition-colors"
            />
            <p className="text-sm text-muted-foreground mt-2 text-center">
              Digite os 6 caracteres do código
            </p>
          </div>

          <GameButton
            type="submit"
            variant="secondary"
            size="lg"
            disabled={roomCode.length !== 6 || loading}
            className="w-full mt-4"
            icon={<span>🚪</span>}
          >
            {loading ? 'Entrando...' : 'ENTRAR'}
          </GameButton>
        </form>
      </BottomSheet>
    </div>
  );
}
