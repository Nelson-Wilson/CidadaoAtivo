const Categoria = require('../../models/Categoria');
const config = require('../../config');
const storage = require('../../storage');
const AIClient = require('./aiClient');

function estaAtivo() {
    return config.ai.features.photoAnalysis && AIClient.estaConfigurado();
}

/** Deteta o tipo de imagem pelos primeiros bytes (a IA só aceita jpeg, png e webp). */
function mimePorConteudo(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
    if (buffer.subarray(0, 4).toString('latin1') === 'RIFF' && buffer.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
    return null;
}

/**
 * Constrói um bloco de imagem a partir de:
 * - um Buffer, ou um objeto `{ buffer, mimetype }` (upload em memória);
 * - um caminho local dentro de public/uploads;
 * - um URL público do bucket Supabase configurado.
 *
 * O tipo é sempre determinado pelo conteúdo, não pelo nome ou pelo MIME declarado.
 * Devolve `null` se a imagem não existir ou tiver um formato não suportado —
 * os chamadores tratam isso como "sem análise".
 */
async function blocoImagem(origemFoto) {
    let buffer = null;
    if (Buffer.isBuffer(origemFoto)) {
        buffer = origemFoto;
    } else if (origemFoto && typeof origemFoto === 'object' && Buffer.isBuffer(origemFoto.buffer)) {
        buffer = origemFoto.buffer;
    } else if (typeof origemFoto === 'string' && origemFoto) {
        buffer = await storage.lerBytes(origemFoto);
    }

    const mimeType = mimePorConteudo(buffer);
    if (!mimeType) return null;

    return { type: 'image', mimeType, data: buffer.toString('base64') };
}

/** Extrai JSON mesmo quando o modelo o envolve em markdown ou texto adicional. */
function processarJson(texto) {
    if (typeof texto !== 'string') return null;

    const limpo = texto
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();

    try {
        return JSON.parse(limpo);
    } catch {
        const inicio = limpo.indexOf('{');
        const fim = limpo.lastIndexOf('}');
        if (inicio === -1 || fim === -1 || fim <= inicio) return null;
        try {
            return JSON.parse(limpo.slice(inicio, fim + 1));
        } catch {
            return null;
        }
    }
}

function normalizarNome(texto) {
    return String(texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();
}

/** Chama a API de visão com N blocos de imagem + o prompt; devolve texto ou null. */
async function chamarApiVisao(blocosImagem, prompt, tokensMaximos, opcoes = {}) {
    return AIClient.enviarMensagem({
        messages: [{
            role: 'user',
            content: [...blocosImagem, { type: 'text', text: prompt }],
        }],
        maxTokens: tokensMaximos,
        timeoutMs: config.ai.timeoutMs,
        temperature: 0.2,
        json: Boolean(opcoes.json),
    });
}

/**
 * Analisa a fotografia e devolve categoria sugerida, gravidade e raciocínio.
 * @returns {Promise<{categoria: object|null, gravidade: string, confianca: number, raciocinio: string}|null>}
 */
async function analisar(origemFoto, descricao = '') {
    if (!estaAtivo()) return null;

    const bloco = await blocoImagem(origemFoto);
    if (!bloco) return null;

    const categorias = await Categoria.todas();
    const nomesCategorias = categorias.map((c) => c.name);

    const prompt = `Estás a analisar uma fotografia enviada por um cidadão para reportar um `
        + `problema urbano ao Conselho Municipal de Maputo. `
        + (descricao.trim() !== '' ? `O cidadão descreveu o problema assim: "${descricao}". ` : '')
        + `Escolhe a categoria que melhor descreve o problema visível na foto, `
        + `de entre exactamente estas opções: ${nomesCategorias.join(', ')}. `
        + `Avalia também a gravidade aparente (normal ou alta — usa "alta" só se `
        + `parecer perigoso, obstruir uma via, ou representar risco para pessoas). `
        + `Responde APENAS com um objecto JSON válido, sem markdown, neste formato exacto: `
        + `{"category": "<uma das opções>", "severity": "normal" ou "alta", `
        + `"confidence": <número entre 0 e 1>, "reasoning": "<uma frase curta em português>"}. `
        + `Se a foto não mostrar claramente nenhum destes problemas, usa "category": "Outros".`;

    const texto = await chamarApiVisao([bloco], prompt, 800, { json: true });
    if (!texto) return null;

    const processado = processarJson(texto);
    if (!processado || !processado.category) return null;

    const categoria = categorias.find(
        (c) => normalizarNome(c.name) === normalizarNome(processado.category)
    ) || null;

    if (!categoria) return null;

    const confianca = Number(processado.confidence);

    return {
        categoria,
        gravidade: processado.severity === 'alta' ? 'alta' : 'normal',
        confianca: Number.isFinite(confianca) ? Math.min(1, Math.max(0, confianca)) : 0.5,
        raciocinio: typeof processado.reasoning === 'string' ? processado.reasoning.slice(0, 240) : '',
    };
}

/**
 * Compara visualmente duas fotos para detetar se representam a mesma ocorrência física.
 * @returns {Promise<{mesmo: boolean, raciocinio: string}|null>}
 */
async function compararCandidatoDuplicado(caminhoFotoNova, caminhoFotoExistente) {
    if (!estaAtivo()) return null;

    const prompt = 'A primeira imagem é uma denúncia nova que um cidadão está prestes a enviar. '
        + 'A segunda imagem é de uma denúncia já existente, reportada perto do mesmo local e na '
        + 'mesma categoria. Parecem mostrar o mesmo problema físico (o mesmo buraco, o mesmo '
        + 'monte de lixo, etc.), ou são claramente coisas diferentes? '
        + 'Responde APENAS com um objecto JSON válido, sem markdown: '
        + '{"same": true ou false, "reasoning": "<uma frase muito curta em português>"}.';

    const bloco1 = await blocoImagem(caminhoFotoNova);
    const bloco2 = await blocoImagem(caminhoFotoExistente);
    if (!bloco1 || !bloco2) return null;

    const texto = await chamarApiVisao([bloco1, bloco2], prompt, 500, { json: true });
    if (!texto) return null;

    const processado = processarJson(texto);
    if (!processado || processado.same === undefined) return null;

    return {
        mesmo: processado.same === true,
        raciocinio: typeof processado.reasoning === 'string' ? processado.reasoning.slice(0, 240) : '',
    };
}

/**
 * Compara a foto do problema com a foto da resolução do técnico.
 * @returns {Promise<string|null>} Comentário curto ou null
 */
async function compararResolucao(caminhoFotoOriginal, caminhoFotoResolucao, nomeCategoria) {
    if (!estaAtivo()) return null;

    const prompt = `A primeira imagem é o problema original reportado por um cidadão (categoria: `
        + `"${nomeCategoria}"). A segunda imagem foi enviada por um técnico municipal como `
        + `prova de que o problema foi resolvido. Numa frase curta em português, diz se a `
        + `segunda foto parece mesmo mostrar o mesmo local com o problema corrigido, ou se `
        + `há alguma dúvida. Sê directo e breve (máximo 20 palavras).`;

    const bloco1 = await blocoImagem(caminhoFotoOriginal);
    const bloco2 = await blocoImagem(caminhoFotoResolucao);
    if (!bloco1 || !bloco2) return null;

    const texto = await chamarApiVisao([bloco1, bloco2], prompt, 160);
    return texto ? texto.replace(/^["“]|["”]$/g, '').trim() : null;
}

module.exports = { estaAtivo, analisar, compararCandidatoDuplicado, compararResolucao, mimePorConteudo };
