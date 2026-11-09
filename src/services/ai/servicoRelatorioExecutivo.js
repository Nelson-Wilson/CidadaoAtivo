const config = require('../../config');
const AIClient = require('./aiClient');

function estaAtivo() {
    return config.ai.features.executiveReport && AIClient.estaConfigurado();
}

/** Relatório determinístico, sempre disponível (também serve de contingência se a IA falhar). */
function gerarPorRegras({ estatisticas: e, categorias, bairros, nomeMunicipio }) {
    const destaques = [];
    const recomendacoes = [];

    destaques.push(`${e.total} ocorrências registadas: ${e.resolvidas} resolvidas (${e.taxa_resolucao}%), ${e.em_execucao} em execução e ${e.pendentes} por analisar.`);
    if (categorias[0]) destaques.push(`Categoria mais reportada: ${categorias[0].name} (${categorias[0].total} ocorrências).`);
    if (bairros[0]) destaques.push(`Bairro com mais ocorrências: ${bairros[0].neighborhood} (${bairros[0].total}, das quais ${bairros[0].urgentes} urgentes abertas).`);
    if (e.tempo_medio_horas !== null) destaques.push(`Tempo médio até à resolução: ${Math.round((e.tempo_medio_horas / 24) * 10) / 10} dias.`);
    if (e.satisfacao_media !== null) destaques.push(`Satisfação dos munícipes: ${e.satisfacao_media}/5 (${e.avaliacoes} avaliações).`);

    if (e.criticas > 0) recomendacoes.push(`Tratar de imediato as ${e.criticas} ocorrências "muito urgentes" ainda abertas.`);
    if (e.sla_atrasadas > 0) recomendacoes.push(`Rever as ${e.sla_atrasadas} ocorrências abertas que já ultrapassaram o prazo (SLA) da sua categoria e reforçar as brigadas responsáveis.`);
    if (e.total > 0 && e.pendentes / e.total > 0.4) recomendacoes.push('Mais de 40% das ocorrências aguardam triagem: aumentar a capacidade de análise e atribuição.');
    if (bairros[0] && bairros[0].urgentes > 0) recomendacoes.push(`Programar uma intervenção concentrada no bairro ${bairros[0].neighborhood}.`);
    if (e.satisfacao_media !== null && e.satisfacao_media < 3.5) recomendacoes.push('A satisfação está abaixo de 3,5/5: analisar os comentários das avaliações e melhorar a comunicação do estado das obras.');
    if (!recomendacoes.length) recomendacoes.push('Sem alertas relevantes: manter o ritmo de resolução e o acompanhamento semanal.');

    return {
        titulo: `Relatório executivo — ${nomeMunicipio}`,
        resumo: destaques[0],
        destaques,
        recomendacoes,
        fonte: 'regras',
    };
}

/** Pede à IA uma narrativa executiva sobre os números reais; se falhar, devolve o relatório por regras. */
async function gerar(dados) {
    const base = gerarPorRegras(dados);
    if (!estaAtivo()) return base;

    const prompt = `Escreve, em português de Moçambique, um relatório executivo curto para a presidência do `
        + `${dados.nomeMunicipio} com base nestes dados reais de ocorrências urbanas (não inventes números): `
        + `${JSON.stringify({ estatisticas: dados.estatisticas, categorias: dados.categorias, bairros: dados.bairros })}. `
        + `Responde APENAS com JSON válido, sem markdown: {"resumo": "<2 a 3 frases>", `
        + `"destaques": ["<até 4 frases curtas>"], "recomendacoes": ["<até 4 acções concretas>"]}.`;

    const texto = await AIClient.enviarMensagem({
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 700,
        timeoutMs: config.ai.timeoutMs,
        temperature: 0.3,
        json: true,
        tentativas: 1,
    });
    if (!texto) return base;

    try {
        const limpo = texto.replace(/^```(json)?/m, '').replace(/```$/m, '').trim();
        const j = JSON.parse(limpo);
        const lista = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).slice(0, 6).map((x) => x.slice(0, 400)) : []);
        if (typeof j.resumo !== 'string' || !j.resumo.trim()) return base;
        return {
            titulo: base.titulo,
            resumo: j.resumo.slice(0, 800),
            destaques: lista(j.destaques).length ? lista(j.destaques) : base.destaques,
            recomendacoes: lista(j.recomendacoes).length ? lista(j.recomendacoes) : base.recomendacoes,
            fonte: 'ia',
        };
    } catch {
        return base;
    }
}

module.exports = { estaAtivo, gerar, gerarPorRegras };
