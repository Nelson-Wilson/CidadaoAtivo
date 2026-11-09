const db = require('../db');
const config = require('../config');
const {
    STATUS_RECEBIDA,
    STATUS_EM_ANALISE,
    STATUS_ATRIBUIDA,
    STATUS_EM_EXECUCAO,
    STATUS_RESOLVIDA,
    STATUS_FECHADA,
    STATUS_REJEITADA,
    STATUSES,
    TRANSITIONS,
    podeMudarStatus,
} = require('../domain/estadosDenuncia');

const PRIORIDADE_BAIXA = 'baixa';
const PRIORIDADE_NORMAL = 'normal';
const PRIORIDADE_URGENTE = 'urgente';
const PRIORIDADE_MUITO_URGENTE = 'muito_urgente';

const ESTADOS_ABERTOS_SQL = "('recebida', 'em_analise', 'atribuida', 'em_execucao')";

function mesmoId(a, b) {
    return a !== null && a !== undefined && b !== null && b !== undefined && Number(a) === Number(b);
}

async function registarHistorico(cx, idDenuncia, anterior, novo, idUsuario, nota = null) {
    await cx.query(
        `INSERT INTO report_status_histories (report_id, previous_status, new_status, changed_by, note)
         VALUES (?, ?, ?, ?, ?)`,
        [idDenuncia, anterior, novo, idUsuario, nota ? String(nota).slice(0, 1000) : null]
    );
}

async function bloquear(cx, idDenuncia) {
    const { rows } = await cx.query('SELECT * FROM reports WHERE id = ? FOR UPDATE', [idDenuncia]);
    if (!rows[0]) throw new Error(`Denúncia #${idDenuncia} não encontrada.`);
    return rows[0];
}

/**
 * Aplica a transição e regista o histórico; lança excepção se inválida.
 * O SELECT ... FOR UPDATE serializa transições concorrentes sobre a mesma
 * denúncia, evitando históricos duplicados ou estados incoerentes.
 */
async function mudarStatus(idDenuncia, novoStatus, alteradoPorUsuarioId, nota = null) {
    return db.tx(async (cx) => {
        const denuncia = await bloquear(cx, idDenuncia);
        if (!podeMudarStatus(denuncia.status, novoStatus)) {
            throw new Error(`Transição inválida de [${denuncia.status}] para [${novoStatus}].`);
        }
        // Não permitir "atribuída" sem técnico: a atribuição tem de passar
        // pela rota /atribuir, que valida departamento e município.
        if (novoStatus === STATUS_ATRIBUIDA && !denuncia.technician_id) {
            throw new Error('Atribui primeiro um técnico responsável antes de mudar para "Atribuída".');
        }
        if (novoStatus === STATUS_EM_EXECUCAO && !denuncia.technician_id) {
            throw new Error('A denúncia precisa de um técnico atribuído para entrar em execução.');
        }
        await cx.query('UPDATE reports SET status = ? WHERE id = ?', [novoStatus, idDenuncia]);
        await registarHistorico(cx, idDenuncia, denuncia.status, novoStatus, alteradoPorUsuarioId, nota);
        return { anterior: denuncia.status, novo: novoStatus };
    });
}

/** Regista uma nova denúncia e o histórico inicial atomicamente. @returns {Promise<number>} id */
async function criar(dados) {
    return db.tx(async (cx) => {
        const { rows } = await cx.query(
            `INSERT INTO reports
                (user_id, category_id, description, photo_path, latitude, longitude,
                 neighborhood, status, priority, municipality_id, department_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
            [
                dados.id_usuario, dados.id_categoria, dados.descricao, dados.caminho_foto || null,
                dados.latitude, dados.longitude, dados.bairro || null,
                dados.status || STATUS_RECEBIDA, dados.prioridade || PRIORIDADE_NORMAL,
                dados.id_municipio || null, dados.id_departamento || null,
            ]
        );
        const idDenuncia = rows[0].id;
        await registarHistorico(cx, idDenuncia, null, dados.status || STATUS_RECEBIDA, dados.id_usuario);
        return idDenuncia;
    });
}

async function buscarPorId(id) {
    const { rows } = await db.query('SELECT * FROM reports WHERE id = ?', [id]);
    return rows[0] || null;
}

/** Denúncia com nomes relacionados, número de votos e prazo (SLA) da categoria. */
async function buscarComRelacoes(id) {
    const { rows } = await db.query(
        `SELECT r.*,
                c.name AS category_name,
                c.sla_hours AS sla_hours,
                m.name AS municipality_name,
                d.name AS department_name,
                u.name AS citizen_name,
                t.name AS technician_name,
                (SELECT COUNT(*) FROM report_confirmations rc WHERE rc.report_id = r.id) AS votes_count,
                (SELECT rpr.note FROM report_photo_resolutions rpr
                  WHERE rpr.report_id = r.id ORDER BY rpr.created_at DESC, rpr.id DESC LIMIT 1) AS resolution_note,
                (SELECT rpr.photo_path FROM report_photo_resolutions rpr
                  WHERE rpr.report_id = r.id ORDER BY rpr.created_at DESC, rpr.id DESC LIMIT 1) AS resolution_photo
         FROM reports r
         LEFT JOIN categories c ON c.id = r.category_id
         LEFT JOIN municipalities m ON m.id = r.municipality_id
         LEFT JOIN departments d ON d.id = r.department_id
         LEFT JOIN users u ON u.id = r.user_id
         LEFT JOIN users t ON t.id = r.technician_id
         WHERE r.id = ?`,
        [id]
    );
    return rows[0] || null;
}

async function historicoStatus(idDenuncia) {
    const { rows } = await db.query(
        `SELECT h.*, u.name AS changed_by_name
         FROM report_status_histories h
         LEFT JOIN users u ON u.id = h.changed_by
         WHERE h.report_id = ?
         ORDER BY h.created_at ASC, h.id ASC`,
        [idDenuncia]
    );
    return rows;
}

async function paginarPorUsuario(idUsuario, pagina = 1, porPagina = 10) {
    const deslocamento = (pagina - 1) * porPagina;
    const { rows: itens } = await db.query(
        `SELECT r.*, c.name AS category_name,
                (SELECT COUNT(*) FROM report_confirmations rc WHERE rc.report_id = r.id) AS votes_count
         FROM reports r
         LEFT JOIN categories c ON c.id = r.category_id
         WHERE r.user_id = ?
         ORDER BY r.created_at DESC, r.id DESC
         LIMIT ? OFFSET ?`,
        [idUsuario, porPagina, deslocamento]
    );
    const { rows } = await db.query('SELECT COUNT(*)::int AS total FROM reports WHERE user_id = ?', [idUsuario]);
    return { itens, total: rows[0].total, pagina, porPagina };
}

async function paraMapa({ idCategoria, status, bairro } = {}) {
    let sql = `SELECT r.id, r.description, r.photo_path, r.latitude, r.longitude,
                      r.neighborhood, r.status, r.priority, r.created_at, c.name AS category_name,
                      (SELECT COUNT(*) FROM report_confirmations rc WHERE rc.report_id = r.id) AS votes_count
               FROM reports r
               LEFT JOIN categories c ON c.id = r.category_id
               WHERE 1 = 1`;
    const parametros = [];
    if (idCategoria) { sql += ' AND r.category_id = ?'; parametros.push(idCategoria); }
    if (status) { sql += ' AND r.status = ?'; parametros.push(status); }
    if (bairro) { sql += ' AND r.neighborhood ILIKE ?'; parametros.push(`%${bairro}%`); }
    sql += ' ORDER BY r.created_at DESC LIMIT 500';

    const { rows } = await db.query(sql, parametros);
    return rows;
}

async function paginarParaMunicipio({ idMunicipio, idCategoria, status, bairro, pagina = 1, porPagina = 15 }) {
    const deslocamento = (pagina - 1) * porPagina;
    let onde = 'WHERE 1 = 1';
    const parametros = [];
    if (idMunicipio) { onde += ' AND r.municipality_id = ?'; parametros.push(idMunicipio); }
    if (idCategoria) { onde += ' AND r.category_id = ?'; parametros.push(idCategoria); }
    if (status) { onde += ' AND r.status = ?'; parametros.push(status); }
    if (bairro) { onde += ' AND r.neighborhood ILIKE ?'; parametros.push(`%${bairro}%`); }

    const { rows: contagem } = await db.query(`SELECT COUNT(*)::int AS total FROM reports r ${onde}`, parametros);

    const { rows: itens } = await db.query(
        `SELECT r.*, c.name AS category_name, c.sla_hours, t.name AS technician_name,
                (SELECT COUNT(*) FROM report_confirmations rc WHERE rc.report_id = r.id) AS votes_count
         FROM reports r
         LEFT JOIN categories c ON c.id = r.category_id
         LEFT JOIN users t ON t.id = r.technician_id
         ${onde}
         ORDER BY r.created_at DESC, r.id DESC
         LIMIT ? OFFSET ?`,
        [...parametros, porPagina, deslocamento]
    );

    return { itens, total: contagem[0].total, pagina, porPagina };
}

/** Todas as denúncias (até 5000) com os campos úteis para exportação CSV. */
async function exportarParaMunicipio(idMunicipio) {
    const { onde, params } = filtroMunicipio(idMunicipio);
    const { rows } = await db.query(
        `SELECT r.id, r.created_at, c.name AS category_name, r.neighborhood, r.status, r.priority,
                d.name AS department_name, t.name AS technician_name, r.latitude, r.longitude,
                r.description,
                (SELECT COUNT(*) FROM report_confirmations rc WHERE rc.report_id = r.id) AS votes_count,
                rt.score AS rating
         FROM reports r
         LEFT JOIN categories c ON c.id = r.category_id
         LEFT JOIN departments d ON d.id = r.department_id
         LEFT JOIN users t ON t.id = r.technician_id
         LEFT JOIN report_ratings rt ON rt.report_id = r.id
         ${onde}
         ORDER BY r.created_at DESC, r.id DESC
         LIMIT 5000`,
        params
    );
    return rows;
}

async function porTecnicoEStatus(idTecnico, listaStatus) {
    const marcadores = listaStatus.map(() => '?').join(',');
    const { rows } = await db.query(
        `SELECT r.*, c.name AS category_name, c.sla_hours
         FROM reports r
         LEFT JOIN categories c ON c.id = r.category_id
         WHERE r.technician_id = ? AND r.status IN (${marcadores})
         ORDER BY r.created_at DESC`,
        [idTecnico, ...listaStatus]
    );
    return rows;
}

/**
 * Atribui um técnico e passa a denúncia de em_analise para atribuida,
 * tudo na mesma transacção. Impede atribuições em estados inválidos.
 */
async function atribuirTecnico(idDenuncia, idTecnico, alteradoPorUsuarioId) {
    return db.tx(async (cx) => {
        const denuncia = await bloquear(cx, idDenuncia);
        if (denuncia.status !== STATUS_EM_ANALISE) {
            throw new Error('Só é possível atribuir denúncias que estejam em análise.');
        }
        await cx.query('UPDATE reports SET technician_id = ?, status = ? WHERE id = ?', [idTecnico, STATUS_ATRIBUIDA, idDenuncia]);
        await registarHistorico(cx, idDenuncia, denuncia.status, STATUS_ATRIBUIDA, alteradoPorUsuarioId);
        return { anterior: denuncia.status, novo: STATUS_ATRIBUIDA };
    });
}

/**
 * Regista a foto de resolução e passa a denúncia de em_execucao para
 * resolvida atomicamente. Evita fotos órfãs quando a transição falha.
 */
async function resolver(idDenuncia, caminhoFoto, idTecnico, nota = null) {
    return db.tx(async (cx) => {
        const denuncia = await bloquear(cx, idDenuncia);
        if (!mesmoId(denuncia.technician_id, idTecnico)) {
            throw new Error('Esta denúncia não está atribuída a este técnico.');
        }
        if (denuncia.status !== STATUS_EM_EXECUCAO) {
            throw new Error('Só é possível resolver denúncias que estejam em execução.');
        }
        const observacao = nota ? String(nota).slice(0, 1000) : null;
        await cx.query(
            `INSERT INTO report_photo_resolutions (report_id, photo_path, technician_id, note)
             VALUES (?, ?, ?, ?)`,
            [idDenuncia, caminhoFoto, idTecnico, observacao]
        );
        await cx.query('UPDATE reports SET status = ? WHERE id = ?', [STATUS_RESOLVIDA, idDenuncia]);
        await registarHistorico(cx, idDenuncia, denuncia.status, STATUS_RESOLVIDA, idTecnico, observacao);
        return { anterior: denuncia.status, novo: STATUS_RESOLVIDA };
    });
}

/**
 * Avaliação do cidadão (1 a 5) sobre uma denúncia resolvida: fecha o ciclo
 * (resolvida -> fechada) respeitando a máquina de estados. Só o autor pode avaliar, uma vez.
 */
async function avaliarEFechar(idDenuncia, idUsuario, nota, comentario) {
    const score = Number(nota);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
        throw new Error('A nota deve ser um número inteiro de 1 a 5.');
    }
    const feedback = String(comentario || '').trim().slice(0, 1000) || null;

    return db.tx(async (cx) => {
        const denuncia = await bloquear(cx, idDenuncia);
        if (!mesmoId(denuncia.user_id, idUsuario)) {
            throw new Error('Só o autor da denúncia a pode avaliar.');
        }
        if (!podeMudarStatus(denuncia.status, STATUS_FECHADA)) {
            throw new Error('Só é possível avaliar denúncias que já estejam resolvidas.');
        }
        await cx.query(
            'INSERT INTO report_ratings (report_id, user_id, score, feedback) VALUES (?, ?, ?, ?)',
            [idDenuncia, idUsuario, score, feedback]
        );
        await cx.query('UPDATE reports SET status = ? WHERE id = ?', [STATUS_FECHADA, idDenuncia]);
        await registarHistorico(cx, idDenuncia, denuncia.status, STATUS_FECHADA, idUsuario);
        return { anterior: denuncia.status, novo: STATUS_FECHADA, nota: score };
    });
}

async function atualizarPrioridade(idDenuncia, prioridade) {
    await db.query('UPDATE reports SET priority = ? WHERE id = ?', [prioridade, idDenuncia]);
}

/** Cláusula WHERE comum às estatísticas (opcionalmente filtrada por município). */
function filtroMunicipio(idMunicipio, alias = 'r') {
    return idMunicipio ? { onde: `WHERE ${alias}.municipality_id = ?`, params: [idMunicipio] } : { onde: 'WHERE 1 = 1', params: [] };
}

async function estatisticasParaMunicipio(idMunicipio) {
    const { onde, params } = filtroMunicipio(idMunicipio);

    const { rows } = await db.query(
        `SELECT COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE (r.created_at AT TIME ZONE ?)::date = (now() AT TIME ZONE ?)::date)::int AS hoje,
                COUNT(*) FILTER (WHERE r.status IN ('recebida', 'em_analise'))::int AS pendentes,
                COUNT(*) FILTER (WHERE r.status = 'em_execucao')::int AS em_execucao,
                COUNT(*) FILTER (WHERE r.status IN ('resolvida', 'fechada'))::int AS resolvidas,
                COUNT(*) FILTER (WHERE r.priority = 'muito_urgente' AND r.status IN ${ESTADOS_ABERTOS_SQL})::int AS criticas,
                COUNT(*) FILTER (WHERE r.status IN ${ESTADOS_ABERTOS_SQL}
                                   AND now() > r.created_at + (c.sla_hours * interval '1 hour'))::int AS sla_atrasadas
         FROM reports r
         LEFT JOIN categories c ON c.id = r.category_id
         ${onde}`,
        [config.timezone, config.timezone, ...params]
    );
    const base = rows[0];

    const { rows: tempo } = await db.query(
        `SELECT AVG(EXTRACT(EPOCH FROM (h.created_at - r.created_at)) / 3600) AS media
         FROM reports r
         INNER JOIN report_status_histories h ON h.report_id = r.id AND h.new_status = 'resolvida'
         ${onde}`,
        params
    );
    const media = tempo[0].media;

    const { rows: satisfacao } = await db.query(
        `SELECT AVG(rt.score) AS media, COUNT(*)::int AS total
         FROM report_ratings rt INNER JOIN reports r ON r.id = rt.report_id
         ${onde}`,
        params
    );

    return {
        ...base,
        tempo_medio_horas: media !== null && media !== undefined ? Math.round(Number(media) * 10) / 10 : null,
        satisfacao_media: satisfacao[0].media !== null ? Math.round(Number(satisfacao[0].media) * 10) / 10 : null,
        avaliacoes: satisfacao[0].total,
        taxa_resolucao: base.total > 0 ? Math.round((base.resolvidas / base.total) * 100) : 0,
    };
}

async function categoriasPrincipais(idMunicipio, limite = 5) {
    const { onde, params } = filtroMunicipio(idMunicipio);
    const { rows } = await db.query(
        `SELECT c.name, COUNT(*)::int AS total
         FROM reports r INNER JOIN categories c ON c.id = r.category_id
         ${onde} GROUP BY c.name ORDER BY total DESC, c.name LIMIT ${Number(limite)}`,
        params
    );
    return rows;
}

/** Ranking de bairros: total de ocorrências e quantas continuam abertas e urgentes. */
async function bairrosPrincipais(idMunicipio, limite = 5) {
    const { onde, params } = filtroMunicipio(idMunicipio);
    const { rows } = await db.query(
        `SELECT r.neighborhood,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE r.priority IN ('urgente', 'muito_urgente')
                                   AND r.status IN ${ESTADOS_ABERTOS_SQL})::int AS urgentes
         FROM reports r
         ${onde} AND r.neighborhood IS NOT NULL
         GROUP BY r.neighborhood ORDER BY total DESC, r.neighborhood LIMIT ${Number(limite)}`,
        params
    );
    return rows;
}

async function pontosCalor(idMunicipio, limite = 1000) {
    const { onde, params } = filtroMunicipio(idMunicipio);
    const { rows } = await db.query(
        `SELECT r.latitude, r.longitude FROM reports r ${onde} LIMIT ${Number(limite)}`,
        params
    );
    return rows;
}

/** Candidatos a duplicado — mesma categoria, bounding box por lat/lng. */
async function candidatosParaVerificacaoDuplicados(idCategoria, lat, lng, deltaLat, deltaLng) {
    const { rows } = await db.query(
        `SELECT r.*,
                (SELECT COUNT(*) FROM report_confirmations rc WHERE rc.report_id = r.id) AS confirmations_count
         FROM reports r
         WHERE r.category_id = ?
           AND r.status NOT IN ('fechada', 'rejeitada')
           AND r.latitude BETWEEN ? AND ?
           AND r.longitude BETWEEN ? AND ?`,
        [idCategoria, lat - deltaLat, lat + deltaLat, lng - deltaLng, lng + deltaLng]
    );
    return rows;
}

module.exports = {
    STATUS_RECEBIDA, STATUS_EM_ANALISE, STATUS_ATRIBUIDA, STATUS_EM_EXECUCAO,
    STATUS_RESOLVIDA, STATUS_FECHADA, STATUS_REJEITADA, STATUSES, TRANSITIONS,
    PRIORIDADE_BAIXA, PRIORIDADE_NORMAL, PRIORIDADE_URGENTE, PRIORIDADE_MUITO_URGENTE,
    podeMudarStatus, mudarStatus, criar, buscarPorId, buscarComRelacoes, historicoStatus,
    paginarPorUsuario, paraMapa, paginarParaMunicipio, porTecnicoEStatus,
    atribuirTecnico, resolver, avaliarEFechar, atualizarPrioridade, estatisticasParaMunicipio,
    categoriasPrincipais, bairrosPrincipais, pontosCalor, candidatosParaVerificacaoDuplicados,
    exportarParaMunicipio,
};
