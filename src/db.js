/**
 * Camada de acesso à base de dados (PostgreSQL / Supabase).
 *
 *  - Produção/desenvolvimento: `pg` ligado ao DATABASE_URL (use o pooler do
 *    Supabase em modo "transaction", porta 6543, na Vercel).
 *  - Testes (NODE_ENV=test sem DATABASE_URL): PGlite, um Postgres real em
 *    memória, para os testes correrem sem instalar nada.
 *
 * API: query(sql, params) -> { rows, rowCount } e tx(async (cx) => ...).
 * Os parâmetros podem ser escritos como `?` (convertidos para $1, $2, ...).
 */
const config = require('./config');

/** Converte placeholders `?` em $1..$n. Nenhuma query do projecto usa `?` noutro contexto. */
function converterPlaceholders(sql) {
    let n = 0;
    return sql.replace(/\?/g, () => `$${++n}`);
}

/** Datas devolvidas sempre como ISO 8601 UTC (string); as vistas formatam com formatarData(). */
function paraIso(valor) {
    if (valor === null || valor === undefined) return valor;
    let s = String(valor).trim().replace(' ', 'T');
    if (/[+-]\d{2}$/.test(s)) s += ':00';
    else if (!/(Z|[+-]\d{2}:\d{2})$/.test(s)) s += 'Z';
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? String(valor) : d.toISOString();
}

const OID_INT8 = 20;
const OID_TIMESTAMPTZ = 1184;
const OID_TIMESTAMP = 1114;

let impl = null;

function criarImplPg() {
    const { Pool, types } = require('pg');
    types.setTypeParser(OID_INT8, (v) => Number(v));
    types.setTypeParser(OID_TIMESTAMPTZ, paraIso);
    types.setTypeParser(OID_TIMESTAMP, paraIso);

    if (!config.db.connectionString) {
        throw new Error('DATABASE_URL não definido. Copia a connection string do Supabase (Project Settings > Database).');
    }
    const pool = new Pool({
        connectionString: config.db.connectionString,
        ssl: config.db.ssl,
        max: config.db.max,
        idleTimeoutMillis: 10000,
        connectionTimeoutMillis: 8000,
    });
    pool.on('error', (err) => console.error('[pg] erro numa ligação ociosa:', err.message));

    const envolver = (cliente) => ({
        query: (sql, params = []) => cliente.query(converterPlaceholders(sql), params),
    });

    return {
        query: (sql, params) => envolver(pool).query(sql, params),
        async tx(fn) {
            const cliente = await pool.connect();
            try {
                await cliente.query('BEGIN');
                const resultado = await fn(envolver(cliente));
                await cliente.query('COMMIT');
                return resultado;
            } catch (err) {
                await cliente.query('ROLLBACK').catch(() => {});
                throw err;
            } finally {
                cliente.release();
            }
        },
        end: () => pool.end(),
    };
}

function criarImplPglite() {
    const fs = require('fs');
    const path = require('path');
    const { PGlite } = require('@electric-sql/pglite');

    const bruto = (v) => v;
    const dados = new PGlite({
        parsers: {
            [OID_INT8]: (v) => Number(v),
            [OID_TIMESTAMPTZ]: paraIso,
            [OID_TIMESTAMP]: paraIso,
            // numeric fica como string, tal como no driver pg
            1700: bruto,
        },
    });
    const pronto = dados.exec(fs.readFileSync(path.join(__dirname, '..', 'database', 'schema.sql'), 'utf8'));

    const envolver = (alvo) => ({
        query: async (sql, params = []) => {
            const r = await alvo.query(converterPlaceholders(sql), params);
            return { rows: r.rows, rowCount: r.affectedRows ?? r.rows.length };
        },
    });

    return {
        query: async (sql, params) => { await pronto; return envolver(dados).query(sql, params); },
        async tx(fn) {
            await pronto;
            return dados.transaction(async (t) => fn(envolver(t)));
        },
        end: async () => { await pronto.catch(() => {}); await dados.close(); },
    };
}

function obter() {
    if (!impl) {
        const usarPglite = config.isTest && !process.env.DATABASE_URL;
        impl = usarPglite ? criarImplPglite() : criarImplPg();
    }
    return impl;
}

module.exports = {
    query: (sql, params) => obter().query(sql, params),
    tx: (fn) => obter().tx(fn),
    end: async () => { if (impl) { const i = impl; impl = null; await i.end(); } },
    converterPlaceholders,
    paraIso,
};
