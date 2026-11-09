const express = require('express');
const request = require('supertest');

const db = require('../helpers/db');
const { createApp } = require('../../src/app');
const Denuncia = require('../../src/models/Denuncia');
const Comentario = require('../../src/models/Comentario');
const Usuario = require('../../src/models/Usuario');
const { PostgresSessionStore } = require('../../src/sessionStore');
const { PostgresRateLimitStore } = require('../../src/rateLimitStore');
const { criarRateLimiter } = require('../../src/rateLimit');
const { reiniciarBaseDeDados, criarDenuncia } = require('../helpers/fixtures');
const { novoAgente, iniciarSessao, obterCsrf } = require('../helpers/http');

let fx;
let app;
let sessionStore;

beforeEach(async () => {
    fx = await reiniciarBaseDeDados();
    sessionStore = new PostgresSessionStore({ ttlMs: 60 * 1000 });
    app = createApp({ sessionStore });
});

function promessa(fn) {
    return new Promise((resolve, reject) => {
        fn((err, valor) => (err ? reject(err) : resolve(valor)));
    });
}

describe('Sessões revogáveis em PostgreSQL', () => {
    test('guarda, lê, expira e revoga sessões por utilizador', async () => {
        await promessa((cb) => sessionStore.set('sid-maria', {
            cookie: { maxAge: 60 * 1000 },
            userId: fx.utilizadores.maria,
        }, cb));

        const guardada = await promessa((cb) => sessionStore.get('sid-maria', cb));
        expect(Number(guardada.userId)).toBe(fx.utilizadores.maria);

        const [[linha]] = await db.query(
            'SELECT user_id FROM user_sessions WHERE sid = ?',
            ['sid-maria']
        );
        expect(Number(linha.user_id)).toBe(fx.utilizadores.maria);

        expect(await promessa((cb) => sessionStore.revogarPorUsuario(fx.utilizadores.maria, cb))).toBe(1);
        expect(await promessa((cb) => sessionStore.get('sid-maria', cb))).toBeNull();

        await promessa((cb) => sessionStore.set('sid-expirada', {
            cookie: { expires: new Date(Date.now() - 1000) },
            userId: fx.utilizadores.rita,
        }, cb));
        expect(await promessa((cb) => sessionStore.get('sid-expirada', cb))).toBeNull();
    });

    test('logout destrói a linha de sessão na base de dados', async () => {
        const maria = await iniciarSessao(novoAgente(app), 'maria@teste.com');

        const [antes] = await db.query('SELECT user_id FROM user_sessions');
        expect(antes).toHaveLength(1);
        expect(Number(antes[0].user_id)).toBe(fx.utilizadores.maria);

        const csrf = await obterCsrf(maria, '/denuncias');
        await maria.post('/logout').type('form').send({ _csrf: csrf }).expect(302).expect('Location', '/login');

        const [depois] = await db.query('SELECT sid FROM user_sessions');
        expect(depois).toHaveLength(0);

        // O cookie deixou de autenticar: a área reservada volta a exigir login.
        await maria.get('/denuncias').expect(302).expect('Location', '/login');
    });

    test('uma conta apagada deixa de autenticar imediatamente', async () => {
        const rita = await iniciarSessao(novoAgente(app), 'rita@teste.com');
        await rita.get('/denuncias').expect(200);

        await db.query('DELETE FROM users WHERE id = ?', [fx.utilizadores.rita]);

        await rita.get('/denuncias').expect(302).expect('Location', '/login');
    });
});

describe('Rate limiting partilhado', () => {
    test('os contadores são atómicos e partilhados entre instâncias', async () => {
        const lojaA = new PostgresRateLimitStore({ windowMs: 60 * 1000 });
        const lojaB = new PostgresRateLimitStore({ windowMs: 60 * 1000 });

        expect((await lojaA.increment('login:127.0.0.1')).totalHits).toBe(1);
        expect((await lojaB.increment('login:127.0.0.1')).totalHits).toBe(2);

        await lojaA.decrement('login:127.0.0.1');
        expect((await lojaA.increment('login:127.0.0.1')).totalHits).toBe(2);

        await lojaB.resetKey('login:127.0.0.1');
        expect((await lojaA.increment('login:127.0.0.1')).totalHits).toBe(1);

        // Janela expirada recomeça em 1 em vez de continuar a somar.
        await db.query(
            "UPDATE rate_limits SET reset_time = now() - interval '1 second' WHERE key = ?",
            ['login:127.0.0.1']
        );
        expect((await lojaA.increment('login:127.0.0.1')).totalHits).toBe(1);
    });

    test('o middleware devolve 429 depois do máximo', async () => {
        const mini = express();
        mini.get(
            '/recurso',
            criarRateLimiter({
                windowMs: 60 * 1000,
                max: 2,
                standardHeaders: true,
                legacyHeaders: false,
                message: 'limite atingido',
            }),
            (req, res) => res.send('ok')
        );

        await request(mini).get('/recurso').expect(200);
        await request(mini).get('/recurso').expect(200);
        const resposta = await request(mini).get('/recurso').expect(429);
        expect(resposta.text).toContain('limite atingido');
    });
});

describe('Privacidade e notas de atendimento', () => {
    test('comentários públicos usam pseudónimos, nunca o nome real', async () => {
        const id = await criarDenuncia({
            userId: fx.utilizadores.maria,
            categoryId: fx.categorias.Buracos,
            municipalityId: fx.municipios.maputo,
            departmentId: fx.departamentos.viasMaputo,
        });

        const maria = await Usuario.buscarPorId(fx.utilizadores.maria);
        await Comentario.criar({ idDenuncia: id, usuario: maria, conteudo: 'Também passo aqui.' });

        const comentarios = await Comentario.listarPorDenuncia(id);
        expect(comentarios[0].author_name).toBe('Cidadão');
        expect(JSON.stringify(comentarios)).not.toContain('Maria Cidadã');
    });

    test('a resposta do município fica gravada no histórico', async () => {
        const id = await criarDenuncia({
            userId: fx.utilizadores.maria,
            categoryId: fx.categorias.Buracos,
            municipalityId: fx.municipios.maputo,
            departmentId: fx.departamentos.viasMaputo,
        });

        await Denuncia.mudarStatus(id, 'em_analise', fx.utilizadores.joao, 'A equipa vai verificar o local.');

        const historico = await Denuncia.historicoStatus(id);
        const ultima = historico[historico.length - 1];
        expect(ultima.new_status).toBe('em_analise');
        expect(ultima.note).toBe('A equipa vai verificar o local.');
    });
});

describe('Cabeçalhos de segurança', () => {
    test('health responde e a CSP não permite scripts inline', async () => {
        const resposta = await request(app).get('/health').expect(200);

        expect(resposta.body.status).toBe('ok');
        expect(resposta.headers['x-powered-by']).toBeUndefined();
        expect(resposta.headers['x-content-type-options']).toBe('nosniff');

        const csp = resposta.headers['content-security-policy'] || '';
        expect(csp).toContain("script-src 'self'");
        expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
        expect(csp).toContain("object-src 'none'");
    });
});
