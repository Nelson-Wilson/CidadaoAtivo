// Cidadão Ativo — mapa de calor do dashboard municipal.
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        var el = document.getElementById('heatmap');
        if (!el || typeof L === 'undefined') return;

        var pontos = [];
        try {
            pontos = JSON.parse(el.getAttribute('data-heat-points') || '[]');
        } catch (erro) {
            pontos = [];
        }

        var mapa = L.map(el).setView([-25.9692, 32.5732], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
        }).addTo(mapa);

        if (pontos.length && typeof L.heatLayer === 'function') {
            L.heatLayer(pontos, { radius: 25, blur: 15 }).addTo(mapa);
        }
    });
})();
