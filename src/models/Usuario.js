const db = require('../db');
const bcrypt = require('bcryptjs');

const PAPEL_CIDADAO = 'cidadao';
const PAPEL_TECNICO = 'tecnico';
const PAPEL_MUNICIPIO = 'municipio';
const PAPEL_ADMIN = 'admin';
const PAPEIS = [PAPEL_CIDADAO, PAPEL_TECNICO, PAPEL_MUNICIPIO, PAPEL_ADMIN];

async function buscarPorId(id) {
    const { rows } = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    return rows[0] || null;
}

async function buscarPorEmail(email) {
    const { rows } = await db.query('SELECT * FROM users WHERE lower(email) = lower(?)', [email]);
    return rows[0] || null;
}

async function emailExiste(email) {
    return (await buscarPorEmail(email)) !== null;
}

async function criar({ nome, email, senha, papel = PAPEL_CIDADAO, id_municipio = null, id_departamento = null }) {
    const hashed = await bcrypt.hash(senha, 10);
    const { rows } = await db.query(
        `INSERT INTO users (name, email, password, role, municipality_id, department_id)
         VALUES (?, ?, ?, ?, ?, ?) RETURNING id`,
        [nome, email, hashed, papel, id_municipio, id_departamento]
    );
    return rows[0].id;
}

async function verificarSenha(usuario, senha) {
    return bcrypt.compare(senha, usuario.password);
}

async function buscarTecnicosPorDepartamento(id_departamento) {
    const { rows } = await db.query(
        'SELECT * FROM users WHERE role = ? AND department_id = ? ORDER BY name',
        [PAPEL_TECNICO, id_departamento]
    );
    return rows;
}

/** Lista para o painel de administração (nunca devolve o hash da password). */
async function listar() {
    const { rows } = await db.query(
        `SELECT u.id, u.name, u.email, u.role, u.created_at,
                m.name AS municipality_name, d.name AS department_name
         FROM users u
         LEFT JOIN municipalities m ON m.id = u.municipality_id
         LEFT JOIN departments d ON d.id = u.department_id
         ORDER BY u.created_at DESC, u.id DESC
         LIMIT 200`
    );
    return rows;
}

module.exports = {
    PAPEL_CIDADAO, PAPEL_TECNICO, PAPEL_MUNICIPIO, PAPEL_ADMIN, PAPEIS,
    buscarPorId, buscarPorEmail, emailExiste, criar, verificarSenha, buscarTecnicosPorDepartamento, listar,
};
