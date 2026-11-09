const config = require('./config');
const { urlPublica } = require('./storage');

function statusLabel(status) {
    return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
}

function statusClasses(status) {
    const map = {
        recebida: 'bg-stone-100 text-stone-600 border-stone-200',
        em_analise: 'bg-baobab-50 text-baobab-500 border-baobab-300',
        atribuida: 'bg-jacaranda-50 text-jacaranda-600 border-jacaranda-100',
        em_execucao: 'bg-sky-50 text-sky-600 border-sky-200',
        resolvida: 'bg-mangrove-50 text-mangrove-600 border-mangrove-100',
        fechada: 'bg-mangrove-50 text-mangrove-600 border-mangrove-100',
        rejeitada: 'bg-laterite-50 text-laterite-600 border-laterite-100',
    };
    return map[status] || 'bg-stone-100 text-stone-600 border-stone-200';
}

function prioridadeLabel(prioridade) {
    return ({ baixa: 'Baixa', normal: 'Normal', urgente: 'Urgente', muito_urgente: 'Muito urgente' })[prioridade] || prioridade;
}

function prioridadeClasses(prioridade) {
    const map = {
        baixa: 'bg-stone-100 text-stone-600 border-stone-200',
        normal: 'bg-sky-50 text-sky-600 border-sky-200',
        urgente: 'bg-baobab-50 text-baobab-500 border-baobab-300',
        muito_urgente: 'bg-laterite-50 text-laterite-600 border-laterite-100',
    };
    return map[prioridade] || map.normal;
}

function escapeHtml(text) {
    return String(text ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Escapa e depois converte quebras de linha em <br> — para usar com <%- %> (raw) nas views. */
function nl2br(text) {
    return escapeHtml(text).replace(/\n/g, '<br>');
}

/** Formata uma data ISO no fuso configurado (Africa/Maputo): "08/11/2026 16:44". */
function formatarData(valor, comHora = true) {
    if (!valor) return '';
    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) return String(valor);
    const opcoes = { timeZone: config.timezone, day: '2-digit', month: '2-digit', year: 'numeric' };
    if (comHora) Object.assign(opcoes, { hour: '2-digit', minute: '2-digit', hour12: false });
    return new Intl.DateTimeFormat('pt-PT', opcoes).format(d).replace(',', '');
}

/** Middleware: expõe estes helpers directamente às views EJS (res.locals). */
function exposeToViews(req, res, next) {
    res.locals.statusLabel = statusLabel;
    res.locals.statusClasses = statusClasses;
    res.locals.prioridadeLabel = prioridadeLabel;
    res.locals.prioridadeClasses = prioridadeClasses;
    res.locals.nl2br = nl2br;
    res.locals.formatarData = formatarData;
    res.locals.appUrl = config.appUrl;
    // url('caminho') -> caminho a partir da raiz (funciona em qualquer domínio, incl. previews da Vercel);
    // url(report.photo_path) deixa passar os URLs completos do Supabase Storage.
    res.locals.url = (caminho = '') => {
        if (/^https?:\/\//i.test(caminho)) return caminho;
        return `/${String(caminho).replace(/^\//, '')}`;
    };
    res.locals.fotoUrl = urlPublica;
    next();
}

module.exports = { statusLabel, statusClasses, nl2br, formatarData, prioridadeLabel, prioridadeClasses, exposeToViews };
