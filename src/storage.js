/**
 * Armazenamento de fotografias.
 *
 *  - driver "supabase": Supabase Storage (bucket público). É o único modo que
 *    funciona na Vercel, onde o disco é só de leitura.
 *  - driver "local": pasta public/uploads (desenvolvimento e testes).
 *
 * Na base de dados guardamos o URL público completo (supabase) ou o caminho
 * relativo "uploads/<pasta>/<ficheiro>" (local). urlPublica() resolve ambos.
 */
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const config = require('./config');

const MIME_PARA_EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

/** Confirma pelos primeiros bytes que o ficheiro é mesmo a imagem que o cliente declara. */
function assinaturaValida(buffer, mimetype) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;
    if (mimetype === 'image/jpeg') return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    if (mimetype === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (mimetype === 'image/webp') return buffer.subarray(0, 4).toString('latin1') === 'RIFF' && buffer.subarray(8, 12).toString('latin1') === 'WEBP';
    return false;
}

function nomeFicheiro(mimetype) {
    return crypto.randomBytes(16).toString('hex') + (MIME_PARA_EXT[mimetype] || '.jpg');
}

function ehUrl(caminho) {
    return /^https?:\/\//i.test(caminho || '');
}

function cabecalhosSupabase(extra = {}) {
    return {
        apikey: config.storage.serviceKey,
        Authorization: `Bearer ${config.storage.serviceKey}`,
        ...extra,
    };
}

/**
 * Guarda um ficheiro vindo do multer (memoryStorage).
 * @returns {Promise<string>} valor a gravar em photo_path
 */
async function guardar(file, pasta) {
    if (!file || !assinaturaValida(file.buffer, file.mimetype)) {
        throw new Error('Ficheiro de imagem inválido.');
    }
    const nome = nomeFicheiro(file.mimetype);

    if (config.storage.driver === 'supabase') {
        const objeto = `${pasta}/${nome}`;
        const resp = await fetch(`${config.storage.supabaseUrl}/storage/v1/object/${config.storage.bucket}/${objeto}`, {
            method: 'POST',
            headers: cabecalhosSupabase({ 'Content-Type': file.mimetype, 'x-upsert': 'false' }),
            body: file.buffer,
            signal: AbortSignal.timeout(20000),
        });
        if (!resp.ok) {
            const detalhe = await resp.text().catch(() => '');
            throw new Error(`Falha ao enviar a foto para o Supabase Storage (${resp.status}): ${detalhe}`);
        }
        return `${config.storage.supabaseUrl}/storage/v1/object/public/${config.storage.bucket}/${objeto}`;
    }

    if (config.isVercel) {
        throw new Error('Armazenamento não configurado: define SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (o disco da Vercel é só de leitura).');
    }
    const destino = path.join(__dirname, '..', 'public', 'uploads', pasta);
    await fs.mkdir(destino, { recursive: true });
    await fs.writeFile(path.join(destino, nome), file.buffer);
    return `uploads/${pasta}/${nome}`;
}

/** Lê os bytes de uma foto já guardada (para a IA). Devolve null se não for possível. */
async function lerBytes(caminho) {
    if (!caminho) return null;
    try {
        if (ehUrl(caminho)) {
            const resp = await fetch(caminho, { signal: AbortSignal.timeout(15000) });
            if (!resp.ok) return null;
            return Buffer.from(await resp.arrayBuffer());
        }
        return await fs.readFile(path.join(__dirname, '..', 'public', caminho));
    } catch {
        return null;
    }
}

/** Remove uma foto (best effort: nunca lança). */
async function eliminar(caminho) {
    if (!caminho) return;
    try {
        if (ehUrl(caminho)) {
            const prefixo = `${config.storage.supabaseUrl}/storage/v1/object/public/${config.storage.bucket}/`;
            if (config.storage.driver !== 'supabase' || !caminho.startsWith(prefixo)) return;
            await fetch(`${config.storage.supabaseUrl}/storage/v1/object/${config.storage.bucket}`, {
                method: 'DELETE',
                headers: cabecalhosSupabase({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({ prefixes: [caminho.slice(prefixo.length)] }),
                signal: AbortSignal.timeout(10000),
            });
            return;
        }
        await fs.unlink(path.join(__dirname, '..', 'public', caminho));
    } catch {
        // ficheiro já inexistente ou storage indisponível: ignorar
    }
}

/** URL a usar nas vistas e na API pública. */
function urlPublica(caminho) {
    if (!caminho) return null;
    if (ehUrl(caminho)) return caminho;
    return `/${String(caminho).replace(/^\//, '')}`; // relativo à origem da app
}

module.exports = { guardar, lerBytes, eliminar, urlPublica, assinaturaValida, MIME_PARA_EXT };
