const express = require('express');
const router = express.Router();

const Categoria = require('../models/Categoria');
const Denuncia = require('../models/Denuncia');
const Avaliacao = require('../models/Avaliacao');
const Usuario = require('../models/Usuario');
const { exigirPapel, exigirAutenticacao } = require('../auth');
const { verifyCsrfBody } = require('../csrf');
const { makeUploader } = require('../upload');
const storage = require('../storage');
const servicoEncaminhamento = require('../services/servicoEncaminhamentoDenuncia');
const servicoClassificacao = require('../services/ai/servicoClassificacao');
const servicoPrioridade = require('../services/ai/servicoPrioridade');
const servicoAnaliseFoto = require('../services/ai/servicoAnaliseFoto');
const { validarDenuncia } = require('../validation/denuncia');
const { podeAcederDenuncia } = require('../authorization');

const uploadFotoDenuncia = makeUploader();

/** Tempo máximo (ms) que o registo espera pela IA antes de responder ao cidadão. */
const LIMITE_IA_MS = 8000;

router.get('/denuncias', exigirPapel(Usuario.PAPEL_CIDADAO), async (req, res) => {
    const pagina = Math.max(1, parseInt(req.query.page) || 1);
    const paginacao = await Denuncia.paginarPorUsuario(req.usuarioAtual.id, pagina);
    res.render('reports/index', { title: 'As minhas denúncias', ...paginacao });
});

router.get('/denuncias/nova', exigirPapel(Usuario.PAPEL_CIDADAO), async (req, res) => {
    const categorias = await Categoria.todas();
    res.render('reports/create', { title: 'Nova denúncia', categories: categorias });
});

router.post('/denuncias', exigirPapel(Usuario.PAPEL_CIDADAO), (req, res, next) => {
    uploadFotoDenuncia.single('photo')(req, res, (err) => {
        if (err) {
            req.flashErrors(['Falha ao enviar a fotografia. Verifica o formato (jpg/png/webp) e o tamanho (máx. 4 MB).']);
            return res.redirect('/denuncias/nova');
        }
        next();
    });
}, verifyCsrfBody, async (req, res) => {
    const { id_categoria, descricao = '', latitude, longitude, bairro } = req.body;
    const { erros, valores } = validarDenuncia({
        id_categoria,
        descricao,
        latitude,
        longitude,
        bairro,
        temFoto: Boolean(req.file),
    });

    let categoria = null;
    if (valores.id_categoria) {
        categoria = await Categoria.buscarPorId(valores.id_categoria);
        if (!categoria) erros.push('Escolhe uma categoria válida.');
    }

    if (erros.length) {
        req.flashErrors(erros);
        req.flashOld({ id_categoria, descricao, bairro, latitude, longitude });
        return res.redirect('/denuncias/nova');
    }

    let caminhoFoto;
    try {
        caminhoFoto = await storage.guardar(req.file, 'reports');
    } catch (err) {
        console.error('[Upload] Falha ao guardar a foto da denúncia:', err.message);
        req.flashErrors(['Não foi possível guardar a fotografia. Verifica se é uma imagem jpg, png ou webp válida e tenta novamente.']);
        req.flashOld({ id_categoria, descricao, bairro, latitude, longitude });
        return res.redirect('/denuncias/nova');
    }

    const encaminhamento = await servicoEncaminhamento.encaminhar(categoria.id);

    let idDenuncia;
    try {
        idDenuncia = await Denuncia.criar({
            id_usuario: req.usuarioAtual.id,
            id_categoria: categoria.id,
            descricao: valores.descricao,
            caminho_foto: caminhoFoto,
            latitude: valores.latitude,
            longitude: valores.longitude,
            bairro: valores.bairro,
            status: Denuncia.STATUS_RECEBIDA,
            id_municipio: encaminhamento.id_municipio,
            id_departamento: encaminhamento.id_departamento,
        });
    } catch (err) {
        await storage.eliminar(caminhoFoto); // não deixar a foto órfã no storage
        throw err;
    }

    // Enriquecimento por IA (prioridade). Em serverless o processamento NÃO pode continuar
    // depois da resposta (a função é congelada), por isso espera-se aqui, com limite de tempo.
    const iaAtiva = servicoClassificacao.estaAtivo()
        || servicoAnaliseFoto.estaAtivo()
        || servicoPrioridade.estaAtivo();

    if (iaAtiva) {
        const enriquecer = async () => {
            const classificacaoTexto = await servicoClassificacao.classificar(valores.descricao);
            let gravidade = classificacaoTexto.gravidade;

            const analiseFoto = await servicoAnaliseFoto.analisar(req.file.buffer, valores.descricao);
            if (analiseFoto && analiseFoto.gravidade === 'alta') gravidade = 'alta';

            const novaDenuncia = await Denuncia.buscarPorId(idDenuncia);
            if (novaDenuncia) {
                const prioridade = await servicoPrioridade.calcular(novaDenuncia, gravidade);
                await Denuncia.atualizarPrioridade(idDenuncia, prioridade);
            }
        };

        let temporizador;
        const limite = new Promise((resolve) => { temporizador = setTimeout(resolve, LIMITE_IA_MS); });
        try {
            await Promise.race([enriquecer(), limite]);
        } catch (erroIa) {
            console.error(`[IA] Erro no processamento da denúncia #${idDenuncia}:`, erroIa.message);
        } finally {
            clearTimeout(temporizador);
        }
    }

    req.flashStatus('Denúncia registada com sucesso. Vai ser encaminhada para a equipa responsável.');
    res.redirect('/denuncias');
});

router.get('/denuncias/:id', exigirAutenticacao, async (req, res) => {
    const denuncia = await Denuncia.buscarComRelacoes(Number(req.params.id));
    if (!denuncia) return res.status(404).send('Denúncia não encontrada.');

    if (!podeAcederDenuncia(req.usuarioAtual, denuncia)) {
        return res.status(403).send('Não tens acesso a esta denúncia.');
    }

    const historico = await Denuncia.historicoStatus(denuncia.id);
    const avaliacao = await Avaliacao.buscarPorDenuncia(denuncia.id);
    const podeAvaliar = req.usuarioAtual.role === Usuario.PAPEL_CIDADAO
        && Number(denuncia.user_id) === Number(req.usuarioAtual.id)
        && denuncia.status === Denuncia.STATUS_RESOLVIDA
        && !avaliacao;

    res.render('reports/show', {
        title: `Denúncia #${denuncia.id}`, report: denuncia, history: historico,
        rating: avaliacao, canRate: podeAvaliar,
    });
});

router.post('/denuncias/:id/avaliar', exigirPapel(Usuario.PAPEL_CIDADAO), verifyCsrfBody, async (req, res) => {
    const idDenuncia = Number(req.params.id);
    const denuncia = await Denuncia.buscarPorId(idDenuncia);
    if (!denuncia) return res.status(404).send('Denúncia não encontrada.');
    if (!podeAcederDenuncia(req.usuarioAtual, denuncia)) {
        return res.status(403).send('Não tens acesso a esta denúncia.');
    }

    try {
        await Denuncia.avaliarEFechar(idDenuncia, req.usuarioAtual.id, req.body.score, req.body.feedback);
        req.flashStatus('Obrigado pela tua avaliação! A denúncia foi fechada.');
    } catch (err) {
        const duplicada = /report_ratings/.test(err.message) || err.code === '23505';
        req.flashErrors([duplicada ? 'Esta denúncia já foi avaliada.' : err.message]);
    }
    res.redirect(`/denuncias/${idDenuncia}`);
});

module.exports = router;
