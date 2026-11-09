const multer = require('multer');
const config = require('./config');
const { MIME_PARA_EXT } = require('./storage');

/**
 * Receção de ficheiros em memória (o disco da Vercel é só de leitura).
 * A gravação definitiva faz-se com storage.guardar() depois de validar o formulário,
 * por isso uma validação falhada nunca deixa ficheiros órfãos.
 */
function makeUploader() {
    return multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: config.storage.maxBytes, files: 1 },
        fileFilter: (req, file, cb) => {
            cb(null, Object.prototype.hasOwnProperty.call(MIME_PARA_EXT, file.mimetype));
        },
    });
}

module.exports = { makeUploader };
