const { createApp } = require('../../src/app');
const config = require('../../src/config');
const { reiniciarBaseDeDados, criarDenuncia } = require('../helpers/fixtures');
const { novoAgente, iniciarSessao, obterCsrf } = require('../helpers/http');

const app = createApp();
let fixture;
const apiKeyOriginal = config.ai.apiKey;

beforeEach(async () => {
    fixture = await reiniciarBaseDeDados();
    config.ai.features.duplicates = false;
    config.ai.features.descriptionHelper = false;
});

async function sessaoMaria() {
    const agente = novoAgente(app);
    await iniciarSessao(agente, 'maria@teste.com');
    const csrf = await obterCsrf(agente, '/denuncias/nova');
    return { agente, csrf };
}

describe('API de IA — descrição e duplicados', () => {
    test('exige autenticação nos dois endpoints', async () => {
        const anonimo = novoAgente(app);

        await anonimo
            .post('/api/ai/duplicates')
            .field('latitude', '-25.9692')
            .field('longitude', '32.5732')
            .expect(401);

        await anonimo
            .post('/api/ai/description')
            .field('mode', 'improve')
            .field('description', 'Buraco grande na estrada, com risco para os automóveis.')
            .expect(401);
    });

    test('exige o token CSRF nos pedidos autenticados', async () => {
        const { agente } = await sessaoMaria();

        await agente
            .post('/api/ai/duplicates')
            .field('latitude', '-25.9692')
            .field('longitude', '32.5732')
            .expect(419);

        await agente
            .post('/api/ai/description')
            .field('mode', 'improve')
            .field('description', 'Buraco grande na estrada, com risco para os automóveis.')
            .expect(419);
    });

    test('a verificação de duplicados funciona só com GPS/mapa', async () => {
        config.ai.features.duplicates = true;

        const denunciaId = await criarDenuncia({
            userId: fixture.utilizadores.rita,
            categoryId: fixture.categorias.Lixo,
            description: 'Contentor de lixo a transbordar junto ao mercado.',
            latitude: -25.9693,
            longitude: 32.5733,
            bairro: 'Polana',
        });

        const { agente, csrf } = await sessaoMaria();

        const resposta = await agente
            .post('/api/ai/duplicates')
            .set('X-CSRF-Token', csrf)
            .field('latitude', '-25.9692')
            .field('longitude', '32.5732')
            .expect(200);

        expect(resposta.body.data).toHaveLength(1);
        expect(resposta.body.data[0]).toMatchObject({
            report_id: denunciaId,
            category_name: 'Lixo',
            confidence: 'baixa',
            text_similarity: null,
            same_category: null,
        });
        expect(resposta.body.data[0].distance_km).toBeGreaterThan(0);
        expect(resposta.body.data[0].distance_km).toBeLessThan(0.3);
    });

    test('a localização é validada antes de consultar a base de dados', async () => {
        const { agente, csrf } = await sessaoMaria();

        const resposta = await agente
            .post('/api/ai/duplicates')
            .set('X-CSRF-Token', csrf)
            .field('latitude', '999')
            .field('longitude', '32.5732')
            .expect(200);

        expect(resposta.body.data).toEqual([]);
    });

    test('a verificação fica inativa quando a flag está desligada', async () => {
        await criarDenuncia({
            userId: fixture.utilizadores.rita,
            categoryId: fixture.categorias.Lixo,
            latitude: -25.9692,
            longitude: 32.5732,
        });

        const { agente, csrf } = await sessaoMaria();

        const resposta = await agente
            .post('/api/ai/duplicates')
            .set('X-CSRF-Token', csrf)
            .field('latitude', '-25.9692')
            .field('longitude', '32.5732')
            .expect(200);

        expect(resposta.body.data).toEqual([]);
    });

    test('a sugestão de descrição devolve null quando a flag está desligada', async () => {
        const { agente, csrf } = await sessaoMaria();

        const resposta = await agente
            .post('/api/ai/description')
            .set('X-CSRF-Token', csrf)
            .field('mode', 'improve')
            .field('description', 'Buraco grande na Avenida Julius Nyerere, com risco para os automóveis.')
            .expect(200);

        expect(resposta.body.data).toBeNull();
    });

    test('o formulário esconde o assistente quando a IA de descrição está desligada', async () => {
        const { agente } = await sessaoMaria();

        const pagina = await agente.get('/denuncias/nova').expect(200);
        expect(pagina.text).not.toContain('id="ai-description-improve"');
    });

    test('o formulário mostra o assistente quando a IA de descrição está configurada', async () => {
        config.ai.features.descriptionHelper = true;
        config.ai.apiKey = 'chave-de-teste';

        try {
            const { agente } = await sessaoMaria();

            const pagina = await agente.get('/denuncias/nova').expect(200);
            expect(pagina.text).toContain('id="ai-description-improve"');
            expect(pagina.text).toContain('id="ai-description-from-photo"');
            expect(pagina.text).toContain('id="duplicate-warning"');
            expect(pagina.text).toContain('Ocorrências perto deste local');
        } finally {
            config.ai.apiKey = apiKeyOriginal;
        }
    });
});
