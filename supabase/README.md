# Backend Supabase – Banco Divertido

Moeda: **BRL**. UI: **pt-BR**.

## Checklist para o app usar o Supabase (e não dados mockados)

1. **Variáveis de ambiente**  
   Crie um arquivo `.env` na raiz do projeto com:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-anon-key
   ```
   (Use os valores do Dashboard do Supabase → Project Settings → API.)

2. **Reiniciar o app**  
   O Vite lê o `.env` ao subir. Depois de criar ou alterar o `.env`, pare o servidor (`Ctrl+C`) e rode de novo: `npm run dev` (ou `yarn dev`).

3. **Login anônimo ativo**  
   No Supabase: **Authentication → Providers → Anonymous** deve estar **habilitado**.

4. **Migrações aplicadas**  
   As tabelas e RPCs precisam existir no projeto. Rode as migrações como abaixo.

5. **Realtime**  
   Para lista de jogadores, início do jogo e transações atualizarem em tempo real em todos os clientes, as tabelas `rooms`, `room_players` e `transactions` precisam estar na publicação Realtime. A migração `20250207000006_realtime_publication.sql` faz isso. Se der erro “already member of publication”, as tabelas já estão habilitadas (ex.: pelo Dashboard em **Database → Replication → supabase_realtime**).

Se algo disso faltar, o app entra em **modo demonstração**: as salas são só na memória (mock) e não aparecem no SQL do Supabase. Na tela “Escolher sala” aparece um aviso amarelo quando está em modo demonstração.

---

## Como rodar as migrações no Supabase

1. **Dashboard (SQL Editor)**  
   No [Supabase Dashboard](https://app.supabase.com) → seu projeto → **SQL Editor**, execute os arquivos **na ordem**:
   - `migrations/20250207000001_schema.sql`
   - `migrations/20250207000002_rls.sql`
   - `migrations/20250207000003_rpc.sql`
   - `migrations/20250207000004_leave_room_rpc.sql`
   - `migrations/20250207000005_fix_rls_recursion.sql`
   - `migrations/20250207000006_realtime_publication.sql`

2. **CLI (recomendado)**  
   Com [Supabase CLI](https://supabase.com/docs/guides/cli) instalado e linkado ao projeto:
   ```bash
   supabase db push
   ```
   Ou, para aplicar só estas migrações manualmente:
   ```bash
   psql $DATABASE_URL -f supabase/migrations/20250207000001_schema.sql
   psql $DATABASE_URL -f supabase/migrations/20250207000002_rls.sql
   psql $DATABASE_URL -f supabase/migrations/20250207000003_rpc.sql
   ```

## Uso no frontend

O app já integra as RPCs em:
- **Cliente**: `src/lib/supabase.ts` (cria o client só se `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estiverem definidos).
- **API**: `src/lib/gameApi.ts` (todas as RPCs + fetch de sala/jogadores/transações + `subscribeToRoom` para realtime).
- **Store**: `src/store/gameStore.ts` (chama a API quando Supabase está configurado; senão usa mock local).

Para usar o backend real: defina as variáveis de ambiente e garanta que o usuário esteja **autenticado** (`auth.uid()` é usado nas funções). Exemplo de chamadas (referência):

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Criar sala (host vira room_player)
const { data: room, error } = await supabase.rpc('create_room', {
  p_name: 'Sala do João',
  p_initial_balance: 15000,
  p_max_players: 8
})
// room: { id, code, name, initial_balance, max_players, host_id, status, ... }

// Entrar por código (lobby: novo jogador; in_game: só rejoin se já estiver em room_players)
const { data: room, error } = await supabase.rpc('join_room_by_code', {
  p_code: 'ABC123'
})

// Iniciar jogo (apenas host)
const { error } = await supabase.rpc('start_game', { p_room_id: roomId })

// Transferência P2P (quem paga é o usuário logado; validado no backend)
const { data: tx, error } = await supabase.rpc('transfer_p2p', {
  p_room_id: roomId,
  p_from_profile_id: myProfileId,
  p_to_profile_id: otherProfileId,
  p_amount: 500,
  p_note: 'Aluguel'
})

// Pagar ao banco
const { data: tx, error } = await supabase.rpc('pay_bank', {
  p_room_id: roomId,
  p_from_profile_id: myProfileId,
  p_amount: 200,
  p_note: 'Imposto'
})

// Receber do banco
const { data: tx, error } = await supabase.rpc('receive_bank', {
  p_room_id: roomId,
  p_to_profile_id: myProfileId,
  p_amount: 1000,
  p_note: 'Salário'
})

// Desfazer última transação (apenas host)
const { data: compensatingTx, error } = await supabase.rpc('undo_last_transaction', {
  p_room_id: roomId
})
```

## Dados em tempo real (opcional)

Para refletir saldos e transações na UI sem recarregar:

```typescript
// Sala e jogadores da sala
supabase
  .channel('room')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` }, payload => { /* atualizar estado */ })
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions', filter: `room_id=eq.${roomId}` }, payload => { /* adicionar tx */ })
  .subscribe()
```

## Regras de negócio (resumo)

- **Saldo nunca negativo**: qualquer operação que debite de um jogador é bloqueada se o saldo ficaria &lt; 0.
- **Banco infinito**: qualquer jogador pode “Receber do banco” e “Pagar ao banco”.
- **Entrada na sala**: se `status = 'in_game'`, só é permitido **rejoin** (já ter linha em `room_players`); novos jogadores não entram.
- **Desfazer**: apenas host; gera transação compensatória (`type = 'undo'`, `original_transaction_id` preenchido); nunca remove linhas.
- **Escrita em saldos/transações**: apenas via RPC; RLS impede insert/update/delete direto nessas tabelas pelo client.

---

## Realtime e limpeza de subscriptions

- O front inscreve em **room_players** e **transactions** da sala atual via Supabase Realtime (`subscribeToRoom(roomId, callbacks)`).
- O hook `useRoomRealtime(roomId)` chama `refreshRoomAndTransactions` nos callbacks, atualizando ranking (ordenado por saldo) e feed de transações (mais recentes primeiro).
- **Limpeza**: o `useEffect` retorna `() => unsubscribe()`, então:
  - ao desmontar a tela (lobby ou game), a subscription é removida (`supabase.removeChannel`);
  - ao trocar de sala (`roomId` muda), o cleanup do effect anterior roda e em seguida uma nova subscription é criada para o novo `roomId`.
- Assim não há vazamento de memória nem callbacks rodando para salas antigas.

## Validação de segurança do QR de pagamento

- **Schema**: só são aceitos links no formato `bankgame://pay?v=1&room=CODE&to=UUID` (e fallback `https://.../pay?...`). `amount` e `note` são opcionais.
- **Validação**: `parsePayUrl` exige `v=1`, `room` com 6 caracteres, `to` como UUID; `amount` numérico ≥ 0 se presente.
- **Sala**: antes de abrir o modal de transferência, o app verifica se a sala existe (join/rejoin via RPC). Em **lobby** permite entrar; em **in_game** só rejoin (já estar em `room_players`).
- **Destinatário**: na tela do jogo, o QR só abre transferência se o `to` for um jogador da sala atual; caso contrário mostra erro em português.

## Autenticação anônima (guest)

O app usa **sessão anônima** do Supabase (sem e-mail/senha). No Dashboard: **Authentication → Providers → Anonymous** deve estar **habilitado**. Ao abrir o app, é feita `signInAnonymously()`; o perfil é criado pelo trigger em `auth.users` e o `profile_id` é o `auth.uid()`.

## Estado persistido e restaurado

- **localStorage**
  - `banco_divertido_last_room_code`: último código de sala (6 caracteres). Definido ao criar ou entrar na sala; removido ao sair da sala ou quando o auto-rejoin falha.
  - `banco_divertido_profile_id`: cópia do `auth.uid()` após login anônimo (referência local).
- **Supabase**
  - Sessão anônima é persistida pelo cliente Supabase (localStorage).
  - Perfil: `profiles` (id = auth.uid(), name, avatar_url) atualizado ao salvar na tela de perfil.
  - Sala/jogadores/transações: sempre lidos do backend quando Supabase está configurado; realtime atualiza saldos e lista de transações.
- **Auto-rejoin na abertura**
  - Se existir `last_room_code` e sessão ativa, o app chama `join_room_by_code`:
    - **lobby**: entra (ou reentra) e navega para `/lobby`.
    - **in_game**: só permite se já existir linha em `room_players` (rejoin); então navega para `/game`.
  - Se a sala não existir, partida tiver acabado ou o usuário for novo em partida em andamento, é exibido o modal “Sala não disponível” e o `last_room_code` é removido.
