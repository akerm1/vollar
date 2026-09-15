// === CHECKOUT RIGHT-CLICK STYLE MENUS ===
// Clic droit dans la caisse :
//   - nom de produit (Panier principal / Client rapide)  -> police + taille
//   - prix dans les cartes "Clients en attente"           -> police + taille
//   - boutons du bas à droite (Finaliser/Imprimer/Vider)  -> pleine largeur oui/non
//   - cases "Produits rapides"                            -> couleur de fond (+ texte toujours visible)
// Préférences stockées dans le localStorage et appliquées via une feuille de
// style persistante : les re-rendus ne demandent aucune ré-application.
(function () {
    'use strict';

    var MENU_ID = 'cart-name-menu';
    var STYLE_ID = 'cart-name-style';
    var FILL_KEY = 'samtex_action_buttons_fill';
    var QUICKCOLOR_KEY = 'samtex_quickbox_colors';

    // Cibles police/taille/couleur
    var TARGETS = [
        { id: 'cart', key: 'samtex_cart_name_prefs', def: 16, label: 'Style du nom de produit',
          sel: '#cart-table-body td:first-child, #quick-cart-table-body td:first-child' },
        { id: 'fastTotal', key: 'samtex_fast_total_prefs', def: 16, label: 'Style du prix (clients)',
          sel: '.fast-client-card .fast-card-total' },
        { id: 'subtotal', key: 'samtex_subtotal_prefs', def: 15, label: 'Style du prix (sous-total)',
          sel: '#cart-table-body td:nth-child(7), #quick-cart-table-body td:nth-child(7)' }
    ];

    var FONTS = [
        { label: 'Défaut', family: '' },
        { label: 'Système', family: 'system-ui, "Segoe UI", Arial, sans-serif' },
        { label: 'Tahoma', family: 'Tahoma, Verdana, sans-serif' },
        { label: 'Serif', family: 'Georgia, "Times New Roman", serif' },
        { label: 'Mono', family: 'Consolas, "Courier New", monospace' },
        { label: 'Impact', family: 'Impact, "Arial Black", sans-serif' }
    ];

    var SIZES = [12, 13, 14, 15, 16, 18, 20, 22, 24];

    var PALETTE = ['#2ecc71', '#e74c3c', '#f39c12', '#3498db', '#9b59b6', '#7f8c8d', '#e67e22', '#16a085', '#e84393'];

    var fontPrefs = {};
    var quickColors = {};
    var fillButtons = true;
    var lastX = 0, lastY = 0;

    function loadPrefs() {
        try {
            for (var i = 0; i < TARGETS.length; i++) {
                var t = TARGETS[i];
                var raw = localStorage.getItem(t.key);
                var v = { font: '', size: t.def, color: '' };
                if (raw) {
                    var p = JSON.parse(raw);
                    if (typeof p.font === 'string') v.font = p.font;
                    if (typeof p.size === 'number' && p.size > 0) v.size = p.size;
                    if (typeof p.color === 'string') v.color = p.color;
                }
                fontPrefs[t.id] = v;
            }
            var fc = localStorage.getItem(FILL_KEY);
            if (fc !== null) fillButtons = fc === '1';
            var qc = localStorage.getItem(QUICKCOLOR_KEY);
            if (qc) quickColors = JSON.parse(qc) || {};
        } catch (e) { /* préférences illisibles -> défaut */ }
    }

    function savePrefs() {
        try {
            for (var i = 0; i < TARGETS.length; i++) {
                var t = TARGETS[i];
                if (fontPrefs[t.id]) localStorage.setItem(t.key, JSON.stringify(fontPrefs[t.id]));
            }
            localStorage.setItem(FILL_KEY, fillButtons ? '1' : '0');
            localStorage.setItem(QUICKCOLOR_KEY, JSON.stringify(quickColors));
        } catch (e) { /* stockage indisponible */ }
    }

    // luminance 0..1 d'une couleur hex -> texte lisible dessus
    function textFor(bg) {
        var m = /^#?([0-9a-f]{6})$/i.exec(String(bg || ''));
        if (!m) return '#1a1a2e';
        var n = parseInt(m[1], 16);
        var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return lum > 0.55 ? '#1a1a2e' : '#ffffff';
    }

    function applyAll() {
        var style = document.getElementById(STYLE_ID);
        if (!style) {
            style = document.createElement('style');
            style.id = STYLE_ID;
            (document.head || document.documentElement).appendChild(style);
        }
        var rules = [];

        for (var i = 0; i < TARGETS.length; i++) {
            var t = TARGETS[i];
            var p = fontPrefs[t.id] || { font: '', size: t.def, color: '' };
            var family = p.font ? ('font-family:' + p.font + '; ') : '';
            var colorRule = p.color ? ('color:' + p.color + ' !important; ') : '';
            rules.push(t.sel + '{font-size:' + p.size + 'px; ' + family + colorRule + '}');
        }

        var keys = Object.keys(quickColors);
        for (var k = 0; k < keys.length; k++) {
            var idx = keys[k];
            var bg = quickColors[idx];
            if (!bg) continue;
            if (!/^[0-9]+$/.test(idx)) continue;
            var txt = textFor(bg);
            rules.push('.quick-box[data-index="' + idx + '"]{background:' + bg + ' !important; border-color:' + bg + ' !important;}');
            rules.push('.quick-box[data-index="' + idx + '"] .quick-box-name{color:' + txt + ' !important;}');
            rules.push('.quick-box[data-index="' + idx + '"] .quick-box-price{color:' + txt + ' !important;}');
            rules.push('.quick-box[data-index="' + idx + '"] .quick-box-plus{color:' + txt + ' !important;}');
            rules.push('.quick-box[data-index="' + idx + '"] .quick-box-out{color:' + txt + ' !important;}');
        }

        if (fillButtons) {
            rules.push('.checkout-action-bar-side{width:100%;gap:6px;}');
            rules.push('.checkout-action-bar-side .action-buttons{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;width:100%;}');
            rules.push('.checkout-action-bar-side .action-buttons .btn{flex:none;width:100%;padding:11px 4px;font-size:12px;white-space:normal;line-height:1.3;}');
        }

        style.textContent = rules.join('\n');
    }

    function closeMenu() {
        var menu = document.getElementById(MENU_ID);
        if (menu) menu.remove();
    }

    function safeRefocus() {
        if (typeof formInputActive !== 'undefined' && formInputActive) return;
        if (window.meterPromptActive) return;
        if (window.askCustomerModalOpen) return;
        if (typeof lockFocus === 'function') lockFocus();
    }

    function styleBtn(txt, css) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = txt;
        b.style.cssText = css;
        b.addEventListener('mousedown', function (e) { e.preventDefault(); });
        return b;
    }

    function labelDiv(txt) {
        var d = document.createElement('div');
        d.textContent = txt;
        d.style.cssText = 'font-size:11px;color:#999;font-weight:600;margin:4px 0 2px;text-transform:uppercase;';
        return d;
    }

    function baseMenu(titleText) {
        closeMenu();
        var menu = document.createElement('div');
        menu.id = MENU_ID;
        menu.style.cssText =
            'position:fixed;z-index:100000;background:#ffffff;border:1px solid #dcdcdc;border-radius:8px;' +
            'box-shadow:0 8px 24px rgba(0,0,0,0.25);padding:8px 10px;min-width:230px;max-width:290px;' +
            'font-family:var(--font-family,"Segoe UI",sans-serif);';
        var title = document.createElement('div');
        title.textContent = titleText;
        title.style.cssText = 'font-size:12px;font-weight:700;color:#555;margin-bottom:6px;';
        menu.appendChild(title);
        return menu;
    }

    function positionMenu(menu) {
        document.body.appendChild(menu);
        var mw = menu.offsetWidth || 230;
        var mh = menu.offsetHeight || 300;
        var x = Math.min(lastX, window.innerWidth - mw - 8);
        var y = Math.min(lastY, window.innerHeight - mh - 8);
        if (x < 8) x = 8;
        if (y < 8) y = 8;
        menu.style.left = Math.round(x) + 'px';
        menu.style.top = Math.round(y) + 'px';
    }

    // ===== Menu police/taille =====
    function openFontMenu(target) {
        var menu = baseMenu(target.label);
        var p = fontPrefs[target.id] || { font: '', size: target.def, color: '' };

        menu.appendChild(labelDiv('Police'));
        FONTS.forEach(function (f) {
            var b = styleBtn(f.label, 'display:block;width:100%;text-align:left;padding:5px 8px;' +
                'border:1px solid #eeeeee;border-radius:6px;margin:2px 0;cursor:pointer;font-size:13px;' +
                'background:' + (p.font === f.family ? '#eef4ff' : '#ffffff') + ';' +
                'font-family:' + (f.family || 'inherit') + ';');
            b.addEventListener('click', function () {
                p.font = f.family;
                savePrefs();
                applyAll();
                closeMenu();
                if (typeof showToast === 'function') showToast('Police : ' + f.label, 'info');
            });
            menu.appendChild(b);
        });

        menu.appendChild(labelDiv('Taille'));
        var sizeWrap = document.createElement('div');
        sizeWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';
        SIZES.forEach(function (s) {
            var b = styleBtn(String(s), 'flex:1 1 auto;min-width:34px;padding:4px 0;border:1px solid #eeeeee;' +
                'border-radius:6px;cursor:pointer;' +
                'background:' + (p.size === s ? '#eef4ff' : '#ffffff') + ';font-size:' + s + 'px;');
            b.title = s + 'px';
            b.addEventListener('click', function () {
                p.size = s;
                savePrefs();
                applyAll();
                closeMenu();
                if (typeof showToast === 'function') showToast('Taille : ' + s + 'px', 'info');
            });
            sizeWrap.appendChild(b);
        });
        menu.appendChild(sizeWrap);

        menu.appendChild(labelDiv('Couleur'));
        var colorWrap = document.createElement('div');
        colorWrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';
        var addColor = function (color, active) {
            var cb = styleBtn('', 'width:28px;height:28px;border-radius:6px;cursor:pointer;border:2px solid ' +
                (active ? '#1a1a2e' : '#dddddd') + ';padding:0;');
            cb.style.background = color || '#ffffff';
            cb.title = color || 'Défaut';
            if (!color) cb.textContent = '↺';
            cb.addEventListener('click', function () {
                p.color = color || '';
                savePrefs();
                applyAll();
                closeMenu();
                if (typeof showToast === 'function') showToast(color ? 'Couleur appliquée' : 'Couleur par défaut', 'info');
            });
            colorWrap.appendChild(cb);
        };
        addColor('', !p.color);
        for (var ci = 0; ci < PALETTE.length; ci++) addColor(PALETTE[ci], p.color === PALETTE[ci]);
        menu.appendChild(colorWrap);

        var reset = styleBtn('↺ ' + (typeof t === 'function' ? (t('btnContextReset') || 'Réinitialiser') : 'Réinitialiser'),
            'display:block;width:100%;margin-top:8px;padding:6px;border:1px solid #eeeeee;border-radius:6px;' +
            'background:#fafafa;cursor:pointer;font-size:13px;color:#c0392b;');
        reset.addEventListener('click', function () {
            p.font = '';
            p.size = target.def;
            p.color = '';
            savePrefs();
            applyAll();
            closeMenu();
            if (typeof showToast === 'function') showToast(typeof t === 'function' ? (t('btnContextResetDone') || 'Style réinitialisé') : 'Style réinitialisé', 'info');
        });
        menu.appendChild(reset);

        positionMenu(menu);
    }

    // ===== Menu couleur des cases produits rapides =====
    function openQuickColorMenu(index) {
        var current = quickColors[String(index)] || '';
        var menu = baseMenu('Couleur de la case');

        menu.appendChild(labelDiv('Fond'));
        var wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;';
        var addColor = function (color, active) {
            var b = styleBtn('', 'width:30px;height:30px;border-radius:6px;cursor:pointer;border:2px solid ' +
                (active ? '#1a1a2e' : '#dddddd') + ';padding:0;');
            b.style.background = color || '#ffffff';
            b.title = color || 'Défaut';
            if (!color) b.textContent = '↺';
            b.addEventListener('click', function () {
                if (color) quickColors[String(index)] = color;
                else delete quickColors[String(index)];
                savePrefs();
                applyAll();
                closeMenu();
            });
            wrap.appendChild(b);
        };
        addColor('', current === '');
        for (var i = 0; i < PALETTE.length; i++) addColor(PALETTE[i], current === PALETTE[i]);
        menu.appendChild(wrap);

        var sep = document.createElement('div');
        sep.style.cssText = 'border-top:1px solid #eeeeee;margin:8px 0 4px;';
        menu.appendChild(sep);

        var change = styleBtn('↔ ' + (typeof t === 'function' ? (t('quickBoxChange') || 'Changer le produit') : 'Changer le produit'),
            'display:block;width:100%;text-align:left;padding:6px 8px;border:1px solid #eeeeee;border-radius:6px;margin:2px 0;cursor:pointer;font-size:13px;background:#ffffff;');
        change.addEventListener('click', function () {
            closeMenu();
            if (typeof window.openQuickBoxPicker === 'function') window.openQuickBoxPicker(parseInt(index, 10));
        });
        menu.appendChild(change);

        var remove = styleBtn('✕ ' + (typeof t === 'function' ? (t('quickBoxRemove') || 'Supprimer la case') : 'Supprimer la case'),
            'display:block;width:100%;text-align:left;padding:6px 8px;border:1px solid #eeeeee;border-radius:6px;margin:2px 0;cursor:pointer;font-size:13px;color:#c0392b;background:#ffffff;');
        remove.addEventListener('click', function () {
            closeMenu();
            if (typeof window.removeQuickBox === 'function') window.removeQuickBox(parseInt(index, 10));
        });
        menu.appendChild(remove);

        positionMenu(menu);
    }

    // ===== Menu boutons du bas =====
    function openFillMenu() {
        var menu = baseMenu('Boutons du bas');
        var b = styleBtn((fillButtons ? '☑' : '☐') + ' Remplir toute la largeur',
            'display:block;width:100%;text-align:left;padding:7px 8px;border:1px solid ' +
            (fillButtons ? '#6C63FF' : '#eeeeee') + ';border-radius:6px;cursor:pointer;font-size:13px;' +
            'background:' + (fillButtons ? '#f2f0ff' : '#ffffff') + ';font-weight:600;');
        b.addEventListener('click', function () {
            fillButtons = !fillButtons;
            savePrefs();
            applyAll();
            closeMenu();
            if (typeof showToast === 'function') showToast(fillButtons ? 'Boutons en pleine largeur' : 'Boutons compacts', 'info');
        });
        menu.appendChild(b);

        var reset = styleBtn('↺ ' + (typeof t === 'function' ? (t('btnContextReset') || 'Réinitialiser') : 'Réinitialiser'),
            'display:block;width:100%;margin-top:6px;padding:6px;border:1px solid #eeeeee;border-radius:6px;' +
            'background:#fafafa;cursor:pointer;font-size:13px;color:#c0392b;');
        reset.addEventListener('click', function () {
            fillButtons = true;
            savePrefs();
            applyAll();
            closeMenu();
        });
        menu.appendChild(reset);

        positionMenu(menu);
    }

    // ===== Cibles right-click =====
    function nameTd(el) {
        if (!el || !el.closest) return null;
        return el.closest('#cart-table-body td:first-child, #quick-cart-table-body td:first-child');
    }

    function fastTotalEl(el) {
        if (!el || !el.closest) return null;
        return el.closest('.fast-client-card .fast-card-total');
    }

    function quickBoxEl(el) {
        if (!el || !el.closest) return null;
        return el.closest('.quick-box[data-index]');
    }

    function subtotalTd(el) {
        if (!el || !el.closest) return null;
        return el.closest('#cart-table-body td:nth-child(7), #quick-cart-table-body td:nth-child(7)');
    }

    function actionBtnEl(el) {
        if (!el || !el.closest) return null;
        return el.closest('.checkout-action-bar-side .action-buttons button');
    }

    // Capture : géré AVANT les menus existants (cases rapides, boutons) pour les remplacer
    function onCtxCapture(e) {
        var t = e.target;
        if (!t || !t.closest) return;
        if (quickBoxEl(t)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            var qb = quickBoxEl(t);
            var index = qb.getAttribute('data-index');
            if (index === null || index === '') return;
            lastX = e.clientX;
            lastY = e.clientY;
            openQuickColorMenu(index);
            return;
        }
        if (actionBtnEl(t)) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            lastX = e.clientX;
            lastY = e.clientY;
            openFillMenu();
            return;
        }
    }

    // Bulle : police/taille pour paniers + prix clients (sinon menu natif)
    function onCtxBubble(e) {
        var el = nameTd(e.target) || fastTotalEl(e.target) || subtotalTd(e.target);
        if (!el) return;
        e.preventDefault();
        lastX = e.clientX;
        lastY = e.clientY;
        var target;
        if (nameTd(e.target)) target = TARGETS[0];
        else if (fastTotalEl(e.target)) target = TARGETS[1];
        else target = TARGETS[2];
        openFontMenu(target);
    }

    function onDocClick(e) {
        var menu = document.getElementById(MENU_ID);
        if (!menu) return;
        if (menu.contains(e.target)) return;
        closeMenu();
        safeRefocus();
    }

    function onDocKeydown(e) {
        var menu = document.getElementById(MENU_ID);
        if (!menu) return;
        if (e.key === 'Escape') {
            e.preventDefault();
            closeMenu();
            safeRefocus();
        }
    }

    function initAll() {
        loadPrefs();
        applyAll();
        document.addEventListener('contextmenu', onCtxCapture, true);
        document.addEventListener('contextmenu', onCtxBubble);
        document.addEventListener('click', onDocClick);
        document.addEventListener('keydown', onDocKeydown);
    }

    // Les scripts sont chargés en fin de <body> : on attache immédiatement
    // (comme button-context / focus-recovery) pour que notre écouteur en
    // capture soit enregistré AVANT les menus existants.
    if (typeof window !== 'undefined' && window.document) {
        if (document.readyState === 'loading' && !document.documentElement) {
            document.addEventListener('DOMContentLoaded', initAll);
        } else {
            initAll();
        }
    }

    window['initCartNameStyle'] = initAll;
    window['setCartNameStyle'] = function (font, size) {
        var p = fontPrefs.cart || { font: '', size: 16, color: '' };
        p.font = font || '';
        p.size = (typeof size === 'number' && size > 0) ? size : 16;
        fontPrefs.cart = p;
        savePrefs();
        applyAll();
    };
    window['setSubtotalStyle'] = function (font, size, color) {
        var p = fontPrefs.subtotal || { font: '', size: 15, color: '' };
        p.font = font || '';
        p.size = (typeof size === 'number' && size > 0) ? size : 15;
        p.color = color || '';
        fontPrefs.subtotal = p;
        savePrefs();
        applyAll();
    };
})();