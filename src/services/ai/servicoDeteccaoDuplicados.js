const Denuncia = require('../../models/Denuncia');
const config = require('../../config');

const LIMITE_RESULTADOS = 5;
const PESO_DISTANCIA = 0.6;
const PESO_TEXTO = 0.25;
const PESO_CATEGORIA = 0.15;

function estaAtivo() {
    return config.ai.features.duplicates;
}

function normalizar(texto) {
    return String(texto || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Semelhança de texto (0..1). O PHP tem similar_text() embutido; em Node
 * usamos o coeficiente de Dice sobre bigramas de caracteres — dá um
 * resultado equivalente em espírito (0 = nada parecido, 1 = idêntico).
 */
function semelhancaTexto(a, b) {
    const bigramas = (s) => {
        const lista = [];
        for (let i = 0; i < s.length - 1; i++) lista.push(s.slice(i, i + 2));
        return lista;
    };

    const bigramasA = bigramas(normalizar(a));
    const bigramasB = bigramas(normalizar(b));

    if (bigramasA.length === 0 || bigramasB.length === 0) return 0;

    const cesta = [...bigramasB];
    let correspondencias = 0;
    for (const bg of bigramasA) {
        const index = cesta.indexOf(bg);
        if (index !== -1) { correspondencias++; cesta.splice(index, 1); }
    }

    return (2 * correspondencias) / (bigramasA.length + bigramasB.length);
}

function haversineKm(lat1, lng1, lat2, lng2) {
    const raioTerraKm = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return raioTerraKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function arredondar(valor, casas = 2) {
    const factor = 10 ** casas;
    return Math.round(valor * factor) / factor;
}

/**
 * A confiança é comunicada separadamente da pontuação para não dar a
 * impressão de que dois pontos apenas próximos são o mesmo problema.
 */
function calcularConfianca({ temTexto, mesmaCategoria, semelhanca }) {
    if (temTexto && mesmaCategoria && semelhanca >= 0.45) return 'alta';
    if (temTexto && semelhanca >= 0.7) return 'alta';
    if (mesmaCategoria) return 'media';
    if (temTexto && semelhanca >= 0.35) return 'media';
    return 'baixa';
}

/**
 * Verificação "location-first": a localização é o único dado obrigatório.
 * Categoria e descrição são opcionais e só reforçam a pontuação.
 *
 * @returns {Promise<Array<{
 *   denuncia: object,
 *   distancia_km: number,
 *   semelhanca_texto: number|null,
 *   pontuacao: number,
 *   mesma_categoria: boolean|null,
 *   confianca: 'alta'|'media'|'baixa'
 * }>>}
 */
async function procurarPossiveisDuplicados({ idCategoria = null, lat, lng, descricao = '' } = {}) {
    if (!estaAtivo()) return [];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];

    const raioKm = Number(config.ai.duplicateRadiusKm);
    if (!Number.isFinite(raioKm) || raioKm <= 0) return [];

    const latDelta = raioKm / 111.0;
    const lngDelta = raioKm / (111.0 * Math.max(Math.cos(lat * Math.PI / 180), 0.1));

    const candidatos = await Denuncia.candidatosParaVerificacaoDuplicados(lat, lng, latDelta, lngDelta);

    const texto = String(descricao || '').trim();
    const temTexto = texto.length >= 10;
    const categoriaId = Number(idCategoria) || null;

    const resultados = [];
    for (const denuncia of candidatos) {
        const distanciaKm = haversineKm(lat, lng, parseFloat(denuncia.latitude), parseFloat(denuncia.longitude));
        if (!Number.isFinite(distanciaKm) || distanciaKm > raioKm) continue;

        const semelhanca = temTexto ? semelhancaTexto(texto, denuncia.description || '') : null;
        const mesmaCategoria = categoriaId !== null && Number(denuncia.category_id) === categoriaId;

        // Média ponderada dos sinais disponíveis. Sem categoria nem texto,
        // a pontuação é simplesmente a proximidade — o que permite mostrar
        // ocorrências vizinhas mesmo antes de o cidadão escrever.
        let soma = PESO_DISTANCIA * Math.max(0, 1 - (distanciaKm / raioKm));
        let pesos = PESO_DISTANCIA;

        if (temTexto) {
            soma += PESO_TEXTO * semelhanca;
            pesos += PESO_TEXTO;
        }

        if (categoriaId !== null) {
            soma += PESO_CATEGORIA * (mesmaCategoria ? 1 : 0);
            pesos += PESO_CATEGORIA;
        }

        const pontuacao = soma / pesos;

        resultados.push({
            denuncia,
            distancia_km: arredondar(distanciaKm, 3),
            semelhanca_texto: semelhanca === null ? null : arredondar(semelhanca, 2),
            pontuacao: arredondar(pontuacao, 2),
            mesma_categoria: categoriaId === null ? null : mesmaCategoria,
            confianca: calcularConfianca({ temTexto, mesmaCategoria, semelhanca: semelhanca || 0 }),
        });
    }

    resultados.sort((a, b) => b.pontuacao - a.pontuacao || a.distancia_km - b.distancia_km);
    return resultados.slice(0, LIMITE_RESULTADOS);
}

module.exports = { estaAtivo, procurarPossiveisDuplicados, calcularConfianca };
