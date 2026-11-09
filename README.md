# Cidadão Ativo

Plataforma de reporte e gestão de ocorrências urbanas (Conselho Municipal de Maputo).
Node.js + Express + EJS, **Postgres no Supabase**, fotografias no **Supabase Storage**,
pronta para publicar na **Vercel**.

## Funcionalidades

| Perfil | O que faz |
|---|---|
| **Cidadão** | Regista ocorrências com foto e GPS, vê o mapa público, **apoia** ocorrências de outros ("também me afeta"), **comenta**, acompanha o estado e **avalia** (1 a 5) quando resolvida, o que fecha o caso. |
| **Técnico** | Vê as tarefas atribuídas, inicia a execução e envia a foto de resolução (a IA compara antes/depois, só como apoio). |
| **Município** | Dashboard com KPIs (críticas, fora do prazo SLA, taxa de resolução, satisfação), ranking de bairros e categorias, mapa de calor, triagem, atribuição de técnicos, **relatório executivo** (IA ou regras) e **exportação CSV**. |
| **Admin** | Tudo do município, mais gestão de **categorias, departamento e SLA** e criação de contas de pessoal. |

Regras já existentes mantidas: máquina de estados (recebida → em análise → atribuída/rejeitada → em execução → resolvida → fechada), prioridade com salvaguarda de perigo de vida, deteção de duplicados (GPS + texto + foto), encaminhamento automático por categoria, chatbot.

## Como funciona em Vercel + Supabase

| Antes (MySQL/XAMPP) | Agora |
|---|---|
| MySQL local | Postgres do Supabase (`DATABASE_URL`, pooler porta 6543) |
| Sessões em tabela MySQL | Cookie de sessão assinado (sem estado, funciona em serverless) |
| Fotos em `public/uploads` | Supabase Storage (bucket público `ocorrencias`) |
| IA a correr depois da resposta | IA com limite de 8 s **antes** de responder (a Vercel congela a função depois) |
| `app.listen` | `api/index.js` exporta a app Express |

Segurança de base: RLS ligado em todas as tabelas **sem políticas** (a chave `anon` do Supabase não lê nada; só o servidor acede), CSRF, rate limit, validação do tipo real das imagens, `SESSION_SECRET` obrigatório em produção, CSV protegido contra injeção de fórmulas.

## Publicar

Siga **[DEPLOY.md](DEPLOY.md)** (Supabase → Vercel, passo a passo).

## Desenvolvimento local

```bash
npm install
cp .env.example .env        # preencha DATABASE_URL e SESSION_SECRET
# no SQL Editor do Supabase (ou psql): database/schema.sql
npm run seed                # categorias, município, departamentos (+ contas de teste fora de produção)
npm run dev                 # http://localhost:3000
```
Sem `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` as fotos ficam em `public/uploads` (só em desenvolvimento).
Contas de teste (apenas fora de produção): `cidadao@`, `tecnico@`, `municipio@`, `admin@teste.com`, password `password`.

## Testes

```bash
npm test
```
Corre sem Supabase nem MySQL: os testes de integração usam um Postgres real em memória ([PGlite](https://pglite.dev)) com o mesmo `database/schema.sql`.

## Interface, IA e segurança

- **Interface**: Tailwind v4 com modo escuro, fontes e Leaflet servidos localmente (sem CDN). O CSS compilado está em `public/css/app.css`; depois de alterar vistas ou `src/styles/app.css`, corre `npm run build:css`.
- **Assistente (Gemini)**: `GEMINI_API_KEY` ativa o chatbot (com histórico e conhecimento por papel), a análise de fotografias, a deteção visual de duplicados e o relatório executivo. Há fallback automático de modelo e, sem chave, respostas de contingência.
- **Segurança**: helmet com CSP estrita (`script-src 'self'`, sem handlers inline), CSRF em todos os formulários e chamadas AJAX, rate limits, cookie de sessão assinado (`httpOnly`, `secure`, `sameSite=lax`), `SESSION_SECRET` de 32+ caracteres obrigatório em produção, validação da assinatura binária das imagens e limite de 32 KB nos pedidos JSON.
