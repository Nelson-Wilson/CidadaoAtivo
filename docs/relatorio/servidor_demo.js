/**
 * Servidor de demonstração para capturas de ecrã do relatório final.
 *
 * Usa PGlite em memória (NODE_ENV=test, DATABASE_URL vazio), storage local e IA
 * desligada. Semeia as personas das fixtures e um conjunto de denúncias que
 * cobre todos os estados, categorias e perfis.
 *
 *   node docs/relatorio/servidor_demo.js
 */

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.PORT = process.env.DEMO_PORT || '3031';
process.env.APP_URL = `http://127.0.0.1:${process.env.PORT}`;
process.env.STORAGE_DRIVER = 'local';
process.env.SESSION_SECRET = 'servidor-de-demonstracao-do-relatorio-final';
process.env.AUTH_RATE_LIMIT_MAX = '5000';
process.env.CHATBOT_RATE_LIMIT_MAX = '5000';
process.env.AI_RATE_LIMIT_MAX = '5000';
process.env.COMMENT_RATE_LIMIT_MAX = '5000';
process.env.REPORT_RATE_LIMIT_MAX = '5000';
process.env.AI_FEATURE_CLASSIFICATION = 'false';
process.env.AI_FEATURE_DESCRIPTION_HELPER = 'false';
process.env.AI_FEATURE_DUPLICATES = 'false';
process.env.AI_FEATURE_SUMMARY = 'false';
process.env.AI_FEATURE_PRIORITY = 'false';
process.env.AI_FEATURE_CHATBOT = 'false';
process.env.AI_FEATURE_SMART_DASHBOARD = 'false';
process.env.AI_FEATURE_PHOTO_ANALYSIS = 'false';
process.env.AI_FEATURE_EXECUTIVE_REPORT = 'false';
process.env.GEMINI_API_KEY = '';
process.env.AI_API_KEY = '';

const fs = require('fs');
const path = require('path');

const config = require('../../src/config');
const db = require('../../src/db');
const fixtures = require('../../tests/helpers/fixtures');
const { createApp } = require('../../src/app');

const RAIZ = path.resolve(__dirname, '..', '..');
const ORIGEM_FOTOS = path.join(__dirname, 'fotos_demo');
const DESTINO_FOTOS = path.join(RAIZ, 'public', 'uploads', 'demo');

function copiarFotos() {
    fs.mkdirSync(DESTINO_FOTOS, { recursive: true });
    for (const nome of ['buraco.jpg', 'lixo.jpg', 'iluminacao.jpg', 'agua.jpg']) {
        const origem = path.join(ORIGEM_FOTOS, nome);
        if (fs.existsSync(origem)) {
            fs.copyFileSync(origem, path.join(DESTINO_FOTOS, nome));
        }
    }
}

function diasAtras(dias, horas = 0) {
    return new Date(Date.now() - dias * 86400000 - horas * 3600000).toISOString();
}

async function inserirDenuncia(dados) {
    const r = await db.query(
        `INSERT INTO reports
            (user_id, category_id, description, photo_path, latitude, longitude, neighborhood,
             status, priority, municipality_id, department_id, technician_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING id`,
        [
            dados.userId, dados.categoryId, dados.description, dados.photoPath,
            dados.latitude, dados.longitude, dados.neighborhood, dados.status, dados.priority,
            dados.municipalityId, dados.departmentId, dados.technicianId,
            dados.createdAt, dados.updatedAt || dados.createdAt,
        ]
    );
    return r.rows[0].id;
}

async function historico(reportId, estados, quem, baseDias) {
    let anterior = null;
    let i = 0;
    for (const estado of estados) {
        await db.query(
            `INSERT INTO report_status_histories (report_id, previous_status, new_status, changed_by, note, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [reportId, anterior, estado, quem, null, diasAtras(baseDias, -i * 6)]
        );
        anterior = estado;
        i += 1;
    }
}

async function semearDemonstracao() {
    const f = await fixtures.reiniciarBaseDeDados();
    const { maputo, matola } = f.municipios;
    const { viasMaputo, saneamentoMaputo, viasMatola } = f.departamentos;
    const cat = f.categorias;
    const u = f.utilizadores;

    // Utilizadores adicionais para dar volume realista ao mapa e ao dashboard.
    const hash = await require('bcryptjs').hash('password', 4);
    async function novoUtilizador(nome, email, role, municipioId = null, departamentoId = null) {
        const r = await db.query(
            `INSERT INTO users (name, email, password, role, municipality_id, department_id)
             VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
            [nome, email, hash, role, municipioId, departamentoId]
        );
        return r.rows[0].id;
    }
    const teresa = await novoUtilizador('Teresa Machava', 'teresa@teste.com', 'cidadao');
    const ahmed = await novoUtilizador('Ahmed Cassim', 'ahmed@teste.com', 'cidadao');
    const marina = await novoUtilizador('Marina Nhaca', 'marina@teste.com', 'cidadao');

    // SLAs por categoria (horas).
    const slas = { Buracos: 72, Lixo: 24, 'Iluminação Pública': 48, 'Água': 12 };
    for (const [nome, horas] of Object.entries(slas)) {
        await db.query('UPDATE categories SET sla_hours = ? WHERE id = ?', [horas, cat[nome]]);
    }

    const fotos = {
        buraco: 'uploads/demo/buraco.jpg',
        lixo: 'uploads/demo/lixo.jpg',
        iluminacao: 'uploads/demo/iluminacao.jpg',
        agua: 'uploads/demo/agua.jpg',
    };

    // 1. Recebida — Maria
    const d1 = await inserirDenuncia({
        userId: u.maria, categoryId: cat.Buracos, description:
            'Buraco profundo na Av. Julius Nyerere, junto ao semáforo da Polana. Os carros desviam para a faixa contrária e já partiram dois pneus esta semana.',
        photoPath: fotos.buraco, latitude: -25.9683, longitude: 32.5981, neighborhood: 'Polana',
        status: 'recebida', priority: 'normal', municipalityId: maputo,
        departmentId: viasMaputo, technicianId: null, createdAt: diasAtras(0, 3),
    });
    await historico(d1, ['recebida'], u.maria, 0);

    // 2. Em análise — Maria
    const d2 = await inserirDenuncia({
        userId: u.maria, categoryId: cat.Lixo, description:
            'Acumulação de sacos de lixo e entulho na Rua da Argélia, em frente ao número 84. O contentor está cheio há mais de uma semana e apareceram ratos.',
        photoPath: fotos.lixo, latitude: -25.9612, longitude: 32.6034, neighborhood: 'Sommerschield',
        status: 'em_analise', priority: 'urgente', municipalityId: maputo,
        departmentId: saneamentoMaputo, technicianId: null, createdAt: diasAtras(2),
    });
    await historico(d2, ['recebida', 'em_analise'], u.joao, 2);

    // 3. Atribuída ao Carlos — Rita
    const d3 = await inserirDenuncia({
        userId: u.rita, categoryId: cat['Iluminação Pública'], description:
            'Três postes apagados na Av. Ahmed Sekou Touré, entre o mercado e a escola primária. A rua fica completamente escura a partir das 18h.',
        photoPath: fotos.iluminacao, latitude: -25.9725, longitude: 32.5836, neighborhood: 'Central',
        status: 'atribuida', priority: 'urgente', municipalityId: maputo,
        departmentId: viasMaputo, technicianId: u.carlos, createdAt: diasAtras(4),
    });
    await historico(d3, ['recebida', 'em_analise', 'atribuida'], u.joao, 4);

    // 4. Em execução — Rita
    const d4 = await inserirDenuncia({
        userId: u.rita, categoryId: cat['Água'], description:
            'Fuga de água constante na Av. 24 de Julho, à saída para a Praça 25 de Junho. A água corre pela via há dois dias e está a danificar o asfalto.',
        photoPath: fotos.agua, latitude: -25.9669, longitude: 32.5745, neighborhood: 'Central',
        status: 'em_execucao', priority: 'muito_urgente', municipalityId: maputo,
        departmentId: saneamentoMaputo, technicianId: u.carlos, createdAt: diasAtras(6),
    });
    await historico(d4, ['recebida', 'em_analise', 'atribuida', 'em_execucao'], u.carlos, 6);

    // 5. Resolvida — aguarda avaliação
    const d5 = await inserirDenuncia({
        userId: ahmed, categoryId: cat.Buracos, description:
            'Buraco na Av. Acordos de Lusaka, sentido aeroporto, com cerca de um metro de diâmetro. Já foi tapado provisoriamente com pedra, mas voltou a abrir.',
        photoPath: fotos.buraco, latitude: -25.9249, longitude: 32.5963, neighborhood: 'Malhangalene',
        status: 'resolvida', priority: 'normal', municipalityId: maputo,
        departmentId: viasMaputo, technicianId: u.carlos, createdAt: diasAtras(12),
    });
    await historico(d5, ['recebida', 'em_analise', 'atribuida', 'em_execucao', 'resolvida'], u.carlos, 12);
    await db.query(
        `INSERT INTO report_photo_resolutions (report_id, photo_path, technician_id, note, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [d5, fotos.buraco, u.carlos,
         'Buraco colmatado com mistura asfáltica e compactado. Sinalização removida no fim dos trabalhos.',
         diasAtras(3)]
    );

    // 6. Fechada com avaliação 5
    const d6 = await inserirDenuncia({
        userId: marina, categoryId: cat.Lixo, description:
            'Lixo acumulado junto à Praça dos Heróis Moçambicanos, no lado da Av. Martires de Mueda. Há sacos espalhados pela calçada.',
        photoPath: fotos.lixo, latitude: -25.9151, longitude: 32.5773, neighborhood: 'Polana Cimento',
        status: 'fechada', priority: 'normal', municipalityId: maputo,
        departmentId: saneamentoMaputo, technicianId: u.carlos, createdAt: diasAtras(22),
    });
    await historico(d6, ['recebida', 'em_analise', 'atribuida', 'em_execucao', 'resolvida', 'fechada'], u.carlos, 22);
    await db.query(
        `INSERT INTO report_photo_resolutions (report_id, photo_path, technician_id, note, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [d6, fotos.lixo, u.carlos, 'Contentor substituído e área lavada pela equipa de saneamento.', diasAtras(9)]
    );
    await db.query(
        `INSERT INTO report_ratings (report_id, user_id, score, feedback, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [d6, marina, 5, 'Resolvido em dois dias e a rua ficou limpa. Obrigada pela rapidez.', diasAtras(8)]
    );

    // 7. Rejeitada (duplicado)
    const d7 = await inserirDenuncia({
        userId: u.maria, categoryId: cat.Buracos, description:
            'Buraco na Rua de Tchamba, perto da escola. Parece ser o mesmo que já reportei na semana passada.',
        photoPath: fotos.buraco, latitude: -25.9701, longitude: 32.5999, neighborhood: 'Polana',
        status: 'rejeitada', priority: 'baixa', municipalityId: maputo,
        departmentId: viasMaputo, technicianId: null, createdAt: diasAtras(9),
    });
    await historico(d7, ['recebida', 'em_analise', 'rejeitada'], u.joao, 9);
    await db.query(
        `INSERT INTO report_status_histories (report_id, previous_status, new_status, changed_by, note, created_at)
         VALUES (?, 'em_analise', 'rejeitada', ?, ?, ?)`,
        [d7, u.joao, 'Denúncia duplicada da ocorrência #5, já em intervenção. Acompanha pelo processo original.',
         diasAtras(8)]
    );

    // 8. Em análise — iluminação, prioridade baixa
    await inserirDenuncia({
        userId: ahmed, categoryId: cat['Iluminação Pública'], description:
            'Poste com luz intermitente na Av. Mao Tse Tung, junto à paragem de autocarros. Acende e apaga durante toda a noite.',
        photoPath: fotos.iluminacao, latitude: -25.9399, longitude: 32.5901, neighborhood: 'Malhangalene',
        status: 'em_analise', priority: 'baixa', municipalityId: maputo,
        departmentId: viasMaputo, technicianId: null, createdAt: diasAtras(3),
    });

    // 9. Atribuída — fuga de água
    const d9 = await inserirDenuncia({
        userId: marina, categoryId: cat['Água'], description:
            'Ruptura na conduta da Av. Eduardo Mondlane, junto ao cruzamento com a Rua da Sé. A água está a invadir a estrada.',
        photoPath: fotos.agua, latitude: -25.9679, longitude: 32.5709, neighborhood: 'Central',
        status: 'atribuida', priority: 'urgente', municipalityId: maputo,
        departmentId: saneamentoMaputo, technicianId: u.carlos, createdAt: diasAtras(1, 8),
    });
    await historico(d9, ['recebida', 'em_analise', 'atribuida'], u.joao, 1);

    // 10. Em execução — lixo no Xipamanine
    await inserirDenuncia({
        userId: teresa, categoryId: cat.Lixo, description:
            'Depósito de lixo a céu aberto junto ao Mercado do Xipamanine. O cheiro é forte e há moscas por todo o lado.',
        photoPath: fotos.lixo, latitude: -25.9437, longitude: 32.5561, neighborhood: 'Xipamanine',
        status: 'em_execucao', priority: 'urgente', municipalityId: maputo,
        departmentId: saneamentoMaputo, technicianId: u.carlos, createdAt: diasAtras(8),
    });

    // 11. Recebida — buraco na Av. OUA
    await inserirDenuncia({
        userId: ahmed, categoryId: cat.Buracos, description:
            'Buraco na Av. Organização da Unidade Africana, à altura do número 120. Ocupa meia faixa e obriga a manobras bruscas.',
        photoPath: fotos.buraco, latitude: -25.9556, longitude: 32.5811, neighborhood: 'Alto Maé',
        status: 'recebida', priority: 'normal', municipalityId: maputo,
        departmentId: viasMaputo, technicianId: null, createdAt: diasAtras(0, 9),
    });

    // 12. Resolvida — poste caído
    const d12 = await inserirDenuncia({
        userId: u.rita, categoryId: cat['Iluminação Pública'], description:
            'Poste de iluminação inclinado sobre o passeio na Av. FPLM, junto à entrada do bairro. Há risco de queda sobre os peões.',
        photoPath: fotos.iluminacao, latitude: -25.9022, longitude: 32.6211, neighborhood: 'Costa do Sol',
        status: 'resolvida', priority: 'muito_urgente', municipalityId: maputo,
        departmentId: viasMaputo, technicianId: u.carlos, createdAt: diasAtras(15),
    });
    await historico(d12, ['recebida', 'em_analise', 'atribuida', 'em_execucao', 'resolvida'], u.carlos, 15);
    await db.query(
        `INSERT INTO report_photo_resolutions (report_id, photo_path, technician_id, note, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [d12, fotos.iluminacao, u.carlos, 'Poste removido e substituído por estrutura nova. Cabos isolados.', diasAtras(6)]
    );

    // 13. Matola — demonstra o isolamento municipal
    const d13 = await inserirDenuncia({
        userId: teresa, categoryId: cat.Buracos, description:
            'Buraco na Av. da Namaacha, junto ao mercado da Matola. Já provocou a queda de um motociclista.',
        photoPath: fotos.buraco, latitude: -25.9622, longitude: 32.4589, neighborhood: 'Matola',
        status: 'atribuida', priority: 'urgente', municipalityId: matola,
        departmentId: viasMatola, technicianId: null, createdAt: diasAtras(5),
    });
    await historico(d13, ['recebida', 'em_analise', 'atribuida'], u.ana, 5);

    // 14. Fechada com avaliação 4 (Matola)
    const d14 = await inserirDenuncia({
        userId: teresa, categoryId: cat['Água'], description:
            'Fuga de água na Rua da Beira, bairro da Matola Rio. A água corre para dentro dos quintais.',
        photoPath: fotos.agua, latitude: -25.9488, longitude: 32.4711, neighborhood: 'Matola Rio',
        status: 'fechada', priority: 'normal', municipalityId: matola,
        departmentId: null, technicianId: null, createdAt: diasAtras(19),
    });
    await historico(d14, ['recebida', 'em_analise', 'atribuida', 'em_execucao', 'resolvida', 'fechada'], u.ana, 19);
    await db.query(
        `INSERT INTO report_ratings (report_id, user_id, score, feedback, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [d14, teresa, 4, 'Resolvido, mas demorou alguns dias até aparecer a equipa.', diasAtras(5)]
    );

    // Apoios ("Também me afeta")
    const apoios = [
        [d1, [u.rita, ahmed, marina, teresa]],
        [d2, [u.maria, marina, ahmed]],
        [d3, [u.maria, ahmed]],
        [d4, [u.rita, marina, teresa, ahmed, u.maria]],
        [d5, [u.maria, u.rita]],
        [d6, [u.maria, teresa, ahmed]],
        [d9, [u.rita, ahmed]],
        [d12, [marina, teresa]],
    ];
    for (const [denunciaId, usuarios] of apoios) {
        for (const usuarioId of usuarios) {
            await db.query(
                'INSERT INTO report_confirmations (report_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
                [denunciaId, usuarioId]
            );
        }
    }

    // Comentários públicos e resposta oficial
    await db.query(
        `INSERT INTO report_comments (report_id, user_id, content, is_official, created_at)
         VALUES (?, ?, ?, false, ?)`,
        [d1, u.rita, 'Também passo por aqui todos os dias. O buraco está a aumentar com a chuva.', diasAtras(0, 1)]
    );
    await db.query(
        `INSERT INTO report_comments (report_id, user_id, content, is_official, created_at)
         VALUES (?, ?, ?, true, ?)`,
        [d3, u.joao, 'Equipa de iluminação agendada para esta semana. Obrigado pelo reporte.', diasAtras(3)]
    );
    await db.query(
        `INSERT INTO report_comments (report_id, user_id, content, is_official, created_at)
         VALUES (?, ?, ?, false, ?)`,
        [d3, u.rita, 'Obrigada. O local fica mesmo ao lado da escola, é urgente.', diasAtras(3)]
    );
    await db.query(
        `INSERT INTO report_comments (report_id, user_id, content, is_official, created_at)
         VALUES (?, ?, ?, true, ?)`,
        [d5, u.joao, 'Intervenção concluída. Pedimos que avalie o serviço para encerrarmos o processo.', diasAtras(3)]
    );

    console.log('Demonstração semeada:', {
        denuncias: 14,
        municipios: 2,
        utilizadores: 10,
        fotos: Object.keys(fotos).length,
    });
}

async function iniciar() {
    copiarFotos();
    await semearDemonstracao();
    const app = createApp();
    app.listen(config.port, '127.0.0.1', () => {
        console.log(`Demonstração em http://127.0.0.1:${config.port}`);
    });
}

iniciar().catch((err) => {
    console.error('Falha ao iniciar a demonstração:', err);
    process.exit(1);
});
