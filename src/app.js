// Deve ser carregado antes das rotas: no Express 4, sem este patch os erros
// lançados em handlers async não chegam ao middleware de erro.
require('express-async-errors');

const express = require('express');
const session = require('express-session');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');

const config = require('./config');
const db = require('./db');
const { PostgresSessionStore } = require('./sessionStore');
const { carregarUsuario } = require('./auth');
const flashMiddleware = require('./flash');
const { csrfMiddleware } = require('./csrf');
const { exposeToViews } = require('./viewHelpers');

const origemSupabase = (() => {
    if (!config.storage.supabaseUrl) return null;
    try {
        return new URL(config.storage.supabaseUrl).origin;
    } catch {
        return null;
    }
})();

/**
 * Constrói a aplicação Express sem a colocar à escuta.
 *
 * Serve o servidor local (scripts/servidor-local.js), a função serverless da Vercel
 * (api/index.js) e os testes de integração (Supertest). Em testes usa-se um
 * MemoryStore isolado; em produção/dev usa-se o store PostgreSQL revogável.
 *
 * @param {{ sessionStore?: import('express-session').Store }} [opcoes]
 * @returns {import('express').Express}
 */
function createApp({ sessionStore } = {}) {
    const app = express();

    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '..', 'views'));
    app.disable('x-powered-by');
    // Atrás do proxy da Vercel: necessário para cookies "secure" e para o rate limit por IP.
    app.set('trust proxy', config.trustProxy);

    // Cabeçalhos de segurança. A CSP bloqueia scripts inline; todo o
    // JavaScript da aplicação vive em ficheiros próprios em /public/js.
    app.use(helmet({
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                scriptSrcAttr: ["'none'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                fontSrc: ["'self'", 'data:'],
                imgSrc: [
                    "'self'",
                    'data:',
                    'blob:',
                    'https://*.tile.openstreetmap.org',
                    'https://tile.openstreetmap.org',
                    'https://server.arcgisonline.com',
                    'https://*.basemaps.cartocdn.com',
                    ...(origemSupabase ? [origemSupabase] : []),
                ],
                connectSrc: ["'self'"],
                objectSrc: ["'none'"],
                baseUri: ["'self'"],
                formAction: ["'self'"],
                frameAncestors: ["'none'"],
                upgradeInsecureRequests: config.isProduction ? [] : null,
            },
        },
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    }));

    app.use(compression());
    app.use(express.urlencoded({ extended: true, limit: '2mb' }));
    app.use(express.json({ limit: '2mb' }));

    // Ficheiros locais (em modo de armazenamento "local"); na Vercel os estáticos vêm de /public via CDN.
    app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads'), {
        maxAge: '1d',
        setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    }));

    // Bibliotecas de terceiros servidas localmente (sem CDN em runtime).
    app.use('/vendor', express.static(path.join(__dirname, '..', 'public', 'vendor'), {
        maxAge: config.isProduction ? '30d' : 0,
        immutable: config.isProduction,
    }));

    app.use(express.static(path.join(__dirname, '..', 'public'), {
        maxAge: config.isProduction ? '1d' : 0,
    }));

    const store = sessionStore || (config.isTest
        ? new session.MemoryStore()
        : new PostgresSessionStore({ ttlMs: config.session.maxAgeMs }));

    app.use(session({
        name: config.session.nome,
        secret: config.sessionSecret,
        store,
        resave: false,
        saveUninitialized: false,
        rolling: true,
        cookie: {
            httpOnly: true,
            secure: config.isProduction,
            sameSite: 'lax',
            maxAge: config.session.maxAgeMs,
        },
    }));

    app.use(carregarUsuario);
    app.use(flashMiddleware);
    app.use(csrfMiddleware);
    app.use(exposeToViews);

    app.get('/health', async (req, res) => {
        try {
            await db.query('SELECT 1');
            res.json({
                status: 'ok',
                uptime: process.uptime(),
                timestamp: new Date().toISOString(),
                storage: config.storage.driver,
                ai: config.ai.apiKey ? 'gemini' : 'off',
                commit: process.env.VERCEL_GIT_COMMIT_SHA ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7) : 'local',
            });
        } catch (err) {
            res.status(503).json({ status: 'error', message: 'Falha na ligação à base de dados.' });
        }
    });

    app.use(require('./routes/map'));
    app.use(require('./routes/auth'));
    app.use(require('./routes/reports'));
    app.use(require('./routes/ocorrencias'));
    app.use(require('./routes/municipio'));
    app.use(require('./routes/tecnico'));
    app.use(require('./routes/admin'));
    app.use(require('./routes/api'));

    app.use((req, res) => {
        res.status(404).render('404', { title: 'Página não encontrada', layout: false });
    });

    app.use((err, req, res, next) => {
        const status = Number(err.status || err.statusCode) || 500;
        const erroDoCliente = status >= 400 && status < 500;

        if (erroDoCliente) {
            console.warn(`[PEDIDO INVÁLIDO] ${req.method} ${req.url}: ${err.message}`);
        } else {
            console.error(`[ERRO NÃO TRATADO] ${req.method} ${req.url}:`, err);
        }

        if (res.headersSent) return next(err);

        const mensagem = erroDoCliente
            ? 'O pedido é inválido ou está incompleto.'
            : 'Ocorreu um erro interno no servidor.';

        if (req.originalUrl.startsWith('/api') || req.xhr) {
            return res.status(status).json({ status: 'error', message: mensagem });
        }

        if (erroDoCliente) return res.status(status).send(mensagem);
        res.status(500).send('Ocorreu um erro ao processar o teu pedido. Por favor, tenta novamente mais tarde.');
    });

    return app;
}

module.exports = { createApp };
