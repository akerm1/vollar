// === AUTO-UPDATE CHECK ======================================================
// On version change the app reloads itself (browser refresh) so the new code
// takes effect. We protect the cashier: never reload while a sale is in
// progress or the cart still has items — money/stock must not be lost.
// ============================================================================

const LAST_VERSION_KEY = 'shoppos_last_app_version';

async function getStoredAppVersion() {
    try {
        if (typeof dbGet !== 'function') return null;
        const rec = await dbGet('settings', LAST_VERSION_KEY);
        if (rec && rec.value !== undefined && rec.value !== null) return rec.value;
        try {
            const legacy = localStorage.getItem(LAST_VERSION_KEY);
            if (legacy !== null) {
                if (typeof dbPut === 'function') await dbPut('settings', { key: LAST_VERSION_KEY, value: legacy });
                try { localStorage.removeItem(LAST_VERSION_KEY); } catch (e) {}
                return legacy;
            }
        } catch (e) {}
        return null;
    } catch (e) {
        return null;
    }
}

async function setStoredAppVersion(version) {
    try { if (typeof dbPut === 'function') await dbPut('settings', { key: LAST_VERSION_KEY, value: version }); } catch (e) {}
}

function isSafeToReload() {
    try {
        if (window.__txInProgress) return false;
        if (typeof window.cart !== 'undefined' && window.cart && Array.isArray(window.cart) && window.cart.length) return false;
        if (typeof window.quickCart !== 'undefined' && window.quickCart && Array.isArray(window.quickCart) && window.quickCart.length) return false;
        return true;
    } catch (e) {
        return true;
    }
}

async function initAutoUpdateCheck() {
    const enabled = typeof settings !== 'undefined' && settings.autoUpdateEnabled !== undefined
        ? settings.autoUpdateEnabled
        : typeof window.__autoUpdateEnabled === 'boolean'
            ? window.__autoUpdateEnabled
            : true;
    const stored = await getStoredAppVersion();
    if (stored && stored !== APP_VERSION) {
        if (enabled && typeof window.location.reload === 'function' && isSafeToReload()) {
            await setStoredAppVersion(APP_VERSION);
            showToast(t('updateApplied'), 'success');
            setTimeout(function () { window.location.reload(); }, 800);
        } else {
            // Either auto-update is off, or a sale is in progress/cart not empty:
            // defer the reload. Do NOT mark the version as applied so the app
            // will offer the update again next time the cashier is idle.
            showToast(t('updateReady'), 'info');
        }
    } else if (!stored) {
        await setStoredAppVersion(APP_VERSION);
    }
}

// === DESKTOP AUTO-UPDATE (electron-updater) =============================
// In the installed desktop app the REAL update is done by electron-updater
// (download new installer + install on quit). This section only wires the
// Settings > Système UI to the safe vollarApp.* bridge. In the browser build
// vollarApp is absent and nothing here runs.
function _desktopUpdater() {
    return typeof vollarApp !== 'undefined' && vollarApp
        && typeof vollarApp.getUpdateState === 'function';
}

function _updateStatusEl() {
    return document.getElementById('update-status-text');
}

function _setUpdateStatus(text) {
    const el = _updateStatusEl();
    if (el) el.textContent = text;
}

function _updatePrefEnabled() {
    try {
        const cb = document.querySelector('[data-setting="autoUpdateEnabled"]');
        if (cb && typeof cb.checked === 'boolean') return cb.checked;
    } catch (e) {}
    return typeof settings !== 'undefined' ? settings.autoUpdateEnabled !== false : true;
}

// Per-client build-time defaults (injected by tools/build-release.js as
// window.__updateDefaults = {enabled, owner, repo}). Empty object when not set.
function _updateDefaults() {
    const d = window.__updateDefaults;
    return (d && typeof d === 'object') ? d : {};
}

function _updateMasterToggleEl() {
    try { return document.querySelector('[data-setting="updateCheckEnabled"]'); } catch (e) { return null; }
}

function _updateMasterEnabled() {
    if (typeof settings !== 'undefined' && typeof settings.updateCheckEnabled === 'boolean') return settings.updateCheckEnabled;
    const def = _updateDefaults();
    if (typeof def.enabled === 'boolean') return def.enabled;
    return true;
}

function _fillUpdateSourceFields() {
    try {
        const def = _updateDefaults();
        const owner = (settings && settings.updateRepoOwner) ? settings.updateRepoOwner : (def.owner || '');
        const repo = (settings && settings.updateRepo) ? settings.updateRepo : (def.repo || '');
        const o = document.getElementById('settings-update-owner');
        const r = document.getElementById('settings-update-repo');
        if (o) o.value = owner;
        if (r) r.value = repo;
        const mc = _updateMasterToggleEl();
        if (mc) mc.checked = _updateMasterEnabled();
    } catch (e) {}
}

// Master switch OFF (per-client "no updates") hides the source/download/check
// controls so this poste never checks for updates.
function _applyUpdateMasterUI() {
    const on = _updateMasterEnabled();
    try {
        const fields = document.getElementById('update-config-fields');
        if (fields) fields.style.display = on ? '' : 'none';
    } catch (e) {}
    try {
        const btnCheck = document.getElementById('btn-check-updates');
        if (btnCheck) btnCheck.style.display = on ? '' : 'none';
        const btnInstall = document.getElementById('btn-install-update');
        if (btnInstall && !on) btnInstall.style.display = 'none';
    } catch (e) {}
    if (!on) _setUpdateStatus(t('updateDisabled'));
}

// Persist the source + master switch, then push them to the main process
// (autoUpdater.setFeedURL({provider:'github', owner, repo})). Empty owner/repo
// fall back to the feed baked into the installer at build time.
function pushUpdateSourceToMain() {
    try {
        const cfg = _readUpdateSource();
        const v = /^[A-Za-z0-9_.-]+$/;
        if ((cfg.owner && !v.test(cfg.owner)) || (cfg.repo && !v.test(cfg.repo))) {
            showToast(t('updateSourceInvalid'), 'error');
            return null;
        }
        try {
            if (typeof dbPut === 'function') {
                dbPut('settings', { key: 'updateRepoOwner', value: cfg.owner });
                dbPut('settings', { key: 'updateRepo', value: cfg.repo });
                dbPut('settings', { key: 'updateCheckEnabled', value: cfg.enabled });
            }
        } catch (e) {}
        if (typeof vollarApp !== 'undefined' && vollarApp && typeof vollarApp.setUpdateSource === 'function') {
            vollarApp.setUpdateSource(cfg);
        }
        _applyUpdateMasterUI();
        return cfg;
    } catch (e) {
        return null;
    }
}

function _readUpdateSource() {
    let owner = '';
    let repo = '';
    try {
        const o = document.getElementById('settings-update-owner');
        const r = document.getElementById('settings-update-repo');
        if (o) owner = String(o.value || '').trim();
        if (r) repo = String(r.value || '').trim();
    } catch (e) {}
    return { owner: owner, repo: repo, enabled: _updateMasterEnabled() };
}

function _applyDesktopVisibility() {
    try {
        const fields = document.getElementById('update-desktop-fields');
        if (fields && !_desktopUpdater()) fields.style.display = 'none';
    } catch (e) {}
}

function initAppUpdate() {
    _applyDesktopVisibility();
    if (!_desktopUpdater()) return;

    const btnCheck = document.getElementById('btn-check-updates');
    const btnInstall = document.getElementById('btn-install-update');
    if (!btnCheck) return;

    // Fill the GitHub source + master switch from settings (or build defaults).
    _fillUpdateSourceFields();

    // Keep the main-process pref in sync once settings have loaded.
    const syncPref = function () {
        try {
            if (typeof vollarApp.setUpdateEnabled === 'function') {
                vollarApp.setUpdateEnabled(_updatePrefEnabled());
            }
        } catch (e) {}
    };
    let tries = 0;
    const iv = setInterval(function () {
        tries++;
        const loaded = typeof window.settingsLoaded !== 'undefined' && window.settingsLoaded;
        if (loaded || tries > 20) {
            clearInterval(iv);

            try { vollarApp.getUpdateState().then(function (st) {
                if (st && st.portable) {
                    _setUpdateStatus(t('updatePortable'));
                }
            }); } catch (e) {}
            syncPref();
            _applyUpdateMasterUI();
            if (loaded) {
                const def = _updateDefaults();
                const apply = (rec) => {
                    if (!rec || rec.value === undefined || rec.value === null) {
                        // First run on this poste with a baked "updates off/custom"
                        // default: persist it so it survives (settings DB was empty).
                        if (typeof def.enabled === 'boolean' && settings.updateCheckEnabled !== def.enabled) {
                            settings.updateCheckEnabled = def.enabled;
                            try { dbPut('settings', { key: 'updateCheckEnabled', value: def.enabled }); } catch (e) {}
                        }
                    }
                    _fillUpdateSourceFields();
                    pushUpdateSourceToMain();
                };
                try {
                    if (typeof def.enabled === 'boolean' && typeof dbGet === 'function') {
                        dbGet('settings', 'updateCheckEnabled').then(apply);
                    } else {
                        apply(null);
                    }
                } catch (e) {
                    apply(null);
                }
            }
        }
    }, 500);

    // Live-sync when the cashier toggles "Mises à jour auto" in Settings.
    try {
        const cb = document.querySelector('[data-setting="autoUpdateEnabled"]');
        if (cb) cb.addEventListener('change', syncPref);
    } catch (e) {}

    // Master switch: persisted by its setToggle attribute, then pushed to the
    // main process so it gates every update check on this poste.
    try {
        const master = _updateMasterToggleEl();
        if (master) master.addEventListener('change', function () { pushUpdateSourceToMain(); });
    } catch (e) {}

    // Save the GitHub source (owner/repo) for this installation.
    try {
        const btnSave = document.getElementById('btn-save-update-source');
        if (btnSave) btnSave.addEventListener('click', function () {
            const cfg = pushUpdateSourceToMain();
            if (cfg) showToast(t('updateSourceSaved'), 'success');
        });
    } catch (e) {}

    // Manual check from Settings > Système.
    btnCheck.addEventListener('click', function () {
        if (!_desktopUpdater()) return;
        _setUpdateStatus(t('updateChecking'));
        try { vollarApp.checkForUpdates(); } catch (e) {}
    });

    // Install the downloaded update (restart button, shown once downloaded).
    if (btnInstall) {
        btnInstall.addEventListener('click', function () {
            try { vollarApp.installUpdate(); } catch (e) {}
        });
    }

    // Update status events → status text + toasts.
    try {
        vollarApp.onUpdateStatus(function (payload) {
            if (!payload || !payload.state) return;
            const st = payload.state;
            const info = payload.info || {};
            if (st === 'checking') {
                _setUpdateStatus(t('updateChecking'));
            } else if (st === 'available') {
                const v = info.version || '';
                _setUpdateStatus(t('updateAvailable').replace('{v}', v));
                showToast(t('updateAvailable').replace('{v}', v), 'info');
            } else if (st === 'downloading') {
                const p = info.percent || 0;
                _setUpdateStatus(t('updateDownloading').replace('{p}', p));
            } else if (st === 'downloaded') {
                const v = info.version || '';
                _setUpdateStatus(t('updateDownloaded').replace('{v}', v));
                if (btnInstall) btnInstall.style.display = '';
                showToast(t('updateDownloaded').replace('{v}', v), 'success');
            } else if (st === 'not-available') {
                _setUpdateStatus(t('updateUpToDate'));
            } else if (st === 'error') {
                _setUpdateStatus(t('updateError'));
                showToast(t('updateError'), 'error');
            }
        });
    } catch (e) {}
}

window['initAutoUpdateCheck'] = initAutoUpdateCheck;
window['initAppUpdate'] = initAppUpdate;
window['pushUpdateSourceToMain'] = pushUpdateSourceToMain;