/**
 * Ambiente isolado dos testes Jest.
 *
 * Força a base de dados de teste e desactiva as chamadas externas de IA para
 * que a suite seja determinística e não gaste tokens.
 */
process.env.NODE_ENV = 'test';
delete process.env.DATABASE_URL; // os testes usam sempre o Postgres em memória (PGlite)
process.env.STORAGE_DRIVER = 'local';
process.env.SESSION_SECRET = 'segredo-apenas-para-testes';
process.env.AUTH_RATE_LIMIT_MAX = '1000';
process.env.APP_URL = 'http://127.0.0.1:3000';
process.env.AI_FEATURE_CLASSIFICATION = 'false';
process.env.AI_FEATURE_DUPLICATES = 'false';
process.env.AI_FEATURE_SUMMARY = 'false';
process.env.AI_FEATURE_PRIORITY = 'false';
process.env.AI_FEATURE_CHATBOT = 'false';
process.env.AI_FEATURE_SMART_DASHBOARD = 'false';
process.env.AI_FEATURE_PHOTO_ANALYSIS = 'false';
process.env.AI_FEATURE_EXECUTIVE_REPORT = 'false';
process.env.AI_API_KEY = '';
