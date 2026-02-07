-- Banco Divertido – RPC (funções atômicas plpgsql)
-- Migração 003: criar sala, entrar, iniciar jogo, transferências, desfazer

-- ---------------------------------------------------------------------------
-- Auxiliar: gera código de 6 caracteres (estilo do frontend)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_room_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- ---------------------------------------------------------------------------
-- create_room(name, initial_balance, max_players)
-- Retorna a sala criada com code; cria host como room_player.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_room(
  p_name text,
  p_initial_balance numeric,
  p_max_players int DEFAULT 8
)
RETURNS public.rooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host_id uuid := auth.uid();
  v_room_id uuid;
  v_code text;
  v_attempt int := 0;
  v_room public.rooms;
BEGIN
  IF v_host_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF p_initial_balance IS NULL OR p_initial_balance < 0 THEN
    RAISE EXCEPTION 'initial_balance deve ser >= 0';
  END IF;
  IF p_max_players IS NULL OR p_max_players < 2 OR p_max_players > 20 THEN
    RAISE EXCEPTION 'max_players deve ser entre 2 e 20';
  END IF;

  LOOP
    v_code := public.generate_room_code();
    BEGIN
      INSERT INTO public.rooms (code, name, initial_balance, max_players, host_id, status)
      VALUES (v_code, p_name, p_initial_balance, p_max_players, v_host_id, 'lobby')
      RETURNING id INTO v_room_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_attempt := v_attempt + 1;
      IF v_attempt >= 10 THEN
        RAISE EXCEPTION 'Não foi possível gerar código único';
      END IF;
    END;
  END LOOP;

  INSERT INTO public.room_players (room_id, profile_id, balance)
  VALUES (v_room_id, v_host_id, 0);

  SELECT * INTO v_room FROM public.rooms WHERE id = v_room_id;
  RETURN v_room;
END;
$$;

-- ---------------------------------------------------------------------------
-- join_room_by_code(code)
-- Lobby e não cheia: insere room_player e retorna sala.
-- in_game: só permite rejoin se já existir room_players para este profile_id.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.join_room_by_code(p_code text)
RETURNS public.rooms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile_id uuid := auth.uid();
  v_room public.rooms;
  v_exists boolean;
BEGIN
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO v_room FROM public.rooms WHERE code = upper(trim(p_code));
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sala não encontrada';
  END IF;

  IF v_room.status = 'in_game' THEN
    -- Rejoin: só se já estiver em room_players
    SELECT EXISTS (
      SELECT 1 FROM public.room_players
      WHERE room_id = v_room.id AND profile_id = v_profile_id
    ) INTO v_exists;
    IF NOT v_exists THEN
      RAISE EXCEPTION 'Partida já iniciada; novos jogadores não podem entrar';
    END IF;
    UPDATE public.room_players SET is_active = true
    WHERE room_id = v_room.id AND profile_id = v_profile_id;
    RETURN v_room;
  END IF;

  IF v_room.status <> 'lobby' THEN
    RAISE EXCEPTION 'Sala não está no lobby';
  END IF;

  IF (SELECT count(*) FROM public.room_players WHERE room_id = v_room.id) >= v_room.max_players THEN
    RAISE EXCEPTION 'Sala cheia';
  END IF;

  INSERT INTO public.room_players (room_id, profile_id, balance)
  VALUES (v_room.id, v_profile_id, 0)
  ON CONFLICT (room_id, profile_id) DO UPDATE SET is_active = true;

  RETURN v_room;
END;
$$;

-- ---------------------------------------------------------------------------
-- start_game(room_id) – apenas host; status -> in_game, balances = initial_balance, tx 'initial' por jogador
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.start_game(p_room_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.rooms;
  v_host_id uuid := auth.uid();
  r record;
BEGIN
  IF v_host_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sala não encontrada';
  END IF;
  IF v_room.host_id <> v_host_id THEN
    RAISE EXCEPTION 'Apenas o host pode iniciar o jogo';
  END IF;
  IF v_room.status <> 'lobby' THEN
    RAISE EXCEPTION 'Jogo já iniciado ou sala encerrada';
  END IF;

  UPDATE public.rooms SET status = 'in_game' WHERE id = p_room_id;

  UPDATE public.room_players
  SET balance = v_room.initial_balance
  WHERE room_id = p_room_id;

  FOR r IN SELECT id, profile_id FROM public.room_players WHERE room_id = p_room_id
  LOOP
    INSERT INTO public.transactions (room_id, type, from_profile_id, to_profile_id, amount, created_by)
    VALUES (p_room_id, 'initial', NULL, r.profile_id, v_room.initial_balance, v_host_id);
  END LOOP;
END;
$$;

-- ---------------------------------------------------------------------------
-- transfer_p2p(room_id, from_profile_id, to_profile_id, amount, note)
-- Valida sala in_game, membros, saldo >= amount, bloqueia saldo negativo.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transfer_p2p(
  p_room_id uuid,
  p_from_profile_id uuid,
  p_to_profile_id uuid,
  p_amount numeric,
  p_note text DEFAULT NULL
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.rooms;
  v_caller uuid := auth.uid();
  v_from_balance numeric;
  v_tx public.transactions;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero';
  END IF;
  IF p_from_profile_id = p_to_profile_id THEN
    RAISE EXCEPTION 'Origem e destino não podem ser iguais';
  END IF;

  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sala não encontrada';
  END IF;
  IF v_room.status <> 'in_game' THEN
    RAISE EXCEPTION 'Partida não está em andamento';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.room_players WHERE room_id = p_room_id AND profile_id = v_caller) THEN
    RAISE EXCEPTION 'Você não está nesta sala';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.room_players WHERE room_id = p_room_id AND profile_id = p_from_profile_id) THEN
    RAISE EXCEPTION 'Remetente não está na sala';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.room_players WHERE room_id = p_room_id AND profile_id = p_to_profile_id) THEN
    RAISE EXCEPTION 'Destinatário não está na sala';
  END IF;

  SELECT balance INTO v_from_balance FROM public.room_players
  WHERE room_id = p_room_id AND profile_id = p_from_profile_id
  FOR UPDATE;

  IF v_from_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente (não é permitido saldo negativo)';
  END IF;

  UPDATE public.room_players SET balance = balance - p_amount
  WHERE room_id = p_room_id AND profile_id = p_from_profile_id;

  UPDATE public.room_players SET balance = balance + p_amount
  WHERE room_id = p_room_id AND profile_id = p_to_profile_id;

  INSERT INTO public.transactions (room_id, type, from_profile_id, to_profile_id, amount, note, created_by)
  VALUES (p_room_id, 'p2p', p_from_profile_id, p_to_profile_id, p_amount, p_note, v_caller)
  RETURNING * INTO v_tx;

  RETURN v_tx;
END;
$$;

-- ---------------------------------------------------------------------------
-- pay_bank(room_id, from_profile_id, amount, note) – jogador paga ao banco (infinito)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.pay_bank(
  p_room_id uuid,
  p_from_profile_id uuid,
  p_amount numeric,
  p_note text DEFAULT NULL
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.rooms;
  v_caller uuid := auth.uid();
  v_from_balance numeric;
  v_tx public.transactions;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero';
  END IF;

  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sala não encontrada';
  END IF;
  IF v_room.status <> 'in_game' THEN
    RAISE EXCEPTION 'Partida não está em andamento';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.room_players WHERE room_id = p_room_id AND profile_id = v_caller) THEN
    RAISE EXCEPTION 'Você não está nesta sala';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.room_players WHERE room_id = p_room_id AND profile_id = p_from_profile_id) THEN
    RAISE EXCEPTION 'Jogador não está na sala';
  END IF;

  SELECT balance INTO v_from_balance FROM public.room_players
  WHERE room_id = p_room_id AND profile_id = p_from_profile_id
  FOR UPDATE;

  IF v_from_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente (não é permitido saldo negativo)';
  END IF;

  UPDATE public.room_players SET balance = balance - p_amount
  WHERE room_id = p_room_id AND profile_id = p_from_profile_id;

  INSERT INTO public.transactions (room_id, type, from_profile_id, to_profile_id, amount, note, created_by)
  VALUES (p_room_id, 'pay_bank', p_from_profile_id, NULL, p_amount, p_note, v_caller)
  RETURNING * INTO v_tx;

  RETURN v_tx;
END;
$$;

-- ---------------------------------------------------------------------------
-- receive_bank(room_id, to_profile_id, amount, note) – banco paga ao jogador (banco infinito)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.receive_bank(
  p_room_id uuid,
  p_to_profile_id uuid,
  p_amount numeric,
  p_note text DEFAULT NULL
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.rooms;
  v_caller uuid := auth.uid();
  v_tx public.transactions;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero';
  END IF;

  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sala não encontrada';
  END IF;
  IF v_room.status <> 'in_game' THEN
    RAISE EXCEPTION 'Partida não está em andamento';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.room_players WHERE room_id = p_room_id AND profile_id = v_caller) THEN
    RAISE EXCEPTION 'Você não está nesta sala';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.room_players WHERE room_id = p_room_id AND profile_id = p_to_profile_id) THEN
    RAISE EXCEPTION 'Jogador não está na sala';
  END IF;

  UPDATE public.room_players SET balance = balance + p_amount
  WHERE room_id = p_room_id AND profile_id = p_to_profile_id;

  INSERT INTO public.transactions (room_id, type, from_profile_id, to_profile_id, amount, note, created_by)
  VALUES (p_room_id, 'receive_bank', NULL, p_to_profile_id, p_amount, p_note, v_caller)
  RETURNING * INTO v_tx;

  RETURN v_tx;
END;
$$;

-- ---------------------------------------------------------------------------
-- undo_last_transaction(room_id) – apenas host; cria tx compensatória (type 'undo'), nunca deleta
-- Respeita regra de saldo não negativo.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.undo_last_transaction(p_room_id uuid)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room public.rooms;
  v_host_id uuid := auth.uid();
  v_last public.transactions;
  v_from_balance numeric;
  v_to_balance numeric;
  v_comp public.transactions;
BEGIN
  IF v_host_id IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sala não encontrada';
  END IF;
  IF v_room.host_id <> v_host_id THEN
    RAISE EXCEPTION 'Apenas o host pode desfazer a última transação';
  END IF;
  IF v_room.status <> 'in_game' THEN
    RAISE EXCEPTION 'Partida não está em andamento';
  END IF;

  SELECT * INTO v_last FROM public.transactions
  WHERE room_id = p_room_id AND type <> 'undo'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nenhuma transação para desfazer';
  END IF;

  -- Transação do tipo 'undo' não é desfeita (evitar cadeia)
  IF v_last.type = 'undo' THEN
    RAISE EXCEPTION 'Não é possível desfazer uma transação de desfazer';
  END IF;

  CASE v_last.type
    WHEN 'p2p' THEN
      -- Reverter: to devolve para from (to deve ter saldo >= v_last.amount)
      SELECT balance INTO v_to_balance FROM public.room_players
      WHERE room_id = p_room_id AND profile_id = v_last.to_profile_id
      FOR UPDATE;
      IF v_to_balance < v_last.amount THEN
        RAISE EXCEPTION 'Desfazer geraria saldo negativo para o destinatário';
      END IF;
      UPDATE public.room_players SET balance = balance + v_last.amount
      WHERE room_id = p_room_id AND profile_id = v_last.from_profile_id;
      UPDATE public.room_players SET balance = balance - v_last.amount
      WHERE room_id = p_room_id AND profile_id = v_last.to_profile_id;
      INSERT INTO public.transactions (room_id, type, from_profile_id, to_profile_id, amount, note, created_by, original_transaction_id)
      VALUES (p_room_id, 'undo', v_last.to_profile_id, v_last.from_profile_id, v_last.amount, 'Desfazer: ' || COALESCE(v_last.note, ''), v_host_id, v_last.id)
      RETURNING * INTO v_comp;

    WHEN 'pay_bank' THEN
      -- Reverter: devolver valor ao from (receive_bank inverso)
      UPDATE public.room_players SET balance = balance + v_last.amount
      WHERE room_id = p_room_id AND profile_id = v_last.from_profile_id;
      INSERT INTO public.transactions (room_id, type, from_profile_id, to_profile_id, amount, note, created_by, original_transaction_id)
      VALUES (p_room_id, 'undo', NULL, v_last.from_profile_id, v_last.amount, 'Desfazer pagamento ao banco: ' || COALESCE(v_last.note, ''), v_host_id, v_last.id)
      RETURNING * INTO v_comp;

    WHEN 'receive_bank' THEN
      -- Reverter: tirar valor do to (pay_bank inverso); to deve ter saldo >= amount
      SELECT balance INTO v_to_balance FROM public.room_players
      WHERE room_id = p_room_id AND profile_id = v_last.to_profile_id
      FOR UPDATE;
      IF v_to_balance < v_last.amount THEN
        RAISE EXCEPTION 'Desfazer geraria saldo negativo (jogador já gastou o valor recebido)';
      END IF;
      UPDATE public.room_players SET balance = balance - v_last.amount
      WHERE room_id = p_room_id AND profile_id = v_last.to_profile_id;
      INSERT INTO public.transactions (room_id, type, from_profile_id, to_profile_id, amount, note, created_by, original_transaction_id)
      VALUES (p_room_id, 'undo', v_last.to_profile_id, NULL, v_last.amount, 'Desfazer recebimento do banco: ' || COALESCE(v_last.note, ''), v_host_id, v_last.id)
      RETURNING * INTO v_comp;

    WHEN 'initial' THEN
      -- Reverter: tirar initial_balance do to_profile; só permitir se saldo >= initial_balance
      SELECT balance INTO v_to_balance FROM public.room_players
      WHERE room_id = p_room_id AND profile_id = v_last.to_profile_id
      FOR UPDATE;
      IF v_to_balance < v_last.amount THEN
        RAISE EXCEPTION 'Desfazer saldo inicial geraria saldo negativo';
      END IF;
      UPDATE public.room_players SET balance = balance - v_last.amount
      WHERE room_id = p_room_id AND profile_id = v_last.to_profile_id;
      INSERT INTO public.transactions (room_id, type, from_profile_id, to_profile_id, amount, note, created_by, original_transaction_id)
      VALUES (p_room_id, 'undo', v_last.to_profile_id, NULL, v_last.amount, 'Desfazer saldo inicial', v_host_id, v_last.id)
      RETURNING * INTO v_comp;

    ELSE
      RAISE EXCEPTION 'Tipo de transação não suportado para desfazer: %', v_last.type;
  END CASE;

  RETURN v_comp;
END;
$$;
