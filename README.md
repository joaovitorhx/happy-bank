# Banco Divertido

Jogo de mesa de dinheiro em tempo real: crie salas, convide por código ou QR, transfira valores entre jogadores e gerencie o banco. Moeda **BRL**, interface em **pt-BR**.

## Como rodar

```sh
# Instalar dependências
npm i

# Desenvolvimento (com hot reload)
npm run dev
```

O app sobe em `http://localhost:8080` (ou a porta indicada no terminal).

## Backend Supabase

O backend de salas, jogadores e transações está em **Supabase** (Postgres + RLS + RPC).

- **Variáveis de ambiente**: crie um `.env` na raiz com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (veja [supabase/README.md](supabase/README.md)).
- **Migrações e RPC**: em [supabase/README.md](supabase/README.md) estão o checklist de configuração, como rodar as migrações e exemplos de uso no frontend.

Sem Supabase configurado, o app entra em **modo demonstração** (dados só na memória).

## Stack

- **Vite** + **TypeScript** + **React**
- **Tailwind CSS** + **shadcn/ui** (Radix)
- **Zustand** (estado) + **React Router**
- **Supabase** (Auth anônimo, Realtime, RPC)
- **Framer Motion** (animações)

## Scripts

| Comando        | Descrição              |
|----------------|------------------------|
| `npm run dev`  | Servidor de desenvolvimento |
| `npm run build`| Build de produção      |
| `npm run preview` | Preview do build   |
| `npm run lint` | ESLint                |
| `npm run test` | Testes (Vitest)       |

## Deploy (Vercel)

1. Conecte o repositório ao [Vercel](https://vercel.com).
2. O projeto já está configurado: `vercel.json` com rewrites para SPA (todas as rotas em `/index.html`).
3. Em **Settings → Environment Variables** adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. Deploy: o build usa `npm run build` e a saída é a pasta `dist`.

Para outros provedores: gere o build com `npm run build` e sirva a pasta `dist`. Configure as variáveis de ambiente no painel.
