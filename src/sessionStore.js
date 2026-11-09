const session = require('express-session');
const db = require('./db');

/**
 * Store de sessões em PostgreSQL.
 *
 * Porque não `cookie-session`: o cookie assinado é stateless e não pode ser
 * revogado. Com uma tabela de sessões, um logout, uma alteração de password ou
 * uma conta desativada podem invalidar imediatamente todas as sessões do
 * utilizador — essencial num serviço municipal.
 *
 * A tabela `user_sessions` é criada por database/schema.sql.
 */
class PostgresSessionStore extends session.Store {
    constructor({ ttlMs = 1000 * 60 * 60 * 24 * 7 } = {}) {
        super();
        this.ttlMs = ttlMs;
        this.ultimaLimpeza = 0;
    }

    static calcularExpiracao(sessao, ttlMs) {
        const cookie = sessao?.cookie || {};
        if (cookie.expires) {
            const data = new Date(cookie.expires);
            if (!Number.isNaN(data.getTime())) return data;
        }
        const maxAge = Number(cookie.maxAge);
        return new Date(Date.now() + (Number.isFinite(maxAge) && maxAge > 0 ? maxAge : ttlMs));
    }

    static extrairUsuarioId(sessao) {
        const valor = sessao?.userId ?? sessao?.user_id ?? null;
        const numero = Number(valor);
        return Number.isInteger(numero) && numero > 0 ? numero : null;
    }

    get(sid, callback) {
        db.query(
            'SELECT sess FROM user_sessions WHERE sid = ? AND expire > now()',
            [sid]
        ).then(async ({ rows }) => {
            if (!rows.length) return callback(null, null);

            const bruto = rows[0].sess;
            const sessao = typeof bruto === 'string' ? JSON.parse(bruto) : bruto;
            callback(null, sessao);
        }).catch((err) => callback(err));
    }

    set(sid, sessao, callback = () => {}) {
        const expira = PostgresSessionStore.calcularExpiracao(sessao, this.ttlMs);
        const userId = PostgresSessionStore.extrairUsuarioId(sessao);
        const json = JSON.stringify(sessao);

        db.query(
            `INSERT INTO user_sessions (sid, sess, user_id, expire, updated_at)
             VALUES (?, ?::jsonb, ?, ?, now())
             ON CONFLICT (sid) DO UPDATE
                SET sess = EXCLUDED.sess,
                    user_id = EXCLUDED.user_id,
                    expire = EXCLUDED.expire,
                    updated_at = now()`,
            [sid, json, userId, expira]
        ).then(() => {
            this.limparExpiradasOportunisticamente();
            callback(null);
        }).catch((err) => callback(err));
    }

    destroy(sid, callback = () => {}) {
        db.query('DELETE FROM user_sessions WHERE sid = ?', [sid])
            .then(() => callback(null))
            .catch((err) => callback(err));
    }

    touch(sid, sessao, callback = () => {}) {
        const expira = PostgresSessionStore.calcularExpiracao(sessao, this.ttlMs);
        db.query(
            'UPDATE user_sessions SET expire = ?, updated_at = now() WHERE sid = ?',
            [expira, sid]
        ).then(() => callback(null)).catch((err) => callback(err));
    }

    /** Revoga todas as sessões de um utilizador (logout global, mudança de password, desativação). */
    revogarPorUsuario(userId, callback = () => {}) {
        const numero = Number(userId);
        if (!Number.isInteger(numero) || numero <= 0) return callback(null, 0);

        db.query('DELETE FROM user_sessions WHERE user_id = ?', [numero])
            .then(({ rowCount }) => callback(null, rowCount || 0))
            .catch((err) => callback(err));
    }

    /** Limpeza oportunista (no máximo uma vez por hora por instância). */
    limparExpiradasOportunisticamente() {
        const agora = Date.now();
        if (agora - this.ultimaLimpeza < 60 * 60 * 1000) return;
        this.ultimaLimpeza = agora;
        db.query('DELETE FROM user_sessions WHERE expire <= now()').catch(() => {});
    }

    limparExpiradas(callback = () => {}) {
        db.query('DELETE FROM user_sessions WHERE expire <= now()')
            .then(({ rowCount }) => callback(null, rowCount || 0))
            .catch((err) => callback(err));
    }

    length(callback) {
        db.query('SELECT COUNT(*)::int AS total FROM user_sessions WHERE expire > now()')
            .then(({ rows }) => callback(null, rows[0]?.total || 0))
            .catch((err) => callback(err));
    }

    clear(callback = () => {}) {
        db.query('DELETE FROM user_sessions')
            .then(() => callback(null))
            .catch((err) => callback(err));
    }

    all(callback) {
        db.query('SELECT sid, sess FROM user_sessions WHERE expire > now()')
            .then(({ rows }) => {
                const sessoes = {};
                for (const linha of rows) {
                    try {
                        sessoes[linha.sid] = typeof linha.sess === 'string' ? JSON.parse(linha.sess) : linha.sess;
                    } catch {
                        // Ignora linhas corrompidas; o get() também as ignora.
                    }
                }
                callback(null, sessoes);
            })
            .catch((err) => callback(err));
    }
}

module.exports = { PostgresSessionStore };
