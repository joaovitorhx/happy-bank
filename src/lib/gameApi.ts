/**
 * API do backend Supabase: RPCs + fetch de sala/jogadores/transações + realtime.
 * Moeda BRL, pt-BR.
 */
import { supabase } from '@/lib/supabase';
import { BANK_LABEL } from '@/constants/bank';
import type { Room, Player, Transaction } from '@/types/game';

// Tipos das linhas do banco (apenas o que usamos)
interface DbProfile {
  id: string;
  name: string | null;
  avatar_url: string | null;
}
interface DbRoom {
  id: string;
  code: string;
  name: string;
  initial_balance: number;
  max_players: number;
  host_id: string;
  status: string;
}
interface DbRoomPlayer {
  id: string;
  room_id: string;
  profile_id: string;
  balance: number;
  is_active: boolean;
}
interface DbTransaction {
  id: string;
  room_id: string;
  created_at: string;
  type: string;
  from_profile_id: string | null;
  to_profile_id: string | null;
  amount: number;
  note: string | null;
  original_transaction_id: string | null;
}

const BANCO = 'BANCO' as const; // id; display name from BANK_LABEL

function profileToAvatar(avatarUrl: string | null): string {
  if (!avatarUrl) return '👤';
  if (avatarUrl.startsWith('http')) return '👤';
  return avatarUrl;
}

export async function getCurrentUserId(): Promise<string | null> {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function getCurrentProfile(): Promise<DbProfile | null> {
  if (!supabase) return null;
  const uid = await getCurrentUserId();
  if (!uid) return null;
  const { data } = await supabase.from('profiles').select('id, name, avatar_url').eq('id', uid).single();
  return data as DbProfile | null;
}

/** Atualiza nome e avatar do perfil atual (para sessão anônima). */
export async function updateProfile(name: string, avatarUrl: string): Promise<void> {
  if (!supabase) return;
  const uid = await getCurrentUserId();
  if (!uid) throw new Error('Sessão não encontrada');
  const { error } = await supabase.from('profiles').update({ name: name.trim(), avatar_url: avatarUrl }).eq('id', uid);
  if (error) throw new Error(error.message || 'Não foi possível salvar o perfil');
}

function mapToPlayer(
  rp: DbRoomPlayer & { profile?: DbProfile | null },
  room: DbRoom,
  currentUserId: string | null
): Player {
  const profile = rp.profile;
  return {
    id: rp.profile_id,
    name: profile?.name ?? 'Jogador',
    avatar: profile?.avatar_url ? profileToAvatar(profile.avatar_url) : '👤',
    balance: Number(rp.balance),
    isHost: room.host_id === rp.profile_id,
    isMe: rp.profile_id === currentUserId,
  };
}

function mapToRoom(dbRoom: DbRoom, players: Player[]): Room {
  return {
    id: dbRoom.id,
    name: dbRoom.name,
    code: dbRoom.code,
    initialMoney: Number(dbRoom.initial_balance),
    maxPlayers: dbRoom.max_players,
    players,
    isStarted: dbRoom.status === 'in_game',
  };
}

async function fetchProfilesMap(profileIds: string[]): Promise<Map<string, DbProfile>> {
  if (!supabase || profileIds.length === 0) return new Map();
  const unique = [...new Set(profileIds)];
  const { data } = await supabase.from('profiles').select('id, name, avatar_url').in('id', unique);
  const map = new Map<string, DbProfile>();
  (data ?? []).forEach((p: DbProfile) => map.set(p.id, p));
  return map;
}

function txTypeToFrontend(type: string): Transaction['type'] {
  if (type === 'p2p') return 'player-to-player';
  if (type === 'pay_bank') return 'player-to-bank';
  if (type === 'receive_bank' || type === 'initial' || type === 'undo') return 'bank-to-player';
  return 'player-to-player';
}

function mapToTransaction(
  tx: DbTransaction,
  profilesMap: Map<string, DbProfile>
): Transaction {
  const fromId = tx.from_profile_id ?? BANCO;
  const toId = tx.to_profile_id ?? BANCO;
  const fromName = fromId === BANCO ? BANK_LABEL : (profilesMap.get(fromId)?.name ?? 'Jogador');
  const toName = toId === BANCO ? BANK_LABEL : (profilesMap.get(toId)?.name ?? 'Jogador');
  return {
    id: tx.id,
    timestamp: new Date(tx.created_at),
    fromId,
    toId,
    fromName,
    toName,
    amount: Number(tx.amount),
    note: tx.note ?? undefined,
    type: txTypeToFrontend(tx.type),
  };
}

/** Busca sala + jogadores (com perfis) e mapeia para Room + Player[]. */
export async function fetchRoomWithPlayers(
  roomId: string,
  currentUserId: string | null
): Promise<{ room: Room; players: Player[] } | null> {
  if (!supabase) return null;
  const { data: dbRoom, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();
  if (roomError || !dbRoom) return null;

  const { data: roomPlayers, error: rpError } = await supabase
    .from('room_players')
    .select('*')
    .eq('room_id', roomId)
    .eq('is_active', true);
  if (rpError) return null;

  const profileIds = (roomPlayers ?? []).map((rp: DbRoomPlayer) => rp.profile_id);
  const profilesMap = await fetchProfilesMap(profileIds);

  const players: Player[] = (roomPlayers ?? []).map((rp: DbRoomPlayer) =>
    mapToPlayer(
      { ...rp, profile: profilesMap.get(rp.profile_id) ?? null },
      dbRoom as DbRoom,
      currentUserId
    )
  );
  const room = mapToRoom(dbRoom as DbRoom, players);
  return { room, players };
}

/** Busca transações da sala e mapeia para Transaction[] (com nomes dos perfis). */
export async function fetchTransactions(roomId: string): Promise<Transaction[]> {
  if (!supabase) return [];
  const { data: rows, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: false });
  if (error || !rows) return [];

  const profileIds = new Set<string>();
  (rows as DbTransaction[]).forEach((t) => {
    if (t.from_profile_id) profileIds.add(t.from_profile_id);
    if (t.to_profile_id) profileIds.add(t.to_profile_id);
  });
  const profilesMap = await fetchProfilesMap([...profileIds]);
  return (rows as DbTransaction[]).map((t) => mapToTransaction(t, profilesMap));
}

// --- RPCs ---

export async function createRoom(
  name: string,
  initialBalance: number,
  maxPlayers: number
): Promise<Room | null> {
  if (!supabase) return null;
  const { data: dbRoom, error } = await supabase.rpc('create_room', {
    p_name: name,
    p_initial_balance: initialBalance,
    p_max_players: maxPlayers,
  });
  if (error || !dbRoom) return null;
  const uid = await getCurrentUserId();
  return fetchRoomWithPlayers(dbRoom.id, uid).then((r) => r?.room ?? null);
}

export async function joinRoomByCode(code: string): Promise<Room | null> {
  if (!supabase) return null;
  const { data: dbRoom, error } = await supabase.rpc('join_room_by_code', {
    p_code: code.trim().toUpperCase().slice(0, 6),
  });
  if (error || !dbRoom) return null;
  const uid = await getCurrentUserId();
  return fetchRoomWithPlayers(dbRoom.id, uid).then((r) => r?.room ?? null);
}

export async function startGame(roomId: string): Promise<void> {
  if (!supabase) return;
  await supabase.rpc('start_game', { p_room_id: roomId });
}

export async function transferP2p(
  roomId: string,
  fromProfileId: string,
  toProfileId: string,
  amount: number,
  note?: string
): Promise<Transaction | null> {
  if (!supabase) return null;
  const { data: tx, error } = await supabase.rpc('transfer_p2p', {
    p_room_id: roomId,
    p_from_profile_id: fromProfileId,
    p_to_profile_id: toProfileId,
    p_amount: amount,
    p_note: note ?? null,
  });
  if (error || !tx) return null;
  const profilesMap = await fetchProfilesMap([fromProfileId, toProfileId]);
  return mapToTransaction(tx as DbTransaction, profilesMap);
}

export async function payBank(
  roomId: string,
  fromProfileId: string,
  amount: number,
  note?: string
): Promise<Transaction | null> {
  if (!supabase) return null;
  const { data: tx, error } = await supabase.rpc('pay_bank', {
    p_room_id: roomId,
    p_from_profile_id: fromProfileId,
    p_amount: amount,
    p_note: note ?? null,
  });
  if (error || !tx) return null;
  const profilesMap = await fetchProfilesMap([fromProfileId]);
  return mapToTransaction(tx as DbTransaction, profilesMap);
}

export async function receiveBank(
  roomId: string,
  toProfileId: string,
  amount: number,
  note?: string
): Promise<Transaction | null> {
  if (!supabase) return null;
  const { data: tx, error } = await supabase.rpc('receive_bank', {
    p_room_id: roomId,
    p_to_profile_id: toProfileId,
    p_amount: amount,
    p_note: note ?? null,
  });
  if (error || !tx) return null;
  const profilesMap = await fetchProfilesMap([toProfileId]);
  return mapToTransaction(tx as DbTransaction, profilesMap);
}

export async function undoLastTransaction(roomId: string): Promise<Transaction | null> {
  if (!supabase) return null;
  const { data: tx, error } = await supabase.rpc('undo_last_transaction', {
    p_room_id: roomId,
  });
  if (error || !tx) return null;
  const t = tx as DbTransaction;
  const ids = [t.from_profile_id, t.to_profile_id].filter(Boolean) as string[];
  const profilesMap = await fetchProfilesMap(ids);
  return mapToTransaction(t, profilesMap);
}

/** Marca o jogador atual como inativo na sala (Sair da sala). */
export async function leaveRoom(roomId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc('leave_room', { p_room_id: roomId });
  if (error) throw new Error(error.message || 'Não foi possível sair da sala');
}

/** Tenta entrar/reentrar na sala pelo código. Retorna dados para a store ou lança com mensagem em português. */
export async function tryRejoinByCode(code: string): Promise<{
  room: Room;
  players: Player[];
  transactions: Transaction[];
}> {
  if (!supabase) throw new Error('Backend não configurado');
  const uid = await getCurrentUserId();
  if (!uid) throw new Error('Sessão não encontrada. Tente novamente.');

  const { data: dbRoom, error } = await supabase.rpc('join_room_by_code', {
    p_code: code.trim().toUpperCase().slice(0, 6),
  });

  if (error) {
    const msg = error.message || '';
    if (msg.includes('não encontrada') || msg.includes('não está no lobby') || msg.includes('já iniciada'))
      throw new Error('Sala não encontrada ou partida já encerrada.');
    throw new Error(msg);
  }
  if (!dbRoom) throw new Error('Sala não encontrada ou partida já encerrada.');

  const data = await fetchRoomWithPlayers(dbRoom.id, uid);
  if (!data) throw new Error('Não foi possível carregar a sala.');
  const transactions = data.room.isStarted ? await fetchTransactions(dbRoom.id) : [];
  return { room: data.room, players: data.players, transactions };
}

/** Inscreve em mudanças de rooms, room_players e transactions da sala (realtime). Retorna função para cancelar. */
export function subscribeToRoom(
  roomId: string,
  callbacks: {
    onRoom?: () => void;
    onPlayers?: () => void;
    onTransactions?: () => void;
  }
): () => void {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
      () => callbacks.onRoom?.()
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
      () => callbacks.onPlayers?.()
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'transactions', filter: `room_id=eq.${roomId}` },
      () => callbacks.onTransactions?.()
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'transactions', filter: `room_id=eq.${roomId}` },
      () => callbacks.onTransactions?.()
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
