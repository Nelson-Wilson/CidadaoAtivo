const express = require('express');
const router = express.Router();
const { criarRateLimiter } = require('../rateLimit');

const Denuncia = require('../models/Denuncia');
const Comentario = require('../models/Comentario');
const Avaliacao = require('../models/Avaliacao');
const ConfirmacaoDenuncia = require('../models/ConfirmacaoDenuncia');
const Usuario = require('../models/Usuario');
const { exigirAutenticacao, exigirPapel } = require('../auth');
const { verifyCsrfBody } = require('../csrf');
const { podeAcederDenuncia, podeGerirDenuncia } = require('../authorization');
const servicoPrioridade = require('../services/ai/servicoPrioridade');

const ORDEM_PRIORIDADE = { baixa: 0, normal: 1, urgente: 2, muito_urgente: 3 };
const ESTADOS_SEM_PARTICIPACAO = ['fechada', 'rejeitada'];

const comentarioLimiter = criarRateLimiter({
    namespace: 'comentario',
    windowMs: 10 * 60 * 1000,
    max: parseInt(process.env.COMMENT_RATE_LIMIT_MAX || '20', 10),
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        req.flashErrors(['Estás a comentar depressa demais. Aguarda uns minutos.']);
        res.redirect(`/ocorrencias/${req.params.id}`);
    },
});

/** Quem pode comentar: qualquer cidadão autenticado; staff só nas denúncias da sua alçada. */
function podeComentar(usuario, denuncia) {
    if (usuario.role === Usuario.PAPEL_CIDADAO) return true;
    return podeGerirDenuncia(usuario, denuncia) || podeAcederDenuncia(usuario, denuncia);
}

async function carregarVisivel(req, res) {
    const denuncia = await Denuncia.buscarComRelacoes(Number(req.params.id));
    if (!denuncia) { res.status(404).render('404', { title: 'Página não encontrada', layout: false }); return null; }
    // Denúncias rejeitadas (spam, conteúdo impróprio) não são públicas.
    if (denuncia.status === Denuncia.STATUS_REJEITADA && !(req.usuarioAtual && podeAcederDenuncia(req.usuarioAtual, denuncia))) {
        res.status(404).render('404', { title: 'Página não encontrada', layout: false });
        return null;
    }
    return denuncia;
}

// Página pública da ocorrência: estado, votos e comentários (sem dados pessoais do autor).
router.get('/ocorrencias/:id', async (req, res) => {
    const denuncia = await carregarVisivel(req, res);
    if (!denuncia) return;

    const [historico, comentarios, avaliacao] = await Promise.all([
        Denuncia.historicoStatus(denuncia.id),
        Comentario.listarPorDenuncia(denuncia.id),
        Avaliacao.buscarPorDenuncia(denuncia.id),
    ]);

    const usuario = req.usuarioAtual;
    const jaVotou = usuario ? await ConfirmacaoDenuncia.usuarioConfirmou(denuncia.id, usuario.id) : false;
    const participacaoAberta = !ESTADOS_SEM_PARTICIPACAO.includes(denuncia.status);

    res.render('ocorrencias/show', {
        title: `Ocorrência #${denuncia.id}`,
        report: denuncia,
        history: historico,
        comments: comentarios,
        rating: avaliacao,
        hasVoted: jaVotou,
        isAuthor: Boolean(usuario) && Number(usuario.id) === Number(denuncia.user_id),
        canVote: Boolean(usuario) && usuario.role === Usuario.PAPEL_CIDADAO && participacaoAberta,
        canComment: Boolean(usuario) && participacaoAberta && podeComentar(usuario, denuncia),
        maxComment: Comentario.MAX_CARACTERES,
    });
});

// Voto "também me afeta": alterna e, se o cálculo estiver ativo, pode subir (nunca descer) a prioridade.
router.post('/ocorrencias/:id/votar', exigirPapel(Usuario.PAPEL_CIDADAO), verifyCsrfBody, async (req, res) => {
    const denuncia = await carregarVisivel(req, res);
    if (!denuncia) return;
    const destino = `/ocorrencias/${denuncia.id}`;

    if (ESTADOS_SEM_PARTICIPACAO.includes(denuncia.status)) {
        req.flashErrors(['Esta ocorrência já não aceita votos.']);
        return res.redirect(destino);
    }
    if (Number(denuncia.user_id) === Number(req.usuarioAtual.id)) {
        req.flashErrors(['Foste tu que reportaste esta ocorrência.']);
        return res.redirect(destino);
    }

    const { votou } = await ConfirmacaoDenuncia.alternar(denuncia.id, req.usuarioAtual.id);

    if (servicoPrioridade.estaAtivo()) {
        const nova = await servicoPrioridade.calcular(denuncia);
        if ((ORDEM_PRIORIDADE[nova] ?? 0) > (ORDEM_PRIORIDADE[denuncia.priority] ?? 0)) {
            await Denuncia.atualizarPrioridade(denuncia.id, nova);
        }
    }

    req.flashStatus(votou ? 'Obrigado! O teu apoio ajuda a priorizar este problema.' : 'O teu voto foi retirado.');
    res.redirect(destino);
});

router.post('/ocorrencias/:id/comentar', comentarioLimiter, exigirAutenticacao, verifyCsrfBody, async (req, res) => {
    const denuncia = await carregarVisivel(req, res);
    if (!denuncia) return;
    const destino = `/ocorrencias/${denuncia.id}#comentarios`;

    if (ESTADOS_SEM_PARTICIPACAO.includes(denuncia.status) || !podeComentar(req.usuarioAtual, denuncia)) {
        return res.status(403).send('Não podes comentar esta ocorrência.');
    }

    try {
        await Comentario.criar({ idDenuncia: denuncia.id, usuario: req.usuarioAtual, conteudo: req.body.content });
        req.flashStatus('Comentário publicado.');
    } catch (err) {
        req.flashErrors([err.message]);
        req.flashOld({ content: req.body.content });
    }
    res.redirect(destino);
});

module.exports = router;
