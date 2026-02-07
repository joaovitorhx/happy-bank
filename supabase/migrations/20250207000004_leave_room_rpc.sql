-- Banco Divertido – RPC leave_room (marca jogador como inativo)
-- Migração 004

CREATE OR REPLACE FUNCTION public.leave_room(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
BEGIN
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  UPDATE public.room_players
  SET is_active = false
  WHERE room_id = p_room_id AND profile_id = v_profile_id;
END;
$$;
