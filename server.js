const config = require('./src/config');
const db = require('./src/db');
const { createApp } = require('./src/app');

/** Arranque local (npm run dev / npm start). Na Vercel usa-se api/index.js. */
function iniciar() {
    const app = createApp();
    const server = app.listen(config.port, () => {
        console.log(`Cidadão Ativo em execução em ${config.appUrl} (armazenamento: ${config.storage.driver})`);
    });

    function encerrarGraciosamente(sinal) {
        console.log(`\nSinal ${sinal} recebido. A encerrar o servidor graciosamente...`);
        server.close(async () => {
            try {
                await db.end();
                process.exit(0);
            } catch (err) {
                console.error('Erro ao encerrar ligações à base de dados:', err);
                process.exit(1);
            }
        });
    }

    process.on('SIGTERM', () => encerrarGraciosamente('SIGTERM'));
    process.on('SIGINT', () => encerrarGraciosamente('SIGINT'));
    return server;
}

if (require.main === module) {
    iniciar();
}

module.exports = { iniciar };
