const db = require('./db');

/**
 * Store de rate limiting em PostgreSQL.
 *
 * A Vercel executa várias instâncias serverless em paralelo. O MemoryStore do
 * express-rate-limit conta por instância, pelo que um atacante poderia
 * multiplicar o limite pelo número de instâncias. Esta tabela partilha os
 * contadores entre todas as instâncias.
 *
 * A tabela `rate_limits` é criada por database/schema.sql.
 */
class PostgresRateLimitStore {
    constructor({ windowMs = 60 * 1000 } = {}) {
        this.windowMs = windowMs;
        this.ultimaLimpeza = 0;
        // Indica ao express-rate-limit que as chaves são partilhadas entre
        // instâncias (evita os avisos de dupla contagem).
        this.localKeys = false;
    }

    init(options) {
        const janela = Number(options?.windowMs);
        if (Number.isFinite(janela) && janela > 0) this.windowMs = janela;
    }

    async increment(key) {
        const chave = String(key).slice(0, 255);
        const resetTime = new Date(Date.now() + this.windowMs);

        try {
            const { rows } = await db.query(
                `INSERT INTO rate_limits (key, total_hits, reset_time, updated_at)
                 VALUES (?, 1, ?, now())
                 ON CONFLICT (key) DO UPDATE
                    SET total_hits = CASE
                            WHEN rate_limits.reset_time <= now() THEN 1
                            ELSE rate_limits.total_hits + 1
                        END,
                        reset_time = CASE
                            WHEN rate_limits.reset_time <= now() THEN EXCLUDED.reset_time
                            ELSE rate_limits.reset_time
                        END,
                        updated_at = now()
                 RETURNING total_hits, reset_time`,
                [chave, resetTime]
            );

            this.limparExpiradasOportunisticamente();

            return {
                totalHits: Number(rows[0]?.total_hits) || 1,
                resetTime: rows[0]?.reset_time ? new Date(rows[0].reset_time) : resetTime,
            };
        } catch (err) {
            // Nunca transformar uma falha transitória da BD numa indisponibilidade
            // total do login. A sessão e a autenticação continuam a exigir a BD.
            console.error('[RateLimit] Falha ao incrementar contador:', err.message);
            return { totalHits: 1, resetTime };
        }
    }

    async decrement(key) {
        try {
            await db.query(
                `UPDATE rate_limits
                    SET total_hits = GREATEST(total_hits - 1, 0), updated_at = now()
                  WHERE key = ?`,
                [String(key).slice(0, 255)]
            );
        } catch (err) {
            console.error('[RateLimit] Falha ao decrementar contador:', err.message);
        }
    }

    async resetKey(key) {
        try {
            await db.query('DELETE FROM rate_limits WHERE key = ?', [String(key).slice(0, 255)]);
        } catch (err) {
            console.error('[RateLimit] Falha ao reiniciar contador:', err.message);
        }
    }

    async resetAll() {
        await db.query('DELETE FROM rate_limits').catch((err) => {
            console.error('[RateLimit] Falha ao limpar contadores:', err.message);
        });
    }

    /** Remove contadores expirados (no máximo uma vez por hora por instância). */
    limparExpiradasOportunisticamente() {
        const agora = Date.now();
        if (agora - this.ultimaLimpeza < 60 * 60 * 1000) return;
        this.ultimaLimpeza = agora;
        db.query("DELETE FROM rate_limits WHERE reset_time < now() - interval '1 hour'")
            .catch(() => {});
    }
}

module.exports = { PostgresRateLimitStore };
