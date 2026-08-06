// ============================================================
// BUTTON CONTEXT MENU: personalisation des boutons au clic droit
// Options : masquer / afficher, couleur, raccourci clavier,
// taille agrandie, réinitialiser, restaurer les boutons masqués.
// Les préférences sont stockées dans le localStorage.
// Un panneau de gestion est disponible dans Paramètres > Système.
// ============================================================
(function () {
    'use strict';

    const PREFS_KEY = 'samtex_button_prefs';
    const EXCLUDED_IDS = ['btn-settings-header', 'btn-structure-collapse'];
    const CONFLICT_KEYS = [
        'Tab', 'Enter', 'Escape', 'Delete', 'Backspace', 'PageUp', 'PageDown',
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
        'Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Caps Lk', 'F1'
    ];
    const COLOR_PRESETS = [
        { labelKey: 'btnContextColorDefault', value: '' },
        { labelKey: 'btnContextColorGreen', value: '#2ecc71' },
        { labelKey: 'btnContextColorRed', value: '#e74c3c' },
        { labelKey: 'btnContextColorOrange', value: '#f39c12' },
        { labelKey: 'btnContextColorBlue', value: '#3498db' },
        { labelKey: 'btnContextColorPurple', value: '#9b59b6' },
        { labelKey: 'btnContextColorGray', value: '#7f8c8d' },
        { labelKey: 'btnContextColorBordeaux', value: '#e67e22' },
        { labelKey: 'btnContextColorTurquoise', value: '#16a085' }
    ];

    let prefs = {};
    let menuEl = null;
    let currentBtn = null;
    let recordingShortcut = false;
    let restoreTargetKey = null;
    let recordingBanner = null;

    // ============================================================
    // CLÉ D'IDENTIFICATION DES BOUTONS
    // Certains boutons (onglets de navigation) n'ont pas d'id ;
    // on génère alors une clé déterministe.
    // ============================================================
    function keyFor(btn) {
        if (!btn) return null;
        if (btn.id) return btn.id;
        if (btn.dataset && btn.dataset.view) return 'nav-tab:' + btn.dataset.view;
        if (btn.dataset && btn.dataset.category) return 'settings-nav:' + btn.dataset.category;
        return null;
    }

    function findByKey(key) {
        if (!key) return null;
        if (key.indexOf('nav-tab:') === 0) {
            return document.querySelector('.nav-tab[data-view="' + key.slice(8) + '"]');
        }
        if (key.indexOf('settings-nav:') === 0) {
            return document.querySelector('.settings-nav-item[data-category="' + key.slice(13) + '"]');
        }
        return document.getElementById(key);
    }

    // ============================================================
    // PERSISTANCE
    // Les préférences sont stockées en double :
    //  - en localStorage (accès rapide au chargement),
    //  - dans la base de données (store "settings", clé buttonPrefs)
    //    pour survivre aux changements de stockage, aux migrations et
    //    être incluses dans les sauvegardes/restaurations.
    // ============================================================
    const DB_SETTINGS_KEY = 'buttonPrefs';
    function loadPrefs() {
        try {
            prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
        } catch (e) {
            prefs = {};
        }
        if (!prefs || typeof prefs !== 'object') prefs = {};
    }

    // Synchronise vers la base AVEC débounce (les boutons peuvent
    // être modifiés en rafale) pour ne pas écrire le store à chaque clic.
    let persistTimer = null;
    function persistToDb() {
        if (persistTimer) return;
        persistTimer = setTimeout(function () {
            persistTimer = null;
            if (typeof dbPut !== 'function') return;
            dbPut('settings', { key: DB_SETTINGS_KEY, value: JSON.parse(JSON.stringify(prefs)) })
                .catch(function (err) {
                    console.error('Persist button prefs to DB error:', err);
                });
        }, 300);
    }

    function savePrefs() {
        try {
            localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
        } catch (e) {
            console.error('Save button prefs error:', e);
        }
        persistToDb();
    }

    // Charge les préférences depuis la base si disponibles (les plus à jour),
    // en repli sur le localStorage. Appelé avant l'application des styles.
    async function loadPrefsFromDb() {
        try {
            if (typeof dbGet !== 'function') return;
            const rec = await dbGet('settings', DB_SETTINGS_KEY);
            if (rec && rec.value && typeof rec.value === 'object') {
                prefs = rec.value;
                try {
                    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
                } catch (_) {}
            }
        } catch (err) {
            console.error('Load button prefs from DB error:', err);
        }
    }

    function prefFor(key) {
        if (!prefs[key]) prefs[key] = {};
        return prefs[key];
    }

    function cleanupEmpty() {
        for (const id in prefs) {
            if (prefs[id] && Object.keys(prefs[id]).length === 0) delete prefs[id];
        }
    }

    // ============================================================
    // HELPERS
    // ============================================================
    function esc(text) {
        const div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }

    function darken(hex, amt) {
        amt = amt || 28;
        let c = hex.replace('#', '');
        if (c.length === 3) c = c.split('').map(function (ch) { return ch + ch; }).join('');
        const n = parseInt(c, 16);
        if (isNaN(n)) return hex;
        const r = Math.max(0, (n >> 16) - amt);
        const g = Math.max(0, ((n >> 8) & 0xff) - amt);
        const b = Math.max(0, (n & 0xff) - amt);
        return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    }

    function buttonLabel(btn) {
        const txt = (btn.textContent || '').trim().replace(/\s+/g, ' ');
        if (txt) return txt;
        return btn.title || btn.id || 'Bouton';
    }

    function isExcluded(btn) {
        const id = btn.id || '';
        if (EXCLUDED_IDS.indexOf(id) !== -1) return true;
        if (/settings/i.test(id)) return true;
        if (btn.closest('#view-settings')) return true;
        if (btn.closest('.settings-nav')) return true;
        return false;
    }

    // ============================================================
    // APPLICATION DES PRÉFÉRENCES
    // ============================================================
    // Les thèmes injectent des feuilles avec des sélecteurs
    // "body.theme-X .btn { background: ... !important }". Pour les
    // devancer, on applique la couleur en style inline !important
    // (priorité plus élevée que n'importe quel !important de feuille).
    function clearColorStyles(btn) {
        btn.style.removeProperty('background-color');
        btn.style.removeProperty('background-image');
        btn.style.removeProperty('border-color');
        btn.style.removeProperty('color');
        btn.style.removeProperty('--btn-custom-bg');
        btn.style.removeProperty('--btn-custom-bg-hover');
    }

    function applyPrefToButton(btn) {
        if (!btn) return;
        const key = keyFor(btn);
        if (!key) return;
        const p = prefs[key];

        btn.classList.remove('btn-custom-large', 'btn-custom-color');
        clearColorStyles(btn);
        if (btn.dataset.btnPrevDisplay !== undefined) {
            btn.style.display = btn.dataset.btnPrevDisplay || '';
            delete btn.dataset.btnPrevDisplay;
        }
        if (btn.dataset.btnOrigTitle !== undefined) {
            btn.title = btn.dataset.btnOrigTitle;
            delete btn.dataset.btnOrigTitle;
        }

        if (!p) return;

        if (p.hidden) {
            btn.dataset.btnPrevDisplay = btn.style.display || '';
            btn.style.display = 'none';
        }
        if (p.color) {
            btn.style.setProperty('--btn-custom-bg', p.color);
            btn.style.setProperty('--btn-custom-bg-hover', darken(p.color));
            btn.classList.add('btn-custom-color');
            btn.style.setProperty('background-color', p.color, 'important');
            btn.style.setProperty('background-image', 'none', 'important');
            btn.style.setProperty('border-color', p.color, 'important');
            btn.style.setProperty('color', '#ffffff', 'important');
        }
        if (p.large) btn.classList.add('btn-custom-large');
        if (p.shortcut) {
            btn.dataset.btnOrigTitle = btn.title || '';
            btn.title = (btn.title || '') + ' [' + p.shortcut + ']';
        }
    }

    function applyAll() {
        document.querySelectorAll('button').forEach(applyPrefToButton);
    }

    function showButton(btn) {
        const key = keyFor(btn);
        if (!key || !prefs[key]) return;
        if (prefs[key].hidden) delete prefs[key].hidden;
        if (prefs[key].color) delete prefs[key].color;
        if (prefs[key].large) delete prefs[key].large;
        cleanupEmpty();
        savePrefs();
        applyPrefToButton(btn);
    }

    function resetButton(btn) {
        const key = keyFor(btn);
        if (!key) return;
        delete prefs[key];
        savePrefs();
        applyPrefToButton(btn);
    }

    // ============================================================
    // ACTIONS DU MENU
    // ============================================================
    function toggleHide(btn) {
        const key = keyFor(btn);
        if (!key) return;
        const p = prefFor(key);
        p.hidden = !p.hidden;
        cleanupEmpty();
        savePrefs();
        applyPrefToButton(btn);
    }

    function setColor(btn, color) {
        const key = keyFor(btn);
        if (!key) return;
        const p = prefFor(key);
        if (color) p.color = color;
        else delete p.color;
        cleanupEmpty();
        savePrefs();
        applyPrefToButton(btn);
    }

    function toggleLarge(btn) {
        const key = keyFor(btn);
        if (!key) return;
        const p = prefFor(key);
        p.large = !p.large;
        cleanupEmpty();
        savePrefs();
        applyPrefToButton(btn);
    }

    function setShortcut(btn, keyName) {
        const key = keyFor(btn);
        if (!key) return;
        prefFor(key).shortcut = keyName;
        savePrefs();
        applyPrefToButton(btn);
    }

    function clearShortcut(btn) {
        const key = keyFor(btn);
        if (!key) return;
        if (prefs[key] && prefs[key].shortcut) delete prefs[key].shortcut;
        cleanupEmpty();
        savePrefs();
        applyPrefToButton(btn);
    }

    function getCustomizedButtons() {
        const out = [];
        for (const key in prefs) {
            const p = prefs[key];
            if (!p || Object.keys(p).length === 0) continue;
            const btn = findByKey(key);
            if (btn) out.push({ key: key, btn: btn, p: p, label: buttonLabel(btn) });
        }
        return out;
    }

    function getHiddenButtons() {
        return getCustomizedButtons().filter(function (c) { return c.p.hidden; });
    }

    function isHiddenBtn(btn) {
        const key = keyFor(btn);
        return !!(key && prefs[key] && prefs[key].hidden);
    }

    // ============================================================
    // MENU (DOM + affichage)
    // ============================================================
    function ensureMenu() {
        if (menuEl) return menuEl;
        menuEl = document.createElement('div');
        menuEl.id = 'btn-context-menu';
        menuEl.style.display = 'none';
        document.body.appendChild(menuEl);

        menuEl.addEventListener('click', function (e) {
            if (e.target.closest('.btn-context-close')) {
                closeMenu();
                return;
            }
            const swatch = e.target.closest('[data-color]');
            if (swatch) {
                const key = swatch.dataset.key;
                const btn = findByKey(key) || currentBtn;
                if (btn) setColor(btn, swatch.dataset.color || '');
                showToast(t('btnContextColor') + ' ✓', 'info');
                closeMenu();
                return;
            }
            const item = e.target.closest('[data-action]');
            if (!item) return;
            const key = item.dataset.key;
            const btn = findByKey(key) || currentBtn;
            if (!btn) return;
            const action = item.dataset.action;
            const isHidden = isHiddenBtn(btn);

            if (action === 'toggle-hide') {
                toggleHide(btn);
                showToast(isHidden ? t('btnContextShow') + ' ✓' : t('btnContextHide') + ' ✓', 'info');
                closeMenu();
            } else if (action === 'shortcut') {
                recordingShortcut = true;
                restoreTargetKey = keyFor(btn);
                closeMenu();
                showRecordingBanner(btn);
                showToast(t('btnContextShortcutSet'), 'info');
            } else if (action === 'clear-shortcut') {
                clearShortcut(btn);
                showToast(t('btnContextShortcutRemove') + ' ✓', 'info');
                closeMenu();
            } else if (action === 'toggle-large') {
                toggleLarge(btn);
                showToast(t('btnContextLarge') + ' ✓', 'info');
                closeMenu();
            } else if (action === 'reset') {
                resetButton(btn);
                showToast(t('btnContextResetDone'), 'success');
                closeMenu();
            } else if (action === 'restore-hidden') {
                const target = findByKey(item.dataset.key);
                if (target) showButton(target);
                showToast(t('btnContextHiddenRestored'), 'success');
                closeMenu();
            }
        });
        return menuEl;
    }

    function positionMenu(x, y) {
        menuEl.style.display = 'block';
        menuEl.style.visibility = 'hidden';
        const mw = menuEl.offsetWidth;
        const mh = menuEl.offsetHeight;
        let left = x;
        let top = y;
        if (left + mw > window.innerWidth - 8) left = Math.max(8, window.innerWidth - mw - 8);
        if (top + mh > window.innerHeight - 8) top = Math.max(8, window.innerHeight - mh - 8);
        menuEl.style.left = left + 'px';
        menuEl.style.top = top + 'px';
        menuEl.style.visibility = 'visible';
    }

    function openMenu(btn, x, y) {
        const key = keyFor(btn);
        if (!btn || !key) return;
        currentBtn = btn;
        ensureMenu();

        const label = buttonLabel(btn);
        const p = prefs[key] || {};
        const hiddenBtns = getHiddenButtons().filter(function (h) { return h.key !== key; });

        const swatches = COLOR_PRESETS.map(function (c) {
            return '<button type="button" class="btn-context-swatch' + (c.value === p.color ? ' active' : '') +
                '" data-color="' + c.value + '" data-key="' + esc(key) +
                '" style="background:' + (c.value || '#fff') + '" title="' + esc(t(c.labelKey)) + '"></button>';
        }).join('');

        let html = '<div class="btn-context-header"><strong>' + esc(label) +
            '</strong><span class="btn-context-close" title="' + esc(t('closeModal')) + '">✕</span></div>';
        html += '<button type="button" class="btn-context-item" data-action="toggle-hide" data-key="' + esc(key) + '">' +
            (p.hidden ? '👁 ' + t('btnContextShow') : '👁 ' + t('btnContextHide')) + '</button>';
        html += '<div class="btn-context-color"><span class="btn-context-color-label">🎨 ' +
            t('btnContextColor') + '</span><div class="btn-context-swatches">' + swatches + '</div></div>';
        html += '<button type="button" class="btn-context-item" data-action="shortcut" data-key="' + esc(key) + '">⌨ ' +
            t('btnContextShortcut') +
            (p.shortcut ? '<span class="ctx-kbd">' + esc(p.shortcut) + '</span>' : '') + '</button>';
        if (p.shortcut) {
            html += '<button type="button" class="btn-context-item" data-action="clear-shortcut" data-key="' + esc(key) + '">🗑 ' +
                t('btnContextShortcutRemove') + '</button>';
        }
        html += '<button type="button" class="btn-context-item" data-action="toggle-large" data-key="' + esc(key) + '">' +
            (p.large ? '✅ ' : '🔠 ') + t('btnContextLarge') + '</button>';
        html += '<button type="button" class="btn-context-item" data-action="reset" data-key="' + esc(key) + '">🔄 ' +
            t('btnContextReset') + '</button>';
        if (hiddenBtns.length) {
            html += '<div class="btn-context-hidden"><div class="btn-context-hidden-title">📑 ' +
                t('btnContextHiddenTitle') + ' (' + hiddenBtns.length + ')</div>';
            html += hiddenBtns.map(function (h) {
                return '<button type="button" class="btn-context-hidden-item" data-action="restore-hidden" data-key="' +
                    esc(h.key) + '">👁 ' + esc(h.label) + '</button>';
            }).join('');
            html += '</div>';
        }

        menuEl.innerHTML = html;
        positionMenu(x, y);
    }

    function openRestoreMenu(btn, x, y, hiddenBtns) {
        currentBtn = btn;
        ensureMenu();
        let html = '<div class="btn-context-header"><strong>📑 ' + t('btnContextHiddenTitle') + '</strong>' +
            '<span class="btn-context-close" title="' + esc(t('closeModal')) + '">✕</span></div>';
        if (hiddenBtns.length) {
            html += hiddenBtns.map(function (h) {
                return '<button type="button" class="btn-context-hidden-item" data-action="restore-hidden" data-key="' +
                    esc(h.key) + '">👁 ' + esc(h.label) + '</button>';
            }).join('');
        } else {
            html += '<div class="btn-context-hidden-title">' + t('btnContextHiddenNone') + '</div>';
        }
        menuEl.innerHTML = html;
        positionMenu(x, y);
    }

    function closeMenu() {
        if (menuEl) menuEl.style.display = 'none';
        currentBtn = null;
    }

    // ============================================================
    // BANDEAU D'ENREGISTREMENT D'UN RACCOURCI
    // ============================================================
    function showRecordingBanner(btn) {
        hideRecordingBanner();
        recordingBanner = document.createElement('div');
        recordingBanner.className = 'btn-context-recording';
        recordingBanner.innerHTML =
            '<div class="btn-context-recording-inner">' +
            '<span class="btn-context-recording-ico">⌨</span>' +
            '<span>' + t('btnContextShortcutSet') + '</span>' +
            '<span class="btn-context-recording-esc">(' + t('btnContextShortcutEsc') + ')</span>' +
            '</div>';
        document.body.appendChild(recordingBanner);
        if (btn) btn.classList.add('btn-context-recording-target');
    }

    function hideRecordingBanner() {
        if (recordingBanner) {
            recordingBanner.remove();
            recordingBanner = null;
        }
        const target = document.querySelector('.btn-context-recording-target');
        if (target) target.classList.remove('btn-context-recording-target');
    }

    // ============================================================
    // PANNEAU DE GESTION (Paramètres > Système)
    // ============================================================
    function renderButtonCustomizationUI() {
        const listEl = document.getElementById('btn-custom-list');
        if (!listEl) return;
        const items = getCustomizedButtons();
        if (!items.length) {
            listEl.innerHTML = '<div class="btn-custom-none">' + t('btnCustomNone') + '</div>';
            return;
        }
        let html = '';
        items.forEach(function (c) {
            const badges = [];
            if (c.p.hidden) badges.push('<span class="btn-custom-row-badge badge-hidden">' + t('btnCustomHidden') + '</span>');
            if (c.p.color) badges.push('<span class="btn-custom-row-badge badge-color" style="background:' + c.p.color + '">🎨</span>');
            if (c.p.shortcut) badges.push('<span class="btn-custom-row-badge badge-shortcut">⌨ ' + esc(c.p.shortcut) + '</span>');
            if (c.p.large) badges.push('<span class="btn-custom-row-badge badge-large">🔠</span>');
            html += '<div class="btn-custom-row">' +
                '<span class="btn-custom-row-label">' + esc(c.label) + '</span>' +
                '<span class="btn-custom-row-badges">' + badges.join('') + '</span>' +
                '<span class="btn-custom-row-actions">' +
                (c.p.hidden
                    ? '<button type="button" class="btn btn-sm btn-primary" data-action="restore-key" data-key="' + esc(c.key) + '">' + t('btnCustomRestore') + '</button> '
                    : '') +
                '<button type="button" class="btn btn-sm btn-secondary" data-action="reset-key" data-key="' + esc(c.key) + '">' + t('btnCustomResetOne') + '</button>' +
                '</span></div>';
        });
        listEl.innerHTML = html;
    }

    function setupSettingsPanel() {
        const listEl = document.getElementById('btn-custom-list');
        if (!listEl || listEl.dataset.bound) return;
        listEl.dataset.bound = '1';
        listEl.addEventListener('click', function (e) {
            const item = e.target.closest('[data-action]');
            if (!item || !item.dataset.key) return;
            const target = findByKey(item.dataset.key);
            if (item.dataset.action === 'reset-key') {
                if (target) resetButton(target);
                renderButtonCustomizationUI();
                showToast(t('btnContextResetDone'), 'success');
            } else if (item.dataset.action === 'restore-key') {
                if (target) showButton(target);
                renderButtonCustomizationUI();
                showToast(t('btnContextHiddenRestored'), 'success');
            }
        });

        const resetAllBtn = document.getElementById('btn-reset-all-buttons');
        if (resetAllBtn && !resetAllBtn.dataset.bound) {
            resetAllBtn.dataset.bound = '1';
            resetAllBtn.addEventListener('click', function () {
                prefs = {};
                savePrefs();
                applyAll();
                renderButtonCustomizationUI();
                showToast(t('btnCustomResetAllDone'), 'success');
            });
        }
    }

    // ============================================================
    // ÉVÉNEMENTS GLOBAUX
    // ============================================================
    document.addEventListener('contextmenu', function (e) {
        // Ferme le menu déjà ouvert (clic droit ailleurs)
        if (menuEl && menuEl.style.display !== 'none') {
            e.preventDefault();
            closeMenu();
            return;
        }
        if (e.target.closest('#btn-context-menu')) {
            e.preventDefault();
            return;
        }
        const btn = e.target.closest('button');
        if (!btn) return;

        if (isExcluded(btn)) {
            // Boutons "système" (paramètres) : petit menu de secours pour
            // réafficher les boutons masqués.
            const hidden = getHiddenButtons();
            if (hidden.length && (btn.id === 'btn-settings-header' || btn.id === 'btn-structure-collapse')) {
                e.preventDefault();
                openRestoreMenu(btn, e.clientX, e.clientY, hidden);
            }
            return;
        }

        e.preventDefault();
        openMenu(btn, e.clientX, e.clientY);
    }, true);

    document.addEventListener('mousedown', function (e) {
        if (menuEl && menuEl.style.display !== 'none' && !e.target.closest('#btn-context-menu')) {
            closeMenu();
        }
    }, true);

    window.addEventListener('blur', closeMenu);
    window.addEventListener('resize', closeMenu);
    window.addEventListener('scroll', closeMenu, true);

    // Raccourcis clavier (enregistrement + déclenchement)
    document.addEventListener('keydown', function (e) {
        const keyName = e.key && e.key.length === 1 ? e.key.toUpperCase() : e.key;

        // Enregistrement d'un nouveau raccourci
        if (recordingShortcut && restoreTargetKey) {
            if (keyName === 'Escape') {
                recordingShortcut = false;
                restoreTargetKey = null;
                hideRecordingBanner();
                showToast(t('btnContextShortcutCancel'), 'info');
                return;
            }
            if (CONFLICT_KEYS.indexOf(keyName) !== -1 || e.ctrlKey || e.altKey || e.metaKey) return;
            e.preventDefault();
            e.stopPropagation();
            const btn = findByKey(restoreTargetKey);
            if (btn) {
                const cur = (prefs[restoreTargetKey] || {}).shortcut;
                if (cur && cur === keyName) {
                    clearShortcut(btn);
                    showToast(t('btnContextShortcutCleared') + ' [' + keyName + ']', 'success');
                } else {
                    setShortcut(btn, keyName);
                    showToast(t('btnContextShortcutSaved') + ' [' + keyName + ']', 'success');
                }
            }
            recordingShortcut = false;
            restoreTargetKey = null;
            hideRecordingBanner();
            return;
        }

        // Fermer le menu avec Échap
        if (keyName === 'Escape' && menuEl && menuEl.style.display !== 'none') {
            e.preventDefault();
            closeMenu();
            return;
        }

        // Déclenchement des raccourcis affectés
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        const ae = document.activeElement;
        if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) {
            const id = ae.id || '';
            const isDummyInput = id === 'scanner-receiver' || id === 'manual-barcode';
            if (!isDummyInput) return;
            if (ae.value && ae.value.length > 0) return;
        }
        if (CONFLICT_KEYS.indexOf(keyName) !== -1 || !keyName || keyName.length !== 1) return;

        if (fireShortcut(keyName)) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);

    // ============================================================
    // DÉCLENCHEMENT D'UN RACCOURCI (exposé pour scanner-setup)
    // ============================================================
    function fireShortcut(keyName) {
        if (recordingShortcut) return false;
        if (!keyName) return false;
        if (keyName.length === 1) keyName = keyName.toUpperCase();
        if (CONFLICT_KEYS.indexOf(keyName) !== -1) return false;
        for (const key in prefs) {
            const p = prefs[key];
            if (!p || !p.shortcut || p.shortcut !== keyName) continue;
            const btn = findByKey(key);
            if (!btn || btn.style.display === 'none') continue;
            btn.click();
            return true;
        }
        return false;
    }

    window.fireButtonShortcut = fireShortcut;
    window.isButtonShortcutRecording = function () { return recordingShortcut; };

    // ============================================================
    // INITIALISATION
    // ============================================================
    function initButtonContext() {
        loadPrefs();
        // Charge d'abord depuis la base (persistant) puis applique les styles.
        loadPrefsFromDb().then(function () {
            applyAll();
            setupSettingsPanel();
            renderButtonCustomizationUI();
        });
    }

    window.initButtonContext = initButtonContext;
    window.applyButtonPrefs = applyAll;
    window.refreshButtonCustomizationUI = renderButtonCustomizationUI;
})();
