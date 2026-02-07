-- Banco Divertido – Corrige recursão infinita nas políticas RLS
-- As políticas que faziam EXISTS (SELECT ... FROM room_players) disparavam
-- RLS em room_players de novo, causando recursão. Usamos uma função
-- SECURITY DEFINER que lê room_players sem passar por RLS.

CREATE OR REPLACE FUNCTION public.is_room_member(p_room_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_players rp
    WHERE rp.room_id = p_room_id AND rp.profile_id = auth.uid()
  );
$$;

-- Substituir políticas que referenciam room_players pela função
DROP POLICY IF EXISTS "rooms_select_member" ON public.rooms;
CREATE POLICY "rooms_select_member"
  ON public.rooms FOR SELECT
  TO authenticated
  USING (public.is_room_member(id));

DROP POLICY IF EXISTS "room_players_select_member" ON public.room_players;
CREATE POLICY "room_players_select_member"
  ON public.room_players FOR SELECT
  TO authenticated
  USING (public.is_room_member(room_id));

DROP POLICY IF EXISTS "transactions_select_member" ON public.transactions;
CREATE POLICY "transactions_select_member"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (public.is_room_member(room_id));
