const express = require('express');
const router = express.Router();

const Categoria = require('../models/Categoria');
const Departamento = require('../models/Departamento');
const Municipio = require('../models/Municipio');
const Usuario = require('../models/Usuario');
const { exigirPapel } = require('../auth');
const { verifyCsrfBody } = require('../csrf');

const soAdmin = exigirPapel(Usuario.PAPEL_ADMIN);
const SLA_MAX_HORAS = 24 * 90;

function validarCategoria(body, departamentos) {
    const erros = [];
    const nome = String(body.name || '').trim();
    const slaHoras = Number(body.sla_hours);
    const idDepartamento = body.department_id ? Number(body.department_id) : null;

    if (nome.length < 2 || nome.length > 80) erros.push('O nome da categoria deve ter entre 2 e 80 caracteres.');
    if (!Number.isInteger(slaHoras) || slaHoras < 1 || slaHoras > SLA_MAX_HORAS) erros.push(`O prazo (SLA) deve ser um número inteiro de horas entre 1 e ${SLA_MAX_HORAS}.`);
    if (idDepartamento !== null && !departamentos.some((d) => Number(d.id) === idDepartamento)) erros.push('Departamento inválido.');
    return { erros, valores: { nome, slaHoras, idDepartamento } };
}

function erroDeNomeDuplicado(err) {
    return err && (err.code === '23505' || /categories_name_key|duplicate key|unique/i.test(err.message || ''));
}

router.get('/admin', soAdmin, (req, res) => res.redirect('/admin/categorias'));

router.get('/admin/categorias', soAdmin, async (req, res) => {
    const [categorias, departamentos] = await Promise.all([Categoria.todasComDepartamento(), Departamento.todos()]);
    res.render('admin/categorias', { title: 'Categorias e prazos (SLA)', categories: categorias, departments: departamentos, tab: 'categorias' });
});

router.post('/admin/categorias', soAdmin, verifyCsrfBody, async (req, res) => {
    const departamentos = await Departamento.todos();
    const { erros, valores } = validarCategoria(req.body, departamentos);
    if (erros.length) {
        req.flashErrors(erros);
        req.flashOld(req.body);
        return res.redirect('/admin/categorias');
    }
    try {
        await Categoria.criar(valores);
        req.flashStatus(`Categoria "${valores.nome}" criada.`);
    } catch (err) {
        if (!erroDeNomeDuplicado(err)) throw err;
        req.flashErrors(['Já existe uma categoria com esse nome.']);
        req.flashOld(req.body);
    }
    res.redirect('/admin/categorias');
});

router.post('/admin/categorias/:id', soAdmin, verifyCsrfBody, async (req, res) => {
    const id = Number(req.params.id);
    if (!(await Categoria.buscarPorId(id))) return res.status(404).send('Categoria não encontrada.');

    const departamentos = await Departamento.todos();
    const { erros, valores } = validarCategoria(req.body, departamentos);
    if (erros.length) {
        req.flashErrors(erros);
        return res.redirect('/admin/categorias');
    }
    try {
        await Categoria.atualizar(id, valores);
        req.flashStatus('Categoria atualizada.');
    } catch (err) {
        if (!erroDeNomeDuplicado(err)) throw err;
        req.flashErrors(['Já existe uma categoria com esse nome.']);
    }
    res.redirect('/admin/categorias');
});

router.post('/admin/categorias/:id/remover', soAdmin, verifyCsrfBody, async (req, res) => {
    try {
        await Categoria.remover(Number(req.params.id));
        req.flashStatus('Categoria removida.');
    } catch (err) {
        req.flashErrors([err.message]);
    }
    res.redirect('/admin/categorias');
});

router.get('/admin/utilizadores', soAdmin, async (req, res) => {
    const [utilizadores, municipios, departamentos] = await Promise.all([Usuario.listar(), Municipio.todos(), Departamento.todos()]);
    res.render('admin/utilizadores', { title: 'Utilizadores', users: utilizadores, municipalities: municipios, departments: departamentos, tab: 'utilizadores' });
});

// Contas de pessoal (técnico, município, admin). Os cidadãos registam-se sozinhos em /registar.
router.post('/admin/utilizadores', soAdmin, verifyCsrfBody, async (req, res) => {
    const nome = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim();
    const senha = String(req.body.password || '');
    const papel = String(req.body.role || '');
    const idMunicipio = req.body.municipality_id ? Number(req.body.municipality_id) : null;
    const idDepartamento = req.body.department_id ? Number(req.body.department_id) : null;
    const erros = [];

    if (!nome) erros.push('Indica o nome.');
    if (!/^\S+@\S+\.\S+$/.test(email)) erros.push('Email inválido.');
    if (senha.length < 8) erros.push('A password deve ter pelo menos 8 caracteres.');
    if (![Usuario.PAPEL_TECNICO, Usuario.PAPEL_MUNICIPIO, Usuario.PAPEL_ADMIN].includes(papel)) erros.push('Escolhe um papel válido.');

    const municipio = idMunicipio ? await Municipio.buscarPorId(idMunicipio) : null;
    const departamento = idDepartamento ? await Departamento.buscarPorId(idDepartamento) : null;
    if ([Usuario.PAPEL_TECNICO, Usuario.PAPEL_MUNICIPIO].includes(papel) && !municipio) erros.push('Escolhe o município.');
    if (papel === Usuario.PAPEL_TECNICO && !departamento) erros.push('Escolhe o departamento do técnico.');
    if (departamento && municipio && Number(departamento.municipality_id) !== Number(municipio.id)) erros.push('O departamento não pertence ao município escolhido.');
    if (email && await Usuario.emailExiste(email)) erros.push('Já existe uma conta com este email.');

    if (erros.length) {
        req.flashErrors(erros);
        req.flashOld({ name: nome, email, role: papel, municipality_id: idMunicipio, department_id: idDepartamento });
        return res.redirect('/admin/utilizadores');
    }

    await Usuario.criar({
        nome, email, senha, papel,
        id_municipio: papel === Usuario.PAPEL_ADMIN ? null : municipio.id,
        id_departamento: papel === Usuario.PAPEL_TECNICO ? departamento.id : null,
    });
    req.flashStatus(`Conta de ${papel} criada para ${email}.`);
    res.redirect('/admin/utilizadores');
});

module.exports = router;
