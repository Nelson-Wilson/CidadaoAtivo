# Publicar o Cidadão Ativo na Vercel com Supabase

## 1. Supabase (base de dados e fotos)

1. Crie um projeto em [supabase.com](https://supabase.com) e guarde a password da base de dados.
2. **SQL Editor → New query**: cole `database/schema.sql` e execute. Depois cole e execute `database/storage.sql` (cria o bucket público `ocorrencias`, limite 4 MB, só imagens).
3. **Project Settings → Database → Connection string**: copie a do **Transaction pooler** (porta **6543**). Substitua `[YOUR-PASSWORD]`. É o seu `DATABASE_URL`.
4. **Project Settings → API**: copie o **Project URL** (`SUPABASE_URL`) e a chave **service_role** (`SUPABASE_SERVICE_ROLE_KEY`).
   A chave `service_role` ignora o RLS: nunca a ponha em código do browser nem em repositórios públicos.

## 2. Dados iniciais (do seu computador)

Crie um `.env` local com `DATABASE_URL` e `SESSION_SECRET` e corra:

```bash
npm install
# categorias, município, departamentos e o PRIMEIRO ADMIN (sem dados de demonstração):
SEED_DEMO=false SEED_ADMIN_EMAIL=admin@seudominio.com SEED_ADMIN_PASSWORD='uma-password-longa-12+' npm run seed
```
Entre com esse admin e, em **Admin → Utilizadores**, crie as contas de técnicos e gestores municipais.
(Para testar com dados e contas de demonstração use `npm run seed` sem `SEED_DEMO=false`; em produção as contas de teste só são criadas com `SEED_TEST_USERS=true`.)

## 3. Vercel

1. Envie o projeto para o GitHub (o `.gitignore` já exclui `.env` e `node_modules`).
2. [vercel.com/new](https://vercel.com/new) → importe o repositório. Framework: **Other** (o `vercel.json` já encaminha tudo para `api/index.js`).
3. **Environment Variables** (Production): `SESSION_SECRET`, `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET=ocorrencias` e, para o assistente, `GEMINI_API_KEY`. `SESSION_SECRET` deve ter pelo menos 32 caracteres.
   Gere o segredo com `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
4. Deploy. Verifique `https://SEU-DOMINIO/health` → `{"status":"ok","storage":"supabase"}`.

## Limitações a conhecer

- **Fotos até 4 MB** (a Vercel limita o corpo de um pedido a 4,5 MB). Telemóveis modernos geram fotos maiores: o cidadão recebe uma mensagem de erro. Para aceitar mais, comprima no browser antes do envio ou faça upload direto ao Supabase com URL assinado.
- **Rate limit em memória**: cada instância serverless conta separadamente, por isso o limite é aproximado. Para limites rigorosos use um armazenamento partilhado (ex.: Upstash Redis).
- **Sessão em cookie assinado**: não há invalidação central (terminar a sessão noutro dispositivo exige trocar o `SESSION_SECRET`, que termina todas).
- **IA (Gemini)**: com `GEMINI_API_KEY` o assistente, a análise de fotografias e o relatório executivo usam o Gemini, com fallback automático para `AI_MODEL_FALLBACK`. Sem chave, o sistema usa regras locais (classificação por palavras, prioridade, chatbot de FAQ, relatório por regras).
- **Interface**: o CSS (Tailwind) já vem compilado em `public/css/app.css`. Depois de mudares vistas, corre `npm run build:css` e faz commit.
- **Segurança**: helmet com CSP estrita (sem scripts inline; todo o JS está em `public/js`).
- Não houve ensaio numa conta real Vercel/Supabase: os testes automáticos cobrem a base de dados (Postgres real em memória), as rotas e o armazenamento com o Supabase simulado.
