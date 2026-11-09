const db = require('../db');

/** Confirma uma denúncia (idempotente). Usado pelo aviso de duplicados. */
async function criar(idDenuncia, idUsuario) {
    await db.query(
        'INSERT INTO report_confirmations (report_id, user_id) VALUES (?, ?) ON CONFLICT DO NOTHING',
        [idDenuncia, idUsuario]
    );
}

async function contarPorDenuncia(idDenuncia) {
    const { rows } = await db.query(
        'SELECT COUNT(*)::int AS total FROM report_confirmations WHERE report_id = ?',
        [idDenuncia]
    );
    return rows[0].total;
}

async function usuarioConfirmou(idDenuncia, idUsuario) {
    const { rows } = await db.query(
        'SELECT 1 FROM report_confirmations WHERE report_id = ? AND user_id = ?',
        [idDenuncia, idUsuario]
    );
    return rows.length > 0;
}

/**
 * Voto "também me afeta": se já votou, retira; senão, regista.
 * @returns {Promise<{votou: boolean, total: number}>}
 */
async function alternar(idDenuncia, idUsuario) {
    return db.tx(async (cx) => {
        const apagado = await cx.query(
            'DELETE FROM report_confirmations WHERE report_id = ? AND user_id = ?',
            [idDenuncia, idUsuario]
        );
        const votou = apagado.rowCount === 0;
        if (votou) {
            await cx.query('INSERT INTO report_confirmations (report_id, user_id) VALUES (?, ?)', [idDenuncia, idUsuario]);
        }
        const { rows } = await cx.query(
            'SELECT COUNT(*)::int AS total FROM report_confirmations WHERE report_id = ?',
            [idDenuncia]
        );
        return { votou, total: rows[0].total };
    });
}

module.exports = { criar, contarPorDenuncia, usuarioConfirmou, alternar };
