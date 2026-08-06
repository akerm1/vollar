
// ============================================================
// AUTO-UPDATE CHECK - version tracking for the static app
// ============================================================
// The app has no update server, so "auto-update" works by
// comparing the bundled APP_VERSION with the version recorded
// at last launch. When new app files are installed (version
// changed) and autoUpdateEnabled is ON, the app reloads once
// to load the new version automatically.

const LAST_VERSION_KEY = 'shoppos_last_app_version';

function getStoredAppVersion() {
    try {
        return localStorage.getItem(LAST_VERSION_KEY);
    } catch (e) {
        return null;
    }
}

function setStoredAppVersion(v) {
    try {
        localStorage.setItem(LAST_VERSION_KEY, v);
    } catch (e) {}
}

// Called once after settings are loaded.
function initAutoUpdateCheck() {
    const enabled = (typeof settings !== 'undefined' && settings.autoUpdateEnabled !== undefined)
        ? settings.autoUpdateEnabled
        : (typeof window.__autoUpdateEnabled === 'boolean' ? window.__autoUpdateEnabled : true);
    const stored = getStoredAppVersion();

    if (stored && stored !== APP_VERSION) {
        // New app files detected — record and apply
        setStoredAppVersion(APP_VERSION);
        if (enabled && typeof window.location.reload === 'function') {
            showToast(t('updateApplied'), 'success');
            setTimeout(function() { window.location.reload(); }, 800);
        } else {
            showToast(t('updateReady'), 'info');
        }
    } else if (!stored) {
        // First run — just record the current version
        setStoredAppVersion(APP_VERSION);
    }
}

window.initAutoUpdateCheck = initAutoUpdateCheck;
