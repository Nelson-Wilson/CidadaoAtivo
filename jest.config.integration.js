/**
 * Testes de integração: app Express + Postgres real em memória (PGlite).
 * Não precisam de Supabase nem de qualquer servidor: cada ficheiro de teste cria o esquema de database/schema.sql.
 */
module.exports = {
    testEnvironment: 'node',
    testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
    setupFiles: ['<rootDir>/tests/setup/setEnv.js'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup/afterEnv.js'],
    testTimeout: 60000,
    maxWorkers: 1,
    clearMocks: true,
    restoreMocks: true,
};
