// Cidadão Ativo — widget flutuante do chatbot de apoio ao cidadão.

document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('chatbot-widget');
    if (!root) return;

    root.innerHTML = `
        <button id="chatbot-toggle" type="button" aria-label="Abrir assistente virtual"
            style="position:fixed;bottom:20px;right:20px;width:52px;height:52px;border-radius:9999px;
                   background:#57407F;color:#fff;border:none;cursor:pointer;font-size:22px;z-index:50;
                   box-shadow:0 4px 14px rgba(87,64,127,.35);">
            💬
        </button>
        <div id="chatbot-panel" style="display:none;position:fixed;bottom:84px;right:20px;width:320px;
             max-height:420px;background:#fff;border:1px solid #E6DFF4;border-radius:16px;
             box-shadow:0 10px 30px rgba(36,27,47,.15);z-index:50;flex-direction:column;overflow:hidden;
             font-family: Inter, sans-serif;">
            <div style="background:#57407F;color:#fff;padding:12px 16px;font-size:14px;font-weight:600;font-family: Fraunces, serif;">
                Assistente Cidadão Ativo
            </div>
            <div id="chatbot-messages" style="flex:1;overflow-y:auto;padding:12px;font-size:13px;
                 display:flex;flex-direction:column;gap:8px;max-height:280px;background:#FBFAF7;">
                <div style="align-self:flex-start;background:#F3F0FA;color:#241B2F;padding:8px 12px;border-radius:10px;max-width:85%;">
                    Olá! Posso ajudar-te a reportar um problema, acompanhar uma denúncia ou explicar como funciona a plataforma.
                </div>
            </div>
            <form id="chatbot-form" style="display:flex;border-top:1px solid #E6DFF4;">
                <input id="chatbot-input" type="text" placeholder="Escreve a tua pergunta…"
                       style="flex:1;border:none;padding:10px 12px;font-size:13px;outline:none;font-family:inherit;">
                <button id="chatbot-send-btn" type="submit" style="background:#57407F;color:#fff;border:none;padding:0 16px;cursor:pointer;">➤</button>
            </form>
        </div>
    `;

    const toggleBtn = document.getElementById('chatbot-toggle');
    const panel = document.getElementById('chatbot-panel');
    const messages = document.getElementById('chatbot-messages');
    const form = document.getElementById('chatbot-form');
    const input = document.getElementById('chatbot-input');
    const sendBtn = document.getElementById('chatbot-send-btn');
    const apiBase = document.body.dataset.apiBase || '/api';

    toggleBtn.addEventListener('click', () => {
        panel.style.display = panel.style.display === 'none' ? 'flex' : 'none';
        if (panel.style.display === 'flex') {
            input.focus();
        }
    });

    function addMessage(text, from) {
        const bubble = document.createElement('div');
        bubble.style.cssText = from === 'user'
            ? 'align-self:flex-end;background:#57407F;color:#fff;padding:8px 12px;border-radius:10px;max-width:85%;'
            : 'align-self:flex-start;background:#F3F0FA;color:#241B2F;padding:8px 12px;border-radius:10px;max-width:85%;';
        bubble.textContent = text;
        messages.appendChild(bubble);
        messages.scrollTop = messages.scrollHeight;
        return bubble;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = input.value.trim();
        if (!message) return;

        addMessage(message, 'user');
        input.value = '';
        input.disabled = true;
        sendBtn.disabled = true;
        sendBtn.style.opacity = '0.5';

        // Indicador de resposta em processamento
        const typingIndicator = addMessage('A pensar...', 'bot');
        typingIndicator.style.fontStyle = 'italic';
        typingIndicator.style.color = '#7c6a99';

        try {
            const response = await fetch(`${apiBase}/chatbot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                body: JSON.stringify({ message }),
            });
            const data = await response.json();
            typingIndicator.remove();
            addMessage(data?.data?.reply ?? data?.message ?? 'Não consegui responder agora. Tenta novamente.', 'bot');
        } catch (err) {
            typingIndicator.remove();
            addMessage('Não consegui ligar ao assistente. Verifica a tua ligação.', 'bot');
        } finally {
            input.disabled = false;
            sendBtn.disabled = false;
            sendBtn.style.opacity = '1';
            input.focus();
        }
    });
});
