const db = require('../db');

const MAX_CARACTERES = 1000;
const PAPEIS_OFICIAIS = ['municipio', 'tecnico', 'admin'];

/** Comentários públicos de uma denúncia, do mais antigo para o mais recente.
 *  Os nomes reais nunca saem da base de dados: a página é pública e o autor
 *  cidadão é pseudonimizado. O papel permite distinguir comentários oficiais.
 */
async function listarPorDenuncia(idDenuncia) {
    const { rows } = await db.query(
        `SELECT c.id, c.content, c.is_official, c.created_at, c.user_id,
                CASE u.role
                    WHEN 'cidadao'  THEN 'Cidadão'
                    WHEN 'tecnico'  THEN 'Técnico municipal'
                    WHEN 'municipio' THEN 'Equipa municipal'
                    WHEN 'admin'    THEN 'Administração'
                    ELSE 'Utilizador'
                END AS author_name,
                u.role AS author_role
         FROM report_comments c
         INNER JOIN users u ON u.id = c.user_id
         WHERE c.report_id = ?
         ORDER BY c.created_at ASC, c.id ASC
         LIMIT 200`,
        [idDenuncia]
    );
    return rows;
}

/** Os comentários de município/técnico/admin ficam marcados como oficiais. */
async function criar({ idDenuncia, usuario, conteudo }) {
    const texto = String(conteudo || '').trim();
    if (!texto) throw new Error('Escreve o comentário.');
    if (texto.length > MAX_CARACTERES) throw new Error(`O comentário não pode ter mais de ${MAX_CARACTERES} caracteres.`);

    const oficial = PAPEIS_OFICIAIS.includes(usuario.role);
    const { rows } = await db.query(
        `INSERT INTO report_comments (report_id, user_id, content, is_official)
         VALUES (?, ?, ?, ?) RETURNING id`,
        [idDenuncia, usuario.id, texto, oficial]
    );
    return rows[0].id;
}

module.exports = { listarPorDenuncia, criar, MAX_CARACTERES };
