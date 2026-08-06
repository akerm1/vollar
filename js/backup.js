// ============================================================
// AUTO-BACKUP TOGGLE - Controls the backup button in header
// ============================================================

// ============================================================
// BACKUP TOGGLE STATE
// ============================================================
let autoBackupEnabled = true;
let autoBackupIntervalId = null;
const BACKUP_TOGGLE_KEY = 'shoppos_autobackup_enabled';

// Load backup toggle state from localStorage
function loadBackupToggleState() {
    try {
        const saved = localStorage.getItem(BACKUP_TOGGLE_KEY);
        if (saved !== null) {
            autoBackupEnabled = saved === 'true';
        } else {
            autoBackupEnabled = true;
        }
    } catch (e) {
        autoBackupEnabled = true;
    }
    return autoBackupEnabled;
}

// Save backup toggle state
function saveBackupToggleState(enabled) {
    try {
        localStorage.setItem(BACKUP_TOGGLE_KEY, String(enabled));
    } catch (e) {
        // Ignore
    }
}

// ============================================================
// SET AUTO-BACKUP STATE (synced from Settings toggle)
// ============================================================
function setAutoBackupFromSettings(enabled) {
    autoBackupEnabled = !!enabled;
    saveBackupToggleState(autoBackupEnabled);
    window.autoBackupEnabled = autoBackupEnabled;
    updateBackupToggleUI();
    if (autoBackupEnabled && typeof window.initAutoBackupSchedule === 'function') {
        window.initAutoBackupSchedule();
    }
}

// ============================================================
// TOGGLE AUTO-BACKUP
// ============================================================
function toggleAutoBackup() {
    autoBackupEnabled = !autoBackupEnabled;
    saveBackupToggleState(autoBackupEnabled);
    
    // ============================================================
    // SYNC WITH WINDOW OBJECT SO app.js CAN CHECK IT
    // ============================================================
    window.autoBackupEnabled = autoBackupEnabled;
    
    updateBackupToggleUI();
    
    // Sync with the settings DB so the Settings toggle stays consistent
    if (typeof dbPut === 'function' && typeof settings !== 'undefined') {
        try {
            settings.autoBackupEnabled = autoBackupEnabled;
            dbPut('settings', { key: 'autoBackupEnabled', value: autoBackupEnabled });
        } catch (e) { /* ignore */ }
    }
    
    if (autoBackupEnabled) {
        showToast(t('autoBackupOn'), 'success');
        // Restart the schedule if needed
        if (typeof window.initAutoBackupSchedule === 'function') {
            window.initAutoBackupSchedule();
        }
        // Do an immediate backup
        if (typeof window.performAutoBackupDownload === 'function') {
            window.performAutoBackupDownload(true);
        }
    } else {
        showToast(t('autoBackupOff'), 'warning');
    }
}

// ============================================================
// UPDATE BACKUP TOGGLE UI
// ============================================================
function updateBackupToggleUI() {
    const dot = document.getElementById('backup-status-dot');
    const btn = document.getElementById('btn-toggle-backup');
    
    if (dot) {
        if (autoBackupEnabled) {
            dot.style.background = '#2ecc71';
            dot.style.boxShadow = '0 0 6px rgba(46,204,113,0.5)';
        } else {
            dot.style.background = '#e74c3c';
            dot.style.boxShadow = '0 0 6px rgba(231,76,60,0.5)';
        }
    }
    
    if (btn) {
        btn.title = autoBackupEnabled 
        ? t('backupAutoEnabled')
        : t('backupAutoDisabled');
    }
}

// ============================================================
// GLOBAL SHIM
// ============================================================
(function installBackupShim() {
    if (typeof window.createAutoBackup === 'function')
        window.__db_createAutoBackup = window.createAutoBackup;
    if (typeof window.restoreAutoBackup === 'function')
        window.__db_restoreAutoBackup = window.restoreAutoBackup;

    window.createAutoBackup = function createAutoBackup() {
        var real = window.__db_createAutoBackup;
        if (typeof real === 'function') return real();
        return Promise.resolve();
    };

    window.restoreAutoBackup = function restoreAutoBackup() {
        var real = window.__db_restoreAutoBackup;
        if (typeof real === 'function') return real();
        return Promise.resolve(false);
    };
})();

// ============================================================
// SETUP BACKUP TOGGLE BUTTON
// ============================================================
function setupBackupToggleButton() {
    const btn = document.getElementById('btn-toggle-backup');
    if (!btn) {
        console.warn('⚠️ Backup toggle button not found');
        return;
    }
    
    // Remove any existing listeners
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    // Load saved state
    loadBackupToggleState();
    window.autoBackupEnabled = autoBackupEnabled;
    
    // Update UI
    updateBackupToggleUI();
    
    // Add click handler
    newBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleAutoBackup();
    });
    
    console.log('✅ Backup toggle button setup complete');
    console.log(`💾 Auto-backup is ${autoBackupEnabled ? 'ENABLED' : 'DISABLED'}`);
}

// ============================================================
// MANUAL BACKUP BUTTON - Always works regardless of toggle
// ============================================================
async function manualBackup() {
    try {
        const products = await dbGetAll('products');
        if (products.length === 0) {
            showToast(t('noDataBackup'), 'info');
            return false;
        }
        
        showToast(t('backupInProgress'), 'info');
        await createAutoBackup();
        await downloadFullBackupOnRefresh();
        
        showToast(t('backupDone'), 'success');
        playSuccess();
        return true;
        
    } catch (error) {
        console.error('Manual backup error:', error);
        showToast(t('backupError'), 'error');
        playError();
        return false;
    }
}

// ============================================================
// DOWNLOAD FULL BACKUP (Manual only - triggers popup)
// ============================================================
async function downloadFullBackupOnRefresh() {
    try {
        console.log('💾 Creating backup file...');
        
        const products = await dbGetAll('products');
        const sales = await dbGetAll('sales');
        const customersData = await dbGetAll('customers');
        const settingsData = await dbGetAll('settings');
        
        if (products.length === 0 && sales.length === 0 && customersData.length === 0) {
            console.log('ℹ️ No data to backup');
            return false;
        }
        
        const backup = {
            version: '2.0',
            timestamp: new Date().toISOString(),
            appName: (typeof getShopName === 'function') ? getShopName() : 'ShopPOS',
            summary: {
                products: products.length,
                sales: sales.length,
                customers: customersData.length,
                totalRevenue: sales.reduce((sum, s) => sum + (s.grandTotal || 0), 0)
            },
            products: products,
            sales: sales,
            customers: customersData,
            settings: settingsData
        };
        
        const json = JSON.stringify(backup, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        link.download = `backup_${timestamp}.json`;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
        
        console.log(`✅ Backup downloaded: ${products.length} products, ${sales.length} sales, ${customersData.length} customers`);
        return true;
        
    } catch (error) {
        console.error('❌ Backup download failed:', error);
        return false;
    }
}

// ============================================================
// EXPOSE FUNCTIONS
// ============================================================
window.downloadFullBackupOnRefresh = downloadFullBackupOnRefresh;
window.manualBackup = manualBackup;
window.toggleAutoBackup = toggleAutoBackup;
window.setAutoBackupFromSettings = setAutoBackupFromSettings;
window.updateBackupToggleUI = updateBackupToggleUI;
window.setupBackupToggleButton = setupBackupToggleButton;
window.autoBackupEnabled = autoBackupEnabled;

console.log('💾 Auto-backup toggle module loaded');