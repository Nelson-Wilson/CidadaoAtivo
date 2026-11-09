const Usuario = require('./models/Usuario');

/** Middleware: coloca req.usuarioAtual (ou null) disponível em todas as rotas. */
async function carregarUsuario(req, res, next) {
    if (req.session?.userId) {
        const usuario = await Usuario.buscarPorId(req.session.userId);
        if (!usuario) {
            // Conta removida: a sessão deixa de ser válida imediatamente.
            req.session.destroy(() => {});
            req.usuarioAtual = null;
        } else {
            req.usuarioAtual = usuario;
        }
    } else {
        req.usuarioAtual = null;
    }
    res.locals.usuarioAtual = req.usuarioAtual; // disponível directamente nas views EJS
    next();
}

/** Verifica se o pedido é para API ou AJAX */
function ehPedidoApi(req) {
    return req.originalUrl.startsWith('/api') || req.xhr || req.headers.accept?.includes('application/json');
}

/** Middleware: exige sessão iniciada. */
function exigirAutenticacao(req, res, next) {
    if (!req.usuarioAtual) {
        if (ehPedidoApi(req)) {
            return res.status(401).json({ status: 'error', message: 'Autenticação necessária.' });
        }
        return res.redirect('/login');
    }
    next();
}

/** Middleware factory: exige um dos papéis indicados. */
function exigirPapel(...papeis) {
    return (req, res, next) => {
        if (!req.usuarioAtual) {
            if (ehPedidoApi(req)) {
                return res.status(401).json({ status: 'error', message: 'Autenticação necessária.' });
            }
            return res.redirect('/login');
        }
        if (!papeis.includes(req.usuarioAtual.role)) {
            if (ehPedidoApi(req)) {
                return res.status(403).json({ status: 'error', message: 'Não tens permissão para aceder a este recurso.' });
            }
            return res.status(403).send('Não tens permissão para aceder a esta página.');
        }
        next();
    };
}

async function tentarAutenticar(email, senha) {
    const usuario = await Usuario.buscarPorEmail(email);
    if (!usuario) return null;
    const valido = await Usuario.verificarSenha(usuario, senha);
    return valido ? usuario : null;
}

/**
 * Revoga todas as sessões de um utilizador.
 * Deve ser chamado após mudança de password, alteração de papel ou desativação.
 * @returns {Promise<number>} número de sessões removidas
 */
function revogarSessoesDoUsuario(req, userId) {
    const store = req.sessionStore;
    if (!store || typeof store.revogarPorUsuario !== 'function') return Promise.resolve(0);

    return new Promise((resolve, reject) => {
        store.revogarPorUsuario(userId, (err, removidas) => (err ? reject(err) : resolve(removidas || 0)));
    });
}

module.exports = {
    carregarUsuario,
    exigirAutenticacao,
    exigirPapel,
    tentarAutenticar,
    revogarSessoesDoUsuario,
};
