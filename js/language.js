// ── Core t() Function ────────────────────────────────────────
function t(key, replacements = {}) {
    // Note: quelques clés ont été (historiquement) ajoutées hors de
    // `translations.fr`, à la racine de `translations`. On les cherche donc
    // d'abord dans `fr`, puis à la racine, puis on renvoie la clé.
    let text = translations.fr[key] || translations[key] || key;
    for (const [k, v] of Object.entries(replacements)) {
        text = text.replace(new RegExp(`{{${k}}}`, 'g'), v);
    }
    return text;
}

// ── Currency Helper ──────────────────────────────────────────
function getCurrency() {
    return 'DA';
}

// ── Marque configurable ──────────────────────────────────────
// Renvoie le nom du magasin configuré, sinon la marque par défaut
// (tradution) définie dans language-data.js.
function getShopName() {
    if (settings && settings.shopName) {
        const s = String(settings.shopName).trim();
        if (s) return s;
    }
    return t('appName');
}

// Applique le nom du magasin partout où la marque est affichée
// (titre navigateur, barres de marque, terminal classique).
function applyBrand() {
    try {
        const brand = getShopName();
        document.title = brand;

        document.querySelectorAll('[data-i18n="appName"]').forEach(el => {
            el.textContent = brand;
        });

        const classicTitle = document.querySelector('.classic-titlebar-text');
        if (classicTitle) classicTitle.textContent = brand + ' — POS TERMINAL';
    } catch (e) {
        console.warn('applyBrand error:', e);
    }
}

// ── Date Formatting ──────────────────────────────────────────
function formatDate(dateStr) {
    try {
        return new Date(dateStr).toLocaleDateString('fr-FR');
    } catch (e) {
        return dateStr;
    }
}

function applyLanguage() {
    try {
        updateNavTabs();

        if (typeof applyRolePermissions === 'function') applyRolePermissions();

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key && typeof t === 'function') {
                el.textContent = t(key);
            }
        });

        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (key && typeof t === 'function') {
                el.placeholder = t(key);
            }
        });

        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.getAttribute('data-i18n-title');
            if (key && typeof t === 'function') {
                el.title = t(key);
            }
        });

        applyBrand();

        if (typeof currentView !== 'undefined') {
            switch (currentView) {
                case 'checkout':
                    if (typeof renderCart === 'function') renderCart();
                    break;
                case 'inventory':
                    if (typeof loadInventory === 'function') loadInventory();
                    break;
                case 'customers':
                    if (typeof loadCustomers === 'function') loadCustomers();
                    break;
                case 'suppliers':
                    if (typeof loadSuppliers === 'function') loadSuppliers();
                    if (typeof loadPurchaseHistory === 'function') loadPurchaseHistory();
                    if (typeof renderLowStockPanel === 'function') renderLowStockPanel();
                    break;
                case 'analytics':
                    if (typeof setupAnalyticsView === 'function') setupAnalyticsView();
                    break;
                case 'settings':
                    if (typeof updateSettingsInfo === 'function') updateSettingsInfo();
                    if (typeof renderThemeSelector === 'function') renderThemeSelector();
                    if (typeof renderStructureSelector === 'function') renderStructureSelector();
                    break;
                case 'users':
                    if (typeof hasPermission === 'function' && hasPermission('users.view')) {
                        if (typeof loadUsers === 'function') loadUsers();
                    } else {
                        if (typeof loadSelfProfile === 'function') loadSelfProfile();
                    }
                    break;
                case 'promotions':
                    if (typeof loadPromotions === 'function') {
                        loadPromotions().then(function() {
                            if (typeof renderPromotionsScreen === 'function') renderPromotionsScreen();
                        });
                    }
                    break;
            }
        }
    } catch (e) {
        console.error('Language switch error:', e);
    }
}

function updateNavTabs() {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        const view = tab.dataset.view;
        const keyMap = {
            'checkout': 'navCheckout',
            'inventory': 'navInventory',
            'customers': 'navCustomers',
            'suppliers': 'navSuppliers',
            'analytics': 'navAnalytics',
            'promotions': 'navPromotions',
            'settings': 'navSettings',
            'users': 'navUsers'
        };
        if (keyMap[view]) {
            const parts = t(keyMap[view]).trim().split(/\s+/);
            const icon = parts.shift() || '🧩';
            const label = parts.join(' ');

            let iconEl = tab.querySelector('.nav-icon');
            let labelEl = tab.querySelector('.nav-label');
            if (!iconEl || !labelEl) {
                const badge = tab.querySelector('.low-stock-badge');
                tab.innerHTML = '<span class="nav-icon"></span><span class="nav-label"></span>';
                if (badge) tab.appendChild(badge);
                iconEl = tab.querySelector('.nav-icon');
                labelEl = tab.querySelector('.nav-label');
            }
            if (iconEl) iconEl.textContent = icon;
            if (labelEl) labelEl.textContent = label;
            tab.title = label;
        }
    });
}

// ── Window Exports ───────────────────────────────────────────
window.t = t;
window.getCurrency = getCurrency;
window.getShopName = getShopName;
window.applyBrand = applyBrand;
window.formatDate = formatDate;
window.applyLanguage = applyLanguage;
