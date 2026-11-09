/* Preflight de produção — não imprime segredos. */
require('dotenv').config();
// Valida sempre o cenário de produção, mesmo que o shell local esteja em development.
process.env.NODE_ENV = 'production';
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const falhas = [];
const ok = (msg) => console.log('OK   ' + msg);
const falha = (msg) => { falhas.push(msg); console.log('FALHA ' + msg); };
const aviso = (msg) => console.log('AVISO ' + msg);

function presente(nome, minimo = 1) {
    const valor = process.env[nome] || '';
    if (valor.length < minimo) {
        falha(`${nome} ausente ou demasiado curto`);
        return false;
    }
    ok(`${nome} definido (${valor.length} caracteres)`);
    return true;
}

(async () => {
    console.log('--- Variáveis ---');
    presente('SESSION_SECRET', 32);
    presente('DATABASE_URL', 20);
    presente('SUPABASE_URL', 20);
    presente('SUPABASE_SERVICE_ROLE_KEY', 20);
    presente('GEMINI_API_KEY', 20);

    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'ocorrencias';
    ok(`bucket configurado: ${bucket}`);

    console.log('\n--- Base de dados ---');
    let db;
    try {
        db = require(path.join(RAIZ, 'src', 'db'));
        const { rows } = await db.query(
            'SELECT current_database() AS base, current_user AS utilizador, version() AS versao'
        );
        const linha = rows[0];
        ok(`ligação estabelecida (base=${linha.base}, utilizador=${linha.utilizador})`);
        console.log('     ' + String(linha.versao).split(',')[0]);

        const esperadas = [
            'municipalities', 'departments', 'users', 'user_sessions', 'rate_limits',
            'categories', 'category_department', 'reports', 'report_status_histories',
            'report_photo_resolutions', 'report_confirmations', 'report_comments', 'report_ratings',
        ];
        const { rows: tabelas } = await db.query(
            "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'"
        );
        const mapa = new Map(tabelas.map((t) => [t.tablename, t.rowsecurity]));
        for (const nome of esperadas) {
            if (!mapa.has(nome)) falha(`tabela em falta: ${nome}`);
            else if (!mapa.get(nome)) aviso(`RLS desligado em ${nome}`);
        }
        if (esperadas.every((n) => mapa.has(n))) ok(`todas as ${esperadas.length} tabelas do schema existem`);
        if (esperadas.every((n) => mapa.get(n))) ok('RLS ativo em todas as tabelas do schema');

        const { rows: colunas } = await db.query(
            `SELECT table_name, column_name
               FROM information_schema.columns
              WHERE table_schema = 'public'
                AND ((table_name = 'report_status_histories' AND column_name = 'note')
                  OR (table_name = 'report_photo_resolutions' AND column_name = 'note')
                  OR (table_name = 'reports' AND column_name IN ('technician_id', 'municipality_id', 'department_id')))`
        );
        const nomesColunas = new Set(colunas.map((c) => `${c.table_name}.${c.column_name}`));
        for (const c of [
            'report_status_histories.note',
            'report_photo_resolutions.note',
            'reports.technician_id',
            'reports.municipality_id',
            'reports.department_id',
        ]) {
            if (!nomesColunas.has(c)) falha(`coluna em falta: ${c}`);
        }
        if (nomesColunas.size >= 5) ok('colunas de notas, técnico e encaminhamento presentes');

        const { rows: contagens } = await db.query(
            `SELECT (SELECT count(*) FROM municipalities) AS municipios,
                    (SELECT count(*) FROM departments) AS departamentos,
                    (SELECT count(*) FROM categories) AS categorias,
                    (SELECT count(*) FROM users) AS utilizadores,
                    (SELECT count(*) FROM reports) AS denuncias`
        );
        const c = contagens[0];
        console.log(`     dados: ${c.municipios} município(s), ${c.departamentos} departamento(s), ${c.categorias} categoria(s), ${c.utilizadores} utilizador(es), ${c.denuncias} denúncia(s)`);
        if (Number(c.municipios) === 0) aviso('sem municípios: corre npm run seed');
        if (Number(c.categorias) === 0) aviso('sem categorias: corre npm run seed');
        if (Number(c.utilizadores) === 0) aviso('sem utilizadores: cria o primeiro admin com npm run seed');
    } catch (err) {
        falha(`ligação/schema: ${err.code || err.message}`);
    }

    console.log('\n--- Supabase Storage ---');
    const base = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
    const chave = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const cabecalhos = { Authorization: `Bearer ${chave}`, apikey: chave };
    try {
        const resposta = await fetch(`${base}/storage/v1/bucket/${bucket}`, { headers: cabecalhos });
        if (!resposta.ok) {
            falha(`bucket ${bucket}: HTTP ${resposta.status}`);
            console.log('     ' + (await resposta.text()).slice(0, 300));
        } else {
            const dados = await resposta.json();
            ok(`bucket ${bucket}: público=${dados.public}, limite=${dados.file_size_limit ?? 'sem limite'}`);
            if (!dados.public) aviso('o bucket não é público: as fotos não abrem no browser');
            const mimes = dados.allowed_mime_types;
            if (Array.isArray(mimes) && !['image/jpeg', 'image/png', 'image/webp'].every((m) => mimes.includes(m))) {
                aviso('MIME types do bucket não incluem jpeg/png/webp');
            }
        }
    } catch (err) {
        falha(`bucket ${bucket}: ${err.message}`);
    }

    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
    const objeto = `preflight/${Date.now()}-${Math.random().toString(16).slice(2)}.png`;
    try {
        const upload = await fetch(`${base}/storage/v1/object/${bucket}/${objeto}`, {
            method: 'POST',
            headers: { ...cabecalhos, 'Content-Type': 'image/png', 'x-upsert': 'true' },
            body: png,
        });
        if (!upload.ok) {
            falha(`upload de teste: HTTP ${upload.status}`);
            console.log('     ' + (await upload.text()).slice(0, 300));
        } else {
            ok('upload de teste concluído');
            const leitura = await fetch(`${base}/storage/v1/object/public/${bucket}/${objeto}?t=${Date.now()}`);
            if (!leitura.ok) falha(`leitura pública de teste: HTTP ${leitura.status}`);
            else {
                const corpo = Buffer.from(await leitura.arrayBuffer());
                if (corpo.equals(png)) ok('leitura pública do objeto devolve os mesmos bytes');
                else falha('leitura pública devolveu conteúdo diferente');
            }
            const remocao = await fetch(`${base}/storage/v1/object/${bucket}/${objeto}`, {
                method: 'DELETE',
                headers: cabecalhos,
            });
            if (!remocao.ok) falha(`remoção do objeto de teste: HTTP ${remocao.status}`);
            else ok('objeto de teste removido');
        }
    } catch (err) {
        falha(`teste de storage: ${err.message}`);
    }

    console.log('\n--- Google Gemini ---');
    const chaveGemini = process.env.GEMINI_API_KEY || '';
    const modelo = process.env.AI_MODEL || 'gemini-3.6-flash';
    const fallback = process.env.AI_MODEL_FALLBACK || 'gemini-3.5-flash-lite';
    try {
        const resposta = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', {
            headers: { 'x-goog-api-key': chaveGemini },
        });
        if (!resposta.ok) {
            falha(`listagem de modelos: HTTP ${resposta.status}`);
            console.log('     ' + (await resposta.text()).slice(0, 300));
        } else {
            const dados = await resposta.json();
            const modelos = (dados.models || [])
                .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
                .map((m) => m.name.replace(/^models\//, ''));
            console.log(`     ${modelos.length} modelos com generateContent`);
            const modeloOk = modelos.includes(modelo);
            const fallbackOk = modelos.includes(fallback);
            if (modeloOk) ok(`modelo principal disponível: ${modelo}`);
            else {
                falha(`modelo principal NÃO disponível: ${modelo}`);
                const flash = modelos.filter((m) => /flash/i.test(m)).slice(0, 20);
                console.log('     modelos flash disponíveis: ' + flash.join(', '));
            }
            if (fallbackOk) ok(`fallback disponível: ${fallback}`);
            else {
                aviso(`fallback NÃO disponível: ${fallback}`);
                if (!modeloOk) {
                    const flashLite = modelos.filter((m) => /flash.*lite/i.test(m)).slice(0, 10);
                    console.log('     fallbacks lite disponíveis: ' + flashLite.join(', '));
                }
            }

            if (modeloOk) {
                const AIClient = require(path.join(RAIZ, 'src', 'services', 'ai', 'aiClient'));
                const texto = await AIClient.enviarMensagem({
                    systemPrompt: 'Responde apenas com a palavra OK.',
                    messages: [{ role: 'user', content: 'ping' }],
                    maxTokens: 8,
                    temperature: 0,
                    tentativas: 1,
                });
                if (texto && texto.trim()) ok('chamada generateContent devolveu texto: ' + texto.trim().slice(0, 40));
                else falha('chamada generateContent não devolveu texto');
            }
        }
    } catch (err) {
        falha(`Gemini: ${err.message}`);
    }

    if (db) await db.end().catch(() => {});
    console.log('\n--- Resultado ---');
    if (falhas.length) {
        console.log(`FALHAS (${falhas.length}):`);
        for (const f of falhas) console.log(' - ' + f);
        process.exitCode = 1;
    } else {
        console.log('Todos os testes de produção passaram.');
    }
})();
