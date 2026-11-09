/**
 * Armazenamento de fotografias.
 *
 * - driver "supabase": Supabase Storage (bucket público). É o modo usado em
 *   produção (o disco da Vercel é só de leitura).
 * - driver "local": pasta public/uploads (desenvolvimento e testes).
 *
 * Na base de dados guardamos o URL público completo (Supabase) ou o caminho
 * relativo "uploads/<pasta>/<ficheiro>" (local). urlPublica() resolve ambos.
 *
 * Segurança:
 * - só aceita JPEG, PNG e WebP, confirmados pelos primeiros bytes;
 * - impõe o limite configurado antes de escrever ou ler;
 * - nunca faz fetch de URLs arbitrários (proteção SSRF): apenas do bucket
 *   Supabase configurado;
 * - nunca lê ficheiros fora de public/uploads.
 */
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const config = require('./config');

const MIME_PARA_EXT = Object.freeze({
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
});

const MAX_BYTES = config.storage.maxBytes;
const UPLOADS_DIR = path.resolve(__dirname, '..', 'public', 'uploads');

/** Confirma pelos primeiros bytes que o ficheiro é mesmo a imagem que o cliente declara. */
function assinaturaValida(buffer, mimetype) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;
    if (mimetype === 'image/jpeg') {
        return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    if (mimetype === 'image/png') {
        return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    if (mimetype === 'image/webp') {
        return buffer.subarray(0, 4).toString('latin1') === 'RIFF'
            && buffer.subarray(8, 12).toString('latin1') === 'WEBP';
    }
    return false;
}

/** MIME a partir da extensão, ignorando query string/hash. */
function mimePorCaminho(caminho) {
    const semQuery = String(caminho || '').split(/[?#]/)[0];
    const extensao = path.extname(semQuery).toLowerCase();
    if (extensao === '.jpg' || extensao === '.jpeg') return 'image/jpeg';
    if (extensao === '.png') return 'image/png';
    if (extensao === '.webp') return 'image/webp';
    return null;
}

function nomeFicheiro(mimetype) {
    return crypto.randomBytes(16).toString('hex') + (MIME_PARA_EXT[mimetype] || '.jpg');
}

function pastaSegura(pasta) {
    const valor = String(pasta || 'reports');
    if (!/^[a-z0-9][a-z0-9_-]{0,40}$/i.test(valor) || valor.includes('..')) {
        throw new Error('Pasta de armazenamento inválida.');
    }
    return valor;
}

function ehUrl(caminho) {
    return /^https?:\/\//i.test(caminho || '');
}

/** Resolve um caminho local e garante que fica dentro de public/uploads. */
function caminhoAbsolutoLocal(caminho) {
    const base = UPLOADS_DIR;
    const resolvido = path.resolve(
        path.isAbsolute(caminho) ? caminho : path.join(__dirname, '..', 'public', caminho)
    );

    if (resolvido !== base && !resolvido.startsWith(base + path.sep)) return null;
    return resolvido;
}

function prefixoPublicoSupabase() {
    if (!config.storage.supabaseUrl || !config.storage.bucket) return null;
    return `${config.storage.supabaseUrl}/storage/v1/object/public/${config.storage.bucket}/`;
}

function urlObjetoSupabase(objeto) {
    return `${config.storage.supabaseUrl}/storage/v1/object/${config.storage.bucket}/${objeto}`;
}

/** Extrai o nome do objeto apenas de um URL público do bucket configurado. */
function objetoAPartirDeUrl(caminho) {
    const prefixo = prefixoPublicoSupabase();
    if (!prefixo || typeof caminho !== 'string' || !caminho.startsWith(prefixo)) return null;

    const objeto = caminho.slice(prefixo.length);
    if (!objeto || objeto.startsWith('/') || objeto.includes('..') || objeto.includes('\\')) return null;
    return objeto;
}

function cabecalhosSupabase(extra = {}) {
    return {
        apikey: config.storage.serviceKey,
        Authorization: `Bearer ${config.storage.serviceKey}`,
        ...extra,
    };
}

/** Lê o corpo com um limite rígido de bytes (não confia no Content-Length). */
async function lerCorpoLimitado(resposta, limite) {
    const tamanhoDeclarado = Number(resposta.headers?.get?.('content-length') || 0);
    if (tamanhoDeclarado > limite) return null;

    if (!resposta.body || typeof resposta.body.getReader !== 'function') {
        const buffer = Buffer.from(await resposta.arrayBuffer());
        return buffer.length <= limite ? buffer : null;
    }

    const leitor = resposta.body.getReader();
    const partes = [];
    let total = 0;

    try {
        for (;;) {
            const { done, value } = await leitor.read();
            if (done) break;
            total += value.length;
            if (total > limite) {
                await leitor.cancel().catch(() => {});
                return null;
            }
            partes.push(Buffer.from(value));
        }
    } finally {
        leitor.releaseLock?.();
    }

    return Buffer.concat(partes);
}

/**
 * Guarda um ficheiro vindo do multer (memoryStorage).
 * @param {{buffer: Buffer, mimetype: string, size?: number}} file
 * @param {string} pasta
 * @returns {Promise<string>} valor a gravar em photo_path
 */
async function guardar(file, pasta) {
    if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
        throw new Error('Ficheiro de imagem inválido.');
    }
    if (file.buffer.length > MAX_BYTES) {
        throw new Error('A fotografia excede o tamanho máximo permitido.');
    }
    if (!Object.prototype.hasOwnProperty.call(MIME_PARA_EXT, file.mimetype)) {
        throw new Error('Formato de imagem não suportado.');
    }
    if (!assinaturaValida(file.buffer, file.mimetype)) {
        throw new Error('O conteúdo do ficheiro não corresponde a uma imagem válida.');
    }

    const subpasta = pastaSegura(pasta);
    const nome = nomeFicheiro(file.mimetype);

    if (config.storage.driver === 'supabase') {
        const objeto = `${subpasta}/${nome}`;
        const resp = await fetch(urlObjetoSupabase(objeto), {
            method: 'POST',
            headers: cabecalhosSupabase({
                'Content-Type': file.mimetype,
                'x-upsert': 'false',
                'cache-control': 'max-age=31536000',
            }),
            body: file.buffer,
            signal: AbortSignal.timeout(20000),
        });
        if (!resp.ok) {
            const detalhe = await resp.text().catch(() => '');
            throw new Error(`Falha ao enviar a foto para o Supabase Storage (${resp.status}): ${detalhe.slice(0, 200)}`);
        }
        return `${prefixoPublicoSupabase()}${objeto}`;
    }

    if (config.isVercel) {
        throw new Error('Armazenamento não configurado: define STORAGE_DRIVER=supabase e as credenciais do Supabase.');
    }

    const destino = path.join(UPLOADS_DIR, subpasta);
    await fs.mkdir(destino, { recursive: true });
    await fs.writeFile(path.join(destino, nome), file.buffer, { flag: 'wx' });
    return `uploads/${subpasta}/${nome}`;
}

/**
 * Lê os bytes de uma foto já guardada (para a IA).
 * Aceita apenas caminhos dentro de public/uploads ou URLs do bucket configurado.
 * @returns {Promise<Buffer|null>}
 */
async function lerBytes(caminho) {
    if (!caminho) return null;

    try {
        if (ehUrl(caminho)) {
            const objeto = objetoAPartirDeUrl(caminho);
            if (!objeto) return null;

            const resp = await fetch(caminho, {
                signal: AbortSignal.timeout(15000),
                redirect: 'error',
            });
            if (!resp.ok) return null;
            return await lerCorpoLimitado(resp, MAX_BYTES);
        }

        const absoluto = caminhoAbsolutoLocal(caminho);
        if (!absoluto) return null;

        const info = await fs.stat(absoluto);
        if (!info.isFile() || info.size > MAX_BYTES) return null;
        return await fs.readFile(absoluto);
    } catch {
        return null;
    }
}

/** Remove uma foto (best effort: nunca lança). */
async function eliminar(caminho) {
    if (!caminho) return;

    try {
        if (ehUrl(caminho)) {
            const objeto = objetoAPartirDeUrl(caminho);
            if (!objeto || !config.storage.serviceKey) return;

            await fetch(urlObjetoSupabase(objeto), {
                method: 'DELETE',
                headers: cabecalhosSupabase(),
                signal: AbortSignal.timeout(10000),
            });
            return;
        }

        const absoluto = caminhoAbsolutoLocal(caminho);
        if (!absoluto) return;
        await fs.unlink(absoluto);
    } catch {
        // Ficheiro já inexistente ou storage indisponível: ignorar.
    }
}

/** URL a usar nas vistas e na API pública. */
function urlPublica(caminho) {
    if (!caminho) return null;
    if (ehUrl(caminho)) return caminho;
    return `/${String(caminho).replace(/^\//, '')}`;
}

module.exports = {
    MAX_BYTES,
    MIME_PARA_EXT,
    assinaturaValida,
    mimePorCaminho,
    guardar,
    lerBytes,
    eliminar,
    urlPublica,
    // Compatibilidade com chamadas antigas.
    lerFicheiro: lerBytes,
    guardarFoto: (pasta, file) => guardar(file, pasta),
};
