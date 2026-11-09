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

> Se o projeto já tinha uma versão anterior do schema, volte a executar `database/schema.sql` por completo. As instruções `CREATE TABLE IF NOT EXISTS` e `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` acrescentam apenas o que falta.

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

Antes de publicar, valide tudo com `npm run preflight` (base de dados, schema/RLS, bucket e Gemini). O comando não imprime segredos.

## 3. Vercel

1. Envie o projeto para o GitHub (o `.gitignore` exclui `.env`, `.env.*`, `node_modules`, `coverage` e `public/uploads`).
2. [vercel.com/new](https://vercel.com/new) → importe o repositório. Framework: **Other**. O `vercel.json` já define `npm run build:css` e encaminha tudo para `api/index.js`.
3. Gere a cópia importável a partir do `.env` já validado:

   ```bash
   npm run env:vercel
   ```

   O comando cria `.env.vercel` (ignorado pelo Git) com as 31 variáveis de produção e confirma que os segredos não foram alterados. Importe esse ficheiro em **Settings → Environment Variables → Import .env** e marque **Production** e **Preview**.

   | Grupo | Variáveis incluídas no ficheiro |
   |---|---|
   | Aplicação | `APP_URL`, `APP_TIMEZONE`, `TRUST_PROXY` |
   | Sessão | `SESSION_SECRET` |
   | Base de dados | `DATABASE_URL`, `DB_POOL_MAX` |
   | Fotografias | `STORAGE_DRIVER`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`, `UPLOAD_MAX_BYTES` |
   | IA | `GEMINI_API_KEY`, `AI_API_URL`, `AI_MODEL`, `AI_MODEL_FALLBACK`, `AI_THINKING_LEVEL`, `AI_TIMEOUT_MS`, `AI_FEATURE_*`, `AI_DUPLICATE_RADIUS_KM` |
   | Limites | `AUTH_RATE_LIMIT_MAX`, `COMMENT_RATE_LIMIT_MAX`, `CHATBOT_RATE_LIMIT_MAX`, `AI_RATE_LIMIT_MAX`, `REPORT_RATE_LIMIT_MAX` |

   O `APP_URL` vem como `https://cidadao-ativo-beta.vercel.app` (domínio de produção atual). Se o projeto novo tiver outro domínio, altere apenas essa linha no `.env`, volte a correr `npm run env:vercel` e importe novamente.

   Gere o segredo com `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.
4. Deploy. Verifique `https://cidadao-ativo-beta.vercel.app/health` → `{"status":"ok","storage":"supabase","ai":"gemini"}`.
   A raiz `/` redireciona para `/inicio` (ver `vercel.json`): o caminho raiz é reservado pela Vercel e devolve `FUNCTION_INVOCATION_FAILED` antes do Express. Use sempre `/inicio` como endereço da página inicial.

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
- **Tiles do mapa**: o servidor de tiles voluntário do OpenStreetMap bloqueia pedidos deste domínio em produção (HTTP 403 "Access blocked"). O mapa usa agora os tiles **Esri World Street Map** (`server.arcgisonline.com`), sem chave. Para uso municipal intensivo, confirma os termos da Esri ou contrata um serviço de tiles (Esri/ArcGIS, MapTiler, Mapbox, Stadia); para trocar, atualiza `public/js/map.js`, `public/js/report-form.js`, `public/js/dashboard.js` e a CSP em `src/app.js`.
- **Planos gratuitos**: o Supabase pode pausar projetos inativos e tem limites de armazenamento/egress; o Gemini free tier tem quotas por minuto/dia. No momento da verificação, o `gemini-3.6-flash` gratuito tinha um limite diário de 20 pedidos; o fallback cobre falhas pontuais, mas não substitui um plano pago para uso municipal real.
- **Sessões e rate limiting partilhados**: usam PostgreSQL, pelo que são consistentes entre instâncias serverless; exigem que `database/schema.sql` tenha sido executado.
- **RLS sem políticas**: a chave `anon` do Supabase não acede a nenhuma tabela. O servidor liga-se com a role Postgres através de `DATABASE_URL`.
- **Estado do ensaio real**: o projeto está publicado em `https://cidadao-ativo-beta.vercel.app` com Supabase e Gemini reais. A verificação da secção 4 continua a ser obrigatória antes de abrir ao público e deve ser repetida após cada alteração ao schema, às variáveis de ambiente ou ao `vercel.json`.
