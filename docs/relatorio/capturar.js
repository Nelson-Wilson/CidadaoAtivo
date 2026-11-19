/**
 * Capturas de ecrã do sistema em execução local, através do Chrome DevTools
 * Protocol. Requer o servidor de demonstração em http://127.0.0.1:3031.
 *
 *   node docs/relatorio/capturar.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://127.0.0.1:3031';
const PORTA_CDP = 9333;
const DESTINO = path.join(__dirname, 'capturas');
const PERFIL = path.join(os.tmpdir(), 'cidadao-capturas');

const WebSocketImpl = globalThis.WebSocket || require('ws');
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

function iniciarChrome() {
    fs.mkdirSync(DESTINO, { recursive: true });
    fs.rmSync(PERFIL, { recursive: true, force: true });
    const proc = spawn(CHROME, [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-dev-shm-usage',
        `--remote-debugging-port=${PORTA_CDP}`,
        `--user-data-dir=${PERFIL}`,
        '--window-size=1440,1000',
        'about:blank',
    ], { stdio: 'ignore' });
    return proc;
}

async function obterVersao() {
    for (let i = 0; i < 60; i += 1) {
        try {
            const r = await fetch(`http://127.0.0.1:${PORTA_CDP}/json/version`);
            if (r.ok) return r.json();
        } catch (_) { /* ainda a arrancar */ }
        await espera(250);
    }
    throw new Error('Chrome não respondeu no porto de depuração.');
}

async function criarAlvo() {
    const r = await fetch(`http://127.0.0.1:${PORTA_CDP}/json/new?about:blank`, { method: 'PUT' });
    if (!r.ok) throw new Error('Não foi possível criar um separador: ' + r.status);
    return r.json();
}

class Sessao {
    constructor(ws) {
        this.ws = ws;
        this.seq = 0;
        this.pendentes = new Map();
        this.eventos = new Map();
        ws.addEventListener('message', (ev) => {
            const msg = JSON.parse(ev.data);
            if (msg.id && this.pendentes.has(msg.id)) {
                const { resolve, reject } = this.pendentes.get(msg.id);
                this.pendentes.delete(msg.id);
                if (msg.error) reject(new Error(msg.error.message));
                else resolve(msg.result);
            } else if (msg.method && this.eventos.has(msg.method)) {
                for (const fn of this.eventos.get(msg.method)) fn(msg.params);
            }
        });
    }

    enviar(method, params = {}) {
        this.seq += 1;
        const id = this.seq;
        return new Promise((resolve, reject) => {
            this.pendentes.set(id, { resolve, reject });
            this.ws.send(JSON.stringify({ id, method, params }));
        });
    }

    async avaliar(expression, awaitPromise = false) {
        const r = await this.enviar('Runtime.evaluate', {
            expression, returnByValue: true, awaitPromise,
        });
        if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
        return r.result.value;
    }

    async esperarPronto(extra = 900) {
        for (let i = 0; i < 80; i += 1) {
            const estado = await this.avaliar('document.readyState').catch(() => null);
            if (estado === 'complete') break;
            await espera(150);
        }
        await espera(extra);
    }

    async ir(url, extra = 900) {
        await this.enviar('Page.navigate', { url });
        await this.esperarPronto(extra);
    }

    async entrar(email) {
        await this.ir(`${BASE}/login`, 400);
        await this.avaliar(`
            document.querySelector('input[name="email"]').value = ${JSON.stringify(email)};
            document.querySelector('input[name="senha"]').value = 'password';
            document.querySelector('input[name="email"]').form.submit();
        `);
        for (let i = 0; i < 60; i += 1) {
            await espera(250);
            const caminho = await this.avaliar('location.pathname').catch(() => '/login');
            if (caminho && caminho !== '/login') break;
        }
        await this.esperarPronto(500);
    }

    async sair() {
        const temFormulario = await this.avaliar('!!document.querySelector(\'form[action$="/logout"]\')');
        if (temFormulario) {
            await this.avaliar('document.querySelector(\'form[action$="/logout"]\').submit()');
        } else {
            await this.ir(`${BASE}/login`, 300);
        }
        for (let i = 0; i < 40; i += 1) {
            await espera(200);
            const caminho = await this.avaliar('location.pathname').catch(() => '');
            if (caminho === '/login') break;
        }
        await this.esperarPronto(300);
    }

    async capturar(nome, { largura = 1440, altura = 1000, movel = false } = {}) {
        await this.enviar('Emulation.setDeviceMetricsOverride', {
            width: largura, height: altura, deviceScaleFactor: 1, mobile: movel,
        });
        await espera(400);
        const r = await this.enviar('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
        const ficheiro = path.join(DESTINO, nome + '.jpg');
        fs.writeFileSync(ficheiro, Buffer.from(r.data, 'base64'));
        const kb = Math.round(fs.statSync(ficheiro).size / 1024);
        console.log(`  ${nome}.jpg (${kb} KB)`);
    }
}

async function principal() {
    const chrome = iniciarChrome();
    try {
        const versao = await obterVersao();
        const alvo = await criarAlvo();
        const ws = new WebSocketImpl(alvo.webSocketDebuggerUrl);
        await new Promise((resolve, reject) => {
            ws.addEventListener('open', resolve);
            ws.addEventListener('error', reject);
        });
        const s = new Sessao(ws);
        await s.enviar('Page.enable');
        await s.enviar('Runtime.enable');
        await s.enviar('Network.enable');

        console.log('Chrome', versao.Browser);

        // Visitante
        await s.ir(`${BASE}/inicio`, 2600);
        await s.capturar('01_mapa_publico');
        await s.ir(`${BASE}/login`, 500);
        await s.capturar('02_login');

        // Maria (cidadã)
        await s.entrar('maria@teste.com');
        await s.ir(`${BASE}/denuncias`, 700);
        await s.capturar('03_minhas_denuncias');
        await s.ir(`${BASE}/denuncias/nova`, 1800);
        await s.capturar('04_nova_denuncia');
        await s.ir(`${BASE}/denuncias/1`, 900);
        await s.capturar('05_detalhe_denuncia');
        await s.ir(`${BASE}/ocorrencias/4`, 1400);
        await s.capturar('06_ocorrencia_publica');
        await s.sair();

        // Carlos (técnico)
        await s.entrar('carlos@teste.com');
        await s.ir(`${BASE}/tecnico/tarefas`, 700);
        await s.capturar('07_tarefas_tecnico');
        await s.ir(`${BASE}/tecnico/tarefas/4`, 900);
        await s.capturar('08_tarefa_detalhe');
        await s.sair();

        // João (município)
        await s.entrar('joao@teste.com');
        await s.ir(`${BASE}/municipio/dashboard`, 1300);
        await s.capturar('09_dashboard_municipal');
        await s.ir(`${BASE}/municipio/denuncias`, 700);
        await s.capturar('10_triagem_municipal');
        await s.ir(`${BASE}/municipio/denuncias/3`, 700);
        await s.capturar('11_gestao_denuncia');
        await s.sair();

        // Administração
        await s.entrar('admin@teste.com');
        await s.ir(`${BASE}/admin/categorias`, 600);
        await s.capturar('12_admin_categorias');
        await s.ir(`${BASE}/admin/utilizadores`, 600);
        await s.capturar('13_admin_utilizadores');
        await s.sair();

        // Vista móvel
        await s.enviar('Emulation.setDeviceMetricsOverride', {
            width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
        });
        await s.ir(`${BASE}/inicio`, 2800);
        await s.capturar('14_mapa_movel', { largura: 390, altura: 844, movel: true });

        ws.close();
        console.log('Capturas concluídas em', DESTINO);
    } finally {
        chrome.kill();
    }
}

principal().catch((err) => {
    console.error('Falha nas capturas:', err);
    process.exit(1);
});
