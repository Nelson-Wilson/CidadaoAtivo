// Ponto de entrada serverless da Vercel: toda a app Express corre numa única função.
const { createApp } = require('../src/app');

module.exports = createApp();
