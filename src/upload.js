const multer = require('multer');
const { MAX_BYTES, MIME_PARA_EXT } = require('./storage');

/**
 * Receção de ficheiros em memória (o disco da Vercel é só de leitura).
 *
 * A gravação definitiva faz-se com storage.guardar() depois de validar o
 * formulário, por isso uma validação falhada nunca deixa ficheiros órfãos.
 * O multer 2.x limita o tamanho e o número de ficheiros; a assinatura real
 * do conteúdo é confirmada por storage.guardar()/lerBytes().
 */
function makeUploader() {
    return multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: MAX_BYTES, files: 1 },
        fileFilter: (req, file, cb) => {
            cb(null, Object.prototype.hasOwnProperty.call(MIME_PARA_EXT, file.mimetype));
        },
    });
}

module.exports = {
    makeUploader,
    ALLOWED_MIME: MIME_PARA_EXT,
    MAX_BYTES,
};
