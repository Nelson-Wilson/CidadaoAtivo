/**
 * Adaptador de testes sobre src/db.js que mantém o formato usado pelos testes
 * escritos originalmente para MySQL: SELECT -> [linhas]; INSERT -> [{ insertId }].
 */
const db = require('../../src/db');

async function query(sql, params = []) {
    const eInsert = /^\s*INSERT/i.test(sql);
    const texto = eInsert && !/RETURNING/i.test(sql) ? `${sql} RETURNING id` : sql;
    const resultado = await db.query(texto, params);
    if (eInsert) return [{ insertId: resultado.rows[0]?.id }];
    return [resultado.rows, resultado];
}

module.exports = { query, end: () => db.end(), raw: db };
