const express = require('express');
const router = express.Router();

const Denuncia = require('../models/Denuncia');
const Usuario = require('../models/Usuario');
const { exigirPapel } = require('../auth');
const { verifyCsrfBody } = require('../csrf');
const { makeUploader } = require('../upload');
const storage = require('../storage');
const { podeAcederDenuncia } = require('../authorization');
const servicoResumo = require('../services/ai/servicoResumo');
const servicoAnaliseFoto = require('../services/ai/servicoAnaliseFoto');

const uploadFotoResolucao = makeUploader();

async function denunciaAutorizada(req, res) {
    const denuncia = await Denuncia.buscarComRelacoes(Number(req.params.id));
    if (!denuncia) { res.status(404).send('Denúncia não encontrada.'); return null; }
    if (!podeAcederDenuncia(req.usuarioAtual, denuncia)) {
        res.status(403).send('Esta denúncia não te está atribuída.');
        return null;
    }
    return denuncia;
}

router.get('/tecnico/tarefas', exigirPapel(Usuario.PAPEL_TECNICO), async (req, res) => {
    const denuncias = await Denuncia.porTecnicoEStatus(req.usuarioAtual.id, [Denuncia.STATUS_ATRIBUIDA, Denuncia.STATUS_EM_EXECUCAO]);
    const historicoTotal = await Denuncia.porTecnicoEStatus(req.usuarioAtual.id, [Denuncia.STATUS_RESOLVIDA, Denuncia.STATUS_FECHADA]);
    res.render('tecnico/reports/index', { title: 'As minhas tarefas', reports: denuncias, historico: historicoTotal.slice(0, 10) });
});

router.get('/tecnico/tarefas/:id', exigirPapel(Usuario.PAPEL_TECNICO), async (req, res) => {
    const denuncia = await denunciaAutorizada(req, res);
    if (!denuncia) return;
    const resumo = servicoResumo.resumir(denuncia.description);
    res.render('tecnico/reports/show', { title: `Denúncia #${denuncia.id}`, report: denuncia, summary: resumo });
});

router.post('/tecnico/tarefas/:id/iniciar', exigirPapel(Usuario.PAPEL_TECNICO), verifyCsrfBody, async (req, res) => {
    const denuncia = await denunciaAutorizada(req, res);
    if (!denuncia) return;

    try {
        await Denuncia.mudarStatus(denuncia.id, Denuncia.STATUS_EM_EXECUCAO, req.usuarioAtual.id);
        req.flashStatus('Denúncia marcada como em execução.');
    } catch (err) {
        req.flashErrors([err.message]);
    }

    res.redirect(`/tecnico/tarefas/${denuncia.id}`);
});

router.post('/tecnico/tarefas/:id/resolver', exigirPapel(Usuario.PAPEL_TECNICO), (req, res, next) => {
    uploadFotoResolucao.single('photo')(req, res, (err) => {
        if (err) {
            req.flashErrors(['Anexa uma fotografia válida (jpg/png/webp, máx. 4 MB).']);
            return res.redirect(`/tecnico/tarefas/${req.params.id}`);
        }
        next();
    });
}, verifyCsrfBody, async (req, res) => {
    const denuncia = await denunciaAutorizada(req, res);
    if (!denuncia) return;

    if (!req.file) {
        req.flashErrors(['Anexa uma fotografia que comprove a resolução.']);
        return res.redirect(`/tecnico/tarefas/${denuncia.id}`);
    }

    let caminhoFoto;
    try {
        caminhoFoto = await storage.guardar(req.file, 'resolutions');
    } catch (err) {
        console.error('[Upload] Falha ao guardar a foto de resolução:', err.message);
        req.flashErrors(['Não foi possível guardar a fotografia. Anexa uma imagem jpg, png ou webp válida.']);
        return res.redirect(`/tecnico/tarefas/${denuncia.id}`);
    }

    try {
        await Denuncia.resolver(denuncia.id, caminhoFoto, req.usuarioAtual.id, req.body.note);
    } catch (err) {
        // A transição falhou: não deixar a fotografia órfã no storage.
        await storage.eliminar(caminhoFoto);
        req.flashErrors([err.message]);
        return res.redirect(`/tecnico/tarefas/${denuncia.id}`);
    }

    // Verificação informativa por IA (nunca bloqueia o técnico). Usa os bytes que já estão em memória.
    let comentario = null;
    if (denuncia.photo_path) {
        try {
            comentario = await servicoAnaliseFoto.compararResolucao(denuncia.photo_path, req.file.buffer, denuncia.category_name);
        } catch (err) {
            console.error('[IA Verificação Resolução]:', err.message);
        }
    }

    let mensagem = 'Denúncia marcada como resolvida. O cidadão será notificado para avaliar.';
    if (comentario) mensagem += ' 🤖 IA: ' + comentario;

    req.flashStatus(mensagem);
    res.redirect('/tecnico/tarefas');
});

module.exports = router;
