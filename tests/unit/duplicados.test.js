jest.mock('../../src/models/Denuncia', () => ({
    candidatosParaVerificacaoDuplicados: jest.fn(),
}));

const Denuncia = require('../../src/models/Denuncia');
const config = require('../../src/config');
const {
    estaAtivo,
    procurarPossiveisDuplicados,
    calcularConfianca,
} = require('../../src/services/ai/servicoDeteccaoDuplicados');

const BASE = { lat: -25.9692, lng: 32.5732 };
const featureOriginal = config.ai.features.duplicates;
const raioOriginal = config.ai.duplicateRadiusKm;

function candidato(overrides = {}) {
    return {
        id: 1,
        category_id: 1,
        description: 'Buraco grande na estrada, com risco para os automóveis.',
        latitude: BASE.lat,
        longitude: BASE.lng,
        ...overrides,
    };
}

describe('Duplicados — verificação location-first', () => {
    beforeEach(() => {
        config.ai.features.duplicates = true;
        config.ai.duplicateRadiusKm = 0.3;
        Denuncia.candidatosParaVerificacaoDuplicados.mockReset();
        Denuncia.candidatosParaVerificacaoDuplicados.mockResolvedValue([]);
    });

    afterAll(() => {
        config.ai.features.duplicates = featureOriginal;
        config.ai.duplicateRadiusKm = raioOriginal;
    });

    test('funciona só com a localização, sem categoria nem descrição', async () => {
        Denuncia.candidatosParaVerificacaoDuplicados.mockResolvedValue([
            candidato({ id: 10, latitude: -25.9693, longitude: 32.5733 }),
        ]);

        const resultados = await procurarPossiveisDuplicados({ lat: BASE.lat, lng: BASE.lng });

        expect(resultados).toHaveLength(1);
        expect(resultados[0]).toMatchObject({
            distancia_km: 0.015,
            semelhanca_texto: null,
            mesma_categoria: null,
            confianca: 'baixa',
        });
        expect(resultados[0].pontuacao).toBeGreaterThan(0.9);
        expect(Denuncia.candidatosParaVerificacaoDuplicados).toHaveBeenCalledWith(
            BASE.lat,
            BASE.lng,
            expect.any(Number),
            expect.any(Number)
        );
    });

    test('descarta candidatos fora do raio de 300 m', async () => {
        Denuncia.candidatosParaVerificacaoDuplicados.mockResolvedValue([
            candidato({ id: 11, latitude: -25.98, longitude: 32.5732 }),
        ]);

        const resultados = await procurarPossiveisDuplicados({ lat: BASE.lat, lng: BASE.lng });

        expect(resultados).toHaveLength(0);
    });

    test('a categoria é opcional: mostra outras categorias, mas pontua melhor a mesma', async () => {
        Denuncia.candidatosParaVerificacaoDuplicados.mockResolvedValue([
            candidato({ id: 12, category_id: 1, latitude: -25.9694, longitude: 32.5732 }),
            candidato({ id: 13, category_id: 2, latitude: -25.9694, longitude: 32.5732 }),
        ]);

        const resultados = await procurarPossiveisDuplicados({
            idCategoria: 1,
            lat: BASE.lat,
            lng: BASE.lng,
        });

        expect(resultados).toHaveLength(2);
        expect(resultados[0].denuncia.id).toBe(12);
        expect(resultados[0].mesma_categoria).toBe(true);
        expect(resultados[0].confianca).toBe('media');
        expect(resultados[1].mesma_categoria).toBe(false);
        expect(resultados[1].confianca).toBe('baixa');
    });

    test('texto muito parecido e mesma categoria elevam a confiança para alta', async () => {
        Denuncia.candidatosParaVerificacaoDuplicados.mockResolvedValue([
            candidato({ id: 14, category_id: 1 }),
        ]);

        const resultados = await procurarPossiveisDuplicados({
            idCategoria: 1,
            lat: BASE.lat,
            lng: BASE.lng,
            descricao: 'Buraco grande na estrada, com risco para os automóveis.',
        });

        expect(resultados[0].semelhanca_texto).toBe(1);
        expect(resultados[0].confianca).toBe('alta');
    });

    test('uma descrição curta é ignorada e não impede a verificação por localização', async () => {
        Denuncia.candidatosParaVerificacaoDuplicados.mockResolvedValue([candidato({ id: 15 })]);

        const resultados = await procurarPossiveisDuplicados({
            lat: BASE.lat,
            lng: BASE.lng,
            descricao: 'lixo',
        });

        expect(resultados).toHaveLength(1);
        expect(resultados[0].semelhanca_texto).toBeNull();
    });

    test('ordena por pontuação e limita a cinco resultados', async () => {
        Denuncia.candidatosParaVerificacaoDuplicados.mockResolvedValue([
            candidato({ id: 21, latitude: -25.96925, longitude: 32.5732 }),
            candidato({ id: 22, latitude: -25.9693, longitude: 32.5732 }),
            candidato({ id: 23, latitude: -25.96935, longitude: 32.5732 }),
            candidato({ id: 24, latitude: -25.9694, longitude: 32.5732 }),
            candidato({ id: 25, latitude: -25.96945, longitude: 32.5732 }),
            candidato({ id: 26, latitude: -25.9695, longitude: 32.5732 }),
        ]);

        const resultados = await procurarPossiveisDuplicados({ lat: BASE.lat, lng: BASE.lng });

        expect(resultados).toHaveLength(5);
        expect(resultados.map((r) => r.denuncia.id)).toEqual([21, 22, 23, 24, 25]);
        expect(resultados[0].distancia_km).toBeLessThan(resultados[4].distancia_km);
    });

    test('não faz consultas quando a funcionalidade está desligada', async () => {
        config.ai.features.duplicates = false;

        await expect(procurarPossiveisDuplicados({ lat: BASE.lat, lng: BASE.lng })).resolves.toEqual([]);
        expect(Denuncia.candidatosParaVerificacaoDuplicados).not.toHaveBeenCalled();
    });

    test('estaAtivo reflecte a flag de configuração', () => {
        expect(estaAtivo()).toBe(true);
        config.ai.features.duplicates = false;
        expect(estaAtivo()).toBe(false);
    });

    test('calcularConfianca distingue proximidade, categoria e texto', () => {
        expect(calcularConfianca({ temTexto: false, mesmaCategoria: false, semelhanca: 0 })).toBe('baixa');
        expect(calcularConfianca({ temTexto: false, mesmaCategoria: true, semelhanca: 0 })).toBe('media');
        expect(calcularConfianca({ temTexto: true, mesmaCategoria: true, semelhanca: 0.5 })).toBe('alta');
        expect(calcularConfianca({ temTexto: true, mesmaCategoria: false, semelhanca: 0.72 })).toBe('alta');
        expect(calcularConfianca({ temTexto: true, mesmaCategoria: false, semelhanca: 0.4 })).toBe('media');
    });
});
