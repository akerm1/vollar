// ============================================================
// CLASSIC POS — terminal rétro (structure-classic)
// Vue autonome : panier, grille produits, pavé numérique,
// fonctions, paiement. Réutilise les API globales du panier
// (window.cart, addToCart, setCartQty, completeTransaction…)
// sans modifier leur logique. Charge APRÈS structures.js.
// ============================================================

(function () {
    'use strict';

    const CLASSIC = 'structure-classic';

    function isActive() {
        return document.body.classList.contains(CLASSIC);
    }

    function $id(id) { return document.getElementById(id); }

    function fmt(n) {
        return (isNaN(n) || n == null) ? '0.00' : Number(n).toFixed(2);
    }

    function cartTotal() {
        if (typeof window.calculateTotals === 'function') {
            const totals = window.calculateTotals('main');
            return totals ? totals.grandTotal : 0;
        }
        let sum = 0;
        (window.cart || []).forEach(function (it) {
            const p = (it.reducedPrice != null && it.reducedPrice < it.price) ? it.reducedPrice : it.price;
            sum += p * it.qty;
        });
        return sum;
    }

    // ------------------------------------------------------------
    // ÉTAT LOCAL
    // ------------------------------------------------------------
    let selectedRow = -1;
    let numpadValue = '0';
    let lastSaleAmount = 0;
    let currentCat = '__all__';
    let built = false;
    let gridTimer = null;
    let pendingSearchChar = '';

    // ------------------------------------------------------------
    // CONSTRUCTION STATIQUE (une seule fois)
    // ------------------------------------------------------------
    function buildStatic() {
        if (built) return;
        built = true;

        buildFunctionPanels();
        wireActions();

        const tbody = $id('classic-cart-body');
        if (tbody) {
            tbody.addEventListener('click', function (e) {
                const tr = e.target && e.target.closest ? e.target.closest('tr[data-index]') : null;
                if (tr) selectRow(parseInt(tr.dataset.index, 10));
            });
        }
        wireCartInputs($id('classic-cart-body'));
        wireCartInputs($id('classic-quick-body'));

        const tabs = $id('classic-cat-tabs');
        if (tabs) {
            tabs.addEventListener('click', function (e) {
                const btn = e.target && e.target.closest ? e.target.closest('.classic-cat-tab[data-cat]') : null;
                if (!btn) return;
                currentCat = btn.dataset.cat;
                renderGrid();
            });
        }

        const grid = $id('classic-cat-grid');
        if (grid) {
            grid.addEventListener('click', function (e) {
                const btn = e.target && e.target.closest ? e.target.closest('.classic-cat-btn[data-barcode]') : null;
                if (!btn) return;
                const bc = btn.dataset.barcode;
                const prod = (window._productsCache || []).find(function (p) { return p.barcode === bc; });
                if (!prod) return;
                if (typeof window.addToCart === 'function') window.addToCart(prod);
            });
        }

        setInterval(function () {
            const clock = $id('classic-clock');
            if (clock && isActive()) {
                const now = new Date();
                clock.textContent = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
            }
        }, 1000);
    }

    function buildFunctionPanels() {
        const defs = {
            '1': [
                { label: '🔍 ' + t('classicSearch'), act: 'search' },
                { label: '⚡ ' + t('classicQuickCart'), act: 'quick' },
                { label: '👤 ' + t('classicClient'), act: 'client' },
                { label: '🧹 ' + t('classicClearCart'), act: 'clearcart' },
                { label: '🚪 ' + t('classicExit'), act: 'exit' },
                { label: '💵 ' + t('classicCash'), act: 'method', method: 'especes' },
                { label: '📝 ' + t('classicCheck'), act: 'method', method: 'cheque' },
                { label: '🔴 ' + t('classicCredit'), act: 'method', method: 'credit' }
            ],
            '2': [
                { label: '🏷️ ' + t('classicDiscountPct'), act: 'discountPct' },
                { label: '💸 ' + t('classicDiscountAmount'), act: 'discountAmount' },
                { label: '💰 ' + t('classicFreePrice'), act: 'freePrice' },
                { label: '🔢 ' + t('classicSetQty'), act: 'setQty' }
            ],
            '3': [
                { label: '💵 ' + t('classicCash'), act: 'method', method: 'especes' },
                { label: '📝 ' + t('classicCheck'), act: 'method', method: 'cheque' },
                { label: '🏦 CCP', act: 'method', method: 'ccp' },
                { label: '📱 BaridiMob', act: 'method', method: 'baridimob' },
                { label: '🔴 ' + t('classicCredit'), act: 'method', method: 'credit' }
            ]
        };

        Object.keys(defs).forEach(function (tab) {
            const panel = $id('classic-func-' + tab);
            if (!panel) return;
            panel.innerHTML = defs[tab].map(function (f) {
                let extra = '';
                if (f.act === 'method') extra = ' data-method="' + f.method + '"';
                return '<button class="classic-fn" type="button" data-act="' + f.act + '"' + extra + '>' + f.label + '</button>';
            }).join('');
            panel.addEventListener('click', function (e) {
                const btn = e.target && e.target.closest ? e.target.closest('.classic-fn') : null;
                if (!btn) return;
                runAction(btn.dataset.act, btn.dataset.method);
            });
        });
    }

    function wireActions() {
        bind($id('classic-btn-pay'), function () { pay(); });

        bind($id('classic-nav-up'), function () { moveSelection(-1); });
        bind($id('classic-nav-down'), function () { moveSelection(1); });
        bind($id('classic-nav-edit'), function () { promptSetQty(); });
        bind($id('classic-nav-del'), function () { removeSelected(); });

        bind($id('classic-btn-void'), function () {
            const cart = window.cart || [];
            if (cart.length === 0) { showToast(t('cartEmpty'), 'error'); playError(); return; }
            if (typeof window.removeFromCart === 'function') window.removeFromCart(cart.length - 1);
        });
        bind($id('classic-btn-print'), function () {
            if (typeof window.printCart === 'function') window.printCart();
        });
        bind($id('classic-btn-ticket'), function () {
            if (typeof window.printReceipt === 'function') window.printReceipt(null);
            else if (typeof window.printCart === 'function') window.printCart();
        });

        const tendered = $id('classic-tendered');
        if (tendered) {
            tendered.addEventListener('focus', function () { formInputActive = true; });
            tendered.addEventListener('blur', function () { formInputActive = false; });
            tendered.addEventListener('input', function () {
                const raw = tendered.value.replace(/[^0-9.,]/g, '');
                tendered.value = raw;
                numpadValue = raw === '' ? '0' : raw;
                updateNumpadDisplay();
                updateTendered();
            });
            tendered.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') { e.preventDefault(); pay(); }
            });
        }
    }

    function bind(el, fn) {
        if (el) el.addEventListener('click', fn);
    }

    // ------------------------------------------------------------
    // SÉLECTION DE LIGNE
    // ------------------------------------------------------------
    function selectRow(index) {
        selectedRow = index;
        renderCartTable();
        updateRowIndicator();
    }

    function moveSelection(delta) {
        const len = (window.cart || []).length;
        if (len === 0) { selectedRow = -1; updateRowIndicator(); return; }
        if (selectedRow < 0) selectedRow = delta > 0 ? 0 : len - 1;
        else selectedRow = Math.min(len - 1, Math.max(0, selectedRow + delta));
        renderCartTable();
        updateRowIndicator();
        const tbody = $id('classic-cart-body');
        if (tbody) {
            const tr = tbody.querySelector('tr[data-index="' + selectedRow + '"]');
            if (tr && tr.scrollIntoView) tr.scrollIntoView({ block: 'nearest' });
        }
    }

    function removeSelected() {
        const cart = window.cart || [];
        if (selectedRow < 0 || selectedRow >= cart.length) {
            showToast(t('classicSelectRowFirst'), 'warning');
            playWarning();
            return;
        }
        if (typeof window.removeFromCart === 'function') window.removeFromCart(selectedRow);
    }

    // ------------------------------------------------------------
    // CLAVIER NUMÉRIQUE (tendue)
    // ------------------------------------------------------------
    function setNumpad(value) {
        numpadValue = value === '' ? '0' : value;
        updateNumpadDisplay();
        updateTendered();
    }

    function updateNumpadDisplay() {
        const display = $id('classic-numpad-display');
        if (display) display.textContent = numpadValue;
        const input = $id('classic-tendered');
        if (input && document.activeElement !== input) input.value = numpadValue;
    }

    function getTendered() {
        const v = parseFloat(String(numpadValue).replace(',', '.'));
        return isNaN(v) || v < 0 ? 0 : v;
    }

    // ------------------------------------------------------------
    // FONCTIONS / PAIEMENT
    // ------------------------------------------------------------
    function runAction(act, method) {
        if (act === 'search') openSearchModal();
        else if (act === 'quick') toggleQuick();
        else if (act === 'client') {
            if (typeof window.openAskCustomerModal === 'function') window.openAskCustomerModal();
        }
        else if (act === 'clearcart') { if (typeof window.clearCart === 'function') window.clearCart(); }
        else if (act === 'exit') {
            const tab = document.querySelector('.nav-tab[data-view="inventory"]');
            if (tab) tab.click();
        } else if (act === 'method') setMethod(method);
        else if (act === 'discountPct') promptDiscountPct();
        else if (act === 'discountAmount') promptDiscountAmount();
        else if (act === 'freePrice') promptFreePrice();
        else if (act === 'setQty') promptSetQty();
    }

    function setMethod(methodId) {
        if (typeof window.selectPaymentMethod === 'function') window.selectPaymentMethod(methodId);
        refreshMethodHighlight();
        const m = (typeof window.PAYMENT_METHODS !== 'undefined' ? window.PAYMENT_METHODS : [])
            .find(function (x) { return x.id === methodId; });
        if (m) showToast('💳 ' + m.label, 'info');
        updateTendered();
    }

    function refreshMethodHighlight() {
        document.querySelectorAll('.classic-fn[data-method]').forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.method === paymentMethod);
        });
    }

    function selectedItem() {
        const cart = window.cart || [];
        if (selectedRow < 0 || selectedRow >= cart.length) return null;
        return { item: cart[selectedRow], index: selectedRow };
    }

    function promptDiscountPct() {
        if (!requireSelection()) return;
        classicPrompt(t('classicDiscountPct'), '', function (pct) {
            if (pct == null) return;
            const sel = selectedItem();
            if (!sel) return;
            const newPrice = sel.item.price * (1 - pct / 100);
            if (typeof window.updateReducedPrice === 'function') window.updateReducedPrice(sel.index, Math.max(0, newPrice));
        }, { decimal: true, suffix: '%' });
    }

    function promptDiscountAmount() {
        if (!requireSelection()) return;
        classicPrompt(t('classicDiscountAmount'), '', function (amount) {
            if (amount == null) return;
            const sel = selectedItem();
            if (!sel) return;
            const newPrice = sel.item.price - amount;
            if (typeof window.updateReducedPrice === 'function') window.updateReducedPrice(sel.index, Math.max(0, newPrice));
        }, { decimal: true, suffix: settings.currency || 'DA' });
    }

    function promptFreePrice() {
        if (!requireSelection()) return;
        classicPrompt(t('classicFreePrice'), '', function (price) {
            if (price == null) return;
            const sel = selectedItem();
            if (!sel) return;
            if (typeof window.updateReducedPrice === 'function') window.updateReducedPrice(sel.index, Math.max(0, price));
        }, { decimal: true, suffix: settings.currency || 'DA' });
    }

    function promptSetQty() {
        if (!requireSelection()) return;
        const sel = selectedItem();
        classicPrompt(t('classicSetQty'), String(sel.item.qty), function (qty) {
            if (qty == null) return;
            const sel2 = selectedItem();
            if (!sel2) return;
            if (typeof window.setCartQty === 'function') window.setCartQty(sel2.index, qty);
        }, { decimal: true });
    }

    function requireSelection() {
        if (!selectedItem()) {
            showToast(t('classicSelectRowFirst'), 'warning');
            playWarning();
            return false;
        }
        return true;
    }

    async function pay() {
        if (!isActive()) return;
        const cart = window.cart || [];
        if (cart.length === 0) {
            showToast(t('cartEmpty'), 'error');
            playError();
            return;
        }

        // Mode client rapide : on règle le panier rapide (parité avec le caisse moderne)
        if (window.quickCustomerMode && (window.quickCart || []).length > 0) {
            quickPay();
            return;
        }

        if (paymentMethod === 'credit') {
            const customerId = DOM.customerSelect ? DOM.customerSelect.value : null;
            if (!customerId) {
                showToast(t('saleCreditNeedsClient'), 'error');
                playError();
                return;
            }
        }

        // Synchroniser l'UI de paiement standard (cachée) avec la tendue classique
        if (typeof window.selectPaymentMethod === 'function') window.selectPaymentMethod(paymentMethod);

        if (paymentMethod === 'especes') {
            let tendered = getTendered();
            if (tendered <= 0) tendered = cartTotal();
            const cashInp = $id('pm-cash-received');
            if (cashInp) cashInp.value = tendered.toFixed(2);
            if (typeof window.updatePaymentMethodTotals === 'function') window.updatePaymentMethodTotals();
        }

        const total = cartTotal();
        const ok = await window.completeTransaction();
        if (ok) {
            lastSaleAmount = total;
            selectedRow = -1;
            setNumpad('0');
            refresh();
            updateRowIndicator();
        }
    }

    async function quickPay() {
        const quick = window.quickCart || [];
        if (quick.length === 0) return;

        const total = typeof window.calculateTotals === 'function'
            ? (window.calculateTotals('quick').grandTotal || 0) : 0;

        if (paymentMethod === 'especes') {
            let tendered = getTendered();
            if (tendered <= 0) tendered = total;
            const cashInp = $id('pm-cash-received');
            if (cashInp) cashInp.value = tendered.toFixed(2);
            if (typeof window.updatePaymentMethodTotals === 'function') window.updatePaymentMethodTotals();
        }

        const ok = await window.completeTransaction(true);
        if (ok) {
            lastSaleAmount = total;
            setNumpad('0');
            refresh();
            updateRowIndicator();
        }
    }

    function toggleQuick() {
        if (typeof window.toggleQuickCustomerMode === 'function') {
            window.toggleQuickCustomerMode();
            refresh();
            return;
        }
        window.quickCustomerMode = !window.quickCustomerMode;
        window.quickCustomerActive = window.quickCustomerMode;
        if (window.quickCustomerMode) {
            window.quickCustomerSnapshot = {
                mainCart: JSON.parse(JSON.stringify(window.cart)),
                quickCart: JSON.parse(JSON.stringify(window.quickCart)),
                customer: DOM.customerSelect ? DOM.customerSelect.value : ''
            };
        }
        refresh();
        showToast(window.quickCustomerMode ? t('quickClientOn') : t('quickClientOff'), 'info');
    }

    // ------------------------------------------------------------
    // RECHERCHE PRODUIT (modal classique)
    // ------------------------------------------------------------
    function openSearchModal() {
        const overlay = classicModal(
            '🔍 ' + t('classicSearch'),
            '<input type="text" id="classic-search-input" class="classic-modal-input" placeholder="' + t('classicSearchPlaceholder') + '" autocomplete="off">' +
            '<div class="classic-search-list" id="classic-search-list"><div class="classic-modal-noresult">' + t('classicSearchNoResult') + '</div></div>'
        );
        if (!overlay) return;

        const input = $id('classic-search-input');
        const list = $id('classic-search-list');
        if (!input || !list) return;

        let debounce = null;
        let results = [];

        function render(items) {
            results = items || [];
            if (results.length === 0) {
                list.innerHTML = '<div class="classic-modal-noresult">' + t('classicSearchNoResult') + '</div>';
                return;
            }
            list.innerHTML = results.map(function (p, i) {
                return '<button class="classic-search-item" type="button" data-i="' + i + '">' +
                    '<span class="cs-name">' + escapeHtml(p.name) + '</span>' +
                    '<span class="cs-price">' + fmt(p.price) + ' ' + (settings.currency || 'DA') + '</span>' +
                    '</button>';
            }).join('');
        }

        input.addEventListener('input', function () {
            if (debounce) clearTimeout(debounce);
            const q = input.value.trim();
            if (!q) { render([]); return; }
            debounce = setTimeout(function () {
                if (typeof window.fastSearch === 'function') {
                    window.fastSearch(q).then(render);
                }
            }, 200);
        });

        list.addEventListener('click', function (e) {
            const btn = e.target && e.target.closest ? e.target.closest('.classic-search-item[data-i]') : null;
            if (!btn) return;
            const p = results[parseInt(btn.dataset.i, 10)];
            if (p && typeof window.addToCart === 'function') {
                closeClassicModal(overlay);
                window.addToCart(p);
                resetScanner();
            }
        });

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { e.preventDefault(); closeClassicModal(overlay); }
            if (e.key === 'Enter') { e.preventDefault(); if (results.length > 0 && typeof window.addToCart === 'function') { window.addToCart(results[0]); closeClassicModal(overlay); resetScanner(); } }
        });

        setTimeout(function () {
            input.focus();
            if (pendingSearchChar) {
                input.value += pendingSearchChar;
                pendingSearchChar = '';
                if (typeof Event === 'function') input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }, 60);
    }

    // Saisie clavier directe → ouvre la recherche manuelle avec le caractère tapé
    // (appelé par scanner-setup.js en mode classic : la boîte de saisie manuelle
    // étant masquée dans le terminal, les lettres sont routées ici).
    function typeToSearch(ch) {
        if (!isActive()) return;
        const input = $id('classic-search-input');
        if (input) {
            input.focus();
            input.value += ch;
            if (typeof Event === 'function') input.dispatchEvent(new Event('input', { bubbles: true }));
            return;
        }
        pendingSearchChar = ch;
        openSearchModal();
    }

    // ------------------------------------------------------------
    // PROMPT CLASSIQUE (saisie nombre)
    // ------------------------------------------------------------
    function classicPrompt(title, initial, callback, opts) {
        opts = opts || {};
        const suffix = opts.suffix ? ' <b>' + escapeHtml(opts.suffix) + '</b>' : '';
        const overlay = classicModal(
            title,
            '<div class="classic-modal-hint">' + (opts.decimal ? t('classicDecimalHint') : '') + '</div>' +
            '<input type="text" id="classic-prompt-input" class="classic-modal-input" value="' + escapeHtml(String(initial == null ? '' : initial)) + '" inputmode="decimal" autocomplete="off">' + suffix +
            '<div class="classic-modal-row">' +
                '<button class="classic-modal-btn" type="button" data-ok="1">OK</button>' +
                '<button class="classic-modal-btn" type="button" data-cancel="1">' + t('cancel') + '</button>' +
            '</div>'
        );
        if (!overlay) return;

        const input = $id('classic-prompt-input');
        if (!input) return;

        function finish() {
            let raw = input.value.replace(',', '.');
            let val = parseFloat(raw);
            if (isNaN(val) || val < 0) val = null;
            closeClassicModal(overlay);
            callback(val);
        }

        input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); finish(); }
            if (e.key === 'Escape') { e.preventDefault(); closeClassicModal(overlay); callback(null); }
        });

        overlay.querySelector('[data-ok]').addEventListener('click', finish);
        overlay.querySelector('[data-cancel]').addEventListener('click', function () {
            closeClassicModal(overlay);
            callback(null);
        });

        setTimeout(function () { input.focus(); input.select(); }, 60);
    }

    // ------------------------------------------------------------
    // MODALE CLASSIQUE GÉNÉRIQUE
    // ------------------------------------------------------------
    function classicModal(title, bodyHtml) {
        closeClassicModal(document.querySelector('.classic-modal-overlay'));
        const overlay = document.createElement('div');
        overlay.className = 'classic-modal-overlay';
        overlay.innerHTML =
            '<div class="classic-modal">' +
                '<div class="classic-modal-title">' + title + '</div>' +
                bodyHtml +
            '</div>';
        document.body.appendChild(overlay);
        overlay.addEventListener('mousedown', function (e) {
            if (e.target === overlay) closeClassicModal(overlay);
        });
        return overlay;
    }

    function closeClassicModal(overlay) {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        resetScanner();
    }

    function closeModals() {
        closeClassicModal(document.querySelector('.classic-modal-overlay'));
    }

    // ------------------------------------------------------------
    // RENDU PANIER
    // ------------------------------------------------------------
    function renderCartTable() {
        const tbody = $id('classic-cart-body');
        if (!tbody) return;
        const cart = window.cart || [];

        if (cart.length === 0) {
            selectedRow = -1;
            tbody.innerHTML = '<tr class="classic-empty-row"><td colspan="7">' + t('emptyCart') + '</td></tr>';
            updateRowIndicator();
            return;
        }

        const promoResult = (typeof calculateCartDiscounts === 'function' && cart.length > 0)
            ? calculateCartDiscounts(cart, window._productsCache || []) : null;

        tbody.innerHTML = cart.map(function (item, i) {
            return classicRowHtml(item, i, 'main', i === selectedRow, promoResult);
        }).join('');
    }

    function renderQuickTable() {
        const tbody = $id('classic-quick-body');
        if (!tbody) return;
        const cart = window.quickCart || [];

        if (cart.length === 0) {
            tbody.innerHTML = '<tr class="classic-empty-row"><td colspan="7">' + t('quickCartEmpty') + '</td></tr>';
        } else {
            const promoResult = (typeof calculateCartDiscounts === 'function' && cart.length > 0)
                ? calculateCartDiscounts(cart, window._productsCache || []) : null;
            tbody.innerHTML = cart.map(function (item, i) {
                return classicRowHtml(item, i, 'quick', false, promoResult);
            }).join('');
        }

        const totalEl = $id('classic-quick-total');
        if (totalEl) {
            const totals = typeof window.calculateTotals === 'function' ? window.calculateTotals('quick') : { grandTotal: 0 };
            totalEl.textContent = fmt(totals ? totals.grandTotal : 0) + ' ' + (settings.currency || 'DA');
        }
    }

    // Ligne de panier partagée (panier principal + panier rapide)
    function classicRowHtml(item, i, target, selected, promoResult) {
        const hasDiscount = item.reducedPrice != null && item.reducedPrice < item.price;
        const effective = hasDiscount ? item.reducedPrice : item.price;
        const subtotal = effective * item.qty;
        const step = (item.unit === 'mètre' || settings.allowDecimals === true) ? '0.1' : '1';

        let meta = '';
        if (item.variantName) meta += '<div class="classic-cart-meta">🎨 ' + escapeHtml(item.variantName) + '</div>';
        if (item.reference) meta += '<div class="classic-cart-meta">' + escapeHtml(item.reference) + '</div>';

        let badge = '';
        if (promoResult && promoResult.itemDiscounts && promoResult.itemDiscounts.has(i)) {
            const info = promoResult.itemDiscounts.get(i);
            if (info && info.promotionName) badge = '<span class="classic-promo-badge">🏷️ ' + escapeHtml(info.promotionName) + '</span>';
        }

        const priceCell = hasDiscount
            ? '<span class="classic-orig-price">' + fmt(item.price) + '</span><span class="classic-eff-price">' + fmt(effective) + '</span>'
            : fmt(item.price);

        return '<tr data-index="' + i + '"' + (selected ? ' class="selected"' : '') + '>' +
            '<td class="classic-td-num">' + (i + 1) + '</td>' +
            '<td class="classic-cart-name-cell"><span class="classic-cart-name">' + escapeHtml(item.name) + '</span>' + meta + badge + '</td>' +
            '<td class="classic-td-num"><div class="classic-qty-wrap"><input type="number" class="classic-qty-input" data-index="' + i + '" data-target="' + target + '" value="' + item.qty + '" step="' + step + '" min="0" inputmode="decimal" title="' + t('classicSetQty') + '">' +
                (item.unit === 'mètre' ? '<span class="classic-unit">m</span>' : '') +
            '</div></td>' +
            '<td class="classic-td-num classic-price-cell">' + priceCell + '</td>' +
            '<td class="classic-td-num"><input type="number" class="classic-reduced-input' + (hasDiscount ? ' has-discount' : '') + '" data-index="' + i + '" data-target="' + target + '" value="' + (item.reducedPrice != null ? item.reducedPrice : '') + '" step="' + step + '" min="0" placeholder="' + fmt(item.price) + '" inputmode="decimal" title="' + t('classicReducedPrice') + '"></td>' +
            '<td class="classic-td-num">' + fmt(subtotal) + '</td>' +
            '<td class="classic-td-num"><button class="classic-row-del" type="button" data-index="' + i + '" data-target="' + target + '" title="✕">✕</button></td>' +
            '</tr>';
    }

    // Délégation d'événements sur les tableaux de panier (inputs qty / prix réduit, suppression)
    function wireCartInputs(tbody) {
        if (!tbody) return;
        tbody.addEventListener('change', function (e) {
            const el = e.target;
            if (!el || !el.classList) return;
            if (el.classList.contains('classic-qty-input')) {
                const index = parseInt(el.dataset.index, 10);
                const target = el.dataset.target === 'quick' ? 'quick' : 'main';
                if (typeof window.setCartQty === 'function') window.setCartQty(index, el.value, target);
            } else if (el.classList.contains('classic-reduced-input')) {
                const index = parseInt(el.dataset.index, 10);
                const target = el.dataset.target === 'quick' ? 'quick' : 'main';
                const v = parseFloat(el.value);
                if (typeof window.updateReducedPrice === 'function') window.updateReducedPrice(index, (isNaN(v) || v < 0) ? null : v, target);
            }
        });
        tbody.addEventListener('click', function (e) {
            const btn = e.target && e.target.closest ? e.target.closest('.classic-row-del') : null;
            if (!btn) return;
            const index = parseInt(btn.dataset.index, 10);
            const target = btn.dataset.target === 'quick' ? 'quick' : 'main';
            if (typeof window.removeFromCart === 'function') window.removeFromCart(index, target);
        });
        tbody.addEventListener('focusin', function (e) {
            const el = e.target;
            if (el && el.classList && (el.classList.contains('classic-qty-input') || el.classList.contains('classic-reduced-input'))) {
                el.select();
            }
        });
        tbody.addEventListener('keydown', function (e) {
            const el = e.target;
            if (!el || !el.classList || !(el.classList.contains('classic-qty-input') || el.classList.contains('classic-reduced-input'))) return;
            if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
            if (e.key === 'Escape') { e.preventDefault(); el.blur(); }
        });
    }

    function updateRowIndicator() {
        const ind = $id('classic-row-indicator');
        if (!ind) return;
        const len = (window.cart || []).length;
        ind.textContent = len === 0 ? '0/0' : ((selectedRow < 0 ? len : selectedRow + 1) + '/' + len);
    }

    // ------------------------------------------------------------
    // RENDU GRILLE PRODUITS
    // ------------------------------------------------------------
    function renderGrid() {
        if (!isActive()) return;
        if (gridTimer) { clearTimeout(gridTimer); gridTimer = null; }
        const products = window._productsCache || [];
        const cats = ['__all__'].concat(
            Array.from(new Set(products.map(function (p) { return p.category || ''; }).filter(function (c) { return c && c.trim(); })))
        );
        if (cats.indexOf(currentCat) < 0) currentCat = '__all__';

        const tabs = $id('classic-cat-tabs');
        if (tabs) {
            tabs.innerHTML = cats.map(function (c) {
                const label = c === '__all__' ? t('classicAllCat') : escapeHtml(c);
                return '<button class="classic-cat-tab' + (c === currentCat ? ' active' : '') + '" type="button" data-cat="' + escapeHtml(c) + '">' + label + '</button>';
            }).join('');
        }

        const grid = $id('classic-cat-grid');
        if (!grid) return;

        let list = products;
        if (currentCat !== '__all__') list = list.filter(function (p) { return (p.category || '') === currentCat; });
        list = list.slice().sort(function (a, b) { return (a.name || '').localeCompare(b.name || ''); });

        if (list.length === 0) {
            grid.innerHTML = '<div class="classic-modal-noresult" style="grid-column:1/-1;">' + t('classicNoProducts') + '</div>';
            return;
        }

        const shown = list.slice(0, 80);
        grid.innerHTML = shown.map(function (p) {
            const out = (typeof p.stock === 'number' && p.stock <= 0);
            return '<button class="classic-cat-btn' + (out ? ' is-out' : '') + '" type="button" data-barcode="' + escapeHtml(p.barcode) + '">' +
                '<span class="classic-cat-name">' + escapeHtml(p.name) + '</span>' +
                '<span class="classic-cat-price">' + fmt(p.price) + ' ' + (settings.currency || 'DA') + '</span>' +
                (out ? '<span class="classic-cat-out">' + t('outOfStockShort') + '</span>' : '') +
                '</button>';
        }).join('');
    }

    // ------------------------------------------------------------
    // RÉFRESH GLOBAL
    // ------------------------------------------------------------
    function refresh() {
        if (!isActive()) return;
        renderCartTable();
        updateQuickSection();
        updateSaleAmount();
        updateTendered();
        updateRowIndicator();
        scheduleGridRefresh();
    }

    function updateQuickSection() {
        const panel = $id('classic-quick-panel');
        if (!panel) return;
        panel.hidden = !Boolean(window.quickCustomerMode);
        renderQuickTable();
    }

    function scheduleGridRefresh() {
        if (gridTimer) clearTimeout(gridTimer);
        gridTimer = setTimeout(function () {
            gridTimer = null;
            renderGrid();
        }, 120);
    }

    function updateSaleAmount() {
        const el = $id('classic-sale-amount');
        if (el) el.textContent = fmt(cartTotal());
    }

    function updateTendered() {
        const tendered = getTendered();
        const total = cartTotal();
        const change = Math.max(0, tendered - total);

        const input = $id('classic-tendered');
        if (input && document.activeElement !== input) input.value = numpadValue;
        const chg = $id('classic-change');
        if (chg) chg.value = fmt(change);
        const mt = $id('classic-metric-tendered');
        if (mt) mt.textContent = fmt(tendered);
        const ml = $id('classic-metric-lastsale');
        if (ml) ml.textContent = fmt(lastSaleAmount);
        const mc = $id('classic-metric-change');
        if (mc) mc.textContent = fmt(change);
    }

    // ------------------------------------------------------------
    // RACCOURCIS CLAVIER CLASSIQUE
    // Interceptés AVANT keyboard.js (enregistrés au chargement) pour
    // rester dans la logique du terminal : Tab/Ctrl+Shift+R → prix
    // réduit de la dernière ligne, Suppr → retirer le dernier article,
    // Ctrl+M → recherche manuelle directe, Espace → payer.
    // ------------------------------------------------------------
    function focusLastReducedInput() {
        const cart = window.cart || [];
        if (cart.length === 0) {
            showToast(t('cartEmptyAddFirst'), 'info');
            if (typeof playError === 'function') playError();
            return;
        }
        const tbody = $id('classic-cart-body');
        const inputs = tbody ? tbody.querySelectorAll('.classic-reduced-input') : [];
        const last = inputs.length > 0 ? inputs[inputs.length - 1] : null;
        if (last) {
            last.focus();
            last.select();
            const lastItem = cart[cart.length - 1];
            showToast(t('editReducedPriceFor', { name: lastItem.name }), 'info');
            if (typeof playScan === 'function') playScan();
        }
    }

    function removeLastItem() {
        const cart = window.cart || [];
        if (cart.length === 0) {
            showToast(t('cartAlreadyEmpty'), 'info');
            if (typeof playError === 'function') playError();
            return;
        }
        const lastItem = cart[cart.length - 1];
        cart.pop();
        renderCart();
        const unitDisplay = lastItem.unit === 'mètre' ? 'm' : '';
        showToast(t('itemRemoved', { qty: lastItem.qty, unit: unitDisplay, name: lastItem.name }), 'warning');
        if (typeof playError === 'function') playError();
    }

    document.addEventListener('keydown', function (e) {
        if (!isActive()) return;
        if (currentView !== 'checkout') return;
        if (document.querySelector('.classic-modal-overlay')) return;

        const activeEl = document.activeElement;
        const tag = activeEl ? activeEl.tagName : '';
        const id = activeEl ? activeEl.id : '';
        const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || (activeEl && activeEl.isContentEditable);
        const isScannerInput = id === 'scanner-receiver' || id === 'manual-barcode';
        const inInput = isInput && !isScannerInput;

        if (e.ctrlKey && e.shiftKey && (e.key === 'r' || e.key === 'R')) {
            e.preventDefault();
            e.stopImmediatePropagation();
            focusLastReducedInput();
            return;
        }

        if (e.ctrlKey && (e.key === 'm' || e.key === 'M')) {
            e.preventDefault();
            e.stopImmediatePropagation();
            openSearchModal();
            return;
        }

        if (e.key === 'Tab' || e.key === 'Delete' || e.keyCode === 46 || e.which === 46) {
            if (inInput) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            if (e.key === 'Tab') focusLastReducedInput();
            else removeLastItem();
            return;
        }

        const isSpace = (e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space');
        if (isSpace) {
            if (inInput && !(id === 'manual-barcode' && activeEl.value.length === 0)) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            pay();
        }
    }, true);

    // ------------------------------------------------------------
    // HOOKS STRUCTURE + RENDER CART
    // ------------------------------------------------------------
    function onStructureChange(structureId) {
        if (structureId === 'classic') {
            buildStatic();
            renderGrid();
            refresh();
            refreshMethodHighlight();
            resetScanner();
        } else {
            closeModals();
        }
    }

    // Wrapper additif : rafraîchit la vue classique après chaque changement
    // du panier (scan, boutons, quantités) sans toucher à la logique.
    if (typeof window.renderCart === 'function') {
        const originalRenderCart = window.renderCart;
        window.renderCart = function () {
            const result = originalRenderCart.apply(this, arguments);
            refresh();
            return result;
        };
    }

    window.onStructureChange = onStructureChange;
    window.ClassicPOS = {
        refresh: refresh,
        pay: pay,
        setMethod: setMethod,
        getTendered: getTendered,
        renderGrid: renderGrid,
        typeToSearch: typeToSearch
    };

    // Initialisation si déjà en mode classic au chargement
    if (isActive()) {
        buildStatic();
        renderGrid();
        refresh();
        refreshMethodHighlight();
    }

    console.log('🕹️ Classic POS terminal loaded');
})();
