// Game Types for Board Game Banking App

export interface Player {
  id: string;
  name: string;
  avatar: string;
  balance: number;
  isHost: boolean;
  isMe: boolean;
}

export interface Room {
  id: string;
  name: string;
  code: string;
  initialMoney: number;
  maxPlayers: number;
  players: Player[];
  isStarted: boolean;
}

export interface Transaction {
  id: string;
  timestamp: Date;
  fromId: string | 'BANCO';
  toId: string | 'BANCO';
  fromName: string;
  toName: string;
  amount: number;
  note?: string;
  type: 'player-to-player' | 'player-to-bank' | 'bank-to-player';
}

export type TransactionFilter = 'all' | 'players' | 'bank';

export interface GameState {
  currentPlayer: Player | null;
  room: Room | null;
  transactions: Transaction[];
  bankModeEnabled: boolean;
}

// Avatar options
export const AVATARS = [
  '🎩', '🚗', '🐕', '🚢', '👢', '🎿',
  '💎', '🏠', '🎲', '💰', '🎯', '🏆',
  '🦊', '🦁', '🐸', '🦄', '🐷', '🦋',
];

// Quick amount chips em transferir / receber banco / pagar banco (valores a partir de 100)
export const QUICK_AMOUNTS = [
  { value: 100, label: '+100' },
  { value: 500, label: '+500' },
  { value: 1000, label: '+1k' },
  { value: 10000, label: '+10k' },
  { value: 100000, label: '+100k' },
  { value: 1000000, label: '+1M' },
];
