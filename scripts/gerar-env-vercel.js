/*
 * Gera .env.vercel (ignorado pelo Git) a partir do .env local.
 *
 * Uso: npm run env:vercel
 *
 * O ficheiro gerado pode ser importado diretamente em:
 *   Vercel > Project > Settings > Environment Variables > Import .env
 *
 * Nunca imprime segredos: apenas nomes, comprimentos e prefixos seguros.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ORIGEM = path.join(RAIZ, '.env');
const DESTINO = path.join(RAIZ, '.env.vercel');

if (!fs.existsSync(ORIGEM)) {
    console.error('ERRO: .env nao encontrado. Copie .env.example para .env e preencha os valores.');
    process.exit(1);
}

const atuais = require('dotenv').parse(fs.readFileSync(ORIGEM, 'utf8'));
const obrigatorias = [
    'SESSION_SECRET',
    'DATABASE_URL',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GEMINI_API_KEY',
];

const erros = [];
for (const nome of obrigatorias) {
    if (!String(atuais[nome] || '').trim()) erros.push(`${nome} ausente no .env`);
}

const valor = (nome, padrao = '') => String(atuais[nome] || padrao).trim();

if (valor('SESSION_SECRET').length < 32) erros.push('SESSION_SECRET deve ter pelo menos 32 caracteres');
if (!/^https:\/\//.test(valor('SUPABASE_URL'))) erros.push('SUPABASE_URL deve comecar por https://');
if (!/pooler\.supabase\.com/.test(valor('DATABASE_URL'))) erros.push('DATABASE_URL deve usar o pooler do Supabase');
if (!/^(sb_secret_|eyJ)/.test(valor('SUPABASE_SERVICE_ROLE_KEY'))) erros.push('SUPABASE_SERVICE_ROLE_KEY com formato inesperado');
if (valor('GEMINI_API_KEY').length < 20) erros.push('GEMINI_API_KEY demasiado curta');

if (erros.length) {
    console.error('ERRO: o .env nao esta pronto para producao:');
    for (const erro of erros) console.error(' - ' + erro);
    process.exit(1);
}

// Escapa valores que o parser da Vercel poderia truncar.
const seguro = (v) => (/[#\s"'`]/.test(v) ? JSON.stringify(v) : v);

const conteudo = `# ==============================================================================
# Cidadao Ativo - ambiente de PRODUCAO (Vercel + Supabase + Gemini)
#
# Gerado por: npm run env:vercel
# Importe este ficheiro em:
#   Vercel > Project > Settings > Environment Variables > Import .env
# Marque os ambientes Production e Preview (e Development, se quiser).
#
# NUNCA faca commit deste ficheiro. O .gitignore protege .env e .env.*
# Se o dominio final for diferente, altere apenas APP_URL no .env.
# ==============================================================================

# --- Aplicacao -----------------------------------------------------------------
APP_URL=${seguro(valor('APP_URL', 'https://cidadao-ativo-beta.vercel.app'))}
APP_TIMEZONE=${seguro(valor('APP_TIMEZONE', 'Africa/Maputo'))}
# A Vercel esta atras de 1 proxy (necessario para IP real e cookies secure).
TRUST_PROXY=${seguro(valor('TRUST_PROXY', '1'))}

# --- Sessao (obrigatoria; a app recusa arrancar em producao sem isto) -----------
SESSION_SECRET=${seguro(valor('SESSION_SECRET'))}

# --- Base de dados: Supabase Transaction pooler (porta 6543) --------------------
DATABASE_URL=${seguro(valor('DATABASE_URL'))}
# Cada instancia serverless deve segurar poucas ligacoes.
DB_POOL_MAX=${seguro(valor('DB_POOL_MAX', '3'))}

# --- Fotografias: Supabase Storage (bucket publico) -----------------------------
STORAGE_DRIVER=${seguro(valor('STORAGE_DRIVER', 'supabase'))}
SUPABASE_URL=${seguro(valor('SUPABASE_URL'))}
SUPABASE_SERVICE_ROLE_KEY=${seguro(valor('SUPABASE_SERVICE_ROLE_KEY'))}
SUPABASE_STORAGE_BUCKET=${seguro(valor('SUPABASE_STORAGE_BUCKET', 'ocorrencias'))}
# 4 MB (a Vercel limita o pedido a 4,5 MB).
UPLOAD_MAX_BYTES=${seguro(valor('UPLOAD_MAX_BYTES', '4194304'))}

# --- IA: Google Gemini ----------------------------------------------------------
GEMINI_API_KEY=${seguro(valor('GEMINI_API_KEY'))}
AI_API_URL=${seguro(valor('AI_API_URL', 'https://generativelanguage.googleapis.com/v1beta'))}
AI_MODEL=${seguro(valor('AI_MODEL', 'gemini-3.6-flash'))}
AI_MODEL_FALLBACK=${seguro(valor('AI_MODEL_FALLBACK', 'gemini-3.5-flash-lite'))}
AI_THINKING_LEVEL=${seguro(valor('AI_THINKING_LEVEL', 'LOW'))}
AI_TIMEOUT_MS=${seguro(valor('AI_TIMEOUT_MS', '20000'))}
AI_FEATURE_CLASSIFICATION=${seguro(valor('AI_FEATURE_CLASSIFICATION', 'true'))}
AI_FEATURE_DESCRIPTION_HELPER=${seguro(valor('AI_FEATURE_DESCRIPTION_HELPER', 'true'))}
AI_FEATURE_DUPLICATES=${seguro(valor('AI_FEATURE_DUPLICATES', 'true'))}
AI_FEATURE_SUMMARY=${seguro(valor('AI_FEATURE_SUMMARY', 'true'))}
AI_FEATURE_PRIORITY=${seguro(valor('AI_FEATURE_PRIORITY', 'true'))}
AI_FEATURE_CHATBOT=${seguro(valor('AI_FEATURE_CHATBOT', 'true'))}
AI_FEATURE_SMART_DASHBOARD=${seguro(valor('AI_FEATURE_SMART_DASHBOARD', 'true'))}
AI_FEATURE_PHOTO_ANALYSIS=${seguro(valor('AI_FEATURE_PHOTO_ANALYSIS', 'true'))}
AI_FEATURE_EXECUTIVE_REPORT=${seguro(valor('AI_FEATURE_EXECUTIVE_REPORT', 'true'))}
AI_DUPLICATE_RADIUS_KM=${seguro(valor('AI_DUPLICATE_RADIUS_KM', '0.3'))}
AI_DESCRIPTION_MAX_CHARS=${seguro(valor('AI_DESCRIPTION_MAX_CHARS', '600'))}

# --- Limites de pedidos (por IP) ------------------------------------------------
AUTH_RATE_LIMIT_MAX=${seguro(valor('AUTH_RATE_LIMIT_MAX', '10'))}
COMMENT_RATE_LIMIT_MAX=${seguro(valor('COMMENT_RATE_LIMIT_MAX', '20'))}
CHATBOT_RATE_LIMIT_MAX=${seguro(valor('CHATBOT_RATE_LIMIT_MAX', '15'))}
AI_RATE_LIMIT_MAX=${seguro(valor('AI_RATE_LIMIT_MAX', '30'))}
AI_DESCRIPTION_RATE_LIMIT_MAX=${seguro(valor('AI_DESCRIPTION_RATE_LIMIT_MAX', '8'))}
REPORT_RATE_LIMIT_MAX=${seguro(valor('REPORT_RATE_LIMIT_MAX', '5'))}
`;

fs.writeFileSync(DESTINO, conteudo, 'utf8');

// Confirma que os segredos sobreviveram intactos.
const relido = require('dotenv').parse(fs.readFileSync(DESTINO, 'utf8'));
for (const nome of obrigatorias) {
    if (relido[nome] !== valor(nome)) {
        console.error(`ERRO: ${nome} foi alterado ao gerar .env.vercel.`);
        process.exit(1);
    }
}

const chaves = Object.keys(relido);
console.log('Gerado .env.vercel com ' + chaves.length + ' variaveis.');
console.log('APP_URL: ' + relido.APP_URL);
console.log('Storage: ' + relido.STORAGE_DRIVER + ' / ' + relido.SUPABASE_STORAGE_BUCKET);
console.log('IA: ' + relido.AI_MODEL + ' (fallback ' + relido.AI_MODEL_FALLBACK + ')');
console.log('Segredos conferidos e preservados. Importe o ficheiro na Vercel.');
