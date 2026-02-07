import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { GameButton } from '@/components/game/GameButton';
import { AvatarPicker } from '@/components/game/AvatarPicker';
import { useGameStore } from '@/store/gameStore';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getCurrentProfile } from '@/lib/gameApi';
import { ArrowLeft } from 'lucide-react';

function profileToAvatar(avatarUrl: string | null): string {
  if (!avatarUrl) return '👤';
  if (avatarUrl.startsWith('http')) return '👤';
  return avatarUrl;
}

export default function ProfileScreen() {
  const navigate = useNavigate();
  const setProfile = useGameStore((state) => state.setProfile);
  const setCurrentPlayerFromProfile = useGameStore((state) => state.setCurrentPlayerFromProfile);

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🎩');
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setInitialized(true);
      return;
    }
    getCurrentProfile().then((profile) => {
      if (profile) {
        setName(profile.name || '');
        setAvatar(profileToAvatar(profile.avatar_url));
        setCurrentPlayerFromProfile({
          id: profile.id,
          name: profile.name,
          avatar: profileToAvatar(profile.avatar_url),
        });
      }
      setInitialized(true);
    });
  }, [setCurrentPlayerFromProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await setProfile(name.trim(), avatar);
      navigate('/rooms');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível salvar o perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col p-6">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-3 mb-8"
      >
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-display text-2xl font-bold">Criar Perfil</h1>
      </motion.div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        {/* Avatar Section */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex justify-center mb-6">
            <motion.div
              key={avatar}
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              className="w-28 h-28 rounded-full bg-card border-4 border-secondary flex items-center justify-center text-6xl shadow-game"
            >
              {avatar}
            </motion.div>
          </div>

          <p className="font-display text-center text-muted-foreground mb-4">
            Escolha seu avatar
          </p>

          <AvatarPicker selected={avatar} onSelect={setAvatar} />
        </motion.div>

        {/* Name Input */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <label className="block font-display font-semibold mb-2">
            Seu nome
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Digite seu nome"
            maxLength={20}
            className="w-full p-4 rounded-2xl bg-card border-4 border-border focus:border-primary outline-none font-display text-lg shadow-game-sm transition-colors"
          />
          <p className="text-sm text-muted-foreground mt-2 text-right">
            {name.length}/20
          </p>
        </motion.div>

        {/* Submit Button */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-auto"
        >
          <GameButton
            type="submit"
            variant="primary"
            size="lg"
            disabled={!name.trim() || loading || !initialized}
            className="w-full"
            icon={<span>✨</span>}
          >
            {loading ? 'Salvando...' : 'CRIAR PERFIL'}
          </GameButton>
        </motion.div>
      </form>
    </div>
  );
}
