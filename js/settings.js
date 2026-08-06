// ============================================================
// SETTINGS: Settings Management
// ============================================================
const DEFAULT_SETTINGS = {
    vatRate: 19,
    lowStockThreshold: 5,
    currency: 'DA',
    openingFloat: 0,
    shopName: '',
    shopAddress: '',
    shopPhone: '',
    shopEmail: '',
    locale: 'fr-FR',
    timezone: 'Africa/Algiers',
    dateFormat: 'DD/MM/YYYY',
    vatInclusive: false,
    fiscalId: '',
    compactModeEnabled: false,
    showIconsEnabled: true,
    animationsEnabled: true,
    highContrastEnabled: false,
    darkModeEnabled: false,
    structure: 'default',
    soundEnabled: true,
    vibrationEnabled: false,
    autoFocusScannerEnabled: true,
    autoAddQtyEnabled: true,
    confirmClearEnabled: false,
    askCustomerEnabled: true,
    quickCustomerEnabled: true,
    trackBatchesEnabled: true,
    autoBarcodeEnabled: false,
    inventoryAutoSaveEnabled: false,
    printAutoEnabled: true,
    printLogoEnabled: false,
    printQREnabled: true,
    printVATDetailsEnabled: false,
    autoBackupEnabled: true,
    cloudBackupEnabled: false,
    autoUpdateEnabled: true,
    advancedReportingEnabled: true,
    fontSize: 'medium',
    density: 'compact',
    defaultPayment: 'cash',
    rounding: 'none',
    quickCustomerName: 'Client rapide',
    negativeStock: 'allow',
    defaultUnit: 'pièce',
    allowDecimals: true,
    inventoryInterval: 5,
    backupInterval: 30,
    backupRetention: 30,
    receiptHeader: '',
    receiptFooter: '',
    printerType: 'thermal',
    printerWidth: '80',
    printTwoCopies: false,
    paymentMethods: null,
    scannerPrefixes: '\u001d,\u001e,\u001f,]C1,]C0,]E0,P',
    scannerTerminalSuffix: 'auto',
    scannerTimeout: 120,
};

async function loadSettings() {
    try {
        for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
            const setting = await dbGet('settings', key);
            settings[key] = setting ? setting.value : defaultValue;
        }

        populateSettingsForm();
        updateSettingsInfo();
        setupSystemButtons();
        applySettings();

        if (typeof setupUserManagement === 'function') setupUserManagement();
        if (typeof setupAuditUI === 'function') setupAuditUI();
        if (typeof applyRolePermissions === 'function') applyRolePermissions();
    } catch (error) {
        console.error('Load settings error:', error);
    }
}

function populateSettingsForm() {
    setField('settings-shop-name', settings.shopName);
    setField('settings-shop-address', settings.shopAddress);
    setField('settings-shop-phone', settings.shopPhone);
    setField('settings-shop-email', settings.shopEmail);
    setField('settings-locale', settings.locale);
    setField('settings-timezone', settings.timezone);
    setField('settings-date-format', settings.dateFormat);
    setField('settings-vat-inclusive', settings.vatInclusive.toString());
    setField('settings-fiscal-id', settings.fiscalId);

    setField('settings-vat', settings.vatRate);
    setField('settings-currency', settings.currency);
    setField('settings-opening-float', settings.openingFloat);

    setField('settings-font-size', settings.fontSize);
    setField('settings-density', settings.density);

    setField('settings-default-payment', settings.defaultPayment);
    setField('settings-rounding', settings.rounding);
    setField('settings-quick-customer-name', settings.quickCustomerName);

    setField('settings-low-stock', settings.lowStockThreshold);
    setField('settings-negative-stock', settings.negativeStock);
    setField('settings-default-unit', settings.defaultUnit);
    setField('settings-inventory-interval', settings.inventoryInterval);

    setField('settings-receipt-header', settings.receiptHeader);
    setField('settings-receipt-footer', settings.receiptFooter);

    setField('settings-scanner-prefixes', settings.scannerPrefixes);
    setField('settings-scanner-term', settings.scannerTerminalSuffix);
    setField('settings-scanner-timeout', settings.scannerTimeout);
    setField('settings-printer-type', settings.printerType);
    setField('settings-printer-width', settings.printerWidth);

    setField('settings-backup-interval', settings.backupInterval);
    setField('settings-backup-retention', settings.backupRetention);

    // Initialize toggle buttons
    updateToggleButtons();
    renderPaymentMethodsSettings();
}

function setField(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value;
}

function setCheckbox(id, checked) {
    const el = document.getElementById(id);
    if (el) el.checked = checked;
}

async function saveSettings() {
    try {
        const newSettings = {};

        newSettings.shopName = getField('settings-shop-name');
        newSettings.shopAddress = getField('settings-shop-address');
        newSettings.shopPhone = getField('settings-shop-phone');
        newSettings.shopEmail = getField('settings-shop-email');
        newSettings.locale = getField('settings-locale');
        newSettings.timezone = getField('settings-timezone');
        newSettings.dateFormat = getField('settings-date-format');
        newSettings.vatInclusive = getField('settings-vat-inclusive');
        newSettings.fiscalId = getField('settings-fiscal-id');

        newSettings.vatRate = parseFloat(getField('settings-vat')) || DEFAULT_SETTINGS.vatRate;
        newSettings.currency = getField('settings-currency');
        newSettings.openingFloat = parseFloat(getField('settings-opening-float')) || 0;

        newSettings.fontSize = getField('settings-font-size');
        newSettings.density = getField('settings-density');

        newSettings.defaultPayment = getField('settings-default-payment');
        newSettings.rounding = getField('settings-rounding');
        newSettings.quickCustomerName = getField('settings-quick-customer-name');

        newSettings.lowStockThreshold = parseInt(getField('settings-low-stock')) || DEFAULT_SETTINGS.lowStockThreshold;
        newSettings.negativeStock = getField('settings-negative-stock');
        newSettings.defaultUnit = getField('settings-default-unit');
        newSettings.inventoryInterval = parseInt(getField('settings-inventory-interval')) || 5;

        newSettings.receiptHeader = getField('settings-receipt-header');
        newSettings.receiptFooter = getField('settings-receipt-footer');
        newSettings.printerType = getField('settings-printer-type');
        newSettings.printerWidth = getField('settings-printer-width');

        newSettings.backupInterval = parseInt(getField('settings-backup-interval')) || 30;
        newSettings.backupRetention = parseInt(getField('settings-backup-retention')) || 30;

        // Toggle settings are now handled via setToggle() and stored in the settings object
        newSettings.compactModeEnabled = settings.compactModeEnabled;
        newSettings.showIconsEnabled = settings.showIconsEnabled;
        newSettings.animationsEnabled = settings.animationsEnabled;
        newSettings.highContrastEnabled = settings.highContrastEnabled;
        newSettings.darkModeEnabled = settings.darkModeEnabled;
        newSettings.autoFocusScannerEnabled = settings.autoFocusScannerEnabled;
        newSettings.autoAddQtyEnabled = settings.autoAddQtyEnabled;
        newSettings.soundEnabled = settings.soundEnabled;
        newSettings.vibrationEnabled = settings.vibrationEnabled;
        newSettings.confirmClearEnabled = settings.confirmClearEnabled;
        newSettings.askCustomerEnabled = settings.askCustomerEnabled;
        newSettings.quickCustomerEnabled = settings.quickCustomerEnabled;
        newSettings.trackBatchesEnabled = settings.trackBatchesEnabled;
        newSettings.autoBarcodeEnabled = settings.autoBarcodeEnabled;
        newSettings.allowDecimals = settings.allowDecimals;
        newSettings.inventoryAutoSaveEnabled = settings.inventoryAutoSaveEnabled;
        newSettings.printAutoEnabled = settings.printAutoEnabled;
        newSettings.printLogoEnabled = settings.printLogoEnabled;
        newSettings.printQREnabled = settings.printQREnabled;
        newSettings.printVATDetailsEnabled = settings.printVATDetailsEnabled;
        newSettings.printTwoCopies = settings.printTwoCopies;
        newSettings.autoBackupEnabled = settings.autoBackupEnabled;
        newSettings.cloudBackupEnabled = settings.cloudBackupEnabled;
        newSettings.autoUpdateEnabled = settings.autoUpdateEnabled;
        newSettings.advancedReportingEnabled = settings.advancedReportingEnabled;

        newSettings.scannerPrefixes = getField('settings-scanner-prefixes');
        newSettings.scannerTerminalSuffix = getField('settings-scanner-term');
        newSettings.scannerTimeout = parseInt(getField('settings-scanner-timeout')) || 120;

        if (isNaN(newSettings.vatRate) || newSettings.vatRate < 0) {
            showSettingsFeedback('invalidVatRate', 'error');
            return;
        }

        if (isNaN(newSettings.lowStockThreshold) || newSettings.lowStockThreshold < 0) {
            showSettingsFeedback('invalidLowStock', 'error');
            return;
        }

        if (!newSettings.currency) {
            showSettingsFeedback('currencyRequired', 'error');
            return;
        }

        for (const [key, value] of Object.entries(newSettings)) {
            await dbPut('settings', { key, value });
            settings[key] = value;
        }

        if (DOM.vatRateDisplay) DOM.vatRateDisplay.textContent = newSettings.vatRate;

        showSettingsFeedback('settingsSaved', 'success');
        showToast(t('settingsSaved'), 'success');

        renderCart();
        loadInventory();
        applySettings();

    } catch (error) {
        console.error('Save settings error:', error);
        showSettingsFeedback('settingsError', 'error');
        showToast(t('settingsError'), 'error');
    }
}

function getField(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

function getCheckbox(id) {
    const el = document.getElementById(id);
    return el ? el.checked : false;
}

function showSettingsFeedback(key, type) {
    var el = document.getElementById('settings-feedback');
    if (el) {
        el.textContent = t(key);
        el.style.color = type === 'error' ? 'var(--danger)' : 'var(--success)';
        el.style.display = 'block';
        setTimeout(function() { el.style.display = 'none'; }, 4000);
    }
}

// Global function to handle toggle buttons — applies instantly AND persists to the DB
async function setToggle(settingKey, value) {
    try {
        settings[settingKey] = value;
        await dbPut('settings', { key: settingKey, value });
        applySettings();
        updateToggleButtons();
        showToast(t('settingsSaved'), 'success');
    } catch (error) {
        console.error('setToggle error:', error);
        settings[settingKey] = !value;
        updateToggleButtons();
        showToast(t('settingsError'), 'error');
    }
}

// Update button states for all toggles
function updateToggleButtons() {
    const toggles = [
        'compactModeEnabled', 'showIconsEnabled', 'animationsEnabled',
        'highContrastEnabled', 'darkModeEnabled', 'soundEnabled',
        'vibrationEnabled', 'autoFocusScannerEnabled', 'autoAddQtyEnabled',
        'confirmClearEnabled', 'askCustomerEnabled', 'quickCustomerEnabled',
        'trackBatchesEnabled', 'autoBarcodeEnabled', 'inventoryAutoSaveEnabled',
        'printAutoEnabled', 'printLogoEnabled', 'printQREnabled',
        'printVATDetailsEnabled', 'printTwoCopies', 'autoBackupEnabled',
        'cloudBackupEnabled', 'autoUpdateEnabled', 'advancedReportingEnabled',
        'allowDecimals'
    ];

    toggles.forEach(key => {
        const input = document.querySelector(`[data-setting="${key}"]`);
        if (input) {
            input.checked = !!settings[key];
        }
    });
}

// Applique tous les paramètres au runtime (appelé après saveSettings() et au chargement de la vue caisse)
function applySettings() {
    if (typeof applyThemeFromSettings === 'function') {
        applyThemeFromSettings();
    }
    if (typeof applyStructureFromSettings === 'function') {
        applyStructureFromSettings();
    }
    if (typeof applyBrand === 'function') {
        applyBrand();
    }
    document.body.classList.toggle('compact-mode', settings.compactModeEnabled);
    document.body.classList.toggle('show-icons', settings.showIconsEnabled);
    document.body.classList.toggle('high-contrast', settings.highContrastEnabled);
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    if (settings.fontSize) {
        document.body.classList.add('font-' + settings.fontSize);
    }
    document.body.classList.remove('density-comfortable', 'density-spacious');
    if (settings.density === 'comfortable') document.body.classList.add('density-comfortable');
    if (settings.density === 'spacious') document.body.classList.add('density-spacious');

    // Settings: quickCustomerEnabled — affiche/masque le bouton "Client rapide" et désactive le mode si désactivé
    var qcBtn = document.getElementById('btn-quick-customer-mode');
    if (qcBtn) {
        qcBtn.style.display = settings.quickCustomerEnabled ? '' : 'none';
        if (!settings.quickCustomerEnabled && window.quickCustomerMode) {
            window.quickCustomerMode = false;
            window.quickCustomerActive = false;
            if (typeof updateQuickCustomerLayout === 'function') updateQuickCustomerLayout();
        }
    }

    // Settings: soundEnabled — variable globale lue par les fonctions playSuccess/playError/playScan/playWarning/playMeterSound
    window.__soundEnabled = settings.soundEnabled;

    // Settings: animations — ajoute/enlève la classe CSS reduce-animations sur <body>
    document.body.classList.toggle('reduce-animations', !settings.animationsEnabled);
    document.body.classList.toggle('dark-mode', settings.darkModeEnabled);
    if (typeof updateReportingUI === 'function') {
        updateReportingUI(settings.advancedReportingEnabled);
    }

    // Settings: autoFocusScanner — focus automatique sur le champ de scan manuel quand la caisse est active
    var scanInput = document.getElementById('manual-barcode');
    if (scanInput) {
        if (settings.autoFocusScannerEnabled) {
            scanInput.setAttribute('autofocus', '');
            if (document.getElementById('view-checkout').classList.contains('active')) {
                scanInput.focus();
            }
        } else {
            scanInput.removeAttribute('autofocus');
        }
    }

    // Settings: vibrationEnabled — variable globale pour les vibrations mobiles
    window.__vibrationEnabled = settings.vibrationEnabled;

    // Settings: printAutoEnabled — impression automatique des tickets
    window.__printAutoEnabled = settings.printAutoEnabled;

    // Settings: printLogoEnabled — afficher/masquer le logo sur les tickets
    window.__printLogoEnabled = settings.printLogoEnabled;

    // Settings: printQREnabled — afficher/masquer le QR code sur les tickets
    window.__printQREnabled = settings.printQREnabled;

    // Settings: printVATDetailsEnabled — afficher/masquer les détails TVA sur les tickets
    window.__printVATDetailsEnabled = settings.printVATDetailsEnabled;

    // Settings: printTwoCopies — imprimer deux exemplaires du ticket
    window.__printTwoCopies = settings.printTwoCopies;

    // Settings: autoBackupEnabled — sauvegarde automatique activée
    window.__autoBackupEnabled = settings.autoBackupEnabled;
    if (typeof window.setAutoBackupFromSettings === 'function') {
        window.setAutoBackupFromSettings(settings.autoBackupEnabled);
    }

    // Settings: cloudBackupEnabled — sauvegarde cloud activée
    window.__cloudBackupEnabled = settings.cloudBackupEnabled;
    if (typeof window.setCloudBackupFromSettings === 'function') {
        window.setCloudBackupFromSettings(settings.cloudBackupEnabled);
    }

    // Settings: autoUpdateEnabled — mises à jour automatiques activées
    window.__autoUpdateEnabled = settings.autoUpdateEnabled;

    // Settings: trackBatchesEnabled — affiche/masque les champs lot & péremption
    var formBatchRow = document.getElementById('form-batch-row');
    if (formBatchRow) formBatchRow.style.display = settings.trackBatchesEnabled ? '' : 'none';
    var editBatchRow = document.getElementById('edit-batch-row');
    if (editBatchRow) editBatchRow.style.display = settings.trackBatchesEnabled ? '' : 'none';
}

// Settings: advancedReportingEnabled — avec le nouveau tableau de bord chaque
// section est repliable individuellement (état mémorisé dans localStorage).
// Ce réglage ne masque donc plus les données de stock; il garantit seulement
// que la section "Stock" reste ouverte quand les rapports avancés sont activés.
function updateReportingUI(enabled) {
    if (enabled === false) return; // la visibilité est gérée par les sections repliables
    if (typeof setAnalyticsSectionState === 'function') {
        setAnalyticsSectionState('inventory', true);
    }
}

async function updateSettingsInfo() {
    try {
        if (typeof window.refreshButtonCustomizationUI === 'function') {
            window.refreshButtonCustomizationUI();
        }
        const products = await dbGetAll('products');
        const sales = await dbGetAll('sales');
        const customersData = await dbGetAll('customers');
        const suppliers = await dbGetAll('suppliers');

        if (DOM.settingsDbInfo) {
            DOM.settingsDbInfo.textContent = `${t('database')}: ${DB_NAME} | ${t('products')}: ${products.length} | ${t('transactions')}: ${sales.length} | ${t('customers')}: ${customersData.length} | ${t('suppliers')}: ${suppliers.length}`;
        }

        ['settings-products-count', 'settings-customers-count', 'settings-sales-count'].forEach(function(id, i) {
            const el = document.getElementById(id);
            if (el) el.textContent = [products.length, customersData.length, sales.length][i];
        });

        if ('storage' in navigator && 'estimate' in navigator.storage) {
            const estimate = await navigator.storage.estimate();
            const used = (estimate.usage / (1024 * 1024)).toFixed(1);
            const total = (estimate.quota / (1024 * 1024)).toFixed(1);
            if (DOM.settingsStorageInfo) {
                DOM.settingsStorageInfo.textContent = `${t('storage')}: ${used} MB / ${total} MB`;
            }
        } else {
            if (DOM.settingsStorageInfo) {
                DOM.settingsStorageInfo.textContent = `${t('storage')}: Non disponible`;
            }
        }
    } catch (error) {
        console.error('Update settings info error:', error);
    }
}

// ============================================================
// PAYMENT METHODS MANAGEMENT
// ============================================================
function renderPaymentMethodsSettings() {
    const listEl = document.getElementById('payment-methods-list');
    if (!listEl) return;
    if (typeof window.applyPaymentMethodConfig === 'function') window.applyPaymentMethodConfig();
    const methods = (typeof window.getConfiguredPaymentMethods === 'function') ? window.getConfiguredPaymentMethods() : [];
    const kindLabels = { cash: 'Espèces', credit: 'Crédit', fields: 'Champs' };
    listEl.innerHTML = methods.map(function(m) {
        const isBuiltIn = m.kind === 'cash' || m.kind === 'credit';
        const fieldsCount = (m.fields && m.fields.length) ? m.fields.length : 0;
        return '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid #ececec;border-radius:8px;background:#fafafa;">' +
            '<span style="font-size:16px;">' + (m.icon || '💳') + '</span>' +
            '<span style="flex:1;font-size:13px;font-weight:600;">' + escapeHtml(m.label || m.id) +
            (isBuiltIn ? ' <span style="font-size:10px;color:#999;font-weight:400;">(intégré)</span>' : '') +
            '</span>' +
            '<span style="font-size:11px;color:#999;">' + (kindLabels[m.kind] || 'Champs') + (fieldsCount ? ' · ' + fieldsCount + ' ' + t('paymentFields') : '') + '</span>' +
            '<button type="button" class="btn btn-danger btn-sm" data-remove-method="' + m.id + '" title="' + t('paymentRemove') + '">🗑</button>' +
        '</div>';
    }).join('');

    listEl.querySelectorAll('[data-remove-method]').forEach(function(btn) {
        btn.addEventListener('click', function() {
            const id = btn.getAttribute('data-remove-method');
            if (confirm(t('confirmRemovePaymentMethod'))) {
                removePaymentMethod(id);
            }
        });
    });

    const addBtn = document.getElementById('btn-add-payment-method');
    if (addBtn && !addBtn.dataset.bound) {
        addBtn.dataset.bound = '1';
        addBtn.addEventListener('click', addPaymentMethod);
    }
    const resetBtn = document.getElementById('btn-reset-payment-methods');
    if (resetBtn && !resetBtn.dataset.bound) {
        resetBtn.dataset.bound = '1';
        resetBtn.addEventListener('click', restoreDefaultPaymentMethods);
    }

    if (typeof window.refreshPaymentMethodSelector === 'function') window.refreshPaymentMethodSelector();
}

function isBuiltIn(m) { return m && (m.kind === 'cash' || m.kind === 'credit'); }

function getPaymentMethodsFromSettings() {
    return (typeof window.getConfiguredPaymentMethods === 'function')
        ? window.getConfiguredPaymentMethods()
        : [];
}

async function savePaymentMethods(list) {
    settings.paymentMethods = list;
    await dbPut('settings', { key: 'paymentMethods', value: list });
    if (typeof window.applyPaymentMethodConfig === 'function') window.applyPaymentMethodConfig();
    if (typeof window.refreshPaymentMethodSelector === 'function') window.refreshPaymentMethodSelector();
    renderPaymentMethodsSettings();
    showToast(t('settingsSaved'), 'success');
    if (typeof logAudit === 'function') await logAudit('PAYMENT_METHODS_UPDATED', 'Moyens de paiement mis à jour (' + (list ? list.length : 0) + ' actif(s))');
}

async function removePaymentMethod(id) {
    const list = getPaymentMethodsFromSettings().filter(function(m) { return m.id !== id; });
    await savePaymentMethods(list);
}

async function addPaymentMethod() {
    const label = (document.getElementById('pm-new-label')?.value || '').trim();
    const icon = (document.getElementById('pm-new-icon')?.value || '💳').trim();
    const fieldsRaw = (document.getElementById('pm-new-fields')?.value || '').trim();
    if (!label) { showToast(t('paymentMethodNameRequired'), 'error'); playError(); return; }

    const list = getPaymentMethodsFromSettings();
    const fields = fieldsRaw
        ? fieldsRaw.split(',').map(function(f) { return f.trim(); }).filter(Boolean).map(function(f, i) {
            return { key: 'field' + (i + 1), label: f };
        })
        : [];
    list.push({ id: 'custom_' + Date.now(), label: label, icon: icon, kind: 'fields', fields: fields });
    await savePaymentMethods(list);
    document.getElementById('pm-new-label').value = '';
    document.getElementById('pm-new-icon').value = '';
    document.getElementById('pm-new-fields').value = '';
}

async function restoreDefaultPaymentMethods() {
    if (confirm(t('confirmResetPaymentMethods'))) {
        settings.paymentMethods = null;
        await dbPut('settings', { key: 'paymentMethods', value: null });
        if (typeof window.applyPaymentMethodConfig === 'function') window.applyPaymentMethodConfig();
        if (typeof window.refreshPaymentMethodSelector === 'function') window.refreshPaymentMethodSelector();
        renderPaymentMethodsSettings();
        showToast(t('settingsSaved'), 'success');
        if (typeof logAudit === 'function') await logAudit('PAYMENT_METHODS_RESET', 'Moyens de paiement réinitialisés');
    }
}

function setupSystemButtons() {
    // System: optimize database
    const btnOptimizeDb = document.getElementById('btn-optimize-db');
    if (btnOptimizeDb && !btnOptimizeDb.dataset.bound) {
        btnOptimizeDb.dataset.bound = '1';
        btnOptimizeDb.addEventListener('click', async function() {
            try {
                btnOptimizeDb.disabled = true;
                const stores = ['products', 'sales', 'settings', 'customers', 'categories', 'zreports', 'suppliers', 'purchases', 'users', 'auditlog', 'promotions', 'product_variants'];
                let total = 0;
                for (const store of stores) {
                    try {
                        total += (await dbGetAll(store)).length;
                    } catch (e) {}
                }
                if (typeof window.refreshProductsCache === 'function') await window.refreshProductsCache();
                if (typeof updateSettingsInfo === 'function') await updateSettingsInfo();
                showToast(t('optimizeDbDone') + ' (' + total + ' ' + t('records') + ')', 'success');
                if (typeof logAudit === 'function') await logAudit('DB_OPTIMIZED', 'Optimized database with ' + total + ' records');
            } catch (e) {
                console.error('Optimize DB error:', e);
                showToast(t('settingsError'), 'error');
            } finally {
                btnOptimizeDb.disabled = false;
            }
        });
    }

    // System: clear cache
    const btnClearCache = document.getElementById('btn-clear-cache');
    if (btnClearCache && !btnClearCache.dataset.bound) {
        btnClearCache.dataset.bound = '1';
        btnClearCache.addEventListener('click', async function() {
            try {
                if (typeof window.refreshProductsCache === 'function') await window.refreshProductsCache();
                if ('caches' in window) {
                    const cacheKeys = await caches.keys();
                    for (const key of cacheKeys) {
                        await caches.delete(key);
                    }
                }
                showToast(t('cacheCleared'), 'success');
                if (typeof logAudit === 'function') await logAudit('CACHE_CLEARED', 'Cache cleared');
            } catch (e) {
                console.error('Clear cache error:', e);
                showToast(t('settingsError'), 'error');
            }
        });
    }

    // System: export logs
    const btnExportLogs = document.getElementById('btn-export-logs');
    if (btnExportLogs && !btnExportLogs.dataset.bound) {
        btnExportLogs.dataset.bound = '1';
        btnExportLogs.addEventListener('click', async function() {
            try {
                const entries = await dbGetAll('auditlog');
                entries.sort(function(a, b) {
                    return new Date(a.timestamp) - new Date(b.timestamp);
                });
                const payload = {
                    exportedAt: new Date().toISOString(),
                    count: entries.length,
                    entries: entries
                };
                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'samtex-logs-' + new Date().toISOString().slice(0, 10) + '.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast(t('logsExported') + ' (' + entries.length + ')', 'success');
                if (typeof logAudit === 'function') await logAudit('LOGS_EXPORTED', 'Exported ' + entries.length + ' log entries');
            } catch (e) {
                console.error('Export logs error:', e);
                showToast(t('settingsError'), 'error');
            }
        });
    }
}
