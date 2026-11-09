const express = require('express');
const router = express.Router();

const Denuncia = require('../models/Denuncia');
const ConfirmacaoDenuncia = require('../models/ConfirmacaoDenuncia');
const { exigirAutenticacao } = require('../auth');
const storage = require('../storage');
const { makeUploader } = require('../upload');
const { formatarData } = require('../viewHelpers');
const { verifyCsrfHeader } = require('../csrf');
const { criarRateLimiter } = require('../rateLimit');
const servicoClassificacao = require('../services/ai/servicoClassificacao');
const servicoDeteccaoDuplicados = require('../services/ai/servicoDeteccaoDuplicados');
const servicoAnaliseFoto = require('../services/ai/servicoAnaliseFoto');
const servicoChatbot = require('../services/ai/servicoChatbot');

// Rate limiting para proteção contra negação de carteira (Denial-of-Wallet) e DoS.
// Os contadores são partilhados em PostgreSQL para funcionarem entre instâncias.
const chatbotLimiter = criarRateLimiter({
    windowMs: 60 * 1000,
    max: parseInt(process.env.CHATBOT_RATE_LIMIT_MAX || '15', 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'error', message: 'Muitos pedidos ao assistente. Por favor, aguarda um momento.' },
});

const aiLimiter = criarRateLimiter({
    windowMs: 60 * 1000,
    max: parseInt(process.env.AI_RATE_LIMIT_MAX || '30', 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'error', message: 'Limite de pedidos de IA atingido. Tenta novamente dentro de 1 minuto.' },
});

// Upload em memória: as fotos só são usadas para análise e nunca tocam no disco.
const memoryUpload = makeUploader();

const urlApp = storage.urlPublica;

// --- Mapa público ---
router.get('/api/reports', async (req, res) => {
    const { id_categoria, status, bairro } = req.query;
    const denuncias = await Denuncia.paraMapa({
        idCategoria: id_categoria ? Number(id_categoria) : null,
        status: status || null,
        bairro: bairro || null,
    });

    res.json({
        message: 'ok',
        data: denuncias.map((d) => ({
            id: d.id,
            category: d.category_name,
            description: d.description.length > 120 ? d.description.slice(0, 120) + '…' : d.description,
            photo_url: d.photo_path ? urlApp(d.photo_path) : null,
            latitude: parseFloat(d.latitude),
            longitude: parseFloat(d.longitude),
            neighborhood: d.neighborhood,
            status: d.status,
            priority: d.priority,
            votes: Number(d.votes_count) || 0,
            created_at: formatarData(d.created_at),
        })),
    });
});

// --- Chatbot (aberto, com rate limiting rígido contra abuso) ---
router.post('/api/chatbot', chatbotLimiter, express.json({ limit: '64kb' }), async (req, res) => {
    const mensagem = (req.body?.message || '').trim();
    if (!mensagem) return res.json({ message: 'ok', data: { reply: 'Escreve a tua pergunta.' } });

    const resposta = await servicoChatbot.perguntar(mensagem.slice(0, 500), {
        historico: Array.isArray(req.body?.history) ? req.body.history : [],
        papel: req.usuarioAtual?.role || 'cidadao',
    });
    res.json({ message: 'ok', data: { reply: resposta } });
});

// --- IA: sugestão de categoria por texto ---
router.post('/api/ai/classify', aiLimiter, exigirAutenticacao, express.json(), verifyCsrfHeader, async (req, res) => {
    const descricao = (req.body?.description || '').trim();
    if (descricao.length < 10) return res.json({ message: 'ok', data: null });

    const resultado = await servicoClassificacao.classificar(descricao);
    res.json({
        message: 'ok',
        data: {
            category_id: resultado.categoria?.id ?? null,
            category_name: resultado.categoria?.name ?? null,
            confidence: resultado.confianca,
            severity: resultado.gravidade,
        },
    });
});

// --- IA: análise de FOTO (visão) assíncrona sem bloquear o disco ---
router.post('/api/ai/analyze-photo', aiLimiter, exigirAutenticacao, memoryUpload.single('photo'), verifyCsrfHeader, async (req, res) => {
    if (!req.file) return res.status(422).json({ message: 'Nenhuma fotografia recebida.', data: null });

    try {
        const resultado = await servicoAnaliseFoto.analisar(
            { buffer: req.file.buffer, mimetype: req.file.mimetype },
            (req.body.description || '').trim()
        );
        if (!resultado) return res.json({ message: 'ok', data: null });

        res.json({
            message: 'ok',
            data: {
                category_id: resultado.categoria?.id ?? null,
                category_name: resultado.categoria?.name ?? null,
                severity: resultado.gravidade,
                confidence: resultado.confianca,
                reasoning: resultado.raciocinio,
            },
        });
    } catch (err) {
        res.json({ message: 'ok', data: null });
    }
});

// --- IA: verificação de duplicados ---
router.post('/api/ai/duplicates', aiLimiter, exigirAutenticacao, memoryUpload.single('photo'), verifyCsrfHeader, async (req, res) => {
    const idCategoria = Number(req.body.category_id || 0);
    const lat = parseFloat(req.body.latitude || 0);
    const lng = parseFloat(req.body.longitude || 0);
    const descricao = (req.body.description || '').trim();

    if (!idCategoria || !lat || !lng || descricao.length < 10) {
        return res.json({ message: 'ok', data: [] });
    }

    const correspondencias = await servicoDeteccaoDuplicados.procurarPossiveisDuplicados(idCategoria, lat, lng, descricao);

    const dados = [];
    for (let i = 0; i < correspondencias.length; i++) {
        const correspondencia = correspondencias[i];
        const denuncia = correspondencia.denuncia;

        let iaEhMesmo = null;
        let iaRaciocinio = null;
        if (req.file && i < 2 && denuncia.photo_path) {
            const veredito = await servicoAnaliseFoto.compararCandidatoDuplicado(
                { buffer: req.file.buffer, mimetype: req.file.mimetype },
                denuncia.photo_path
            );
            if (veredito) { iaEhMesmo = veredito.mesmo; iaRaciocinio = veredito.raciocinio; }
        }

        dados.push({
            report_id: denuncia.id,
            description: denuncia.description.length > 100 ? denuncia.description.slice(0, 100) + '…' : denuncia.description,
            photo_url: denuncia.photo_path ? urlApp(denuncia.photo_path) : null,
            status: denuncia.status,
            distance_km: correspondencia.distancia_km,
            score: correspondencia.pontuacao,
            confirmations_count: denuncia.confirmations_count || 0,
            ai_same: iaEhMesmo,
            ai_reasoning: iaRaciocinio,
        });
    }

    res.json({ message: 'ok', data: dados });
});

router.post('/api/ai/duplicates/:id/confirm', aiLimiter, exigirAutenticacao, express.json(), verifyCsrfHeader, async (req, res) => {
    await ConfirmacaoDenuncia.criar(Number(req.params.id), req.usuarioAtual.id);
    res.json({ message: 'Obrigado! A tua confirmação ajuda a priorizar este problema.' });
});

module.exports = router;
