
// ============================================================
// AUTO-BACKUP SYSTEM
// ============================================================
const AUTO_BACKUP_FS_KEY  = 'shoppos_backup_folder_handle';
const AUTO_BACKUP_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours
let   _backupFolderHandle = null;
let   _autoBackupIntervalId = null;

// ── Build backup payload ────────────────────────────────────
async function buildBackupPayload() {
    const products      = await dbGetAll('products');
    const sales         = await dbGetAll('sales');
    const customersData = await dbGetAll('customers');
    const settingsData  = await dbGetAll('settings');
    const promotionsData = await dbGetAll('promotions');
    return {
        version:        '2.0',
        timestamp:      new Date().toISOString(),
        products,
        sales,
        customers:      customersData,
        settings:       settingsData,
        promotions:     promotionsData,
        totalProducts:  products.length,
        totalSales:     sales.length,
        totalCustomers: customersData.length
    };
}

// ── Restore a previously granted folder handle from IndexedDB ─
async function loadSavedFolderHandle() {
    try {
        const record = await dbGet('settings', AUTO_BACKUP_FS_KEY);
        if (!record || !record.handle) return null;
        const perm = await record.handle.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') return record.handle;
        return null;
    } catch (_) {
        return null;
    }
}

// ── Persist folder handle to IndexedDB ──────────────────────
async function saveFolderHandle(handle) {
    try {
        await dbPut('settings', { id: AUTO_BACKUP_FS_KEY, handle });
    } catch (_) {}
}

// ── Core: write JSON to folder (File System Access API) ─────
async function writeBackupToFolder(handle, filename, json) {
    const fileHandle = await handle.getFileHandle(filename, { create: true });
    const writable   = await fileHandle.createWritable();
    await writable.write(json);
    await writable.close();
}

// ── Core: fallback — silent <a> download (no popup) ─────────
function downloadBackupSilent(filename, json) {
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// ── Main export function called on startup & every 12h ──────
async function performAutoBackupDownload(silent = true, forceFolder = false) {
    if (window.autoBackupEnabled === false && !forceFolder) {
        console.log('ℹ️ Auto-backup is disabled, skipping download');
        return;
    }
    
    try {
        const payload  = await buildBackupPayload();
        const json     = JSON.stringify(payload, null, 2);
        const ts       = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const filename = `backup_${ts}.json`;

        const cloudOk = forceFolder || window.cloudBackupEnabled === true;
        if (cloudOk && 'showDirectoryPicker' in window) {
            if (!_backupFolderHandle) {
                _backupFolderHandle = await loadSavedFolderHandle();
            }
            if (_backupFolderHandle) {
                await writeBackupToFolder(_backupFolderHandle, filename, json);
                console.log(`✅ Backup written to folder: ${filename}`);
                if (!silent) showToast(t('backupSaved', { filename }), 'success');
                await (window.createAutoBackup || (() => Promise.resolve()))();
                return;
            }
        }

        downloadBackupSilent(filename, json);
        console.log(`✅ Backup downloaded: ${filename} (${payload.totalProducts} produits, ${payload.totalSales} ventes)`);
        if (!silent) showToast(t('backupDownloaded', { filename }), 'success');
        await (window.createAutoBackup || (() => Promise.resolve()))();

    } catch (error) {
        console.error('❌ Auto-backup failed:', error);
    }
}

// ── Let the user pick a folder once ──────────────────────────
async function pickBackupFolder() {
    if (!('showDirectoryPicker' in window)) {
        showToast(t('folderNotSupported'), 'info');
        return;
    }
    try {
        const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
        _backupFolderHandle = handle;
        await saveFolderHandle(handle);
        showToast(t('folderSelected'), 'success');
        await performAutoBackupDownload(false, true);
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error('Folder pick error:', err);
            showToast(t('folderError'), 'error');
        }
    }
}

// ── Cloud backup toggle (synced from Settings) ───────────────
let _lastCloudSetting = null;
let _cloudSettingInitialized = false;

async function setCloudBackupFromSettings(enabled) {
    enabled = !!enabled;
    const firstSync = !_cloudSettingInitialized;
    _cloudSettingInitialized = true;
    const changed = firstSync || _lastCloudSetting !== enabled;
    _lastCloudSetting = enabled;
    window.cloudBackupEnabled = enabled;
    window.__cloudBackupEnabled = enabled;

    if (firstSync) return; // silent at startup — only react to real toggles
    if (!changed) return;
    if (enabled) {
        if (!_backupFolderHandle) {
            _backupFolderHandle = await loadSavedFolderHandle();
        }
        if (_backupFolderHandle) {
            await performAutoBackupDownload(false, true);
            showToast(t('cloudBackupOn'), 'success');
        } else {
            showToast(t('cloudBackupFolderNeeded'), 'info');
            await pickBackupFolder();
        }
    } else {
        showToast(t('cloudBackupOff'), 'warning');
    }
}

// ── Schedule: startup + every 12h ───────────────────────────
function initAutoBackupSchedule() {
    // Ne PAS télécharger/écrire une sauvegarde à CHAQUE démarrage :
    // sur un rechargement fréquent cela relit toute la base et (re)télécharge
    // un JSON, ce qui ralentit fortement la caisse. Le déclenchement réel se
    // fait sur l'intervalle + à la fermeture/visibilité (voir plus bas) et
    // lors des écritures de données (createAutoBackup).

    if (_autoBackupIntervalId) {
        clearInterval(_autoBackupIntervalId);
        _autoBackupIntervalId = null;
    }

    _autoBackupIntervalId = setInterval(() => {
        if (window.autoBackupEnabled !== false) {
            performAutoBackupDownload(true);
        } else {
            console.log('ℹ️ Auto-backup is disabled, skipping scheduled backup');
        }
    }, AUTO_BACKUP_INTERVAL_MS);
}

// ── beforeunload ─────────────────────────────────────────────
window.addEventListener('beforeunload', function() {
    if (window.autoBackupEnabled === false) {
        console.log('ℹ️ Auto-backup disabled, skipping beforeunload backup');
        return;
    }
    try {
        (window.createAutoBackup || (() => {}))();
    } catch (_) {}
});

// ── Fermeture : signal au serveur local pour qu'il s'arrête ──
// (Option "arret immédiat") : dès que la caisse quitte la page, on prévient
// le serveur local via /__shutdown__ pour qu'il se ferme tout seul. Le serveur
// garde une petite marge de 3 s et annule si c'était juste un rechargement.
window.addEventListener('pagehide', function() {
    // Uniquement via le serveur local (http), jamais dans le shell Electron
    // (window.sqlite) ni en direct file://.
    if (location.protocol !== 'http:' && location.protocol !== 'https:') return;
    if (window.sqlite) return;
    if (typeof navigator.sendBeacon !== 'function') return;
    try {
        navigator.sendBeacon('/__shutdown__');
    } catch (_) {
        // silencieux : le serveur s'arrêtera de toute façon par délai d'inactivité
    }
});

// ── Page hidden ──────────────────────────────────────────────
document.addEventListener('visibilitychange', function() {
    if (document.hidden && window.autoBackupEnabled !== false) {
        (window.createAutoBackup || (() => {}))();
    }
    if (!document.hidden && typeof resetIdleTimer === 'function') {
        resetIdleTimer();
    }
});

// ── Restore: trouve la sauvegarde la plus récente du dossier ──
async function restoreAutoBackup() {
    try {
        const handle = await loadSavedFolderHandle();
        if (!handle) return false;

        const files = [];
        for await (const [name, fh] of handle.entries()) {
            if (typeof name === 'string' && name.startsWith('backup_') && name.endsWith('.json')) {
                files.push({ name, fh });
            }
        }
        if (files.length === 0) return false;

        // backup_YYYY-MM-DDTHH...json → le tri lexicographique donne le plus récent
        files.sort((a, b) => b.name.localeCompare(a.name));
        const file = await files[0].fh.getFile();
        const text = await file.text();
        const data = JSON.parse(text);

        const stores = ['products', 'sales', 'customers', 'settings', 'promotions'];
        for (const s of stores) {
            if (Array.isArray(data[s]) && data[s].length > 0) {
                for (const rec of data[s]) await dbPut(s, rec);
            }
        }
        console.log('✅ Auto-restore réalisé depuis le dossier de sauvegarde');
        return true;
    } catch (error) {
        console.error('Auto-restore error:', error);
        return false;
    }
}

// ============================================================
// EXPOSE AUTO-BACKUP FUNCTIONS
// ============================================================
window.performAutoBackupDownload = performAutoBackupDownload;
window.initAutoBackupSchedule = initAutoBackupSchedule;
window.pickBackupFolder = pickBackupFolder;
window.setCloudBackupFromSettings = setCloudBackupFromSettings;
window.buildBackupPayload = buildBackupPayload;
window.restoreAutoBackup = restoreAutoBackup;
window.__db_restoreAutoBackup = restoreAutoBackup;

// ============================================================
// PRODUCTS CACHE for Promotions
// ============================================================
window._productsCache = [];

async function refreshProductsCache() {
    try {
        window._productsCache = await dbGetAll('products');
    } catch (e) {
        window._productsCache = [];
    }
}
window.refreshProductsCache = refreshProductsCache;
