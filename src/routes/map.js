const express = require('express');
const router = express.Router();
const Categoria = require('../models/Categoria');
const Usuario = require('../models/Usuario');
const { exigirAutenticacao } = require('../auth');
const db = require('../db');

// TEMPORARIO: diagnostico de producao, removido logo apos a investigacao.
router.get('/__diag_7f3a9c2e', async (req, res) => {
    const saida = {
        env: process.env.NODE_ENV,
        vercel: Boolean(process.env.VERCEL),
        appUrl: process.env.APP_URL || null,
    };
    try {
        const { rows } = await db.query(
            'SELECT current_database() AS base, current_user AS utilizador, (SELECT count(*) FROM categories) AS categorias'
        );
        saida.base = rows[0].base;
        saida.utilizador = rows[0].utilizador;
        saida.categorias = Number(rows[0].categorias);
    } catch (err) {
        saida.erroBd = { message: err.message, code: err.code };
    }
    try {
        const categorias = await Categoria.todas();
        saida.linhasCategorias = categorias.length;
        saida.amostra = categorias.slice(0, 3).map((c) => ({ id: c.id, name: c.name }));
        await new Promise((resolve) => {
            res.render('map/index', { title: 'Diagnostico', categories: categorias }, (err, html) => {
                if (err) saida.erroRender = { name: err.name, message: err.message };
                else {
                    saida.renderOk = true;
                    saida.htmlLength = html.length;
                }
                resolve();
            });
        });
    } catch (err) {
        saida.erroCategorias = { name: err.name, message: err.message, code: err.code };
    }
    res.json(saida);
});

router.get('/__diag_send_7f3a9c2e', async (req, res) => {
    const categorias = await Categoria.todas();
    res.render('map/index', { title: 'Diagnostico', categories: categorias });
});

router.get('/', async (req, res) => {
    const categorias = await Categoria.todas();
    res.render('map/index', { title: 'Mapa de ocorrências', categories: categorias });
});

router.get('/dashboard', exigirAutenticacao, (req, res) => {
    const papel = req.usuarioAtual.role;
    if (papel === Usuario.PAPEL_MUNICIPIO || papel === Usuario.PAPEL_ADMIN) return res.redirect('/municipio/dashboard');
    if (papel === Usuario.PAPEL_TECNICO) return res.redirect('/tecnico/tarefas');
    return res.redirect('/denuncias');
});

module.exports = router;
