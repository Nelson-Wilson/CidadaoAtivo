require('dotenv').config();

/**
 * Configuração centralizada da aplicação Cidadão Ativo.
 *
 * Alvo de produção: Vercel (função serverless) + Supabase (Postgres e Storage)
 * + Google Gemini (chatbot, classificação, visão e relatório executivo).
 *
 * As validações abaixo falham cedo em produção em vez de deixar a aplicação
 * arrancar com segredos previsíveis ou armazenamento efémero.
 */
const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';
const isTest = env === 'test';
const isVercel = Boolean(process.env.VERCEL);

const SEGREDO_EXEMPLO = 'troca-isto-por-uma-string-aleatoria-longa';
const segredosFracos = new Set([SEGREDO_EXEMPLO, 'muda-isto', 'segredo', 'secret', '']);
const sessionSecret = process.env.SESSION_SECRET || SEGREDO_EXEMPLO;

if (isProduction && (segredosFracos.has(sessionSecret) || sessionSecret.length < 32)) {
    throw new Error(
        '[SEGURANÇA] SESSION_SECRET ausente ou demasiado fraco. '
        + 'Gera uma chave com pelo menos 32 caracteres antes de arrancar em produção.'
    );
}

const databaseUrl = (process.env.DATABASE_URL || '').trim() || null;
const dbEhLocal = !databaseUrl || /@(localhost|127\.0\.0\.1)/.test(databaseUrl);

if (isProduction && !databaseUrl) {
    throw new Error('[Base de dados] DATABASE_URL não definido. Usa a connection string do Supabase (Transaction pooler, porta 6543).');
}

function interpretarTrustProxy(valor) {
    if (valor === undefined || valor === '') return 1;
    if (valor === 'true') return 1;
    if (valor === 'false') return false;
    const numero = Number(valor);
    return Number.isInteger(numero) && numero >= 0 ? numero : valor;
}

const supabaseUrl = (process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
const supabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const supabaseBucket = (process.env.SUPABASE_STORAGE_BUCKET || process.env.SUPABASE_BUCKET || 'ocorrencias').trim();

if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(supabaseBucket)) {
    throw new Error('[Storage] SUPABASE_STORAGE_BUCKET deve usar apenas minúsculas, números e hífenes.');
}

const storagePedido = (process.env.STORAGE_DRIVER || '').trim().toLowerCase();
if (storagePedido && !['local', 'supabase'].includes(storagePedido)) {
    throw new Error(`[Storage] STORAGE_DRIVER inválido: "${storagePedido}". Usa "local" ou "supabase".`);
}

// Se não for indicado explicitamente, usa Supabase quando há credenciais.
// Em testes usa local por omissão para não tocar na rede, mas um teste pode
// forçar STORAGE_DRIVER=supabase para simular o fetch.
const storageDriver = storagePedido || (isTest ? 'local' : (supabaseUrl && supabaseKey ? 'supabase' : 'local'));

if (storageDriver === 'supabase' && (!/^https:\/\//.test(supabaseUrl) || !supabaseKey)) {
    throw new Error('[Storage] STORAGE_DRIVER=supabase exige SUPABASE_URL (https) e SUPABASE_SERVICE_ROLE_KEY.');
}

if (isVercel && storageDriver === 'local') {
    throw new Error('[Storage] Na Vercel o disco é só de leitura. Define STORAGE_DRIVER=supabase com as credenciais do Supabase.');
}

const geminiApiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || null;

// Gemini 3+ pensa por omissão. LOW reduz latência e evita que os tokens de
// raciocínio consumam o maxOutputTokens das respostas curtas.
const niveisThinking = new Set(['MINIMAL', 'LOW', 'MEDIUM', 'HIGH']);
const thinkingConfigurado = (process.env.AI_THINKING_LEVEL ?? 'LOW').trim().toUpperCase();
const thinkingLevel = thinkingConfigurado === '' || niveisThinking.has(thinkingConfigurado)
    ? thinkingConfigurado
    : 'LOW';

if (isProduction && !geminiApiKey) {
    console.warn(
        '[IA] GEMINI_API_KEY não configurada. O chatbot usará respostas de contingência '
        + 'e a análise de fotografias ficará desativada.'
    );
}

const config = {
    env,
    isProduction,
    isTest,
    isVercel,
    port: parseInt(process.env.PORT || '3000', 10),
    appUrl: (process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')).replace(/\/$/, ''),
    sessionSecret,
    trustProxy: interpretarTrustProxy(process.env.TRUST_PROXY),
    timezone: process.env.APP_TIMEZONE || 'Africa/Maputo',
    session: {
        nome: 'cidadao_ativo_sid',
        maxAgeMs: 1000 * 60 * 60 * 24 * 7, // 7 dias
    },
    db: {
        connectionString: databaseUrl,
        // O Supabase exige TLS; em ligações locais desliga-se.
        ssl: dbEhLocal ? false : { rejectUnauthorized: false },
        // Em serverless cada instância deve segurar poucas ligações.
        max: parseInt(process.env.DB_POOL_MAX || (isVercel ? '3' : '10'), 10),
    },
    storage: {
        driver: storageDriver,
        supabaseUrl,
        serviceKey: supabaseKey,
        // Alias usado por algum código/teste antigo.
        supabaseKey,
        bucket: supabaseBucket,
        // A Vercel limita o corpo de um pedido a 4,5 MB: ficamos abaixo disso.
        maxBytes: parseInt(process.env.UPLOAD_MAX_BYTES || String(4 * 1024 * 1024), 10),
    },
    ai: {
        provider: 'gemini',
        apiKey: geminiApiKey,
        apiUrl: (process.env.AI_API_URL || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, ''),
        model: process.env.AI_MODEL || 'gemini-3.6-flash',
        fallbackModel: process.env.AI_MODEL_FALLBACK || 'gemini-3.5-flash-lite',
        thinkingLevel,
        timeoutMs: parseInt(process.env.AI_TIMEOUT_MS || '20000', 10),
        features: {
            classification: (process.env.AI_FEATURE_CLASSIFICATION ?? 'true') !== 'false',
            duplicates: (process.env.AI_FEATURE_DUPLICATES ?? 'true') !== 'false',
            summary: (process.env.AI_FEATURE_SUMMARY ?? 'true') !== 'false',
            priority: (process.env.AI_FEATURE_PRIORITY ?? 'true') !== 'false',
            chatbot: (process.env.AI_FEATURE_CHATBOT ?? 'true') !== 'false',
            smartDashboard: (process.env.AI_FEATURE_SMART_DASHBOARD ?? 'true') !== 'false',
            photoAnalysis: (process.env.AI_FEATURE_PHOTO_ANALYSIS ?? 'true') !== 'false',
            executiveReport: (process.env.AI_FEATURE_EXECUTIVE_REPORT ?? 'true') !== 'false',
        },
        duplicateRadiusKm: parseFloat(process.env.AI_DUPLICATE_RADIUS_KM || '0.3'),
    },
};

module.exports = config;
