const rateLimit = require('express-rate-limit');
const config = require('./config');
const { PostgresRateLimitStore } = require('./rateLimitStore');

/**
 * Cria um limitador com contadores partilhados.
 *
 * - Produção/desenvolvimento: PostgreSQL (funciona em várias instâncias Vercel).
 * - Testes: MemoryStore isolado por limitador, para a suite ser rápida e não
 *   depender da ordem dos pedidos entre ficheiros de teste.
 *
 * Cada limitador recebe a sua própria instância de store: o
 * express-rate-limit recusa reutilizar a mesma instância em middlewares
 * diferentes.
 */
function criarRateLimiter(opcoes) {
    const store = config.isTest
        ? undefined
        : new PostgresRateLimitStore({ windowMs: opcoes.windowMs });

    return rateLimit({
        ...opcoes,
        ...(store ? { store } : {}),
    });
}

module.exports = { criarRateLimiter };
