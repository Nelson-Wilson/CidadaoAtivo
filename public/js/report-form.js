// Cidadão Ativo — mapa de localização e assistência por IA no formulário de denúncia.
(function () {
    'use strict';

    function obterApiBase() {
        var alvo = document.querySelector('[data-api-base]');
        return (alvo && alvo.dataset.apiBase) || '/api';
    }

    function csrfToken() {
        var meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.content : '';
    }

    function alternar(elemento, visivel) {
        if (elemento) elemento.classList.toggle('hidden', !visivel);
    }

    // --- Localização: GPS + pino arrastável ---------------------------------
    document.addEventListener('DOMContentLoaded', function () {
        var mapEl = document.getElementById('location-picker');
        if (!mapEl || typeof L === 'undefined') return;

        var latInput = document.getElementById('latitude');
        var lngInput = document.getElementById('longitude');
        var statusEl = document.getElementById('location-status');
        var defaultCenter = [-25.9692, 32.5732];

        var map = L.map(mapEl, { scrollWheelZoom: false }).setView(defaultCenter, 13);
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
            maxZoom: 19,
        }).addTo(map);

        var marker = null;

        function escreverStatus(texto) {
            if (statusEl) statusEl.textContent = texto;
        }

        function setLocation(lat, lng, zoom) {
            latInput.value = Number(lat).toFixed(7);
            lngInput.value = Number(lng).toFixed(7);

            if (marker) {
                marker.setLatLng([lat, lng]);
            } else {
                marker = L.marker([lat, lng], { draggable: true }).addTo(map);
                marker.on('dragend', function () {
                    var pos = marker.getLatLng();
                    setLocation(pos.lat, pos.lng, map.getZoom());
                    escreverStatus('Local ajustado manualmente. Confirma se o pino está no sítio certo.');
                    latInput.dispatchEvent(new Event('change'));
                });
            }

            map.setView([lat, lng], zoom || map.getZoom());
        }

        map.on('click', function (evento) {
            setLocation(evento.latlng.lat, evento.latlng.lng, map.getZoom());
            escreverStatus('Local escolhido no mapa. Podes arrastar o pino para afinar.');
            latInput.dispatchEvent(new Event('change'));
        });

        var latitudeInicial = parseFloat(latInput.value);
        var longitudeInicial = parseFloat(lngInput.value);
        var temPosicaoGuardada = Number.isFinite(latitudeInicial) && Number.isFinite(longitudeInicial);

        if (temPosicaoGuardada) {
            setLocation(latitudeInicial, longitudeInicial, 15);
            escreverStatus('Localização anterior recuperada. Podes ajustar o pino se necessário.');
            return;
        }

        if (!navigator.geolocation) {
            setLocation(defaultCenter[0], defaultCenter[1], 12);
            escreverStatus('O navegador não suporta geolocalização. Marca o local onde ocorreu o problema.');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            function (posicao) {
                setLocation(posicao.coords.latitude, posicao.coords.longitude, 16);
                escreverStatus('Localização GPS obtida. Arrasta o pino se o ponto não estiver exato.');
                latInput.dispatchEvent(new Event('change'));
            },
            function () {
                setLocation(defaultCenter[0], defaultCenter[1], 12);
                escreverStatus('Sem acesso ao GPS. Clica no mapa para marcar o local.');
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
        );
    });

    // --- IA: descrição, categoria, duplicados e análise da fotografia -------
    document.addEventListener('DOMContentLoaded', function () {
        var descriptionEl = document.getElementById('description');
        if (!descriptionEl) return;

        var categoryEl = document.getElementById('category_id');
        var latInput = document.getElementById('latitude');
        var lngInput = document.getElementById('longitude');
        var suggestionEl = document.getElementById('ai-suggestion');
        var duplicateWarning = document.getElementById('duplicate-warning');
        var duplicateList = document.getElementById('duplicate-list');
        var photoInput = document.getElementById('photo');
        var previewEl = document.getElementById('photo-preview');
        var photoNote = document.getElementById('photo-ai-note');
        var photoAnalyzing = document.getElementById('photo-analyzing');

        var descricaoImproveBtn = document.getElementById('ai-description-improve');
        var descricaoSummarizeBtn = document.getElementById('ai-description-summarize');
        var descricaoFromPhotoBtn = document.getElementById('ai-description-from-photo');
        var descricaoHintEl = document.getElementById('ai-description-hint');
        var descricaoPanel = document.getElementById('ai-description-panel');
        var descricaoTextEl = document.getElementById('ai-description-text');
        var descricaoAcceptBtn = document.getElementById('ai-description-accept');
        var descricaoRetryBtn = document.getElementById('ai-description-retry');
        var descricaoDiscardBtn = document.getElementById('ai-description-discard');
        var descricaoCloseBtn = document.getElementById('ai-description-close');
        var descricaoUndoEl = document.getElementById('ai-description-undo');
        var descricaoErroEl = document.getElementById('ai-description-error');

        var apiBase = obterApiBase();
        var token = csrfToken();
        var sugestaoAtual = null;
        var previewUrl = null;

        var sugestaoDescricao = null;
        var modoDescricao = 'improve';
        var textoAnteriorDescricao = null;
        var textoAceitoDescricao = null;
        var pedidoDescricaoEmCurso = false;
        var pedidoDuplicados = 0;

        function postJson(url, body) {
            return fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-Token': token,
                },
                body: JSON.stringify(body),
            }).then(function (resposta) {
                return resposta.ok ? resposta.json() : null;
            }).catch(function () {
                return null;
            });
        }

        function postForm(url, formData) {
            return fetch(url, {
                method: 'POST',
                headers: { Accept: 'application/json', 'X-CSRF-Token': token },
                body: formData,
            }).then(function (resposta) {
                return resposta.ok ? resposta.json() : null;
            }).catch(function () {
                return null;
            });
        }

        // --- Assistente de descrição --------------------------------------
        function textoDescricao() {
            return descriptionEl.value.trim();
        }

        function temFotoSelecionada() {
            return Boolean(photoInput && photoInput.files && photoInput.files[0]);
        }

        function atualizarFerramentasDescricao() {
            if (!descricaoImproveBtn && !descricaoSummarizeBtn && !descricaoFromPhotoBtn) return;

            var temTexto = textoDescricao().length >= 10;
            var temFoto = temFotoSelecionada();

            if (descricaoImproveBtn) descricaoImproveBtn.disabled = !temTexto || pedidoDescricaoEmCurso;
            if (descricaoSummarizeBtn) descricaoSummarizeBtn.disabled = !temTexto || pedidoDescricaoEmCurso;
            if (descricaoFromPhotoBtn) {
                descricaoFromPhotoBtn.disabled = !temFoto || pedidoDescricaoEmCurso;
                alternar(descricaoFromPhotoBtn, temFoto);
            }

            if (descricaoHintEl) {
                if (pedidoDescricaoEmCurso) {
                    descricaoHintEl.textContent = 'A IA está a preparar uma sugestão…';
                } else if (temTexto) {
                    descricaoHintEl.textContent = 'Revê sempre a sugestão antes de a usares.';
                } else if (temFoto) {
                    descricaoHintEl.textContent = 'Podes pedir uma sugestão com base na foto ou escrever pelo menos 10 caracteres.';
                } else {
                    descricaoHintEl.textContent = 'Escreve pelo menos 10 caracteres ou anexa uma foto para receber uma sugestão.';
                }
            }
        }

        function limparErroDescricao() {
            if (!descricaoErroEl) return;
            descricaoErroEl.textContent = '';
            alternar(descricaoErroEl, false);
        }

        function mostrarErroDescricao(mensagem) {
            if (!descricaoErroEl) return;
            descricaoErroEl.textContent = mensagem;
            alternar(descricaoErroEl, true);
        }

        function resetarAceiteDescricao() {
            if (!descricaoAcceptBtn) return;
            descricaoAcceptBtn.disabled = false;
            descricaoAcceptBtn.textContent = 'Usar esta versão';
        }

        async function pedirSugestaoDescricao(modo) {
            if (pedidoDescricaoEmCurso) return;

            var descricao = textoDescricao();
            var temFoto = temFotoSelecionada();
            if (modo !== 'from_photo' && descricao.length < 10) return;
            if (modo === 'from_photo' && !temFoto) return;

            pedidoDescricaoEmCurso = true;
            modoDescricao = modo;
            sugestaoDescricao = null;
            limparErroDescricao();
            resetarAceiteDescricao();
            alternar(descricaoPanel, false);

            var botao = modo === 'summarize' ? descricaoSummarizeBtn
                : modo === 'from_photo' ? descricaoFromPhotoBtn
                    : descricaoImproveBtn;
            var rotulo = botao ? botao.textContent : '';
            if (botao) botao.textContent = 'A gerar…';
            if (descricaoPanel) descricaoPanel.setAttribute('aria-busy', 'true');
            atualizarFerramentasDescricao();

            try {
                var formData = new FormData();
                formData.append('mode', modo);
                formData.append('description', descricao);
                if (categoryEl && categoryEl.value) formData.append('category_id', categoryEl.value);

                var bairroEl = document.getElementById('neighborhood');
                if (bairroEl && bairroEl.value.trim()) formData.append('neighborhood', bairroEl.value.trim());

                if (modo === 'from_photo') {
                    formData.append('photo', photoInput.files[0]);
                }

                var resultado = await postForm(apiBase + '/ai/description', formData);
                var dados = resultado && resultado.data;
                var sugestao = dados && typeof dados.suggestion === 'string' ? dados.suggestion.trim() : '';

                if (!sugestao) {
                    mostrarErroDescricao('A IA não conseguiu gerar uma sugestão agora. Tenta novamente ou continua com o teu texto.');
                    return;
                }

                sugestaoDescricao = sugestao;
                if (descricaoTextEl) descricaoTextEl.textContent = sugestao;
                alternar(descricaoPanel, true);
            } finally {
                pedidoDescricaoEmCurso = false;
                if (botao) botao.textContent = rotulo;
                if (descricaoPanel) descricaoPanel.setAttribute('aria-busy', 'false');
                atualizarFerramentasDescricao();
            }
        }

        function aplicarSugestaoDescricao() {
            if (!sugestaoDescricao) return;

            if (textoAnteriorDescricao === null) {
                textoAnteriorDescricao = descriptionEl.value;
            }

            textoAceitoDescricao = sugestaoDescricao;
            descriptionEl.value = sugestaoDescricao;
            alternar(descricaoUndoEl, true);

            if (descricaoAcceptBtn) {
                descricaoAcceptBtn.disabled = true;
                descricaoAcceptBtn.textContent = 'Aplicado ✓';
            }

            atualizarFerramentasDescricao();
            runClassification();
            runDuplicateCheck();
        }

        function reporTextoDescricao() {
            if (textoAnteriorDescricao === null) return;

            descriptionEl.value = textoAnteriorDescricao;
            textoAnteriorDescricao = null;
            textoAceitoDescricao = null;
            sugestaoDescricao = null;
            alternar(descricaoUndoEl, false);
            alternar(descricaoPanel, false);
            resetarAceiteDescricao();
            limparErroDescricao();
            atualizarFerramentasDescricao();
            runClassification();
            runDuplicateCheck();
        }

        function descartarSugestaoDescricao() {
            sugestaoDescricao = null;
            alternar(descricaoPanel, false);
            limparErroDescricao();
            resetarAceiteDescricao();

            // Se a sugestão já foi aplicada, o botão de repor continua visível.
            if (textoAceitoDescricao === null) alternar(descricaoUndoEl, false);
        }

        if (descricaoImproveBtn) {
            descricaoImproveBtn.addEventListener('click', function () {
                pedirSugestaoDescricao('improve');
            });
        }
        if (descricaoSummarizeBtn) {
            descricaoSummarizeBtn.addEventListener('click', function () {
                pedirSugestaoDescricao('summarize');
            });
        }
        if (descricaoFromPhotoBtn) {
            descricaoFromPhotoBtn.addEventListener('click', function () {
                pedirSugestaoDescricao('from_photo');
            });
        }
        if (descricaoAcceptBtn) descricaoAcceptBtn.addEventListener('click', aplicarSugestaoDescricao);
        if (descricaoRetryBtn) {
            descricaoRetryBtn.addEventListener('click', function () {
                pedirSugestaoDescricao(modoDescricao);
            });
        }
        if (descricaoDiscardBtn) descricaoDiscardBtn.addEventListener('click', descartarSugestaoDescricao);
        if (descricaoCloseBtn) descricaoCloseBtn.addEventListener('click', descartarSugestaoDescricao);
        if (descricaoUndoEl) descricaoUndoEl.addEventListener('click', reporTextoDescricao);

        // --- Sugestão de categoria por texto ------------------------------
        async function runClassification() {
            var descricao = descriptionEl.value.trim();
            if (descricao.length < 10) {
                alternar(suggestionEl, false);
                return;
            }

            var resultado = await postJson(apiBase + '/ai/classify', { description: descricao });
            var dados = resultado && resultado.data;
            if (!dados || !dados.category_name) {
                alternar(suggestionEl, false);
                return;
            }

            sugestaoAtual = dados;
            suggestionEl.textContent = 'Sugestão da IA: “' + dados.category_name + '”'
                + (dados.severity === 'alta' ? ' — parece um caso mais grave' : '')
                + '. Clica para aplicar.';
            alternar(suggestionEl, true);
        }

        function etiquetaConfianca(confianca) {
            if (confianca === 'alta') {
                return {
                    texto: 'Provável duplicado',
                    classe: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200',
                };
            }
            if (confianca === 'media') {
                return {
                    texto: 'Possível duplicado',
                    classe: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200',
                };
            }
            return {
                texto: 'Perto',
                classe: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
            };
        }

        function criarAvisoConfirmacao(match) {
            var aviso = document.createElement('div');
            aviso.className = 'rounded-xl border border-emerald-200 bg-emerald-50 p-2.5 text-[11px] leading-relaxed text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200';

            var texto = document.createElement('p');
            texto.textContent = 'Confirmaste que é a mesma ocorrência. Podes acompanhá-la em vez de criar uma nova.';
            aviso.appendChild(texto);

            var link = document.createElement('a');
            link.href = '/ocorrencias/' + match.report_id;
            link.className = 'mt-1 inline-block font-bold underline underline-offset-2';
            link.textContent = 'Ver ocorrência';
            aviso.appendChild(link);

            var continuar = document.createElement('button');
            continuar.type = 'button';
            continuar.className = 'ml-3 mt-1 inline-block font-semibold underline underline-offset-2';
            continuar.textContent = 'Continuar mesmo assim';
            continuar.addEventListener('click', function () {
                alternar(aviso, false);
            });
            aviso.appendChild(continuar);

            return aviso;
        }

        function criarItemDuplicado(match) {
            var container = document.createElement('div');
            container.className = 'space-y-2';

            var item = document.createElement('div');
            item.className = 'flex items-start gap-3 rounded-xl border border-amber-200 bg-white p-2.5 dark:border-amber-800 dark:bg-slate-900';

            if (match.photo_url) {
                var img = document.createElement('img');
                img.src = match.photo_url;
                img.alt = '';
                img.loading = 'lazy';
                img.className = 'h-12 w-12 shrink-0 rounded-lg object-cover';
                item.appendChild(img);
            }

            var corpo = document.createElement('div');
            corpo.className = 'min-w-0 flex-1';

            var etiqueta = etiquetaConfianca(match.confidence);
            var selo = document.createElement('span');
            selo.className = 'inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ' + etiqueta.classe;
            selo.textContent = etiqueta.texto;
            corpo.appendChild(selo);

            var descricao = document.createElement('p');
            descricao.className = 'mt-1 text-[11px] leading-snug text-slate-700 dark:text-slate-200';
            descricao.textContent = match.description || 'Ocorrência sem descrição.';
            corpo.appendChild(descricao);

            var meta = document.createElement('p');
            meta.className = 'mt-0.5 text-[10px] text-slate-400 dark:text-slate-500';
            meta.textContent = (match.category_name ? match.category_name + ' · ' : '')
                + (match.distance_km || 0) + ' km · '
                + (match.confirmations_count || 0) + ' confirmação(ões)';
            corpo.appendChild(meta);

            if (match.ai_same === true || match.ai_same === false) {
                var nota = document.createElement('p');
                nota.className = match.ai_same
                    ? 'mt-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300'
                    : 'mt-1 text-[10px] text-slate-500 dark:text-slate-400';
                nota.textContent = (match.ai_same ? 'A IA confirma: parece o mesmo problema' : 'A IA acha que pode ser diferente')
                    + (match.ai_reasoning ? ' — ' + match.ai_reasoning : '');
                corpo.appendChild(nota);
            }

            item.appendChild(corpo);

            var botao = document.createElement('button');
            botao.type = 'button';
            botao.className = 'shrink-0 rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-amber-600 disabled:opacity-60';
            botao.textContent = 'É este';
            botao.addEventListener('click', async function () {
                botao.disabled = true;
                botao.textContent = 'A confirmar…';

                var confirmacao = await postJson(apiBase + '/ai/duplicates/' + match.report_id + '/confirm', {});
                if (!confirmacao) {
                    botao.disabled = false;
                    botao.textContent = 'Tenta novamente';
                    return;
                }

                botao.textContent = 'Confirmado ✓';
                botao.classList.remove('bg-amber-500', 'hover:bg-amber-600');
                botao.classList.add('bg-emerald-600');
                container.appendChild(criarAvisoConfirmacao(match));
            });
            item.appendChild(botao);

            container.appendChild(item);
            return container;
        }

        async function runDuplicateCheck(incluirFoto) {
            var descricao = descriptionEl.value.trim();
            var categoria = categoryEl ? categoryEl.value : '';
            var lat = latInput ? latInput.value : '';
            var lng = lngInput ? lngInput.value : '';

            var latNum = parseFloat(lat);
            var lngNum = parseFloat(lng);
            if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
                alternar(duplicateWarning, false);
                return;
            }

            var meuPedido = ++pedidoDuplicados;

            var formData = new FormData();
            formData.append('latitude', String(latNum));
            formData.append('longitude', String(lngNum));
            if (descricao) formData.append('description', descricao);
            if (categoria) formData.append('category_id', categoria);

            // A comparação visual é reservada ao primeiro check após escolher
            // a foto. Repeti-la a cada ajuste do mapa gastaria quota e tempo.
            var ficheiro = incluirFoto && photoInput && photoInput.files ? photoInput.files[0] : null;
            if (ficheiro) formData.append('photo', ficheiro);

            var resultado = await postForm(apiBase + '/ai/duplicates', formData);

            // Uma resposta antiga não pode substituir o resultado de uma
            // localização mais recente.
            if (meuPedido !== pedidoDuplicados) return;

            var matches = resultado && Array.isArray(resultado.data) ? resultado.data : [];

            if (!matches.length) {
                alternar(duplicateWarning, false);
                return;
            }

            duplicateList.innerHTML = '';
            matches.forEach(function (match) {
                duplicateList.appendChild(criarItemDuplicado(match));
            });
            alternar(duplicateWarning, true);
        }

        function debounce(fn, ms) {
            var timer = null;
            return function () {
                var args = arguments;
                var contexto = this;
                clearTimeout(timer);
                timer = setTimeout(function () {
                    fn.apply(contexto, args);
                }, ms);
            };
        }

        var classificarAgendado = debounce(runClassification, 700);
        var duplicadosAgendados = debounce(runDuplicateCheck, 1200);

        descriptionEl.addEventListener('input', function () {
            atualizarFerramentasDescricao();

            if (textoAceitoDescricao !== null && descriptionEl.value !== textoAceitoDescricao) {
                textoAceitoDescricao = null;
                textoAnteriorDescricao = null;
                alternar(descricaoUndoEl, false);
                resetarAceiteDescricao();
            }

            classificarAgendado();
        });

        descriptionEl.addEventListener('change', function () {
            if (descriptionEl.value.trim().length >= 10) duplicadosAgendados();
        });

        if (categoryEl) {
            categoryEl.addEventListener('change', function () {
                duplicadosAgendados();
            });
        }

        if (latInput) {
            latInput.addEventListener('change', function () {
                duplicadosAgendados();
            });
        }

        if (suggestionEl) {
            suggestionEl.addEventListener('click', function () {
                if (!sugestaoAtual || !sugestaoAtual.category_id || !categoryEl) return;
                categoryEl.value = String(sugestaoAtual.category_id);
                alternar(suggestionEl, false);
                runDuplicateCheck();
            });
        }

        // --- Análise da fotografia assim que é escolhida -------------------
        if (photoInput) {
            photoInput.addEventListener('change', async function () {
                var ficheiro = photoInput.files ? photoInput.files[0] : null;

                if (previewEl) {
                    if (previewUrl) URL.revokeObjectURL(previewUrl);
                    if (ficheiro) {
                        previewUrl = URL.createObjectURL(ficheiro);
                        previewEl.src = previewUrl;
                        alternar(previewEl, true);
                    } else {
                        previewUrl = null;
                        previewEl.removeAttribute('src');
                        alternar(previewEl, false);
                    }
                }

                atualizarFerramentasDescricao();

                if (!ficheiro) return;

                alternar(photoNote, false);
                alternar(photoAnalyzing, true);

                var formData = new FormData();
                formData.append('photo', ficheiro);
                formData.append('description', descriptionEl.value.trim());

                var resultado = await postForm(apiBase + '/ai/analyze-photo', formData);
                var dados = resultado && resultado.data;

                alternar(photoAnalyzing, false);

                if (dados && dados.category_id) {
                    if (categoryEl) categoryEl.value = String(dados.category_id);

                    if (photoNote) {
                        photoNote.textContent = 'A IA identificou “' + dados.category_name + '” na fotografia.'
                            + (dados.severity === 'alta' ? ' Parece um caso mais grave.' : '')
                            + ' Podes corrigir se não for isso.';
                        alternar(photoNote, true);
                    }
                }

                runDuplicateCheck(true);
            });
        }

        atualizarFerramentasDescricao();

        // A localização pode já estar preenchida (posição recuperada). Nesse
        // caso a verificação de duplicados arranca sem esperar pela descrição.
        if (latInput && lngInput && latInput.value && lngInput.value) {
            duplicadosAgendados();
        }
    });

    // --- Prevenção de duplo envio ------------------------------------------
    document.addEventListener('DOMContentLoaded', function () {
        var form = document.querySelector('form[action$="/denuncias"]');
        if (!form) return;

        form.addEventListener('submit', function () {
            var botao = form.querySelector('button[type="submit"]');
            if (!botao || botao.disabled) return;
            botao.disabled = true;
            botao.dataset.original = botao.textContent;
            botao.textContent = 'A enviar denúncia…';
            botao.classList.add('opacity-60', 'cursor-not-allowed');
        });
    });
})();
