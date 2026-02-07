import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { GameButton } from '@/components/game/GameButton';
import { Coins, Users, Zap } from 'lucide-react';

export default function WelcomeScreen() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        <motion.div
          animate={{ 
            rotate: [0, 360],
            y: [0, -20, 0]
          }}
          transition={{ 
            rotate: { duration: 20, repeat: Infinity, ease: 'linear' },
            y: { duration: 3, repeat: Infinity, ease: 'easeInOut' }
          }}
          className="absolute top-20 right-8 text-6xl opacity-30"
        >
          🪙
        </motion.div>
        <motion.div
          animate={{ y: [0, 15, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-40 left-6 text-5xl opacity-25"
        >
          💰
        </motion.div>
        <motion.div
          animate={{ rotate: [-10, 10, -10] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-32 right-12 text-7xl opacity-20"
        >
          🏦
        </motion.div>
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-48 left-10 text-4xl opacity-25"
        >
          🎲
        </motion.div>
      </div>

      {/* Main Content */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center z-10"
      >
        {/* Logo / Title */}
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className="mb-6"
        >
          <span className="text-8xl">🏛️</span>
        </motion.div>

        <h1 className="font-display text-4xl font-bold text-primary mb-2 text-shadow-game">
          Banco Imobiliário
        </h1>
        <h2 className="font-display text-2xl font-semibold text-secondary mb-8">
          Digital
        </h2>

        {/* Feature Cards */}
        <div className="space-y-3 mb-8 max-w-xs mx-auto">
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="game-card flex items-center gap-3 p-4"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Coins className="w-6 h-6 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-display font-semibold">Sem dinheiro físico</p>
              <p className="text-sm text-muted-foreground">Tudo digital e organizado</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="game-card flex items-center gap-3 p-4"
          >
            <div className="w-12 h-12 rounded-xl bg-secondary/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-secondary" />
            </div>
            <div className="text-left">
              <p className="font-display font-semibold">Transferências rápidas</p>
              <p className="text-sm text-muted-foreground">Pague e receba instantaneamente</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="game-card flex items-center gap-3 p-4"
          >
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-accent" />
            </div>
            <div className="text-left">
              <p className="font-display font-semibold">Até 8 jogadores</p>
              <p className="text-sm text-muted-foreground">Jogue com amigos e família</p>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Start Button */}
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="w-full max-w-xs z-10"
      >
        <GameButton
          variant="primary"
          size="lg"
          onClick={() => navigate('/profile')}
          className="w-full text-xl"
          icon={<span>🎮</span>}
        >
          INICIAR
        </GameButton>
      </motion.div>

      {/* Footer */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="absolute bottom-6 text-sm text-muted-foreground font-display"
      >
        Feito com 💚 para board gamers
      </motion.p>
    </div>
  );
}
