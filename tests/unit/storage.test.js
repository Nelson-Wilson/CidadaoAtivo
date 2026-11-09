const { assinaturaValida } = require('../../src/storage');
const { gerarPorRegras } = require('../../src/services/ai/servicoRelatorioExecutivo');

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20)]);
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(8)]);

describe('assinaturaValida', () => {
    test('aceita jpeg, png e webp reais', () => {
        expect(assinaturaValida(JPEG, 'image/jpeg')).toBe(true);
        expect(assinaturaValida(PNG, 'image/png')).toBe(true);
        expect(assinaturaValida(WEBP, 'image/webp')).toBe(true);
    });

    test('recusa ficheiros cujo conteúdo não corresponde ao mimetype declarado', () => {
        expect(assinaturaValida(Buffer.from('<?php echo 1; ?> texto qualquer'), 'image/jpeg')).toBe(false);
        expect(assinaturaValida(PNG, 'image/jpeg')).toBe(false);
        expect(assinaturaValida(JPEG, 'image/png')).toBe(false);
        expect(assinaturaValida(null, 'image/png')).toBe(false);
        expect(assinaturaValida(PNG, 'application/pdf')).toBe(false);
    });
});

describe('relatório executivo por regras', () => {
    const base = {
        nomeMunicipio: 'Maputo',
        categorias: [{ name: 'Buracos', total: 6 }],
        bairros: [{ neighborhood: 'Polana', total: 4, urgentes: 2 }],
    };
    const stats = { total: 10, resolvidas: 3, taxa_resolucao: 30, em_execucao: 2, pendentes: 5, criticas: 1, sla_atrasadas: 2, tempo_medio_horas: 48, satisfacao_media: 3, avaliacoes: 2 };

    test('cita números reais e gera recomendações coerentes com os alertas', () => {
        const r = gerarPorRegras({ ...base, estatisticas: stats });
        expect(r.fonte).toBe('regras');
        expect(r.resumo).toContain('10 ocorrências');
        const texto = r.recomendacoes.join(' ');
        expect(texto).toContain('1 ocorrências "muito urgentes"');
        expect(texto).toContain('2 ocorrências abertas');
        expect(texto).toContain('Polana');
        expect(texto).toContain('abaixo de 3,5');
    });

    test('sem alertas devolve uma recomendação neutra', () => {
        const r = gerarPorRegras({ ...base, bairros: [], estatisticas: { ...stats, criticas: 0, sla_atrasadas: 0, pendentes: 1, satisfacao_media: 4.5 } });
        expect(r.recomendacoes).toHaveLength(1);
        expect(r.recomendacoes[0]).toContain('Sem alertas');
    });
});

describe('armazenamento Supabase (fetch simulado)', () => {
    let storage;
    let chamadas;

    beforeEach(() => {
        chamadas = [];
        jest.resetModules();
        process.env.SUPABASE_URL = 'https://abc.supabase.co/';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key-de-teste';
        process.env.SUPABASE_BUCKET = 'ocorrencias';
        process.env.STORAGE_DRIVER = 'supabase';
        global.fetch = jest.fn(async (url, opcoes) => {
            chamadas.push({ url, opcoes });
            return { ok: true, status: 200, text: async () => '', arrayBuffer: async () => PNG };
        });
        storage = require('../../src/storage');
    });

    afterEach(() => {
        delete process.env.SUPABASE_URL;
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        process.env.STORAGE_DRIVER = 'local';
        delete global.fetch;
    });

    test('guardar envia o ficheiro ao bucket com a chave de serviço e devolve o URL público', async () => {
        const url = await storage.guardar({ buffer: PNG, mimetype: 'image/png' }, 'reports');
        expect(url).toMatch(/^https:\/\/abc\.supabase\.co\/storage\/v1\/object\/public\/ocorrencias\/reports\/[0-9a-f]{32}\.png$/);

        const [{ url: alvo, opcoes }] = chamadas;
        expect(alvo).toMatch(/^https:\/\/abc\.supabase\.co\/storage\/v1\/object\/ocorrencias\/reports\/[0-9a-f]{32}\.png$/);
        expect(opcoes.method).toBe('POST');
        expect(opcoes.headers.Authorization).toBe('Bearer service-key-de-teste');
        expect(opcoes.headers['Content-Type']).toBe('image/png');
        expect(opcoes.body).toBe(PNG);
    });

    test('guardar recusa conteúdo inválido sem chamar a rede', async () => {
        await expect(storage.guardar({ buffer: Buffer.from('isto não é uma imagem'), mimetype: 'image/png' }, 'reports')).rejects.toThrow('inválido');
        expect(chamadas).toHaveLength(0);
    });

    test('guardar propaga falhas do Supabase (para a rota não gravar uma denúncia sem foto)', async () => {
        global.fetch = jest.fn(async () => ({ ok: false, status: 403, text: async () => 'forbidden' }));
        await expect(storage.guardar({ buffer: PNG, mimetype: 'image/png' }, 'reports')).rejects.toThrow('403');
    });

    test('eliminar converte o URL público no caminho do objeto; ignora URLs de outros sítios', async () => {
        await storage.eliminar('https://abc.supabase.co/storage/v1/object/public/ocorrencias/reports/aaa.png');
        expect(chamadas[0].opcoes.method).toBe('DELETE');
        expect(JSON.parse(chamadas[0].opcoes.body)).toEqual({ prefixes: ['reports/aaa.png'] });

        await storage.eliminar('https://outro-site.com/foto.png');
        expect(chamadas).toHaveLength(1);
    });

    test('lerBytes descarrega o URL guardado; urlPublica deixa URLs completos intactos', async () => {
        const bytes = await storage.lerBytes('https://abc.supabase.co/storage/v1/object/public/ocorrencias/reports/aaa.png');
        expect(Buffer.from(bytes).equals(PNG)).toBe(true);
        expect(storage.urlPublica('https://abc.supabase.co/x.png')).toBe('https://abc.supabase.co/x.png');
        expect(storage.urlPublica('uploads/reports/a.jpg')).toBe('/uploads/reports/a.jpg');
        expect(storage.urlPublica(null)).toBeNull();
    });
});
