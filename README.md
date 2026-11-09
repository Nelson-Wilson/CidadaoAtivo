# Cidadão Ativo

Plataforma de reporte e gestão de ocorrências urbanas do Conselho Municipal de Maputo.
Node.js 20 + Express + EJS, **PostgreSQL no Supabase**, fotografias no **Supabase Storage**,
IA **Google Gemini** e deploy na **Vercel**.

## Funcionalidades

| Perfil | O que faz |
|---|---|
| **Cidadão** | Regista ocorrências com foto e GPS, vê o mapa público, **apoia** ocorrências de outros (“também me afeta”), **comenta**, acompanha o estado e **avalia** (1 a 5) quando resolvida, o que fecha o caso. |
| **Técnico** | Vê as tarefas atribuídas, inicia a execução e envia a foto de resolução com observações. A IA compara antes/depois apenas como apoio. |
| **Município** | Dashboard com KPIs (críticas, fora do prazo SLA, taxa de resolução, satisfação), ranking de bairros e categorias, mapa de calor, triagem, atribuição de técnicos, resposta ao cidadão, **relatório executivo** (Gemini ou regras) e **exportação CSV**. |
| **Admin** | Tudo do município, mais gestão de **categorias, departamentos e SLA** e criação de contas de pessoal. |

Mantêm-se a máquina de estados (recebida → em análise → atribuída/rejeitada → em execução → resolvida → fechada), a prioridade com salvaguarda de perigo de vida, a deteção de duplicados (GPS + texto + foto), o encaminhamento automático por categoria e o chatbot.

## Stack de produção

| Área | Implementação |
|---|---|
| Base de dados | PostgreSQL no Supabase. `database/schema.sql` é idempotente e liga RLS em todas as tabelas **sem políticas**: a chave `anon` não lê nada; só o servidor acede com a ligação Postgres. |
| Sessões | `express-session` com store PostgreSQL (`user_sessions`), revogáveis. Logout, conta apagada ou alteração de password podem invalidar sessões imediatamente. |
| Rate limiting | Contadores na tabela `rate_limits`, partilhados entre instâncias serverless. Aplicado a login/registo, chatbot, IA, comentários e relatório. |
| Fotografias | `multer` 2 em memória, validação do MIME real pelos primeiros bytes, limite de 4 MB, Supabase Storage (bucket público de leitura). Leitura restrita ao bucket configurado (proteção SSRF). |
| IA | Cliente único para a API Gemini `generateContent`: chatbot com histórico/papel, classificação, análise de fotografia, duplicados visuais e relatório executivo. Modelo principal + fallback e contingência determinística. |
| Segurança | Helmet com CSP sem scripts inline, CSRF, bcrypt, validação de entrada, autorização por papel/município, mensagens de erro sem detalhes internos. |
| Frontend | Tailwind CSS 4 compilado (`public/css/app.css`), fontes Inter/Plus Jakarta e Leaflet servidos localmente. Sem CDNs, Google Fonts ou scripts inline. |
| Deploy | `api/index.js` exporta a app Express; `vercel.json` encaminha todo o tráfego e inclui views, public e database na função. |

## IA Gemini

- `GEMINI_API_KEY` ativa a IA. `AI_MODEL` (por omissão `gemini-3.6-flash`) e `AI_MODEL_FALLBACK` (`gemini-3.5-flash-lite`) permitem ajustar o modelo.
- `AI_THINKING_LEVEL` controla o raciocínio dos modelos Gemini 3+ (`LOW` por omissão, para menor latência).
- As funcionalidades podem ser desligadas individualmente com `AI_FEATURE_* = false`.
- Sem chave, a plataforma continua a funcionar: classificação e prioridade por regras, chatbot de contingência e relatório determinístico. A análise de fotografias fica desativada.

## Desenvolvimento local

```bash
npm install
cp .env.example .env          # preencha DATABASE_URL e SESSION_SECRET
# no SQL Editor do Supabase (ou psql): database/schema.sql e database/storage.sql
npm run build:css             # gera public/css/app.css a partir de src/styles/app.css
npm run seed                  # categorias, município, departamentos (+ contas de teste fora de produção)
npm run dev                   # http://localhost:3000
```

Para alterar estilos durante o desenvolvimento, corra `npm run watch:css` num segundo terminal.

Sem `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` as fotos ficam em `public/uploads` (apenas desenvolvimento; na Vercel o disco é só de leitura).
Contas de teste (apenas fora de produção): `cidadao@`, `tecnico@`, `municipio@`, `admin@teste.com`, password `password`.

## Testes

```bash
npm test
```

A suite cobre 77 testes unitários e 31 de integração (108 no total): domínio, autorização, validação, prioridade, Gemini com `fetch` simulado, armazenamento Supabase, sessões revogáveis, rate limiting, pseudonimização de comentários e o fluxo completo cidadão → município → técnico → cidadão.
Corre sem Supabase nem MySQL: os testes de integração usam um Postgres real em memória ([PGlite](https://pglite.dev)) com o mesmo `database/schema.sql`.
O GitHub Actions corre `npm ci`, a compilação do Tailwind e a suite completa em cada push para `main` (`.github/workflows/ci.yml`).

## Verificação de produção

Com o `.env` preenchido, corra:

```bash
npm run preflight
```

O preflight valida a ligação ao Supabase, as tabelas e o RLS, o upload/leitura/remoção no bucket, a chave Gemini e a disponibilidade dos modelos configurados. Nunca imprime segredos.

## Publicar

Siga **[DEPLOY.md](DEPLOY.md)** (Supabase → Vercel, passo a passo).
