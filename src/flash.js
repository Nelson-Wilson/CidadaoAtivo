/**
 * Mensagens "flash" (só duram um pedido) e valores "old" (para repopular
 * formulários depois de um erro de validação).
 * A sessão vive num cookie assinado (cookie-session), por isso limitamos o tamanho.
 */
const MAX_CAMPO = 400;

function encurtar(dados) {
    const saida = {};
    for (const [k, v] of Object.entries(dados || {})) {
        saida[k] = typeof v === 'string' ? v.slice(0, MAX_CAMPO) : v;
    }
    return saida;
}

function flashMiddleware(req, res, next) {
    res.locals.status = req.session.flashStatus || null;
    res.locals.errors = req.session.flashErrors || [];
    res.locals.old = req.session.flashOld || {};

    delete req.session.flashStatus;
    delete req.session.flashErrors;
    delete req.session.flashOld;

    req.flashStatus = (message) => { req.session.flashStatus = String(message).slice(0, 500); };
    req.flashErrors = (errors) => { req.session.flashErrors = (errors || []).slice(0, 8).map((e) => String(e).slice(0, 300)); };
    req.flashOld = (data) => { req.session.flashOld = encurtar(data); };

    next();
}

module.exports = flashMiddleware;
