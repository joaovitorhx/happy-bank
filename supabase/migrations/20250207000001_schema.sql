-- Banco Divertido – Schema (BRL, pt-BR)
-- Migração 001: tabelas, constraints, índices

-- Extensão para UUID (já existe no Supabase, mas garantimos)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- PROFILES (vinculado ao auth.uid() no frontend/Supabase Auth)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'Perfil do usuário; id deve ser igual a auth.uid() após login.';

-- ---------------------------------------------------------------------------
-- ROOMS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL CHECK (char_length(code) = 6),
  name text NOT NULL,
  initial_balance numeric NOT NULL CHECK (initial_balance >= 0),
  max_players int NOT NULL DEFAULT 8 CHECK (max_players >= 2 AND max_players <= 20),
  host_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'in_game', 'ended')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_rooms_code ON public.rooms (code);
CREATE INDEX IF NOT EXISTS idx_rooms_host_id ON public.rooms (host_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms (status);

-- Garantir código com 6 caracteres (validação adicional na aplicação/RPC)
COMMENT ON COLUMN public.rooms.code IS 'Código único da sala (6 caracteres).';

-- ---------------------------------------------------------------------------
-- ROOM_PLAYERS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance numeric NOT NULL DEFAULT 0 CHECK (balance >= 0),
  joined_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE (room_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_room_players_room_id ON public.room_players (room_id);
CREATE INDEX IF NOT EXISTS idx_room_players_profile_id ON public.room_players (profile_id);
CREATE INDEX IF NOT EXISTS idx_room_players_room_profile ON public.room_players (room_id, profile_id);

-- ---------------------------------------------------------------------------
-- TRANSACTIONS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL CHECK (type IN ('p2p', 'pay_bank', 'receive_bank', 'adjustment', 'initial', 'undo')),
  from_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  to_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  note text,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  original_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_room_id ON public.transactions (room_id);
CREATE INDEX IF NOT EXISTS idx_transactions_room_created ON public.transactions (room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_original ON public.transactions (original_transaction_id);

-- ---------------------------------------------------------------------------
-- Trigger: criar perfil ao criar usuário no Auth (Supabase)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
