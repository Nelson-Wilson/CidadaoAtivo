const db = require('../db');

async function buscarPorDenuncia(idDenuncia) {
    const { rows } = await db.query('SELECT * FROM report_ratings WHERE report_id = ?', [idDenuncia]);
    return rows[0] || null;
}

module.exports = { buscarPorDenuncia };
