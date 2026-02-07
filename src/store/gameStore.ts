import { create } from 'zustand';
import { Player, Room, Transaction, GameState } from '@/types/game';
import { generateRoomCode, generateId } from '@/lib/formatters';
import { isSupabaseConfigured } from '@/lib/supabase';
import { setStoredRoomCode, clearStoredRoomCode } from '@/lib/storage';
import { initAnonymousSession } from '@/lib/auth';
import { playReceiveSound } from '@/lib/sounds';
import * as api from '@/lib/gameApi';

// Mock players for demo (quando Supabase não está configurado)
const mockPlayers: Player[] = [
  { id: '1', name: 'João', avatar: '🎩', balance: 15000, isHost: true, isMe: true },
  { id: '2', name: 'Maria', avatar: '💎', balance: 12500, isHost: false, isMe: false },
  { id: '3', name: 'Pedro', avatar: '🚗', balance: 18000, isHost: false, isMe: false },
  { id: '4', name: 'Ana', avatar: '🦋', balance: 9800, isHost: false, isMe: false },
];

const mockTransactions: Transaction[] = [
  { id: '1', timestamp: new Date(Date.now() - 1000 * 60 * 5), fromId: '3', toId: '1', fromName: 'Pedro', toName: 'João', amount: 2000, note: 'Aluguel', type: 'player-to-player' },
  { id: '2', timestamp: new Date(Date.now() - 1000 * 60 * 10), fromId: 'BANCO', toId: '1', fromName: 'Banco', toName: 'João', amount: 200, note: 'Salário', type: 'bank-to-player' },
  { id: '3', timestamp: new Date(Date.now() - 1000 * 60 * 15), fromId: '1', toId: 'BANCO', fromName: 'João', toName: 'Banco', amount: 500, note: 'Imposto', type: 'player-to-bank' },
];

interface GameStore extends GameState {
  setProfile: (name: string, avatar: string) => void | Promise<void>;
  setCurrentPlayerFromProfile: (profile: { id: string; name: string | null; avatar: string }) => void;
  setRoomFromRejoin: (data: { room: Room; players: Player[]; transactions: Transaction[] }) => void;
  createRoom: (name: string, initialMoney: number, maxPlayers: number) => Promise<void>;
  joinRoom: (code: string) => Promise<void>;
  leaveRoom: () => void;
  startGame: () => Promise<void>;
  transferToPlayer: (toPlayerId: string, amount: number, note?: string) => Promise<void>;
  payBank: (amount: number, note?: string) => Promise<void>;
  receiveFromBank: (amount: number, note?: string) => Promise<void>;
  bankPayToPlayer: (playerId: string, amount: number, note?: string) => Promise<void>;
  bankReceiveFromPlayer: (playerId: string, amount: number, note?: string) => Promise<void>;
  undoLastTransaction: () => Promise<void>;
  refreshRoomAndTransactions: () => Promise<void>;
  getPlayerById: (id: string) => Player | undefined;
  toggleBankMode: () => void;
  /** 'in' = dinheiro entrando (mola), 'out' = saindo; usado para animação no BalanceCard. */
  lastBalancePulse: 'in' | 'out' | null;
}

const PULSE_CLEAR_MS = 700;

export const useGameStore = create<GameStore>((set, get) => ({
  currentPlayer: null,
  room: null,
  transactions: [],
  bankModeEnabled: false,
  lastBalancePulse: null,

  setProfile: async (name, avatar) => {
    if (isSupabaseConfigured()) {
      const uid = await api.getCurrentUserId();
      if (uid) {
        await api.updateProfile(name, avatar);
        set({
          currentPlayer: {
            id: uid,
            name,
            avatar,
            balance: 0,
            isHost: false,
            isMe: true,
          },
        });
        return;
      }
    }
    set({
      currentPlayer: {
        id: generateId(),
        name,
        avatar,
        balance: 0,
        isHost: false,
        isMe: true,
      },
    });
  },

  setCurrentPlayerFromProfile: (profile) => {
    set({
      currentPlayer: {
        id: profile.id,
        name: profile.name || 'Jogador',
        avatar: profile.avatar || '👤',
        balance: 0,
        isHost: false,
        isMe: true,
      },
    });
  },

  setRoomFromRejoin: (data) => {
    const me = data.players.find((p) => p.isMe);
    set({
      room: data.room,
      currentPlayer: me ?? null,
      transactions: data.transactions,
    });
  },

  createRoom: async (name, initialMoney, maxPlayers) => {
    const { currentPlayer } = get();
    if (!currentPlayer) return;

    if (isSupabaseConfigured()) {
      let uid = await api.getCurrentUserId();
      if (!uid) {
        await initAnonymousSession();
        uid = await api.getCurrentUserId();
      }
      if (uid) {
        const room = await api.createRoom(name, initialMoney, maxPlayers);
        if (!room) throw new Error('Não foi possível criar a sala');
        const data = await api.fetchRoomWithPlayers(room.id, uid);
        if (data) {
          const me = data.players.find((p) => p.isMe);
          set({ room: data.room, currentPlayer: me ?? null, transactions: [] });
          setStoredRoomCode(data.room.code);
          return;
        }
      } else {
        throw new Error('Conexão com o servidor não disponível. Verifique o login anônimo no Supabase e tente novamente.');
      }
    }

    set({
      currentPlayer: { ...currentPlayer, balance: initialMoney, isHost: true },
      room: {
        id: generateId(),
        name,
        code: generateRoomCode(),
        initialMoney,
        maxPlayers,
        players: [{ ...currentPlayer, balance: initialMoney, isHost: true }],
        isStarted: false,
      },
      transactions: [],
    });
  },

  joinRoom: async (code) => {
    const { currentPlayer } = get();
    if (!currentPlayer) return;

    if (isSupabaseConfigured()) {
      let uid = await api.getCurrentUserId();
      if (!uid) {
        await initAnonymousSession();
        uid = await api.getCurrentUserId();
      }
      if (uid) {
        const room = await api.joinRoomByCode(code);
        if (!room) throw new Error('Sala não encontrada ou partida já iniciada');
        const data = await api.fetchRoomWithPlayers(room.id, uid);
        if (data) {
          const me = data.players.find((p) => p.isMe);
          const txList = data.room.isStarted ? await api.fetchTransactions(room.id) : [];
          set({ room: data.room, currentPlayer: me ?? null, transactions: txList });
          setStoredRoomCode(data.room.code);
          return;
        }
      } else {
        throw new Error('Conexão com o servidor não disponível. Verifique o login anônimo no Supabase e tente novamente.');
      }
    }

    const updatedPlayer = { ...currentPlayer, balance: 15000, isHost: false };
    const allPlayers = [...mockPlayers.map((p) => ({ ...p, isMe: false, isHost: p.id === '1' })), updatedPlayer];
    set({
      currentPlayer: updatedPlayer,
      room: { id: generateId(), name: 'Sala do Pedro', code: code.toUpperCase(), initialMoney: 15000, maxPlayers: 8, players: allPlayers, isStarted: false },
      transactions: [],
    });
  },

  leaveRoom: () => {
    clearStoredRoomCode();
    set({ room: null, transactions: [] });
  },

  startGame: async () => {
    const { room } = get();
    if (!room) return;

    if (isSupabaseConfigured()) {
      const uid = await api.getCurrentUserId();
      if (uid) {
        await api.startGame(room.id);
        const data = await api.fetchRoomWithPlayers(room.id, uid);
        const txList = await api.fetchTransactions(room.id);
        if (data) {
          const me = data.players.find((p) => p.isMe);
          set({ room: data.room, currentPlayer: me ?? null, transactions: txList });
          return;
        }
      }
    }

    set({
      room: { ...room, isStarted: true, players: mockPlayers },
      currentPlayer: mockPlayers.find((p) => p.isMe) ?? null,
      transactions: mockTransactions,
    });
  },

  refreshRoomAndTransactions: async () => {
    const { room, currentPlayer: prevMe } = get();
    if (!room || !isSupabaseConfigured()) return;
    const uid = await api.getCurrentUserId();
    if (!uid) return;
    const data = await api.fetchRoomWithPlayers(room.id, uid);
    const txList = await api.fetchTransactions(room.id);
    if (data) {
      const me = data.players.find((p) => p.isMe);
      const prevBalance = prevMe?.balance ?? 0;
      const newBalance = me?.balance ?? 0;
      const pulse = newBalance > prevBalance ? 'in' : newBalance < prevBalance ? 'out' : null;
      set({ room: data.room, currentPlayer: me ?? get().currentPlayer, transactions: txList, lastBalancePulse: pulse });
      // coin.mp3 só toca quando o usuário recebe transferência P2P (não banco)
      const latestTx = txList[0];
      const isP2PReceived = latestTx?.type === 'player-to-player' && latestTx?.toId === uid;
      if (newBalance > prevBalance && isP2PReceived) playReceiveSound();
      if (pulse) setTimeout(() => set({ lastBalancePulse: null }), PULSE_CLEAR_MS);
    }
  },

  transferToPlayer: async (toPlayerId, amount, note) => {
    const { room, currentPlayer } = get();
    if (!room || !currentPlayer) return;

    if (isSupabaseConfigured()) {
      const tx = await api.transferP2p(room.id, currentPlayer.id, toPlayerId, amount, note);
      if (!tx) throw new Error('Transferência recusada (saldo insuficiente ou sala inválida)');
      set({ lastBalancePulse: 'out' });
      setTimeout(() => set({ lastBalancePulse: null }), PULSE_CLEAR_MS);
      await get().refreshRoomAndTransactions();
      return;
    }

    const toPlayer = room.players.find((p) => p.id === toPlayerId);
    if (!toPlayer) return;
    const newTx: Transaction = { id: generateId(), timestamp: new Date(), fromId: currentPlayer.id, toId: toPlayerId, fromName: currentPlayer.name, toName: toPlayer.name, amount, note, type: 'player-to-player' };
    const updated = room.players.map((p) => {
      if (p.id === currentPlayer.id) return { ...p, balance: p.balance - amount };
      if (p.id === toPlayerId) return { ...p, balance: p.balance + amount };
      return p;
    });
    const me = updated.find((p) => p.id === currentPlayer.id);
    set({ room: { ...room, players: updated }, currentPlayer: me ?? currentPlayer, transactions: [newTx, ...get().transactions] });
  },

  payBank: async (amount, note) => {
    const { room, currentPlayer } = get();
    if (!room || !currentPlayer) return;

    if (isSupabaseConfigured()) {
      const tx = await api.payBank(room.id, currentPlayer.id, amount, note);
      if (!tx) throw new Error('Pagamento ao banco recusado (saldo insuficiente ou sala inválida)');
      set({ lastBalancePulse: 'out' });
      setTimeout(() => set({ lastBalancePulse: null }), PULSE_CLEAR_MS);
      await get().refreshRoomAndTransactions();
      return;
    }

    const newTx: Transaction = { id: generateId(), timestamp: new Date(), fromId: currentPlayer.id, toId: 'BANCO', fromName: currentPlayer.name, toName: 'Banco', amount, note, type: 'player-to-bank' };
    const updated = room.players.map((p) => (p.id === currentPlayer.id ? { ...p, balance: p.balance - amount } : p));
    const me = updated.find((p) => p.id === currentPlayer.id);
    set({ room: { ...room, players: updated }, currentPlayer: me ?? currentPlayer, transactions: [newTx, ...get().transactions] });
  },

  receiveFromBank: async (amount, note) => {
    const { room, currentPlayer } = get();
    if (!room || !currentPlayer) return;

    if (isSupabaseConfigured()) {
      const tx = await api.receiveBank(room.id, currentPlayer.id, amount, note);
      if (!tx) throw new Error('Recebimento do banco recusado');
      await get().refreshRoomAndTransactions();
      return;
    }

    const newTx: Transaction = { id: generateId(), timestamp: new Date(), fromId: 'BANCO', toId: currentPlayer.id, fromName: 'Banco', toName: currentPlayer.name, amount, note, type: 'bank-to-player' };
    const updated = room.players.map((p) => (p.id === currentPlayer.id ? { ...p, balance: p.balance + amount } : p));
    const me = updated.find((p) => p.id === currentPlayer.id);
    set({ room: { ...room, players: updated }, currentPlayer: me ?? currentPlayer, transactions: [newTx, ...get().transactions] });
  },

  bankPayToPlayer: async (playerId, amount, note) => {
    const { room } = get();
    if (!room) return;
    if (isSupabaseConfigured()) {
      const tx = await api.receiveBank(room.id, playerId, amount, note);
      if (!tx) throw new Error('Operação recusada');
      await get().refreshRoomAndTransactions();
      return;
    }
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;
    const newTx: Transaction = { id: generateId(), timestamp: new Date(), fromId: 'BANCO', toId: playerId, fromName: 'Banco', toName: player.name, amount, note, type: 'bank-to-player' };
    const updated = room.players.map((p) => (p.id === playerId ? { ...p, balance: p.balance + amount } : p));
    set({ room: { ...room, players: updated }, transactions: [newTx, ...get().transactions] });
  },

  bankReceiveFromPlayer: async (playerId, amount, note) => {
    const { room } = get();
    if (!room) return;
    if (isSupabaseConfigured()) {
      const tx = await api.payBank(room.id, playerId, amount, note);
      if (!tx) throw new Error('Operação recusada (saldo insuficiente)');
      await get().refreshRoomAndTransactions();
      return;
    }
    const player = room.players.find((p) => p.id === playerId);
    if (!player) return;
    const newTx: Transaction = { id: generateId(), timestamp: new Date(), fromId: playerId, toId: 'BANCO', fromName: player.name, toName: 'Banco', amount, note, type: 'player-to-bank' };
    const updated = room.players.map((p) => (p.id === playerId ? { ...p, balance: p.balance - amount } : p));
    set({ room: { ...room, players: updated }, transactions: [newTx, ...get().transactions] });
  },

  undoLastTransaction: async () => {
    const { room } = get();
    if (!room) return;
    if (isSupabaseConfigured()) {
      const tx = await api.undoLastTransaction(room.id);
      if (!tx) throw new Error('Não foi possível desfazer (apenas host ou nenhuma transação)');
      await get().refreshRoomAndTransactions();
      return;
    }
  },

  getPlayerById: (id) => get().room?.players.find((p) => p.id === id),
  toggleBankMode: () => set((s) => ({ bankModeEnabled: !s.bankModeEnabled })),
}));
