require('dotenv').config();

/**
 * Configuração centralizada da aplicação Cidadão Ativo.
 * Pensada para Vercel (serverless) + Supabase (Postgres e Storage).
 */
const env = process.env.NODE_ENV || 'development';
const isProduction = env === 'production';
const isTest = env === 'test';

const segredosFracos = new Set([
    'troca-isto-por-uma-string-aleatoria-longa',
    'muda-isto',
    'segredo',
    'secret',
]);
const sessionSecret = process.env.SESSION_SECRET || 'troca-isto-por-uma-string-aleatoria-longa';

if (isProduction && (!process.env.SESSION_SECRET || segredosFracos.has(sessionSecret) || sessionSecret.length < 32)) {
    // Em produção um segredo previsível permitiria forjar sessões: recusamos arrancar.
    throw new Error(
        '[SEGURANÇA] SESSION_SECRET ausente ou demasiado fraco. '
        + 'Gera uma chave com pelo menos 32 caracteres antes de arrancar em produção.'
    );
}

if (isProduction && !/^https:\/\//.test(process.env.APP_URL || (process.env.VERCEL_URL ? 'https://x' : ''))) {
    console.warn('[SEGURANÇA] APP_URL não usa HTTPS. Cookies seguros e links absolutos podem falhar.');
}

function interpretarTrustProxy(valor) {
    if (valor === undefined || valor === '') return isProduction || Boolean(process.env.VERCEL) ? 1 : false;
    if (valor === 'true') return 1;
    if (valor === 'false') return false;
    const numero = Number(valor);
    return Number.isInteger(numero) && numero >= 0 ? numero : valor;
}

const geminiApiKey = process.env.GEMINI_API_KEY || process.env.AI_API_KEY || null;

// Gemini 3+ pensa por defeito. LOW reduz latência e evita que os tokens de
// raciocínio consumam o maxOutputTokens das respostas curtas da aplicação.
// Deixa AI_THINKING_LEVEL vazio para não enviar thinkingConfig.
const niveisThinking = new Set(['MINIMAL', 'LOW', 'MEDIUM', 'HIGH']);
const thinkingLevelConfigurado = (process.env.AI_THINKING_LEVEL ?? 'LOW').trim().toUpperCase();
const thinkingLevel = thinkingLevelConfigurado === '' || niveisThinking.has(thinkingLevelConfigurado)
    ? thinkingLevelConfigurado
    : 'LOW';

if (isProduction && !geminiApiKey) {
    console.warn(
        '[IA] GEMINI_API_KEY não configurada. O chatbot usará respostas de contingência '
        + 'e a análise de fotografias ficará desativada.'
    );
}

const databaseUrl = process.env.DATABASE_URL || null;
const dbEhLocal = !databaseUrl || /@(localhost|127\.0\.0\.1)/.test(databaseUrl);

const supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const storageSupabase = Boolean(supabaseUrl && supabaseServiceKey) && process.env.STORAGE_DRIVER !== 'local';

const config = {
    env,
    isProduction,
    isTest,
    isVercel: Boolean(process.env.VERCEL),
    port: parseInt(process.env.PORT || '3000', 10),
    appUrl: (process.env.APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')).replace(/\/$/, ''),
    sessionSecret,
    trustProxy: interpretarTrustProxy(process.env.TRUST_PROXY),
    timezone: process.env.APP_TIMEZONE || 'Africa/Maputo',
    db: {
        connectionString: databaseUrl,
        // O Supabase exige TLS; em ligações locais desliga-se.
        ssl: dbEhLocal ? false : { rejectUnauthorized: false },
        // Em serverless cada instância deve segurar poucas ligações (o pooler do Supabase faz o resto).
        max: parseInt(process.env.DB_POOL_MAX || (process.env.VERCEL ? '3' : '10'), 10),
    },
    storage: {
        driver: storageSupabase ? 'supabase' : 'local',
        supabaseUrl,
        serviceKey: supabaseServiceKey,
        bucket: process.env.SUPABASE_BUCKET || 'ocorrencias',
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
