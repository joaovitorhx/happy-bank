import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Settings,
  Copy,
  Share2,
  Send,
  ArrowDownToLine,
  ArrowUpFromLine,
  QrCode,
  Building2,
  Trophy,
  History,
  Check,
  LogOut
} from 'lucide-react';
import { GameButton } from '@/components/game/GameButton';
import { BalanceCard } from '@/components/game/BalanceCard';
import { PlayerCard } from '@/components/game/PlayerCard';
import { TransactionList } from '@/components/game/TransactionList';
import { useGameStore } from '@/store/gameStore';
import { useRoomRealtime } from '@/hooks/useRoomRealtime';
import { isSupabaseConfigured } from '@/lib/supabase';
import { leaveRoom as leaveRoomRpc } from '@/lib/gameApi';
import { TransactionFilter, Player, Transaction } from '@/types/game';

// Modal components
import { TransferModal, type TransferPreselect } from '@/components/modals/TransferModal';
import { PayBankModal } from '@/components/modals/PayBankModal';
import { ReceiveBankModal } from '@/components/modals/ReceiveBankModal';
import { QRModal } from '@/components/modals/QRModal';
import { TransactionDetailModal } from '@/components/modals/TransactionDetailModal';
import { SettingsModal } from '@/components/modals/SettingsModal';

export default function MainGameScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { room, currentPlayer, transactions, bankModeEnabled, toggleBankMode, leaveRoom, joinRoom, undoLastTransaction, lastBalancePulse, refreshRoomAndTransactions } = useGameStore();

  useRoomRealtime(room?.id);

  // Ao entrar na tela do jogo, atualiza dados (evita ter que sair e entrar na sala)
  useEffect(() => {
    if (room?.id) refreshRoomAndTransactions();
  }, [room?.id]);

  // Manter tela acesa enquanto estiver em jogo (Wake Lock API - mobile)
  useEffect(() => {
    let wakeLock: { release: () => Promise<void> } | null = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as Navigator & { wakeLock: { request: (t: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock.request('screen');
        }
      } catch {
        // ignorar se não suportado ou negado
      }
    };
    requestWakeLock();
    return () => {
      wakeLock?.release?.().catch(() => {});
    };
  }, []);

  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('all');
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [transferPreselect, setTransferPreselect] = useState<TransferPreselect | null>(null);

  // Modals
  const [showTransfer, setShowTransfer] = useState(false);
  const [showPayBank, setShowPayBank] = useState(false);
  const [showReceiveBank, setShowReceiveBank] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [undoing, setUndoing] = useState(false);

  // URL pay redirect: /game?pay=1&room=...&to=...&amount=...&note=...
  useEffect(() => {
    const pay = searchParams.get('pay');
    const roomCode = searchParams.get('room')?.trim().toUpperCase();
    const to = searchParams.get('to')?.trim();
    const amountStr = searchParams.get('amount');
    const note = searchParams.get('note')?.trim() || undefined;
    if (pay !== '1' || !roomCode || !to) return;

    const amount = amountStr ? parseInt(amountStr, 10) : undefined;
    setSearchParams({}, { replace: true });

    if (room?.code === roomCode) {
      setTransferPreselect({ playerId: to, amount, note });
      setShowTransfer(true);
      return;
    }
    (async () => {
      try {
        await joinRoom(roomCode);
        const nextRoom = useGameStore.getState()?.room;
        if (nextRoom?.code === roomCode) {
          if (nextRoom.isStarted) {
            setTransferPreselect({ playerId: to, amount, note });
            setShowTransfer(true);
          } else {
            navigate('/lobby');
            toast.success('Entrou na sala. Inicie o jogo para transferir.');
          }
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Não foi possível entrar na sala.');
      }
    })();
  }, [searchParams, room?.code, joinRoom, navigate]);

  const handleUndo = async () => {
    setUndoing(true);
    try {
      await undoLastTransaction();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Não foi possível desfazer');
    } finally {
      setUndoing(false);
    }
  };

  const handleQRScanSuccess = (result: { roomCode: string; toProfileId: string; amount?: number; note?: string }) => {
    if (room?.code !== result.roomCode) {
      toast.error('Este QR é de outra sala. Entre na sala pelo código primeiro.');
      return;
    }
    const playerExists = room.players.some((p) => p.id === result.toProfileId);
    if (!playerExists) {
      toast.error('Jogador não está nesta sala.');
      return;
    }
    setTransferPreselect({
      playerId: result.toProfileId,
      amount: result.amount,
      note: result.note,
    });
    setShowQR(false);
    setShowTransfer(true);
  };

  if (!room || !currentPlayer) {
    navigate('/rooms');
    return null;
  }

  const sortedPlayers = [...room.players].sort((a, b) => b.balance - a.balance);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Código copiado!');
    } catch {
      toast.error('Não foi possível copiar.');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: room.name,
          text: `Entre na minha sala do Banco Divertido com o código: ${room.code}`,
        });
        toast.success('Compartilhado!');
      } catch (err) {
        if ((err as Error)?.name !== 'AbortError') {
          toast.error('Não foi possível compartilhar.');
        }
      }
    } else {
      handleCopyCode();
    }
  };

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

  return (
    <div className="min-h-screen flex flex-col pb-6">
      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b-4 border-border p-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-lg font-bold truncate max-w-[180px]">
              {room.name}
            </h1>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-display text-primary font-semibold">
                {room.code}
              </span>
              <button type="button" onClick={handleCopyCode} className="p-1 touch-manipulation" aria-label="Copiar código">
                {copied ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              <button type="button" onClick={handleShare} className="p-1 touch-manipulation" aria-label="Compartilhar">
                <Share2 className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
          
          <button
            onClick={() => setShowSettings(true)}
            className="p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </motion.header>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Balance Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <BalanceCard balance={currentPlayer.balance} playerName={currentPlayer.name} pulse={lastBalancePulse} />
        </motion.div>

        {/* Quick Actions */}
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="grid grid-cols-2 gap-3">
            <GameButton
              variant="primary"
              size="md"
              onClick={() => setShowTransfer(true)}
              icon={<Send className="w-5 h-5" />}
              className="flex-col h-auto py-5"
            >
              TRANSFERIR
            </GameButton>
            
            <GameButton
              variant="accent"
              size="md"
              onClick={() => setShowPayBank(true)}
              icon={<ArrowUpFromLine className="w-5 h-5" />}
              className="flex-col h-auto py-5"
            >
              PAGAR BANCO
            </GameButton>
            
            <GameButton
              variant="secondary"
              size="md"
              onClick={() => setShowReceiveBank(true)}
              icon={<ArrowDownToLine className="w-5 h-5" />}
              className="flex-col h-auto py-5"
            >
              RECEBER DO BANCO
            </GameButton>
            
            <GameButton
              variant="outline"
              size="md"
              onClick={() => setShowQR(true)}
              icon={<QrCode className="w-5 h-5" />}
              className="flex-col h-auto py-5"
            >
              ESCANEAR QR
            </GameButton>
          </div>

          {/* Bank Mode + Sair da Sala */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-3 space-y-2"
          >
            <GameButton
              variant="bank"
              size="md"
              onClick={() => navigate('/bank-mode')}
              icon={<Building2 className="w-5 h-5" />}
              className="w-full"
            >
              MODO BANCO
            </GameButton>
            <GameButton
              variant="outline"
              size="md"
              onClick={handleLeave}
              disabled={leaving}
              icon={<LogOut className="w-5 h-5" />}
              className="w-full"
            >
              {leaving ? 'Saindo...' : 'SAIR DA SALA'}
            </GameButton>
          </motion.div>
        </motion.section>

        {/* Leaderboard */}
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="section-header">
            <Trophy className="w-5 h-5 text-secondary" />
            Ranking dos Jogadores
          </h3>
          <div className="game-card space-y-2">
            {sortedPlayers.map((player, index) => (
              <PlayerCard
                key={player.id}
                player={player}
                rank={index + 1}
                showBalance
              />
            ))}
          </div>
        </motion.section>

        {/* Transaction Feed + Undo (host) */}
        <motion.section
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="section-header mb-0">
              <History className="w-5 h-5 text-primary" />
              Histórico de Transações
            </h3>
            {currentPlayer?.isHost && transactions.length > 0 && (
              <button
                onClick={handleUndo}
                disabled={undoing}
                className="text-sm font-display font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50 px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors"
              >
                {undoing ? 'Desfazendo...' : 'Desfazer última'}
              </button>
            )}
          </div>
          <div className="game-card">
            <TransactionList
              transactions={transactions}
              filter={transactionFilter}
              onFilterChange={setTransactionFilter}
              currentPlayerId={currentPlayer.id}
              onTransactionClick={setSelectedTransaction}
            />
          </div>
        </motion.section>
      </div>

      {/* Modals */}
      <TransferModal
        isOpen={showTransfer}
        onClose={() => { setShowTransfer(false); setTransferPreselect(null); }}
        players={room.players.filter(p => !p.isMe)}
        currentPlayer={currentPlayer}
        initialPreselect={transferPreselect}
      />

      <PayBankModal
        isOpen={showPayBank}
        onClose={() => setShowPayBank(false)}
        currentPlayer={currentPlayer}
      />

      <ReceiveBankModal
        isOpen={showReceiveBank}
        onClose={() => setShowReceiveBank(false)}
        currentPlayer={currentPlayer}
      />

      <QRModal
        isOpen={showQR}
        onClose={() => setShowQR(false)}
        room={room}
        currentPlayer={currentPlayer}
        onScanSuccess={handleQRScanSuccess}
      />

      <TransactionDetailModal
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        transaction={selectedTransaction}
      />

      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
