const { createApp } = require('../../src/app');
const { reiniciarBaseDeDados, criarDenuncia } = require('../helpers/fixtures');
const { novoAgente, iniciarSessao } = require('../helpers/http');

const app = createApp();
let fx;
let idDenuncia;

beforeEach(async () => {
    fx = await reiniciarBaseDeDados();
    idDenuncia = await criarDenuncia({
        userId: fx.utilizadores.maria,
        categoryId: fx.categorias.Buracos,
        municipalityId: fx.municipios.maputo,
        departmentId: fx.departamentos.viasMaputo,
    });
});

describe('Cabeçalhos de segurança (helmet + CSP)', () => {
    test('resposta HTML traz CSP restritiva e não revela o Express', async () => {
        const r = await novoAgente(app).get('/login').expect(200);
        const csp = r.headers['content-security-policy'];
        expect(csp).toContain("default-src 'self'");
        expect(csp).toContain("script-src 'self'");
        expect(csp).toContain("script-src-attr 'none'");
        expect(csp).toContain("object-src 'none'");
        expect(csp).toContain("frame-ancestors 'none'");
        expect(r.headers['x-content-type-options']).toBe('nosniff');
        expect(r.headers['x-powered-by']).toBeUndefined();
    });

    test('o CSS compilado e os ficheiros locais são servidos (sem CDN)', async () => {
        const agente = novoAgente(app);
        await agente.get('/css/app.css').expect(200).expect('Content-Type', /css/);
        await agente.get('/vendor/leaflet/leaflet.css').expect(200);
        await agente.get('/fonts/inter-latin-var.woff2').expect(200);
        await agente.get('/js/ui.js').expect(200);
    });
});

describe('Nenhuma página depende de JavaScript inline (bloqueado pela CSP)', () => {
    const paginasPorPapel = {
        anonimo: () => ['/', '/login', '/registar', `/ocorrencias/${idDenuncia}`],
        'maria@teste.com': () => ['/denuncias', '/denuncias/nova', `/denuncias/${idDenuncia}`, `/ocorrencias/${idDenuncia}`],
        'joao@teste.com': () => ['/municipio/dashboard', '/municipio/denuncias', `/municipio/denuncias/${idDenuncia}`, '/municipio/relatorio'],
        'admin@teste.com': () => ['/admin/categorias', '/admin/utilizadores', '/municipio/dashboard'],
    };

    for (const [papel, paginas] of Object.entries(paginasPorPapel)) {
        test(`${papel}: páginas sem <script> inline, sem on*= e sem cores antigas`, async () => {
            const agente = papel === 'anonimo' ? novoAgente(app) : await iniciarSessao(novoAgente(app), papel);
            for (const caminho of paginas()) {
                const r = await agente.get(caminho);
                expect([caminho, r.status]).toEqual([caminho, 200]);
                const html = r.text;
                const scripts = [...html.matchAll(/<script\b([^>]*)>/gi)];
                for (const s of scripts) expect([caminho, s[1]]).toEqual([caminho, expect.stringContaining('src=')]);
                expect([caminho, /\son[a-z]+\s*=\s*["']/i.test(html)]).toEqual([caminho, false]);
                expect([caminho, /javascript:/i.test(html)]).toEqual([caminho, false]);
                expect(html).toContain('/css/app.css');
                expect(html).toContain('data-theme-toggle');
            }
        });
    }
});

describe('Assistente virtual (Gemini com contingência)', () => {
    test('sem chave da API responde com texto de contingência e sem cache', async () => {
        const r = await novoAgente(app).post('/api/chatbot').send({ message: 'Como reporto um buraco?' }).expect(200);
        expect(typeof r.body.data.reply).toBe('string');
        expect(r.body.data.reply.length).toBeGreaterThan(10);
        expect(r.headers['cache-control']).toBe('no-store');
    });

    test('mensagem vazia e corpo gigante são tratados', async () => {
        const vazio = await novoAgente(app).post('/api/chatbot').send({ message: '   ' }).expect(200);
        expect(vazio.body.data.reply).toMatch(/pergunta/i);
        await novoAgente(app).post('/api/chatbot').send({ message: 'x'.repeat(60 * 1024) }).expect(413);
    });
});
