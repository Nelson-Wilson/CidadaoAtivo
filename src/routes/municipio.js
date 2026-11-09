const express = require('express');
const router = express.Router();

const Denuncia = require('../models/Denuncia');
const Categoria = require('../models/Categoria');
const Usuario = require('../models/Usuario');
const { exigirPapel } = require('../auth');
const { verifyCsrfBody } = require('../csrf');
const servicoDashboardInteligente = require('../services/ai/servicoDashboardInteligente');
const servicoRelatorio = require('../services/ai/servicoRelatorioExecutivo');
const Municipio = require('../models/Municipio');
const { criarRateLimiter } = require('../rateLimit');
const { podeGerirDenuncia, podeAtribuirTecnico } = require('../authorization');

const papeisPermitidos = [Usuario.PAPEL_MUNICIPIO, Usuario.PAPEL_ADMIN];

// O relatório pode chamar a IA (custo): limite por IP.
const relatorioLimiter = criarRateLimiter({
    namespace: 'relatorio',
    windowMs: 60 * 1000,
    max: parseInt(process.env.REPORT_RATE_LIMIT_MAX || '5', 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Muitos pedidos de relatório. Aguarda um minuto.',
});

/** Protege contra "CSV injection": células que começam por = + - @ seriam fórmulas no Excel. */
function celulaCsv(valor) {
    let texto = valor === null || valor === undefined ? '' : String(valor);
    if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
    return `"${texto.replace(/"/g, '""')}"`;
}

/** Admin pode ver tudo; um gestor municipal tem de estar associado a um município. */
function exigirMunicipio(req, res, next) {
    if (req.usuarioAtual.role !== Usuario.PAPEL_ADMIN && !req.usuarioAtual.municipality_id) {
        return res.status(403).send('A tua conta não está associada a um município.');
    }
    next();
}

router.get('/municipio/dashboard', exigirPapel(...papeisPermitidos), exigirMunicipio, async (req, res) => {
    const idMunicipio = req.usuarioAtual.municipality_id || null;

    const estatisticas = await Denuncia.estatisticasParaMunicipio(idMunicipio);
    const categoriasPrincipais = await Denuncia.categoriasPrincipais(idMunicipio);
    const bairrosPrincipais = await Denuncia.bairrosPrincipais(idMunicipio);
    const pontosCalor = await Denuncia.pontosCalor(idMunicipio);
    const resumoInteligente = servicoDashboardInteligente.resumir(estatisticas, categoriasPrincipais, bairrosPrincipais);

    res.render('municipio/dashboard', { title: 'Dashboard', stats: estatisticas, topCategories: categoriasPrincipais, topNeighborhoods: bairrosPrincipais, heatPoints: pontosCalor, smartSummary: resumoInteligente });
});

router.get('/municipio/relatorio', relatorioLimiter, exigirPapel(...papeisPermitidos), exigirMunicipio, async (req, res) => {
    const idMunicipio = req.usuarioAtual.municipality_id || null;
    const [estatisticas, categorias, bairros, municipio] = await Promise.all([
        Denuncia.estatisticasParaMunicipio(idMunicipio),
        Denuncia.categoriasPrincipais(idMunicipio, 5),
        Denuncia.bairrosPrincipais(idMunicipio, 5),
        idMunicipio ? Municipio.buscarPorId(idMunicipio) : Municipio.primeiro(),
    ]);
    const relatorio = await servicoRelatorio.gerar({
        estatisticas, categorias, bairros, nomeMunicipio: municipio ? municipio.name : 'Conselho Municipal',
    });
    res.render('municipio/relatorio', { title: 'Relatório executivo', report: relatorio, stats: estatisticas, topCategories: categorias, topNeighborhoods: bairros, generatedAt: new Date().toISOString() });
});

router.get('/municipio/exportar.csv', exigirPapel(...papeisPermitidos), exigirMunicipio, async (req, res) => {
    const linhas = await Denuncia.exportarParaMunicipio(req.usuarioAtual.municipality_id || null);
    const cabecalho = ['id', 'data', 'categoria', 'bairro', 'estado', 'prioridade', 'departamento', 'tecnico', 'latitude', 'longitude', 'votos', 'avaliacao', 'descricao'];
    const corpo = linhas.map((l) => [l.id, l.created_at, l.category_name, l.neighborhood, l.status, l.priority, l.department_name, l.technician_name, l.latitude, l.longitude, l.votes_count, l.rating, l.description].map(celulaCsv).join(','));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="denuncias.csv"');
    res.send('\ufeff' + [cabecalho.map(celulaCsv).join(','), ...corpo].join('\r\n'));
});

router.get('/municipio/denuncias', exigirPapel(...papeisPermitidos), exigirMunicipio, async (req, res) => {
    const pagina = Math.max(1, parseInt(req.query.page) || 1);
    const { id_categoria, status, bairro } = req.query;

    const paginacao = await Denuncia.paginarParaMunicipio({
        idMunicipio: req.usuarioAtual.municipality_id || null,
        idCategoria: id_categoria ? Number(id_categoria) : null,
        status: status || null,
        bairro: bairro || null,
        pagina,
    });

    const categorias = await Categoria.todas();
    res.render('municipio/reports/index', {
        title: 'Denúncias do município', ...paginacao, categories: categorias,
        filters: { id_categoria: id_categoria || '', status: status || '', bairro: bairro || '' },
    });
});

router.get('/municipio/denuncias/:id', exigirPapel(...papeisPermitidos), async (req, res) => {
    const denuncia = await Denuncia.buscarComRelacoes(Number(req.params.id));
    if (!denuncia) return res.status(404).send('Denúncia não encontrada.');

    if (!podeGerirDenuncia(req.usuarioAtual, denuncia)) {
        return res.status(403).send('Não tens permissão para aceder a denúncias de outro município.');
    }

    const tecnicos = denuncia.department_id ? await Usuario.buscarTecnicosPorDepartamento(denuncia.department_id) : [];
    const historico = await Denuncia.historicoStatus(denuncia.id);
    const estadosSeguintes = (Denuncia.TRANSITIONS[denuncia.status] || [])
        .filter((estado) => estado !== Denuncia.STATUS_ATRIBUIDA || Boolean(denuncia.technician_id));

    res.render('municipio/reports/show', { title: `Denúncia #${denuncia.id}`, report: denuncia, technicians: tecnicos, history: historico, nextStates: estadosSeguintes });
});

router.post('/municipio/denuncias/:id/atribuir', exigirPapel(...papeisPermitidos), verifyCsrfBody, async (req, res) => {
    const idDenuncia = Number(req.params.id);
    const idTecnico = Number(req.body.technician_id);

    const denuncia = await Denuncia.buscarPorId(idDenuncia);
    if (!denuncia) return res.status(404).send('Denúncia não encontrada.');

    if (!podeGerirDenuncia(req.usuarioAtual, denuncia)) {
        return res.status(403).send('Não tens permissão para atribuir denúncias de outro município.');
    }

    const tecnico = Number.isInteger(idTecnico) && idTecnico > 0
        ? await Usuario.buscarPorId(idTecnico)
        : null;

    if (!podeAtribuirTecnico(req.usuarioAtual, denuncia, tecnico)) {
        req.flashErrors(['Escolhe um técnico válido do departamento e município responsáveis.']);
        return res.redirect(`/municipio/denuncias/${idDenuncia}`);
    }

    try {
        await Denuncia.atribuirTecnico(idDenuncia, idTecnico, req.usuarioAtual.id);
        req.flashStatus('Técnico atribuído com sucesso.');
    } catch (err) {
        req.flashErrors([err.message]);
    }

    res.redirect(`/municipio/denuncias/${idDenuncia}`);
});

router.post('/municipio/denuncias/:id/estado', exigirPapel(...papeisPermitidos), verifyCsrfBody, async (req, res) => {
    const idDenuncia = Number(req.params.id);
    const novoStatus = req.body.status;

    const denuncia = await Denuncia.buscarPorId(idDenuncia);
    if (!denuncia) return res.status(404).send('Denúncia não encontrada.');

    if (!podeGerirDenuncia(req.usuarioAtual, denuncia)) {
        return res.status(403).send('Não tens permissão para alterar denúncias de outro município.');
    }

    if (!Denuncia.STATUSES.includes(novoStatus)) {
        return res.status(422).send('Estado inválido.');
    }

    try {
        const nota = String(req.body.response || '').trim().slice(0, 1000);
        await Denuncia.mudarStatus(idDenuncia, novoStatus, req.usuarioAtual.id, nota);
        req.flashStatus('Estado da denúncia actualizado.');
    } catch (err) {
        req.flashErrors([err.message]);
    }

    res.redirect(`/municipio/denuncias/${idDenuncia}`);
});

module.exports = router;
