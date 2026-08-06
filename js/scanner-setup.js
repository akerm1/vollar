
// ============================================================
// SETUP #scanner-receiver  (hidden input, always has focus)
// ============================================================
function setupScannerReceiver() {
    const el = document.getElementById('scanner-receiver');
    if (!el) { console.warn('scanner-receiver not found'); return; }

    el.setAttribute('autocomplete', 'off');
    el.value = '';

    // Enter key → process immediately
    el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();

            // If manual-barcode has content + suggestions are open,
            // delegate Enter to the search path instead
            const manualInp = document.getElementById('manual-barcode');
            const suggestions = document.getElementById('barcode-suggestions');
            if (manualInp && manualInp.value.trim() &&
                suggestions && suggestions.style.display !== 'none') {
                const items = suggestions.querySelectorAll('.suggestion-item');
                if (items.length > 0) {
                    let idx = 0;
                    items.forEach((el2, i) => { if (el2.classList.contains('active')) idx = i; });
                    const barcode = items[idx].dataset.barcode;
                    manualInp.value = '';
                    closeSuggestions();
                    routeBarcode(barcode);
                    return;
                }
            }

            const val = this.value.trim();
            this.value = '';
            if (barcodeInputTimer) { clearTimeout(barcodeInputTimer); barcodeInputTimer = null; }
            if (val) routeBarcode(val);
        }
    });

    // Accumulate characters; fire after BARCODE_TIMEOUT ms of silence
    el.addEventListener('input', function () {
        const val = this.value || '';

        // inline newline means scanner sent Enter as part of value
        if (val.includes('\n') || val.includes('\r')) {
            const cleaned = val.replace(/[\r\n]/g, '').trim();
            this.value = '';
            if (barcodeInputTimer) { clearTimeout(barcodeInputTimer); barcodeInputTimer = null; }
            if (cleaned) routeBarcode(cleaned);
            return;
        }

        if (barcodeInputTimer) clearTimeout(barcodeInputTimer);
        barcodeInputTimer = setTimeout(() => {
            const current = this.value.trim();
            this.value = '';
            barcodeInputTimer = null;
            if (current.length >= 2) routeBarcode(current);
        }, getScannerTimeout());
    });

    // paste
    el.addEventListener('paste', function (e) {
        try {
            const text = (e.clipboardData || window.clipboardData).getData('text');
            if (text) {
                e.preventDefault();
                this.value = '';
                routeBarcode(text.trim());
            }
        } catch (_) {}
    });

    // re-focus only if focus went somewhere unrelated
    // (not to manual-barcode, not to the suggestions dropdown, not to a SELECT, not to any INPUT)
    el.addEventListener('blur', function () {
        setTimeout(() => {
            const active = document.activeElement;
            const manualInput = document.getElementById('manual-barcode');
            const suggestions = document.getElementById('barcode-suggestions');
            const inSuggestions = suggestions && suggestions.contains(active);
            const inSelect = active && active.tagName === 'SELECT';
            const inInput  = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
            if (active !== el && active !== manualInput && !inSuggestions && !inSelect && !inInput) {
                try { el.focus(); } catch (_) {}
            }
        }, 50);
    });

    setTimeout(() => { try { el.focus(); } catch (_) {} }, 100);
    console.log('✅ scanner-receiver ready');
}

// ============================================================
// SETUP #manual-barcode  (visible search box)
// ============================================================
function setupManualBarcode() {
    const inp = document.getElementById('manual-barcode');
    const btn = document.getElementById('btn-manual-scan');
    if (!inp) { console.warn('manual-barcode not found'); return; }

    inp.value = '';

    // ── input: live search ────────────────────────────────────
    inp.addEventListener('input', function () {
        if (window.meterPromptActive) { this.value = ''; return; }
        const val = this.value;
        if (searchDebounceTimer) { clearTimeout(searchDebounceTimer); searchDebounceTimer = null; }
        if (!val) { closeSuggestions(); return; }
        searchDebounceTimer = setTimeout(() => {
            showSearchSuggestions(val);
            searchDebounceTimer = null;
        }, SEARCH_DEBOUNCE);
    });

    // ── keydown: Enter / Escape / arrows ─────────────────────
    inp.addEventListener('keydown', function (e) {
        if (window.meterPromptActive) { e.preventDefault(); this.value = ''; return; }

        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            if (searchDebounceTimer) { clearTimeout(searchDebounceTimer); searchDebounceTimer = null; }

            const val = this.value.trim();
            if (!val) return;

            // If suggestions are already visible → pick the highlighted one
            const container = document.getElementById('barcode-suggestions');
            const items = container ? container.querySelectorAll('.suggestion-item') : [];

            if (items.length > 0 && container.style.display !== 'none') {
                // find active item (default to first)
                let idx = 0;
                items.forEach((el, i) => { if (el.classList.contains('active')) idx = i; });
                const barcode = items[idx].dataset.barcode;
                this.value = '';
                closeSuggestions();
                routeBarcode(barcode);
                return;
            }

            // Suggestions not yet rendered → run search now, pick top result
            const self = this;
            fastSearch(val).then(results => {
                self.value = '';
                closeSuggestions();
                if (results.length > 0) {
                    routeBarcode(results[0].barcode);
                } else {
                    // last resort: treat typed text as a direct barcode
                    routeBarcode(val);
                }
            });
            return;
        }

        if (e.key === 'Escape') {
            if (searchDebounceTimer) { clearTimeout(searchDebounceTimer); searchDebounceTimer = null; }
            this.value = '';
            closeSuggestions();
            return;
        }

        if (e.key === 'ArrowDown') { e.preventDefault(); navigateSuggestions(1);  return; }
        if (e.key === 'ArrowUp')   { e.preventDefault(); navigateSuggestions(-1); return; }
    });

    // ── button click ──────────────────────────────────────────
    if (btn) {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', function () {
            if (window.meterPromptActive) return;
            if (searchDebounceTimer) { clearTimeout(searchDebounceTimer); searchDebounceTimer = null; }

            const val = inp.value.trim();
            if (!val) {
                if (typeof showToast   === 'function') showToast(t('enterBarcodeOrName'), 'warning');
                if (typeof playWarning === 'function') playWarning();
                inp.focus();
                return;
            }

            const container = document.getElementById('barcode-suggestions');
            const items = container ? container.querySelectorAll('.suggestion-item') : [];

            if (items.length > 0 && container && container.style.display !== 'none') {
                let idx = 0;
                items.forEach((el, i) => { if (el.classList.contains('active')) idx = i; });
                const barcode = items[idx].dataset.barcode;
                inp.value = '';
                closeSuggestions();
                routeBarcode(barcode);
            } else {
                inp.value = '';
                closeSuggestions();
                routeBarcode(val);
            }
            setTimeout(() => inp.focus(), 300);
        });
    }

    // ── close suggestions on outside click ───────────────────
    document.addEventListener('click', function (e) {
        const container = document.getElementById('barcode-suggestions');
        if (container && !container.contains(e.target) && e.target !== inp) {
            closeSuggestions();
        }
    });

    console.log('✅ manual-barcode search ready');
}

// ============================================================
// GLOBAL KEYBOARD REDIRECT
// Letters typed outside any input → auto-focus manual-barcode + type
// Numbers with empty input → let scanner-receiver handle (barcode scan)
// ============================================================
function setupKeyboardRedirect() {
    document.addEventListener('keydown', function(e) {
        const active = document.activeElement;
        if (active) {
            const tag = active.tagName || '';
            if ((tag === 'INPUT' || tag === 'TEXTAREA' || active.isContentEditable)
                && active.id !== 'scanner-receiver') {
                return;
            }
        }

        if (e.ctrlKey || e.altKey || e.metaKey) return;
        if (e.key.length > 1) return;
        if (!e.key || e.key.length !== 1) return;

        // Enregistrement d'un raccourci bouton → laisser button-context gérer
        if (window.isButtonShortcutRecording && window.isButtonShortcutRecording()) return;

        // Raccourci bouton configuré → priorité sur la redirection
        if (window.fireButtonShortcut && window.fireButtonShortcut(e.key)) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        const isLetter = /[a-zA-Z]/.test(e.key);
        const isNumber = /[0-9]/.test(e.key);

        if (active && active.id === 'manual-barcode') return;

        const manualInput = document.getElementById('manual-barcode');
        if (!manualInput) return;

        // Letters → always redirect to manual-barcode for search
        if (isLetter) {
            e.preventDefault();
            e.stopPropagation();

            // Classic terminal : la boîte de saisie manuelle est masquée → on
            // ouvre directement la recherche manuelle du terminal avec la lettre.
            if (document.body.classList.contains('structure-classic') &&
                typeof window.ClassicPOS !== 'undefined' &&
                typeof window.ClassicPOS.typeToSearch === 'function') {
                window.ClassicPOS.typeToSearch(e.key);
                return;
            }

            manualInput.focus();
            manualInput.value += e.key;
            manualInput.dispatchEvent(new Event('input', { bubbles: true }));
            return;
        }

        // Numbers while already typing → continue in manual-barcode
        if (isNumber && manualInput.value.length > 0) {
            e.preventDefault();
            e.stopPropagation();
            manualInput.focus();
            manualInput.value += e.key;
            manualInput.dispatchEvent(new Event('input', { bubbles: true }));
            return;
        }

        // Numbers with empty manual input → let scanner-receiver handle it (barcode scan)
        return;
    }, true);

    console.log('✅ Keyboard redirect ready');
}
