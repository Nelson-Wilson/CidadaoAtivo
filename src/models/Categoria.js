const db = require('../db');

async function todas() {
    const { rows } = await db.query('SELECT * FROM categories ORDER BY name');
    return rows;
}

/** Categorias com o departamento responsável e o número de denúncias (painel de admin). */
async function todasComDepartamento() {
    const { rows } = await db.query(
        `SELECT c.*, d.id AS department_id, d.name AS department_name,
                (SELECT COUNT(*) FROM reports r WHERE r.category_id = c.id) AS reports_count
         FROM categories c
         LEFT JOIN category_department cd ON cd.category_id = c.id
         LEFT JOIN departments d ON d.id = cd.department_id
         ORDER BY c.name`
    );
    return rows;
}

async function buscarPorId(id) {
    const { rows } = await db.query('SELECT * FROM categories WHERE id = ?', [id]);
    return rows[0] || null;
}

async function buscarPorNome(name) {
    const { rows } = await db.query('SELECT * FROM categories WHERE name = ?', [name]);
    return rows[0] || null;
}

/** Cria a categoria e (opcionalmente) liga-a a um departamento. */
async function criar({ nome, slaHoras = 72, idDepartamento = null }) {
    return db.tx(async (cx) => {
        const { rows } = await cx.query(
            'INSERT INTO categories (name, sla_hours) VALUES (?, ?) RETURNING id',
            [nome, slaHoras]
        );
        const id = rows[0].id;
        if (idDepartamento) {
            await cx.query('INSERT INTO category_department (category_id, department_id) VALUES (?, ?)', [id, idDepartamento]);
        }
        return id;
    });
}

async function atualizar(id, { nome, slaHoras, idDepartamento }) {
    return db.tx(async (cx) => {
        await cx.query('UPDATE categories SET name = ?, sla_hours = ? WHERE id = ?', [nome, slaHoras, id]);
        await cx.query('DELETE FROM category_department WHERE category_id = ?', [id]);
        if (idDepartamento) {
            await cx.query('INSERT INTO category_department (category_id, department_id) VALUES (?, ?)', [id, idDepartamento]);
        }
    });
}

/** Só remove categorias sem denúncias associadas (as denúncias históricas não podem ficar órfãs). */
async function remover(id) {
    const { rows } = await db.query('SELECT COUNT(*)::int AS total FROM reports WHERE category_id = ?', [id]);
    if (rows[0].total > 0) {
        throw new Error('Não é possível remover uma categoria que já tem denúncias associadas.');
    }
    await db.query('DELETE FROM categories WHERE id = ?', [id]);
}

module.exports = { todas, todasComDepartamento, buscarPorId, buscarPorNome, criar, atualizar, remover };
