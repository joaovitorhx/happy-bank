-- Habilita Realtime para as tabelas usadas pelo app (lista de jogadores, status da sala, transações).
-- Se alguma tabela já estiver na publicação, ignore o erro ou adicione só as que faltam pelo Dashboard:
-- Database → Replication → supabase_realtime → marque rooms, room_players, transactions.

ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
