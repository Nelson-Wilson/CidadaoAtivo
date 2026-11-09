/**
 * Dados iniciais (idempotente): categorias com SLA, município, departamentos,
 * contas de teste e algumas denúncias de demonstração.
 *
 *   npm run seed                 -> estrutura + contas de teste + demonstração
 *   SEED_DEMO=false npm run seed -> só estrutura (categorias, município, departamentos)
 *
 * Em PRODUÇÃO as contas de teste (password "password") NÃO são criadas, a menos que
 * SEED_TEST_USERS=true. Cria o primeiro administrador com SEED_ADMIN_EMAIL e SEED_ADMIN_PASSWORD.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const config = require('../src/config');
const db = require('../src/db');

const CATEGORIAS = [
    ['Buracos', 72], ['Iluminação Pública', 96], ['Lixo', 48], ['Água', 24], ['Esgotos', 48],
    ['Semáforos', 24], ['Árvores Caídas', 48], ['Construções Perigosas', 24],
    ['Animais Abandonados', 120], ['Vandalismo', 120], ['Segurança', 24], ['Outros', 168],
];

const DEPARTAMENTOS = {
    'Departamento de Vias': ['Buracos', 'Semáforos', 'Construções Perigosas'],
    'Departamento de Saneamento': ['Lixo', 'Esgotos', 'Água'],
    'Departamento de Iluminação': ['Iluminação Pública'],
    'Departamento de Ambiente e Segurança': ['Árvores Caídas', 'Animais Abandonados', 'Vandalismo', 'Segurança', 'Outros'],
};

async function idOuCriar(selectSql, selectParams, insertSql, insertParams) {
    const { rows } = await db.query(selectSql, selectParams);
    if (rows.length) return rows[0].id;
    const criado = await db.query(`${insertSql} RETURNING id`, insertParams);
    return criado.rows[0].id;
}

async function seed() {
    const criarDemo = process.env.SEED_DEMO !== 'false';
    const criarContasTeste = criarDemo && (!config.isProduction || process.env.SEED_TEST_USERS === 'true');
    console.log('A popular a base de dados...');

    const categoryIds = {};
    for (const [nome, sla] of CATEGORIAS) {
        categoryIds[nome] = await idOuCriar(
            'SELECT id FROM categories WHERE name = ?', [nome],
            'INSERT INTO categories (name, sla_hours) VALUES (?, ?)', [nome, sla]
        );
    }
    console.log(`  Categorias: ${Object.keys(categoryIds).length}`);

    const municipalityId = await idOuCriar(
        'SELECT id FROM municipalities WHERE name = ?', ['Conselho Municipal de Maputo'],
        'INSERT INTO municipalities (name, region) VALUES (?, ?)', ['Conselho Municipal de Maputo', 'Maputo Cidade']
    );

    const departmentIds = {};
    for (const [nomeDep, categorias] of Object.entries(DEPARTAMENTOS)) {
        const idDep = await idOuCriar(
            'SELECT id FROM departments WHERE name = ? AND municipality_id = ?', [nomeDep, municipalityId],
            'INSERT INTO departments (name, municipality_id) VALUES (?, ?)', [nomeDep, municipalityId]
        );
        departmentIds[nomeDep] = idDep;
        for (const nomeCat of categorias) {
            await db.query(
                'INSERT INTO category_department (category_id, department_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
                [categoryIds[nomeCat], idDep]
            );
        }
    }
    console.log(`  Município #${municipalityId} e ${Object.keys(departmentIds).length} departamentos`);

    async function seedUser(nome, email, papel, municipio = null, departamento = null, senha = 'password') {
        const { rows } = await db.query('SELECT id FROM users WHERE lower(email) = lower(?)', [email]);
        if (rows.length) return rows[0].id;
        const hash = await bcrypt.hash(senha, 10);
        const criado = await db.query(
            'INSERT INTO users (name, email, password, role, municipality_id, department_id) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
            [nome, email, hash, papel, municipio, departamento]
        );
        return criado.rows[0].id;
    }

    if (process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD) {
        if (process.env.SEED_ADMIN_PASSWORD.length < 12) throw new Error('SEED_ADMIN_PASSWORD deve ter pelo menos 12 caracteres.');
        await seedUser('Administrador', process.env.SEED_ADMIN_EMAIL, 'admin', null, null, process.env.SEED_ADMIN_PASSWORD);
        console.log(`  Administrador: ${process.env.SEED_ADMIN_EMAIL}`);
    }

    let cidadaoId = null;
    if (criarContasTeste) {
        const viasId = departmentIds['Departamento de Vias'];
        cidadaoId = await seedUser('Cidadão Teste', 'cidadao@teste.com', 'cidadao');
        await seedUser('Técnico Teste', 'tecnico@teste.com', 'tecnico', municipalityId, viasId);
        await seedUser('Gestor Municipal Teste', 'municipio@teste.com', 'municipio', municipalityId);
        await seedUser('Administrador Teste', 'admin@teste.com', 'admin');
        console.log('  Contas de teste: cidadao@ / tecnico@ / municipio@ / admin@teste.com  (password: password)');
    } else if (criarDemo) {
        console.log('  Contas de teste ignoradas em produção (use SEED_TEST_USERS=true para as criar).');
    }

    if (cidadaoId) {
        const amostras = [
            { categoria: 'Buracos', bairro: 'Polana', lat: -25.9605, lng: 32.5880 },
            { categoria: 'Iluminação Pública', bairro: 'Sommerschield', lat: -25.9560, lng: 32.5950 },
            { categoria: 'Lixo', bairro: 'Malhangalene', lat: -25.9400, lng: 32.5780 },
            { categoria: 'Esgotos', bairro: 'Coop', lat: -25.9500, lng: 32.6050 },
            { categoria: 'Água', bairro: 'Alto Maé', lat: -25.9720, lng: 32.5660 },
        ];
        for (const a of amostras) {
            const categoryId = categoryIds[a.categoria];
            const { rows } = await db.query(
                'SELECT id FROM reports WHERE user_id = ? AND category_id = ? AND neighborhood = ?',
                [cidadaoId, categoryId, a.bairro]
            );
            if (rows.length) continue;

            const departamento = await db.query(
                'SELECT department_id FROM category_department WHERE category_id = ? LIMIT 1', [categoryId]
            );
            const criado = await db.query(
                `INSERT INTO reports (user_id, category_id, description, latitude, longitude, neighborhood, status, municipality_id, department_id)
                 VALUES (?, ?, ?, ?, ?, ?, 'recebida', ?, ?) RETURNING id`,
                [cidadaoId, categoryId, `Problema de ${a.categoria} reportado no bairro ${a.bairro}.`, a.lat, a.lng, a.bairro, municipalityId, departamento.rows[0]?.department_id ?? null]
            );
            await db.query(
                "INSERT INTO report_status_histories (report_id, previous_status, new_status, changed_by) VALUES (?, NULL, 'recebida', ?)",
                [criado.rows[0].id, cidadaoId]
            );
        }
        console.log(`  Denúncias de demonstração: ${amostras.length}`);
    }

    console.log('\nConcluído.');
}

if (require.main === module) {
    seed()
        .then(() => db.end())
        .catch(async (err) => { console.error('Falha no seed:', err); await db.end().catch(() => {}); process.exit(1); });
}

module.exports = { seed };
