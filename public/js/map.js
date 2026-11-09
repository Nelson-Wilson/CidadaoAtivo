// Cidadão Ativo — mapa público de ocorrências (Leaflet + /api/reports).

const STATUS_COLORS = {
    recebida: '#a8a29e',
    em_analise: '#C08C28',
    atribuida: '#6C4F9E',
    em_execucao: '#0284c7',
    resolvida: '#2F7D68',
    fechada: '#256555',
    rejeitada: '#BC5732',
};

function sanitizarTexto(texto) {
    const el = document.createElement('div');
    el.textContent = texto ?? '';
    return el.innerHTML;
}

function ocorrenciaUrl(id) {
    return `/ocorrencias/${encodeURIComponent(Number(id))}`;
}

document.addEventListener('DOMContentLoaded', () => {
    const mapEl = document.getElementById('reports-map');
    if (!mapEl || typeof L === 'undefined') return;

    const map = L.map(mapEl).setView([-25.9692, 32.5732], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    const categorySelect = document.getElementById('filter-category');
    const statusSelect = document.getElementById('filter-status');
    const apiBase = document.body.dataset.apiBase || '/api';

    async function loadReports() {
        const params = new URLSearchParams();
        if (categorySelect.value) params.set('id_categoria', categorySelect.value);
        if (statusSelect.value) params.set('status', statusSelect.value);

        try {
            const response = await fetch(`${apiBase}/reports?${params.toString()}`, {
                headers: { Accept: 'application/json' },
            });
            if (!response.ok) return;

            const { data } = await response.json();
            markersLayer.clearLayers();

            data.forEach((report) => {
                const color = STATUS_COLORS[report.status] ?? '#6b7280';

                const marker = L.circleMarker([report.latitude, report.longitude], {
                    radius: 8, color, fillColor: color, fillOpacity: 0.8, weight: 2,
                });

                // Sanitização estrita contra XSS Armazenado
                const safeCategory = sanitizarTexto(report.category || 'Sem categoria');
                const safeDescription = sanitizarTexto(report.description || '');
                const safeStatus = sanitizarTexto((report.status || '').replace(/_/g, ' '));
                const safeDate = sanitizarTexto(report.created_at || '');
                const safePhotoUrl = report.photo_url ? encodeURI(report.photo_url) : null;

                const photoHtml = safePhotoUrl
                    ? `<img src="${safePhotoUrl}" alt="${safeCategory}" style="width:100%;border-radius:6px;margin-bottom:6px;max-height:140px;object-fit:cover;">`
                    : '';

                marker.bindPopup(`
                    ${photoHtml}
                    <strong>${safeCategory}</strong><br>
                    <span style="text-transform:capitalize;">${safeStatus}</span><br>
                    <span style="color:#4b5563;font-size:12px;display:block;margin-top:4px;">${safeDescription}</span><br>
                    <span style="color:#9ca3af;font-size:11px;">${safeDate} · 👍 ${Number(report.votes) || 0}</span><br>
                    <a href="${ocorrenciaUrl(report.id)}" style="color:#6d28d9;font-weight:600;font-size:12px;">Ver detalhes e apoiar →</a>
                `);

                markersLayer.addLayer(marker);
            });
        } catch (err) {
            console.error('Erro ao carregar ocorrências para o mapa:', err);
        }
    }

    const recenterBtn = document.getElementById('btn-recenter');
    if (recenterBtn) {
        recenterBtn.addEventListener('click', () => {
            map.setView([-25.9692, 32.5732], 13);
        });
    }

    if (categorySelect) categorySelect.addEventListener('change', loadReports);
    if (statusSelect) statusSelect.addEventListener('change', loadReports);
    loadReports();
});
