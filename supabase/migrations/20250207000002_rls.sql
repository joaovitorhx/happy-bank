-- Banco Divertido – RLS (Row Level Security)
-- Migração 002: políticas de leitura/escrita por tabela

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- PROFILES: usuário pode ler todos (nomes/avatars na sala), editar só o próprio
-- ---------------------------------------------------------------------------
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- ---------------------------------------------------------------------------
-- ROOMS: usuário só vê salas em que participa (room_players); escrita via RPC
-- ---------------------------------------------------------------------------
CREATE POLICY "rooms_select_member"
  ON public.rooms FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.room_players rp
      WHERE rp.room_id = rooms.id AND rp.profile_id = auth.uid()
    )
  );

-- Sem políticas de INSERT/UPDATE/DELETE: uso exclusivo via RPC (SECURITY DEFINER)

-- ---------------------------------------------------------------------------
-- ROOM_PLAYERS: usuário só vê jogadores das salas em que participa; escrita via RPC
-- ---------------------------------------------------------------------------
CREATE POLICY "room_players_select_member"
  ON public.room_players FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.room_players rp
      WHERE rp.room_id = room_players.room_id AND rp.profile_id = auth.uid()
    )
  );

-- Sem políticas de INSERT/UPDATE/DELETE: saldos e membros só mudam via RPC

-- ---------------------------------------------------------------------------
-- TRANSACTIONS: usuário só vê transações das salas em que participa; escrita via RPC
-- ---------------------------------------------------------------------------
CREATE POLICY "transactions_select_member"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.room_players rp
      WHERE rp.room_id = transactions.room_id AND rp.profile_id = auth.uid()
    )
  );

-- Sem políticas de INSERT/UPDATE/DELETE: transações só via RPC
