const db = require('../helpers/db');
const { createApp } = require('../../src/app');
const { reiniciarBaseDeDados, criarDenuncia } = require('../helpers/fixtures');
const { novoAgente, iniciarSessao, obterCsrf } = require('../helpers/http');

const app = createApp();
let fx;

beforeEach(async () => { fx = await reiniciarBaseDeDados(); });

async function novaDenuncia(overrides = {}) {
    return criarDenuncia({
        userId: fx.utilizadores.maria,
        categoryId: fx.categorias.Buracos,
        municipalityId: fx.municipios.maputo,
        departmentId: fx.departamentos.viasMaputo,
        ...overrides,
    });
}

async function linha(sql, params = []) {
    const [rows] = await db.query(sql, params);
    return rows[0];
}

describe('Página pública da ocorrência', () => {
    test('visitante anónimo vê a página, mas sem o nome do autor nem botão de voto', async () => {
        const id = await novaDenuncia();
        const resposta = await novoAgente(app).get(`/ocorrencias/${id}`).expect(200);
        expect(resposta.text).toContain('Buracos');
        expect(resposta.text).not.toContain('Maria Cidadã');
        expect(resposta.text).toContain('Entra para apoiar');
    });

    test('denúncia rejeitada não é pública (404), mas o autor ainda a vê', async () => {
        const id = await novaDenuncia({ status: 'rejeitada' });
        await novoAgente(app).get(`/ocorrencias/${id}`).expect(404);

        const maria = await iniciarSessao(novoAgente(app), 'maria@teste.com');
        await maria.get(`/ocorrencias/${id}`).expect(200);
    });
});

describe('Votos "também me afeta"', () => {
    test('outro cidadão vota, retira o voto, e o autor não pode votar na própria denúncia', async () => {
        const id = await novaDenuncia();
        const rita = await iniciarSessao(novoAgente(app), 'rita@teste.com');

        let csrf = await obterCsrf(rita, `/ocorrencias/${id}`);
        await rita.post(`/ocorrencias/${id}/votar`).type('form').send({ _csrf: csrf }).expect(302);
        expect((await linha('SELECT COUNT(*) AS n FROM report_confirmations WHERE report_id = ?', [id])).n).toBe(1);

        csrf = await obterCsrf(rita, `/ocorrencias/${id}`);
        await rita.post(`/ocorrencias/${id}/votar`).type('form').send({ _csrf: csrf }).expect(302);
        expect((await linha('SELECT COUNT(*) AS n FROM report_confirmations WHERE report_id = ?', [id])).n).toBe(0);

        const maria = await iniciarSessao(novoAgente(app), 'maria@teste.com');
        csrf = await obterCsrf(maria, `/ocorrencias/${id}`);
        await maria.post(`/ocorrencias/${id}/votar`).type('form').send({ _csrf: csrf }).expect(302);
        expect((await linha('SELECT COUNT(*) AS n FROM report_confirmations WHERE report_id = ?', [id])).n).toBe(0);
    });

    test('exige sessão, token CSRF e papel de cidadão', async () => {
        const id = await novaDenuncia();
        await novoAgente(app).post(`/ocorrencias/${id}/votar`).type('form').send({}).expect(302).expect('Location', '/login');

        const rita = await iniciarSessao(novoAgente(app), 'rita@teste.com');
        await rita.post(`/ocorrencias/${id}/votar`).type('form').send({ _csrf: 'invalido' }).expect(419);

        const joao = await iniciarSessao(novoAgente(app), 'joao@teste.com');
        const csrf = await obterCsrf(joao, '/municipio/dashboard');
        await joao.post(`/ocorrencias/${id}/votar`).type('form').send({ _csrf: csrf }).expect(403);
    });

    test('não aceita votos em denúncias fechadas', async () => {
        const id = await novaDenuncia({ status: 'fechada' });
        const rita = await iniciarSessao(novoAgente(app), 'rita@teste.com');
        const csrf = await obterCsrf(rita, `/ocorrencias/${id}`);
        await rita.post(`/ocorrencias/${id}/votar`).type('form').send({ _csrf: csrf }).expect(302);
        expect((await linha('SELECT COUNT(*) AS n FROM report_confirmations WHERE report_id = ?', [id])).n).toBe(0);
    });
});

describe('Comentários', () => {
    test('cidadão comenta; comentário de gestor do município certo fica marcado como oficial', async () => {
        const id = await novaDenuncia();

        const rita = await iniciarSessao(novoAgente(app), 'rita@teste.com');
        let csrf = await obterCsrf(rita, `/ocorrencias/${id}`);
        await rita.post(`/ocorrencias/${id}/comentar`).type('form').send({ _csrf: csrf, content: 'Também passo aqui todos os dias.' }).expect(302);

        const joao = await iniciarSessao(novoAgente(app), 'joao@teste.com');
        csrf = await obterCsrf(joao, `/ocorrencias/${id}`);
        await joao.post(`/ocorrencias/${id}/comentar`).type('form').send({ _csrf: csrf, content: 'Equipa a caminho.' }).expect(302);

        const [comentarios] = await db.query('SELECT content, is_official FROM report_comments ORDER BY id');
        expect(comentarios).toEqual([
            { content: 'Também passo aqui todos os dias.', is_official: false },
            { content: 'Equipa a caminho.', is_official: true },
        ]);

        const pagina = await novoAgente(app).get(`/ocorrencias/${id}`).expect(200);
        expect(pagina.text).toContain('Equipa a caminho.');
        expect(pagina.text).toContain('Oficial');
    });

    test('gestor de OUTRO município não pode comentar', async () => {
        const id = await novaDenuncia();
        const ana = await iniciarSessao(novoAgente(app), 'ana@teste.com');
        const csrf = await obterCsrf(ana, `/ocorrencias/${id}`);
        await ana.post(`/ocorrencias/${id}/comentar`).type('form').send({ _csrf: csrf, content: 'Intruso' }).expect(403);
        expect((await linha('SELECT COUNT(*) AS n FROM report_comments')).n).toBe(0);
    });

    test('HTML no comentário é escapado (sem XSS) e comentários vazios ou longos são recusados', async () => {
        const id = await novaDenuncia();
        const rita = await iniciarSessao(novoAgente(app), 'rita@teste.com');
        let csrf = await obterCsrf(rita, `/ocorrencias/${id}`);
        await rita.post(`/ocorrencias/${id}/comentar`).type('form').send({ _csrf: csrf, content: '<script>alert(1)</script>' }).expect(302);

        csrf = await obterCsrf(rita, `/ocorrencias/${id}`);
        await rita.post(`/ocorrencias/${id}/comentar`).type('form').send({ _csrf: csrf, content: '   ' }).expect(302);
        csrf = await obterCsrf(rita, `/ocorrencias/${id}`);
        await rita.post(`/ocorrencias/${id}/comentar`).type('form').send({ _csrf: csrf, content: 'x'.repeat(1001) }).expect(302);

        expect((await linha('SELECT COUNT(*) AS n FROM report_comments')).n).toBe(1);
        const pagina = await novoAgente(app).get(`/ocorrencias/${id}`).expect(200);
        expect(pagina.text).not.toContain('<script>alert(1)</script>');
        expect(pagina.text).toContain('&lt;script&gt;');
    });
});

describe('Avaliação do cidadão', () => {
    test('autor avalia uma denúncia resolvida: guarda a nota e fecha pelo histórico de estados', async () => {
        const id = await novaDenuncia({ status: 'resolvida' });
        const maria = await iniciarSessao(novoAgente(app), 'maria@teste.com');
        const csrf = await obterCsrf(maria, `/denuncias/${id}`);
        await maria.post(`/denuncias/${id}/avaliar`).type('form').send({ _csrf: csrf, score: '4', feedback: 'Bom trabalho' }).expect(302);

        expect((await linha('SELECT status FROM reports WHERE id = ?', [id])).status).toBe('fechada');
        const nota = await linha('SELECT score, feedback FROM report_ratings WHERE report_id = ?', [id]);
        expect(nota).toEqual({ score: 4, feedback: 'Bom trabalho' });
        const hist = await linha("SELECT previous_status, new_status FROM report_status_histories WHERE report_id = ? AND new_status = 'fechada'", [id]);
        expect(hist).toEqual({ previous_status: 'resolvida', new_status: 'fechada' });
    });

    test('recusa: outro cidadão, denúncia ainda não resolvida, nota inválida e avaliação repetida', async () => {
        const resolvida = await novaDenuncia({ status: 'resolvida' });
        const emCurso = await novaDenuncia({ status: 'em_execucao' });

        const rita = await iniciarSessao(novoAgente(app), 'rita@teste.com');
        let csrf = await obterCsrf(rita, '/denuncias');
        await rita.post(`/denuncias/${resolvida}/avaliar`).type('form').send({ _csrf: csrf, score: '5' }).expect(403);

        const maria = await iniciarSessao(novoAgente(app), 'maria@teste.com');
        csrf = await obterCsrf(maria, '/denuncias');
        await maria.post(`/denuncias/${emCurso}/avaliar`).type('form').send({ _csrf: csrf, score: '5' }).expect(302);
        expect((await linha('SELECT status FROM reports WHERE id = ?', [emCurso])).status).toBe('em_execucao');

        await maria.post(`/denuncias/${resolvida}/avaliar`).type('form').send({ _csrf: csrf, score: '9' }).expect(302);
        expect((await linha('SELECT status FROM reports WHERE id = ?', [resolvida])).status).toBe('resolvida');

        await maria.post(`/denuncias/${resolvida}/avaliar`).type('form').send({ _csrf: csrf, score: '3' }).expect(302);
        await maria.post(`/denuncias/${resolvida}/avaliar`).type('form').send({ _csrf: csrf, score: '1' }).expect(302);
        expect((await linha('SELECT COUNT(*) AS n FROM report_ratings WHERE report_id = ?', [resolvida])).n).toBe(1);
        expect((await linha('SELECT score FROM report_ratings WHERE report_id = ?', [resolvida])).score).toBe(3);
    });
});

describe('Painel municipal: KPIs, relatório e exportação', () => {
    test('estatísticas incluem satisfação, críticas e ocorrências fora do prazo (SLA)', async () => {
        await db.query("UPDATE categories SET sla_hours = 1 WHERE id = ?", [fx.categorias.Buracos]);
        const atrasada = await novaDenuncia({ status: 'em_analise', priority: 'muito_urgente' });
        await db.query("UPDATE reports SET created_at = now() - interval '5 hours' WHERE id = ?", [atrasada]);
        const resolvida = await novaDenuncia({ status: 'resolvida' });
        await db.query('INSERT INTO report_ratings (report_id, user_id, score) VALUES (?, ?, ?)', [resolvida, fx.utilizadores.maria, 4]);

        const Denuncia = require('../../src/models/Denuncia');
        const e = await Denuncia.estatisticasParaMunicipio(fx.municipios.maputo);
        expect(e.total).toBe(2);
        expect(e.criticas).toBe(1);
        expect(e.sla_atrasadas).toBe(1);
        expect(e.satisfacao_media).toBe(4);
        expect(e.taxa_resolucao).toBe(50);

        const joao = await iniciarSessao(novoAgente(app), 'joao@teste.com');
        const painel = await joao.get('/municipio/dashboard').expect(200);
        expect(painel.text).toContain('Fora do prazo (SLA)');
        const relatorio = await joao.get('/municipio/relatorio').expect(200);
        expect(relatorio.text).toContain('Relatório executivo');
    });

    test('exportação CSV é restrita ao município e neutraliza fórmulas', async () => {
        await novaDenuncia({ description: '=HYPERLINK("http://mau.example")' });
        await criarDenuncia({ userId: fx.utilizadores.maria, categoryId: fx.categorias.Lixo, municipalityId: fx.municipios.matola, description: 'Lixo na Matola, fora do município de Maputo.' });

        const joao = await iniciarSessao(novoAgente(app), 'joao@teste.com');
        const csv = await joao.get('/municipio/exportar.csv').expect(200).expect('Content-Type', /text\/csv/);
        expect(csv.text).toContain('"\'=HYPERLINK');
        expect(csv.text).not.toContain('Lixo na Matola');

        await novoAgente(app).get('/municipio/exportar.csv').expect(302);
        const maria = await iniciarSessao(novoAgente(app), 'maria@teste.com');
        await maria.get('/municipio/exportar.csv').expect(403);
    });
});

describe('Administração', () => {
    test('só o admin gere categorias; valida SLA, nome duplicado e bloqueia remoção com denúncias', async () => {
        const joao = await iniciarSessao(novoAgente(app), 'joao@teste.com');
        await joao.get('/admin/categorias').expect(403);

        const admin = await iniciarSessao(novoAgente(app), 'admin@teste.com');
        let csrf = await obterCsrf(admin, '/admin/categorias');
        await admin.post('/admin/categorias').type('form').send({ _csrf: csrf, name: 'Sinalização', sla_hours: '36', department_id: String(fx.departamentos.viasMaputo) }).expect(302);
        const nova = await linha("SELECT id, sla_hours FROM categories WHERE name = 'Sinalização'");
        expect(nova.sla_hours).toBe(36);
        expect((await linha('SELECT COUNT(*) AS n FROM category_department WHERE category_id = ?', [nova.id])).n).toBe(1);

        csrf = await obterCsrf(admin, '/admin/categorias');
        await admin.post('/admin/categorias').type('form').send({ _csrf: csrf, name: 'Sinalização', sla_hours: '36' }).expect(302);
        await admin.post('/admin/categorias').type('form').send({ _csrf: csrf, name: 'Outra', sla_hours: '0' }).expect(302);
        expect((await linha('SELECT COUNT(*) AS n FROM categories WHERE name IN (\'Sinalização\', \'Outra\')')).n).toBe(1);

        await novaDenuncia();
        await admin.post(`/admin/categorias/${fx.categorias.Buracos}/remover`).type('form').send({ _csrf: csrf }).expect(302);
        expect((await linha('SELECT COUNT(*) AS n FROM categories WHERE id = ?', [fx.categorias.Buracos])).n).toBe(1);
        await admin.post(`/admin/categorias/${nova.id}/remover`).type('form').send({ _csrf: csrf }).expect(302);
        expect((await linha('SELECT COUNT(*) AS n FROM categories WHERE id = ?', [nova.id])).n).toBe(0);
    });

    test('admin cria conta de técnico válida; recusa email repetido e departamento de outro município', async () => {
        const admin = await iniciarSessao(novoAgente(app), 'admin@teste.com');
        const csrf = await obterCsrf(admin, '/admin/utilizadores');
        const base = { _csrf: csrf, name: 'Novo Técnico', email: 'novo@teste.com', password: 'umasenhalonga1', role: 'tecnico', municipality_id: String(fx.municipios.maputo), department_id: String(fx.departamentos.viasMaputo) };

        await admin.post('/admin/utilizadores').type('form').send(base).expect(302);
        const criado = await linha("SELECT role, municipality_id, department_id FROM users WHERE email = 'novo@teste.com'");
        expect(criado).toEqual({ role: 'tecnico', municipality_id: fx.municipios.maputo, department_id: fx.departamentos.viasMaputo });

        await admin.post('/admin/utilizadores').type('form').send(base).expect(302);
        await admin.post('/admin/utilizadores').type('form').send({ ...base, email: 'outro@teste.com', department_id: String(fx.departamentos.viasMatola) }).expect(302);
        expect((await linha("SELECT COUNT(*) AS n FROM users WHERE email IN ('novo@teste.com','outro@teste.com')")).n).toBe(1);

        const maria = await iniciarSessao(novoAgente(app), 'maria@teste.com');
        await maria.get('/admin/utilizadores').expect(403);
    });
});
