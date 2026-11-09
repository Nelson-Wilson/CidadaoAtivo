// Cidadão Ativo — captura de localização no formulário de nova denúncia.

document.addEventListener('DOMContentLoaded', () => {
    const mapEl = document.getElementById('location-picker');
    if (!mapEl || typeof L === 'undefined') return;

    const latInput = document.getElementById('latitude');
    const lngInput = document.getElementById('longitude');
    const statusEl = document.getElementById('location-status');

    const defaultCenter = [-25.9692, 32.5732]; // Maputo

    const map = L.map(mapEl).setView(defaultCenter, 13);
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
        maxZoom: 19,
    }).addTo(map);

    let marker = null;

    function setLocation(lat, lng, zoom = 16) {
        latInput.value = lat.toFixed(7);
        lngInput.value = lng.toFixed(7);

        if (marker) {
            marker.setLatLng([lat, lng]);
        } else {
            marker = L.marker([lat, lng], { draggable: true }).addTo(map);
            marker.on('dragend', () => {
                const pos = marker.getLatLng();
                setLocation(pos.lat, pos.lng, map.getZoom());
            });
        }

        map.setView([lat, lng], zoom);
    }

    map.on('click', (e) => setLocation(e.latlng.lat, e.latlng.lng, map.getZoom()));

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation(position.coords.latitude, position.coords.longitude);
                statusEl.textContent = 'Localização obtida por GPS. Podes ajustar arrastando o marcador.';
            },
            () => {
                setLocation(defaultCenter[0], defaultCenter[1], 12);
                statusEl.textContent = 'Não foi possível obter o GPS. Marca o local manualmente no mapa.';
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    } else {
        setLocation(defaultCenter[0], defaultCenter[1], 12);
        statusEl.textContent = 'O teu navegador não suporta geolocalização. Marca o local manualmente.';
    }
});

// --- IA (Sprint 3): sugestão de categoria + aviso de possíveis duplicados. ---
document.addEventListener('DOMContentLoaded', () => {
    const descriptionEl = document.getElementById('description');
    const categoryEl = document.getElementById('category_id');
    const latInput = document.getElementById('latitude');
    const suggestionEl = document.getElementById('ai-suggestion');
    const duplicateWarning = document.getElementById('duplicate-warning');
    const duplicateList = document.getElementById('duplicate-list');

    if (!descriptionEl) return;

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
    const apiBase = document.body.dataset.apiBase || '/api';
    let debounceTimer = null;

    async function postJson(url, body) {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-CSRF-Token': csrfToken ?? '',
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) return null;
        return response.json();
    }

    async function postForm(url, formData) {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'X-CSRF-Token': csrfToken ?? '' },
            body: formData,
        });
        if (!response.ok) return null;
        return response.json();
    }

    async function runClassification() {
        const description = descriptionEl.value.trim();
        if (description.length < 10) return;

        const result = await postJson(`${apiBase}/ai/classify`, { description });
        const data = result?.data;
        if (!data || !data.category_name) {
            suggestionEl.style.display = 'none';
            return;
        }

        suggestionEl.textContent = `Sugestão da IA: "${data.category_name}"${data.severity === 'alta' ? ' — parece um caso mais grave' : ''}. Clica para aplicar.`;
        suggestionEl.style.display = 'block';
        suggestionEl.onclick = () => {
            if (data.category_id) categoryEl.value = data.category_id;
            suggestionEl.style.display = 'none';
        };
    }

    async function runDuplicateCheck() {
        const description = descriptionEl.value.trim();
        const categoryId = categoryEl.value;
        const lat = latInput.value;
        const lng = document.getElementById('longitude').value;

        if (description.length < 10 || !categoryId || !lat || !lng) {
            duplicateWarning.style.display = 'none';
            return;
        }

        const formData = new FormData();
        formData.append('description', description);
        formData.append('category_id', categoryId);
        formData.append('latitude', lat);
        formData.append('longitude', lng);

        // Se já houver foto escolhida, envia-a também — reforça a confirmação
        // dos 2 candidatos mais prováveis com comparação visual pela IA.
        const photoFile = document.getElementById('photo')?.files?.[0];
        if (photoFile) formData.append('photo', photoFile);

        const result = await postForm(`${apiBase}/ai/duplicates`, formData);

        const matches = result?.data ?? [];
        if (!matches.length) {
            duplicateWarning.style.display = 'none';
            return;
        }

        function escaparHtml(str) {
            const div = document.createElement('div');
            div.textContent = str ?? '';
            return div.innerHTML;
        }

        duplicateList.innerHTML = '';
        matches.forEach((match) => {
            const item = document.createElement('div');
            item.style.cssText = 'display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #EAC57C;border-radius:10px;padding:8px;';

            const safeDesc = escaparHtml(match.description);
            const safeReasoning = match.ai_reasoning ? escaparHtml(match.ai_reasoning) : '';

            const aiNote = match.ai_same === true
                ? `<p style="margin:2px 0 0;font-size:11px;color:#9C4526;font-weight:600;">🤖 A IA confirma: parece ser o mesmo problema${safeReasoning ? ' — ' + safeReasoning : ''}.</p>`
                : (match.ai_same === false
                    ? `<p style="margin:2px 0 0;font-size:11px;color:#6b7280;">🤖 A IA acha que pode ser diferente${safeReasoning ? ' — ' + safeReasoning : ''}.</p>`
                    : '');

            const safePhoto = match.photo_url
                ? `<img src="${encodeURI(match.photo_url)}" style="width:48px;height:48px;object-fit:cover;border-radius:8px;">`
                : '';

            item.innerHTML = `
                ${safePhoto}
                <div style="flex:1;">
                    <p style="margin:0;font-size:12px;color:#374151;">${safeDesc}</p>
                    <p style="margin:0;font-size:11px;color:#9ca3af;">${match.distance_km} km de distância · ${match.confirmations_count} confirmação(ões)</p>
                    ${aiNote}
                </div>
                <button type="button" data-report-id="${match.report_id}"
                        style="font-size:12px;background:#C08C28;color:#fff;border:none;border-radius:9999px;padding:5px 10px;cursor:pointer;">
                    É este
                </button>
            `;
            duplicateList.appendChild(item);
        });

        duplicateList.querySelectorAll('button[data-report-id]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const reportId = btn.dataset.reportId;
                await postJson(`${apiBase}/ai/duplicates/${reportId}/confirm`, {});
                btn.textContent = 'Confirmado ✓';
                btn.disabled = true;
            });
        });

        duplicateWarning.style.display = 'block';
    }

    function debounce(fn, ms) {
        return (...args) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => fn(...args), ms);
        };
    }

    const debouncedCheck = debounce(() => {
        runClassification();
        runDuplicateCheck();
    }, 700);

    descriptionEl.addEventListener('input', debouncedCheck);
    categoryEl.addEventListener('change', debouncedCheck);
    latInput.addEventListener('change', debouncedCheck);

    // Exposto para o bloco de análise de foto poder recorrer a este mesmo
    // aviso de duplicados assim que a foto for escolhida.
    window.__recheckDuplicates = () => runDuplicateCheck();
});

// --- IA (Sprint 3+): análise da FOTOGRAFIA por visão computacional. ---
// Assim que o cidadão escolhe/tira a foto, envia-a de imediato para a IA
// analisar e pré-seleccionar a categoria — o cidadão pode sempre corrigir
// antes de enviar a denúncia.
document.addEventListener('DOMContentLoaded', () => {
    const photoInput = document.getElementById('photo');
    const categoryEl = document.getElementById('category_id');
    const descriptionEl = document.getElementById('description');
    const noteEl = document.getElementById('photo-ai-note');
    const analyzingEl = document.getElementById('photo-analyzing');

    if (!photoInput) return;

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
    const apiBase = document.body.dataset.apiBase || '/api';

    photoInput.addEventListener('change', async () => {
        const file = photoInput.files?.[0];
        if (!file) return;

        noteEl.classList.add('hidden');
        analyzingEl.classList.remove('hidden');

        const formData = new FormData();
        formData.append('photo', file);
        formData.append('description', descriptionEl.value.trim());

        try {
            const response = await fetch(`${apiBase}/ai/analyze-photo`, {
                method: 'POST',
                headers: { 'X-CSRF-Token': csrfToken ?? '' },
                body: formData,
            });
            const result = await response.json();
            const data = result?.data;

            analyzingEl.classList.add('hidden');

            if (!data || !data.category_id) {
                return; // IA desactivada, sem chave configurada, ou não conseguiu identificar — segue sem sugestão.
            }

            categoryEl.value = data.category_id;

            const severityNote = data.severity === 'alta' ? ' Parece um caso mais grave.' : '';
            noteEl.textContent = `🤖 A IA identificou "${data.category_name}" na fotografia.${severityNote} Podes corrigir se não for isso.`;
            noteEl.classList.remove('hidden');

            // Com a categoria já preenchida pela IA, aproveita para reforçar
            // o aviso de duplicados com a comparação visual desta foto.
            window.__recheckDuplicates?.();
        } catch (err) {
            analyzingEl.classList.add('hidden');
        }
    });

    // Pré-visualização da fotografia escolhida pelo cidadão
    const previewImg = document.createElement('img');
    previewImg.id = 'photo-preview';
    previewImg.className = 'hidden w-36 h-36 object-cover rounded-xl border border-jacaranda-200 mt-2.5 shadow-sm';
    photoInput.parentNode.appendChild(previewImg);

    photoInput.addEventListener('change', () => {
        const file = photoInput.files?.[0];
        if (file) {
            previewImg.src = URL.createObjectURL(file);
            previewImg.classList.remove('hidden');
        } else {
            previewImg.classList.add('hidden');
        }
    });
});

// Prevenção de duplo envio de formulário
document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form[action$="/denuncias"]');
    if (!form) return;

    form.addEventListener('submit', () => {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'A enviar denúncia...';
            submitBtn.classList.add('opacity-60', 'cursor-not-allowed');
        }
    });
});
