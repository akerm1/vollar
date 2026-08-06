
// ============================================================
// SUGGESTION DROPDOWN UI
// ============================================================
function closeSuggestions() {
    const c = document.getElementById('barcode-suggestions');
    if (c) c.style.display = 'none';
    selectedSuggestionIndex = -1;
}

function highlightSuggestion(index) {
    const c = document.getElementById('barcode-suggestions');
    if (!c) return;
    const items = c.querySelectorAll('.suggestion-item');
    items.forEach((el, i) => {
        el.classList.toggle('active', i === index);
        el.style.background = (i === index) ? '#D4D0FF' : 'white';
        if (i === index) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    selectedSuggestionIndex = index;
}

function navigateSuggestions(dir) {
    const c = document.getElementById('barcode-suggestions');
    if (!c || c.style.display === 'none') return;
    const items = c.querySelectorAll('.suggestion-item');
    if (!items.length) return;
    let next = selectedSuggestionIndex + dir;
    if (next < 0) next = items.length - 1;
    if (next >= items.length) next = 0;
    highlightSuggestion(next);
}

// selectSuggestion / unselectSuggestion kept for onmouseover compatibility
function selectSuggestion(index)   { highlightSuggestion(index); }
function unselectSuggestion(index) {
    if (selectedSuggestionIndex !== index) {
        const c = document.getElementById('barcode-suggestions');
        if (!c) return;
        const items = c.querySelectorAll('.suggestion-item');
        if (items[index]) { items[index].classList.remove('active'); items[index].style.background = 'white'; }
    }
}

function selectCurrentSuggestion() {
    const c = document.getElementById('barcode-suggestions');
    if (!c || c.style.display === 'none') return false;
    const items = c.querySelectorAll('.suggestion-item');
    const idx = selectedSuggestionIndex >= 0 ? selectedSuggestionIndex : 0;
    if (!items[idx]) return false;
    const barcode = items[idx].dataset.barcode;
    closeSuggestions();
    routeBarcode(barcode);
    return true;
}

async function showSearchSuggestions(query) {
    const container = document.getElementById('barcode-suggestions');
    if (!container) return;

    if (!query) { closeSuggestions(); return; }

    try {
        const t0      = performance.now();
        const results = await fastSearch(query);
        const ms      = Math.round(performance.now() - t0);

        if (!results.length) {
            container.innerHTML = `
                <div style="padding:12px 16px;color:#999;text-align:center;font-style:italic;font-size:13px;">
                    🔍 Aucun produit trouvé
                </div>`;
            container.style.display = 'block';
            selectedSuggestionIndex = -1;
            return;
        }

        let html = `
            <div style="padding:6px 12px;background:#f8f9fa;font-size:11px;color:#999;
                        border-bottom:1px solid #eee;display:flex;justify-content:space-between;">
                <span>${results.length} résultat(s)</span><span>${ms}ms</span>
            </div>`;

        results.forEach((p, i) => {
            const ref  = p.reference ? ` [${p.reference}]` : '';
            const sel  = i === 0 ? 'active' : '';
            const bg   = i === 0 ? '#c2c2c2' : 'white';
            html += `
                <div class="suggestion-item ${sel}" data-barcode="${p.barcode}" data-index="${i}"
                    style="padding:10px 16px;cursor:pointer;border-bottom:1px solid #f0f0f0;
                           font-size:14px;display:flex;justify-content:space-between;
                           align-items:center;background:${bg};"
                    onmouseover="selectSuggestion(${i})" onmouseout="unselectSuggestion(${i})">
                    <div>
                        <span style="font-weight:500;">${escapeHtml(p.name)}</span>
                        <span style="font-size:12px;color:#888;">${escapeHtml(ref)}</span>
                        <span style="font-size:11px;color:#aaa;margin-left:8px;
                                     background:#f0f0f0;padding:1px 8px;border-radius:10px;">
                            ${escapeHtml(p.barcode)}
                        </span>
                    </div>
                    <div style="display:flex;align-items:center;gap:12px;">
                        <span style="font-size:13px;color:#666;">Stock: ${p.stock}</span>
                        <span style="font-size:15px;color:var(--primary);font-weight:700;">
                            ${p.price.toFixed(2)} DA
                        </span>
                    </div>
                </div>`;
        });

        html += `
            <div style="padding:6px 12px;background:#f8f9fa;font-size:11px;color:#aaa;
                        border-top:1px solid #eee;text-align:center;display:flex;
                        justify-content:center;gap:16px;">
                <span>⬆⬇ Naviguer</span><span>⏎ Ajouter</span><span>⎋ Annuler</span>
            </div>`;

        container.innerHTML = html;
        container.style.display = 'block';
        selectedSuggestionIndex = 0;

        // click handler on each row
        container.querySelectorAll('.suggestion-item').forEach(el => {
            el.addEventListener('click', function () {
                const barcode = this.dataset.barcode;
                closeSuggestions();
                const inp = document.getElementById('manual-barcode');
                if (inp) inp.value = '';
                routeBarcode(barcode);
            });
        });

    } catch (err) {
        console.error('showSearchSuggestions error:', err);
        closeSuggestions();
    }
}
