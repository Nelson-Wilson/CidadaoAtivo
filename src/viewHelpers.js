const config = require('./config');
const { urlPublica } = require('./storage');

const STATUS_LABELS = {
    recebida: 'Recebida',
    em_analise: 'Em análise',
    atribuida: 'Atribuída',
    em_execucao: 'Em execução',
    resolvida: 'Resolvida',
    fechada: 'Fechada',
    rejeitada: 'Rejeitada',
};

const PRIORITY_LABELS = {
    baixa: 'Baixa',
    normal: 'Normal',
    urgente: 'Urgente',
    muito_urgente: 'Muito urgente',
};

const ROLE_LABELS = {
    cidadao: 'Cidadão',
    tecnico: 'Técnico',
    municipio: 'Município',
    admin: 'Administrador',
};

// Ícones desenhados em SVG (traço) para manter a interface consistente e
// sem depender de emojis, que variam de aspeto entre sistemas operativos.
const CATEGORY_ICON_PATHS = {
    'Buracos': '<path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>',
    'Iluminação Pública': '<path d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18"/>',
    'Lixo': '<path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>',
    'Água': '<path d="M12 2.25c-3.5 3.9-6.75 7.75-6.75 11.25a6.75 6.75 0 0013.5 0c0-3.5-3.25-7.35-6.75-11.25z"/>',
    'Esgotos': '<rect x="4.5" y="4.5" width="15" height="15" rx="2.25"/><path d="M8.25 9h7.5M8.25 12h7.5M8.25 15h7.5"/>',
    'Semáforos': '<rect x="7.5" y="2.25" width="9" height="19.5" rx="2.25"/><circle cx="12" cy="7" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="17" r="1.1" fill="currentColor" stroke="none"/>',
    'Árvores Caídas': '<path d="M12 3l4.5 6h-3l4 5.25h-4.5V21h-2v-6.75H6.5l4-5.25h-3L12 3z"/>',
    'Construções Perigosas': '<path d="M4.5 21V5.25A1.5 1.5 0 016 3.75h12a1.5 1.5 0 011.5 1.5V21M3 21h18M9 8.25h1.5m3 0H15M9 12h1.5m3 0H15M9 15.75h1.5m3 0H15M10.5 21v-3h3v3"/>',
    'Animais Abandonados': '<circle cx="7.5" cy="7" r="1.5"/><circle cx="16.5" cy="7" r="1.5"/><circle cx="5" cy="11.5" r="1.3"/><circle cx="19" cy="11.5" r="1.3"/><path d="M12 11.25c-2.1 0-4.25 2.05-4.25 4.15 0 1.42 1.05 2.45 2.4 2.45.75 0 1.25-.35 1.85-.35s1.1.35 1.85.35c1.35 0 2.4-1.03 2.4-2.45 0-2.1-2.15-4.15-4.25-4.15z"/>',
    'Vandalismo': '<path d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42"/>',
    'Segurança': '<path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"/>',
    'Outros': '<path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>',
};

const CATEGORY_TONES = {
    'Buracos': 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300',
    'Iluminação Pública': 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950/50 dark:text-yellow-300',
    'Lixo': 'bg-lime-50 text-lime-600 dark:bg-lime-950/50 dark:text-lime-300',
    'Água': 'bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300',
    'Esgotos': 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-300',
    'Semáforos': 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300',
    'Árvores Caídas': 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300',
    'Construções Perigosas': 'bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300',
    'Animais Abandonados': 'bg-fuchsia-50 text-fuchsia-600 dark:bg-fuchsia-950/50 dark:text-fuchsia-300',
    'Vandalismo': 'bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300',
    'Segurança': 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-300',
    'Outros': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

function statusLabel(status) {
    return STATUS_LABELS[status] || String(status || '').replace(/_/g, ' ');
}

function statusClasses(status) {
    const map = {
        recebida: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        em_analise: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
        atribuida: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800',
        em_execucao: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800',
        resolvida: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
        fechada: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
        rejeitada: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
    };
    return map[status] || map.recebida;
}

function statusDotClasses(status) {
    const map = {
        recebida: 'bg-slate-400',
        em_analise: 'bg-amber-500',
        atribuida: 'bg-violet-500',
        em_execucao: 'bg-sky-500',
        resolvida: 'bg-emerald-500',
        fechada: 'bg-emerald-600',
        rejeitada: 'bg-rose-500',
    };
    return map[status] || map.recebida;
}

function statusProgress(status) {
    const map = {
        recebida: 10,
        em_analise: 30,
        atribuida: 50,
        em_execucao: 70,
        resolvida: 100,
        fechada: 100,
        rejeitada: 100,
    };
    return map[status] ?? 10;
}

function priorityLabel(priority) {
    return PRIORITY_LABELS[priority] || String(priority || '').replace(/_/g, ' ');
}

function priorityClasses(priority) {
    if (priority === 'muito_urgente' || priority === 'urgente') {
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800';
    }
    if (priority === 'baixa') {
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
    return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
}

function categoryIcon(name, classes = 'h-5 w-5') {
    const caminho = CATEGORY_ICON_PATHS[name] || CATEGORY_ICON_PATHS.Outros;
    return `<svg class="${classes}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${caminho}</svg>`;
}

function categoryTone(name) {
    return CATEGORY_TONES[name] || CATEGORY_TONES.Outros;
}

function roleLabel(role) {
    return ROLE_LABELS[role] || role || 'Utilizador';
}

function initials(name) {
    const partes = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return 'CA';
    const primeira = partes[0][0] || '';
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
    return (primeira + ultima).toUpperCase();
}

/** Verdadeiro para valores do PostgreSQL (Date) ou cadeias ISO com hora. */
function temDataIso(value) {
    if (value instanceof Date) return true;
    return /^\d{4}-\d{2}-\d{2}T/.test(String(value));
}

const formatadorData = new Intl.DateTimeFormat('pt-PT', {
    timeZone: config.timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
});

const formatadorDataHora = new Intl.DateTimeFormat('pt-PT', {
    timeZone: config.timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
});

function formatDate(value) {
    if (!value) return '—';
    if (temDataIso(value)) {
        const data = value instanceof Date ? value : new Date(value);
        if (!Number.isNaN(data.getTime())) return formatadorData.format(data);
    }
    const texto = String(value);
    const data = texto.split(' ')[0];
    const partes = data.split('-');
    if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
    return texto;
}

function formatDateTime(value) {
    if (!value) return '—';
    if (temDataIso(value)) {
        const data = value instanceof Date ? value : new Date(value);
        if (!Number.isNaN(data.getTime())) return formatadorDataHora.format(data).replace(',', ' ·');
    }
    const texto = String(value);
    const [data, hora = ''] = texto.split(' ');
    const dataFormatada = formatDate(data);
    return hora ? `${dataFormatada} · ${hora.slice(0, 5)}` : dataFormatada;
}

/** Formata uma data ISO no fuso configurado (Africa/Maputo): "08/11/2026 16:44". */
function formatarData(valor, comHora = true) {
    if (!valor) return '';
    const d = valor instanceof Date ? valor : new Date(valor);
    if (Number.isNaN(d.getTime())) return String(valor);
    const opcoes = { timeZone: config.timezone, day: '2-digit', month: '2-digit', year: 'numeric' };
    if (comHora) Object.assign(opcoes, { hour: '2-digit', minute: '2-digit', hour12: false });
    return new Intl.DateTimeFormat('pt-PT', opcoes).format(d).replace(',', '');
}

function excerpt(text, max = 140) {
    const limpo = String(text || '').replace(/\s+/g, ' ').trim();
    return limpo.length > max ? `${limpo.slice(0, max - 1)}…` : limpo;
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

/** Middleware: expõe estes helpers directamente às views EJS (res.locals). */
function exposeToViews(req, res, next) {
    res.locals.statusLabel = statusLabel;
    res.locals.statusClasses = statusClasses;
    res.locals.statusDotClasses = statusDotClasses;
    res.locals.statusProgress = statusProgress;
    res.locals.priorityLabel = priorityLabel;
    res.locals.priorityClasses = priorityClasses;
    res.locals.categoryIcon = categoryIcon;
    res.locals.categoryTone = categoryTone;
    res.locals.roleLabel = roleLabel;
    res.locals.initials = initials;
    res.locals.formatDate = formatDate;
    res.locals.formatDateTime = formatDateTime;
    res.locals.formatarData = formatarData;
    res.locals.excerpt = excerpt;
    res.locals.nl2br = nl2br;
    res.locals.currentPath = req.path;
    res.locals.appUrl = config.appUrl;
    res.locals.aiDescriptionEnabled = config.ai.features.descriptionHelper && Boolean(config.ai.apiKey);

    // Aliases em português usados pelas views mais recentes.
    res.locals.prioridadeLabel = priorityLabel;
    res.locals.prioridadeClasses = priorityClasses;

    // url('caminho') -> caminho a partir da raiz (funciona em qualquer domínio, incl. previews da Vercel);
    // url(report.photo_path) deixa passar os URLs completos do Supabase Storage.
    res.locals.url = (caminho = '') => {
        if (/^https?:\/\//i.test(caminho)) return caminho;
        return `/${String(caminho).replace(/^\//, '')}`;
    };
    res.locals.fotoUrl = urlPublica;
    next();
}

module.exports = {
    statusLabel,
    statusClasses,
    statusDotClasses,
    statusProgress,
    priorityLabel,
    priorityClasses,
    categoryIcon,
    categoryTone,
    roleLabel,
    initials,
    formatDate,
    formatDateTime,
    formatarData,
    excerpt,
    escapeHtml,
    nl2br,
    exposeToViews,
};
