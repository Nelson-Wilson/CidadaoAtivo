# Publicar o Cidadão Ativo na Vercel com Supabase e Gemini

## 0. Antes de começar

- Confirme o enquadramento do projeto na Vercel: o plano **Hobby** é para uso pessoal/não comercial. Um serviço municipal deve usar um plano adequado.
- Se alguma chave (`GEMINI_API_KEY`, password de base de dados, `SUPABASE_SERVICE_ROLE_KEY`) já foi partilhada ou commitada, **revogue-a e gere outra** antes do deploy.
- Nunca coloque a chave `service_role` do Supabase nem a chave Gemini em código do browser ou num repositório público.

## 1. Supabase (base de dados e fotografias)

1. Crie um projeto em [supabase.com](https://supabase.com) e guarde a password da base de dados.
2. **SQL Editor → New query**: cole `database/schema.sql` e execute. Repita com `database/storage.sql` (cria o bucket público `ocorrencias`, limite 4 MB, só JPEG/PNG/WebP).
3. **Project Settings → Database → Connection string**: copie a do **Transaction pooler** (porta **6543**). Substitua `[YOUR-PASSWORD]`. É o seu `DATABASE_URL`.
4. **Project Settings → API**: copie o **Project URL** (`SUPABASE_URL`) e a chave **service_role** (`SUPABASE_SERVICE_ROLE_KEY`).
5. Se usar outro nome de bucket, defina também `SUPABASE_STORAGE_BUCKET` (apenas minúsculas, números e hífenes).

O `schema.sql` é idempotente: pode ser executado novamente para criar tabelas/colunas novas (`user_sessions`, `rate_limits`, notas de histórico/resolução).

## 2. Dados iniciais (do seu computador)

Crie um `.env` local com `DATABASE_URL`, `SESSION_SECRET` e, se quiser IA, `GEMINI_API_KEY`:

```bash
npm install
npm run build:css
# categorias, município, departamentos e o PRIMEIRO ADMIN (sem dados de demonstração):
SEED_DEMO=false SEED_ADMIN_EMAIL=admin@seudominio.com SEED_ADMIN_PASSWORD='uma-password-longa-12+' npm run seed
```

Entre com esse admin e, em **Admin → Utilizadores**, crie as contas de técnicos e gestores municipais.
Para testar com dados e contas de demonstração use `npm run seed` sem `SEED_DEMO=false`; em produção as contas de teste só são criadas com `SEED_TEST_USERS=true`.

## 3. Vercel

1. Envie o projeto para o GitHub (o `.gitignore` exclui `.env`, `node_modules`, `coverage` e `public/uploads`).
2. [vercel.com/new](https://vercel.com/new) → importe o repositório. Framework: **Other**. O `vercel.json` já define `npm run build:css` e encaminha tudo para `api/index.js`.
3. **Environment Variables** (Production):

   | Variável | Obrigatória | Notas |
   |---|---|---|
   | `SESSION_SECRET` | Sim | 48 bytes aleatórios; a app recusa arrancar em produção com um segredo fraco. |
   | `DATABASE_URL` | Sim | Transaction pooler do Supabase (porta 6543). |
   | `SUPABASE_URL` | Sim (fotos) | URL do projeto. |
   | `SUPABASE_SERVICE_ROLE_KEY` | Sim (fotos) | Secreta; só no servidor. |
   | `SUPABASE_STORAGE_BUCKET` | Não | Por omissão `ocorrencias`. |
   | `GEMINI_API_KEY` | Recomendada | Sem ela, a IA fica em modo de contingência. |
   | `APP_URL` | Recomendada | `https://o-seu-dominio.com`. |
   | `AI_MODEL`, `AI_MODEL_FALLBACK`, `AI_THINKING_LEVEL` | Não | Por omissão `gemini-3.6-flash`, `gemini-3.5-flash-lite`, `LOW`. |

   Gere o segredo com `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
4. Deploy. Verifique `https://SEU-DOMINIO/health` → `{"status":"ok","storage":"supabase","ai":"gemini"}`.

## 4. Verificação depois do deploy

1. `/health` responde `200` e mostra `storage: supabase`.
2. Criar conta de cidadão, entrar e submeter uma denúncia **com fotografia**.
3. Confirmar que a foto abre a partir do URL do Supabase e que o mapa público a mostra.
4. Abrir o chatbot e fazer uma pergunta; confirmar resposta (Gemini ou contingência).
5. Entrar como técnico, iniciar execução e resolver com foto + observações.
6. Confirmar que o cidadão vê a resolução e a nota no histórico.
7. Gerar o relatório executivo e exportar CSV.
8. Terminar sessão e confirmar que `/denuncias` volta a redirecionar para `/login`.

## 5. Limitações a conhecer

- **Fotografias até 4 MB** (a Vercel limita o corpo de um pedido a 4,5 MB). Telemóveis modernos geram fotos maiores: o cidadão recebe uma mensagem de erro. Para aceitar mais, comprima no browser antes do envio ou faça upload direto ao Supabase com URL assinado.
- **Duração máxima da função**: 60 segundos (`vercel.json`). As chamadas Gemini têm timeout configurável (`AI_TIMEOUT_MS`) e fallback de modelo; evite valores que somem mais do que esse limite.
- **Planos gratuitos**: o Supabase pode pausar projetos inativos e tem limites de armazenamento/egress; o Gemini free tier tem quotas por minuto/dia. O fallback e as contingências locais reduzem o impacto, mas não substituem um plano adequado a produção.
- **Sessões e rate limiting partilhados**: usam PostgreSQL, pelo que são consistentes entre instâncias serverless; exigem que `database/schema.sql` tenha sido executado.
- **RLS sem políticas**: a chave `anon` do Supabase não acede a nenhuma tabela. O servidor liga-se com a role Postgres através de `DATABASE_URL`.
- **Ainda não houve ensaio numa conta real Vercel/Supabase**: os testes automáticos cobrem Postgres real em memória (PGlite), rotas, sessões, rate limiting e o armazenamento Supabase com `fetch` simulado. A verificação da secção 4 é obrigatória antes de abrir ao público.
