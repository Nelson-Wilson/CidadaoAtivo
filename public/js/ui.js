// Cidadão Ativo — interações globais sem JavaScript inline (compatível com CSP).
(function () {
    'use strict';

    function configurarConfirmacoes() {
        document.querySelectorAll('form[data-confirm]').forEach(function (form) {
            form.addEventListener('submit', function (evento) {
                var mensagem = form.getAttribute('data-confirm') || 'Confirmas esta ação?';
                if (!window.confirm(mensagem)) evento.preventDefault();
            });
        });
    }

    function configurarImpressao() {
        document.querySelectorAll('[data-print]').forEach(function (botao) {
            botao.addEventListener('click', function () {
                window.print();
            });
        });
    }

    function configurarFiltros() {
        document.querySelectorAll('select[data-auto-submit]').forEach(function (select) {
            select.addEventListener('change', function () {
                if (select.form) {
                    if (typeof select.form.requestSubmit === 'function') select.form.requestSubmit();
                    else select.form.submit();
                }
            });
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        configurarConfirmacoes();
        configurarImpressao();
        configurarFiltros();
    });
})();
