// ============================================================
// VOLLAR POS — Electron main process
// Secure desktop shell around the browser-only POS:
//   - loadFile() on the existing index.html (no server needed)
//   - IndexedDB storage (unchanged, persists in userData)
//   - hardened webPreferences + anti-devtools + no menu
//   - single instance lock and navigation lockdown
// ============================================================

const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Auto-update (electron-updater) — only enabled for the installed NSIS app.
// The portable build cannot self-update (no installer to run).
const { autoUpdater } = require('electron-updater');
const IS_PORTABLE = !!process.env.PORTABLE_EXECUTABLE_DIR;

let mainWindow = null;
let _quitPending = false;      // true when will-quit is firing
let _rendererReady = false;    // set when renderer signals quitReady
let _updateEnabled = true;     // renderer-driven pref (Mises à jour auto)
let _updatesEnabled = true;    // per-install master switch (Activer les mises à jour)
let _updatePending = false;    // an update has been downloaded
let _updateInstalling = false; // guards quitAndInstall re-entry
let _startupCheckDone = false;
let _crashPending = false;     // previous run did not quit cleanly (crash/power loss)

// Marker file lives in userData. A marker present at launch means the previous
// run was NOT shut down cleanly (crash, power loss, forced kill): it is written
// on every load and removed only after a confirmed clean-quit handshake.
function _markerFile() {
    return path.join(app.getPath('userData'), 'session.marker');
}
function _clearCrashMarker() {
    try {
        if (fs.existsSync(_markerFile())) fs.unlinkSync(_markerFile());
    } catch (e) { /* ignore */ }
}
function _stampCrashMarker() {
    try { fs.writeFileSync(_markerFile(), String(Date.now()), 'utf8'); } catch (e) { /* ignore */ }
}

// Only allow the renderer to read/write/delete the app's own backup/export
// files. Every bridge-written file in the app is named
// backup_<timestamp>.json (or backup_SHUTDOWN_<timestamp>.json); nothing else
// should ever be written through these channels.
function isAllowedDataFile(name) {
    if (typeof name !== 'string') return false;
    return /^(backup_|export_)[A-Za-z0-9._-]+\.json$/.test(name);
}

// Lock the app to a single instance.
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        show: false,
        backgroundColor: '#1a1a2e',
        icon: path.join(__dirname, '..', 'build', 'icon.ico'),
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            devTools: false,
            webSecurity: true,
            allowRunningInsecureContent: false,
            spellcheck: false
        }
    });

    // Remove the application menu entirely (removes "Toggle Developer Tools"
    // entry points) and drop any default accelerator shortcuts.
    Menu.setApplicationMenu(null);

    // Keep only the fullscreen toggle (F11). DevTools shortcuts (F12 /
    // Ctrl+Shift+I/J/C) are deliberately NOT handled: devTools:false above
    // keeps the inspector closed in the shipped app.
    mainWindow.webContents.on('before-input-event', (event, input) => {
        const key = input.key ? String(input.key).toLowerCase() : '';
        // F11 = fullscreen toggle (menu is null, so Electron has no default).
        if (key === 'f11' && input.type === 'keyDown') {
            event.preventDefault();
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
        }
    });

    // Load the existing (browser-identical) entry point.
    mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));

    // Crash-recovery marker: the flag is read at app startup (whenReady) BEFORE
    // the renderer can ask for it; here we only stamp our own marker so a crash
    // on THIS run is detected next time. The marker is removed only on a clean
    // quit (renderer-quit-ready) or an update relaunch.
    mainWindow.webContents.on('did-finish-load', () => {
        _stampCrashMarker();
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Hard lockdown on any new web contents created by the renderer:
// no window.open, no navigation away from the packaged app pages.
app.on('web-contents-created', (event, contents) => {
    contents.on('will-navigate', (navEvent, url) => {
        const allowed = 'file://' + path.normalize(path.join(__dirname, '..'));
        if (!url.startsWith(allowed)) {
            navEvent.preventDefault();
        }
    });

    contents.setWindowOpenHandler(({ url }) => {
        // Open external http(s) links in the system browser instead of new Electron windows.
        if (url.startsWith('http://') || url.startsWith('https://')) {
            require('electron').shell.openExternal(url);
        }
        return { action: 'deny' };
    });

    // Block any context-menu (inspect element, view source, copy of UI).
    contents.on('context-menu', (ctxEvent) => {
        ctxEvent.preventDefault();
    });
});

// Open the app's user-data folder (where IndexedDB / Local Storage live) in
// the OS file manager. Safe: it only ever reveals the local data directory.
ipcMain.handle('open-data-folder', async () => {
    const dir = app.getPath('userData');
    const err = await shell.openPath(dir);
    return { ok: !err, path: dir, error: err || null };
});

// Non-destructive: returns the userData path only (drive-warning checks use it).
ipcMain.handle('get-data-path', async () => {
    return { path: app.getPath('userData') };
});

// === File-system IPC handlers (used by hourly export + shutdown backup) ===

ipcMain.handle('pick-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || !result.filePaths.length) return null;
    return { path: result.filePaths[0] };
});

ipcMain.handle('save-file', async (event, dirPath, fileName, content) => {
    // Atomic write: write to a .partial temp then rename over the final name.
    // A rename within the same directory is atomic on Windows, so a crash can
    // never leave a truncated backup at the final filename.
    let filePath = null;
    let tmp = null;
    try {
        if (!isAllowedDataFile(fileName)) {
            return { ok: false, error: 'Refused: file name not allowed (' + fileName + ')' };
        }
        filePath = path.join(dirPath, fileName);
        tmp = filePath + '.partial';
        await fs.promises.writeFile(tmp, content, 'utf8');
        await fs.promises.rename(tmp, filePath);
        return { ok: true, path: filePath };
    } catch (err) {
        if (tmp) { try { await fs.promises.unlink(tmp); } catch (e2) { /* ignore */ } }
        console.error('save-file error:', err);
        return { ok: false, error: err.message };
    }
});

ipcMain.handle('list-files', async (event, dirPath) => {
    try {
        const entries = await fs.promises.readdir(dirPath, { withFileTypes: false });
        const files = [];
        for (const name of entries) {
            try {
                const stat = await fs.promises.stat(path.join(dirPath, name));
                files.push({ name, mtime: stat.mtimeMs });
            } catch (e) { /* skip unreadable */ }
        }
        return { files };
    } catch (err) {
        return { files: [] };
    }
});

ipcMain.handle('delete-file', async (event, filePath) => {
    try {
        const name = path.basename(filePath);
        if (!isAllowedDataFile(name)) {
            return { ok: false, error: 'Refused: file name not allowed (' + name + ')' };
        }
        await fs.promises.unlink(filePath);
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err.message };
    }
});

// Read one of the app's own backup files back (restore panel). Same guard as
// save/delete: only backup_/export_ .json basenames are ever readable.
ipcMain.handle('read-backup-file', async (event, dirPath, fileName) => {
    try {
        if (!isAllowedDataFile(fileName)) {
            return { ok: false, error: 'Refused: file name not allowed (' + fileName + ')' };
        }
        const content = await fs.promises.readFile(path.join(dirPath, fileName), 'utf8');
        return { ok: true, content };
    } catch (err) {
        return { ok: false, error: err.message };
    }
});

ipcMain.handle('get-desktop-path', async () => {
    return { path: app.getPath('desktop') };
});

// Dedicated shutdown-backup folder on the Desktop ("Données du POS auto"),
// auto-created on every launch if missing. Skips the portable/read-only edge
// cases gracefully: if the folder cannot be created, returns the raw Desktop.
ipcMain.handle('get-auto-backup-folder', async () => {
    const desktop = app.getPath('desktop');
    const dir = path.join(desktop, 'Données du POS auto');
    try {
        await fs.promises.mkdir(dir, { recursive: true });
        return { path: dir };
    } catch (err) {
        console.error('get-auto-backup-folder error:', err);
        return { path: desktop };
    }
});

// === Auto-update (electron-updater) ===
// The renderer controls the "Mises à jour auto" preference and can force a
// check from the Settings > Système panel. All events are forwarded to the
// renderer so it can show progress/status. Runs in the main process, which is
// unaffected by the renderer sandbox / contextIsolation.
function sendUpdateStatus(state, info) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-status', { state, info: info || {} });
    }
}

function setupAutoUpdater() {
    if (IS_PORTABLE) return;

    autoUpdater.autoDownload = true;          // download as soon as available
    autoUpdater.autoInstallOnAppQuit = false; // install is gated by our shutdown handshake

    autoUpdater.on('checking-for-update', () => sendUpdateStatus('checking'));
    autoUpdater.on('update-available', (info) => sendUpdateStatus('available', { version: info.version }));
    autoUpdater.on('update-not-available', () => sendUpdateStatus('not-available'));
    autoUpdater.on('download-progress', (p) => sendUpdateStatus('downloading', { percent: Math.round(p.percent) }));
    autoUpdater.on('update-downloaded', (info) => {
        _updatePending = true;
        sendUpdateStatus('downloaded', { version: info.version });
    });
    autoUpdater.on('error', (err) => {
        console.error('autoUpdater error:', err && err.message);
        sendUpdateStatus('error', { message: err && err.message ? String(err.message) : 'update error' });
    });
}

function currentUpdateState() {
    return {
        portable: IS_PORTABLE,
        version: app.getVersion(),
        pending: _updatePending
    };
}

async function runUpdateCheck() {
    if (IS_PORTABLE) return 'unsupported';
    if (!_updatesEnabled) return 'disabled';
    try {
        // Respect the "Mises à jour auto" pref: if disabled, still report
        // availability but do not download unless the user forced a check.
        autoUpdater.autoDownload = _updateEnabled;
        await autoUpdater.checkForUpdates();
        return 'started';
    } catch (err) { sendUpdateStatus('error', { message: err && err.message ? String(err.message) : 'update error' }); return 'error'; }
}

ipcMain.handle('update-prefs', async (event, enabled) => {
    _updateEnabled = !!enabled;
    return currentUpdateState();
});

// Per-install update source: master switch ("Activer les mises à jour") plus
// the GitHub owner/repo to fetch updates from. Empty owner/repo keep the feed
// baked into the installer at build time (package.json build.publish).
ipcMain.handle('update-source', async (event, cfg) => {
    cfg = cfg || {};
    const wasEnabled = _updatesEnabled;
    _updatesEnabled = cfg.enabled !== false;
    const owner = typeof cfg.owner === 'string' ? String(cfg.owner).trim() : '';
    const repo = typeof cfg.repo === 'string' ? String(cfg.repo).trim() : '';
    if (owner && repo) {
        try {
            autoUpdater.setFeedURL({ provider: 'github', owner: owner, repo: repo });
        } catch (err) {
            console.error('setFeedURL error:', err && err.message);
        }
    }
    if (_updatesEnabled) {
        if (!_startupCheckDone) {
            // One-time startup check, once the renderer reports the master state.
            _startupCheckDone = true;
            if (_updateEnabled) {
                setTimeout(() => { if (_updatesEnabled) runUpdateCheck(); }, 5000);
            }
        } else if (!wasEnabled) {
            // Master switch flipped ON mid-session: give immediate feedback.
            setTimeout(() => runUpdateCheck(), 1500);
        }
    }
    return currentUpdateState();
});

ipcMain.handle('update-check', async () => {
    return runUpdateCheck();
});

ipcMain.handle('update-install', () => {
    _updatePending = true;
    return installPendingUpdate() ? 'installing' : 'no-update';
});

ipcMain.handle('update-state', () => currentUpdateState());

function installPendingUpdate() {
    if (_updatePending && !_updateInstalling && !IS_PORTABLE) {
        _updateInstalling = true;
        try {
            _clearCrashMarker(); // update relaunch is a controlled restart -> treat as clean
            autoUpdater.quitAndInstall(false, true);
            return true;
        } catch (err) {
            console.error('quitAndInstall error:', err);
        }
    }
    return false;
}

// Tells the renderer whether the PREVIOUS run crashed / was killed (i.e. the
// clean-quit marker was still present when this run started). One-shot: once
// reported, the flag is cleared so it is not surfaced again on refresh.
ipcMain.handle('get-crash-flag', async () => {
    const flag = _crashPending;
    _crashPending = false;
    return flag;
});

// Whether two paths live on the same volume/root drive. Used to warn the user
// when a backup folder sits on the same disk as the data it is protecting.
ipcMain.handle('same-drive', async (event, a, b) => {
    try {
        if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
        const ra = path.parse(path.resolve(a)).root;
        const rb = path.parse(path.resolve(b)).root;
        return !!(ra && rb && ra.toLowerCase() === rb.toLowerCase());
    } catch (e) {
        return false;
    }
});

// === Shutdown backup (will-quit handler) ===
// When the user closes the app, we signal the renderer to run a final backup,
// wait up to 2 seconds for it to respond, then force-quit.
app.on('will-quit', (event) => {
    if (_quitPending || !mainWindow) return;
    event.preventDefault();
    _quitPending = true;

    const FORCE_QUIT_MS = 2500;
    const timer = setTimeout(() => {
        // Renderer didn't respond in time — force quit (installing first).
        _quitPending = false;
        if (!installPendingUpdate()) app.exit(0);
    }, FORCE_QUIT_MS);

    ipcMain.once('renderer-quit-ready', () => {
        clearTimeout(timer);
        _quitPending = false;
        _clearCrashMarker(); // clean quit confirmed -> next launch sees no crash flag
        if (!installPendingUpdate()) app.exit(0);
    });

    // Signal the renderer to build and save the shutdown backup.
    mainWindow.webContents.send('app-quit');
});

app.whenReady().then(() => {
    // Detect an abnormal shutdown from the PREVIOUS run (crash / power loss /
    // forced kill leave the marker behind; a clean quit removed it).
    try { _crashPending = fs.existsSync(_markerFile()); } catch (e) { _crashPending = false; }

    createWindow();
    setupAutoUpdater();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
