
// ============================================================
// SETUP MAIN BUTTONS
// ============================================================
function setupMainButtons() {
    // Complete Transaction Button
    if (DOM.btnComplete) {
        const newBtn = DOM.btnComplete.cloneNode(true);
        DOM.btnComplete.parentNode.replaceChild(newBtn, DOM.btnComplete);
        DOM.btnComplete = newBtn;
        
        DOM.btnComplete.addEventListener('click', function() {
            console.log('🔄 Complete button clicked');
            completeTransaction();
        });
    }
    
    // Clear Cart Button
    if (DOM.btnClearCart) {
        const newBtn = DOM.btnClearCart.cloneNode(true);
        DOM.btnClearCart.parentNode.replaceChild(newBtn, DOM.btnClearCart);
        DOM.btnClearCart = newBtn;
        DOM.btnClearCart.addEventListener('click', clearCart);
    }

    const quickCustomerBtn = document.getElementById('btn-quick-customer-mode');
    if (quickCustomerBtn) {
        quickCustomerBtn.addEventListener('click', toggleQuickCustomerMode);
    }
    
    // Export CSV Button
    if (DOM.btnExportCsv) {
        const newBtn = DOM.btnExportCsv.cloneNode(true);
        DOM.btnExportCsv.parentNode.replaceChild(newBtn, DOM.btnExportCsv);
        DOM.btnExportCsv = newBtn;
        DOM.btnExportCsv.addEventListener('click', exportCSV);
    }
    
    // Export JSON Button
    if (DOM.btnExportJson) {
        const newBtn = DOM.btnExportJson.cloneNode(true);
        DOM.btnExportJson.parentNode.replaceChild(newBtn, DOM.btnExportJson);
        DOM.btnExportJson = newBtn;
        DOM.btnExportJson.addEventListener('click', exportJSON);
    }
}

// ============================================================
// SETUP NAV TABS
// ============================================================
function setupNavTabs() {
    if (DOM.navTabs) {
        DOM.navTabs.forEach(tab => {
            const newTab = tab.cloneNode(true);
            tab.parentNode.replaceChild(newTab, tab);
            
            newTab.addEventListener('click', () => {
                switchView(newTab.dataset.view);
            });
        });
        DOM.navTabs = document.querySelectorAll('.nav-tab');
    }
    
    // Settings header button
    if (DOM.btnSettingsHeader) {
        const newBtn = DOM.btnSettingsHeader.cloneNode(true);
        DOM.btnSettingsHeader.parentNode.replaceChild(newBtn, DOM.btnSettingsHeader);
        DOM.btnSettingsHeader = newBtn;
        DOM.btnSettingsHeader.addEventListener('click', () => {
            switchView('settings');
        });
    }
}

// ============================================================
// SETUP SETTINGS CATEGORY GRID
// ============================================================
function setupSettingsTabs() {
    var nav = document.getElementById('settings-nav');
    var panels = document.querySelector('.settings-content');
    if (!nav || !panels) return;
    if (nav.dataset.bound) return;
    nav.dataset.bound = '1';

    // Sidebar nav item clicks
    nav.querySelectorAll('.settings-nav-item').forEach(function(item) {
        item.addEventListener('click', function() {
            var cat = item.dataset.category;
            var panel = document.getElementById('panel-' + cat);
            if (!panel) return;

            nav.querySelectorAll('.settings-nav-item').forEach(function(i) { i.classList.remove('active'); });
            item.classList.add('active');

            panels.querySelectorAll('.settings-panel').forEach(function(p) { p.classList.remove('active'); });
            panel.classList.add('active');
            panels.scrollTop = 0;
        });
    });
}

// ============================================================
// SETUP CLEAR SALES - FIXED: Use clearAllSales with stock restoration
// ============================================================
function setupClearSales() {
    if (DOM.btnClearSales) {
        const newBtn = DOM.btnClearSales.cloneNode(true);
        DOM.btnClearSales.parentNode.replaceChild(newBtn, DOM.btnClearSales);
        DOM.btnClearSales = newBtn;
        
        DOM.btnClearSales.addEventListener('click', async function() {
            // Use clearAllSales which restores stock
            if (typeof clearAllSales === 'function') {
                await clearAllSales();
            } else {
                // Fallback to old behavior
                if (confirm(t('deleteAllSalesConfirm'))) {
                    try {
                        await dbClear('sales');
                        showToast(t('allSalesDeleted'), 'success');
                        if (typeof refreshAnalytics === 'function') {
                            await refreshAnalytics();
                        } else {
                            loadAnalytics();
                        }
                        await (window.createAutoBackup || (() => Promise.resolve()))();
                    } catch (error) {
                        console.error('Clear sales error:', error);
                        showToast(t('deleteFailed'), 'error');
                    }
                }
            }
        });
    }
}

// ============================================================
// SETUP RESET ALL (réinitialisation complète — pour remise à neuf)
// - Sauvegarde automatique d'abord (toujours réversible)
// - Confirmation en tapant le mot « RÉINITIALISER »
// - Efface TOUTES les données (produits, ventes, clients, réglages,
//   utilisateurs, audit, fournisseurs, achats, rapports Z, promotions,
//   catégories, variantes) puis recharge l'application à vide.
// ============================================================
const RESET_ALL_STORES = [
    'products', 'sales', 'customers', 'settings', 'categories', 'zreports',
    'suppliers', 'purchases', 'users', 'auditlog', 'promotions', 'product_variants'
];

async function factoryReset() {
    if (!confirm(t('resetAllConfirm'))) return;
    const typed = prompt(t('resetTypeToConfirm'), '');
    if (typed !== 'RÉINITIALISER') {
        showToast(t('resetCancelled'), 'warning');
        return;
    }

    try {
        // 1. Sauvegarde automatique avant effacement (récupérable)
        showToast(t('backupInProgress'), 'info');
        if (typeof window.performAutoBackupDownload === 'function') {
            try { await window.performAutoBackupDownload(false, true); } catch (_) {}
        } else if (typeof window.createAutoBackup === 'function') {
            try { await window.createAutoBackup(); } catch (_) {}
        }

        // 2. Effacement complet de toutes les données
        for (const store of RESET_ALL_STORES) {
            await dbClear(store);
        }
        cart = [];

        // 3. Suppression des repères locaux (dossier de sauvegarde, auto-restore)
        try { localStorage.removeItem(BACKUP_KEY); } catch (_) {}

        // 4. Recharge l'application → admin par défaut + assistant de bienvenue
        showToast(t('dataReset'), 'success');
        setTimeout(() => { location.reload(); }, 400);
    } catch (error) {
        console.error('Reset all error:', error);
        showToast(t('resetFailed'), 'error');
    }
}

function setupResetAll() {
    if (DOM.btnResetAll) {
        const newBtn = DOM.btnResetAll.cloneNode(true);
        DOM.btnResetAll.parentNode.replaceChild(newBtn, DOM.btnResetAll);
        DOM.btnResetAll = newBtn;

        DOM.btnResetAll.addEventListener('click', factoryReset);
    }
}

// ============================================================
// SETUP EXPORT FULL BACKUP
// ============================================================
function setupExportFullBackup() {
    if (DOM.btnExportFullBackup) {
        const newBtn = DOM.btnExportFullBackup.cloneNode(true);
        DOM.btnExportFullBackup.parentNode.replaceChild(newBtn, DOM.btnExportFullBackup);
        DOM.btnExportFullBackup = newBtn;
        DOM.btnExportFullBackup.addEventListener('click', exportJSON);
    }
}

// ============================================================
// SETUP AMOUNT PAID
// ============================================================
function setupAmountPaid() {
    if (DOM.amountPaidInput) {
        const newInput = DOM.amountPaidInput.cloneNode(true);
        DOM.amountPaidInput.parentNode.replaceChild(newInput, DOM.amountPaidInput);
        DOM.amountPaidInput = newInput;
        
        DOM.amountPaidInput.addEventListener('input', function() {
            updateRemainingAmount();
        });
        
        DOM.amountPaidInput.value = '0';
    }
}

// ============================================================
// SETUP KEYBOARD SHORTCUTS (Additional)
// ============================================================
function setupAdditionalShortcuts() {
    document.addEventListener('keydown', function(e) {
        if (e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space' || e.keyCode === 32) {
            const activeEl = document.activeElement;
            if (!activeEl || (activeEl.tagName !== 'INPUT' && activeEl.tagName !== 'TEXTAREA')) {
                e.preventDefault();
            }
        }
    }, false);
}

// ============================================================
// SETUP PRINT BUTTON
// ============================================================
function setupPrintButton() {
    const printBtn = document.getElementById('btn-print-receipt');
    if (printBtn) {
        console.log('🖨️ Setting up print button...');
        
        const newBtn = printBtn.cloneNode(true);
        printBtn.parentNode.replaceChild(newBtn, printBtn);
        
        newBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('🖨️ Print button clicked');
            
            if (window.cart && window.cart.length > 0) {
                if (typeof window.printCart === 'function') {
                    window.printCart();
                } else {
                    showToast(t('printFunctionUnavailable'), 'error');
                    if (typeof playError === 'function') playError();
                }
            } else {
                showToast(t('cartEmptyAddFirst'), 'error');
                if (typeof playError === 'function') playError();
            }
        });
        
        console.log('✅ Print button setup complete');
    } else {
        console.warn('⚠️ Print button not found in DOM');
    }
}

// ============================================================
// SETUP SETTINGS BUTTONS
// ============================================================
function setupSettingsButtons() {
    if (DOM.btnSaveSettings) {
        const newBtn = DOM.btnSaveSettings.cloneNode(true);
        DOM.btnSaveSettings.parentNode.replaceChild(newBtn, DOM.btnSaveSettings);
        DOM.btnSaveSettings = newBtn;
        DOM.btnSaveSettings.addEventListener('click', saveSettings);
    }
    
    if (DOM.btnResetSettings) {
        const newBtn = DOM.btnResetSettings.cloneNode(true);
        DOM.btnResetSettings.parentNode.replaceChild(newBtn, DOM.btnResetSettings);
        DOM.btnResetSettings = newBtn;
        DOM.btnResetSettings.addEventListener('click', function() {
            if (DOM.settingsVat) DOM.settingsVat.value = DEFAULT_VAT_RATE;
            if (DOM.settingsLowStock) DOM.settingsLowStock.value = DEFAULT_LOW_STOCK;
            if (DOM.settingsCurrency) DOM.settingsCurrency.value = DEFAULT_CURRENCY;
            if (DOM.settingsFeedback) {
                DOM.settingsFeedback.textContent = t('settingsDefaultLoaded');
                DOM.settingsFeedback.style.color = 'var(--info)';
            }
        });
    }
}
