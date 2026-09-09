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
let _updatePending = false;    // an update has been downloaded
let _updateInstalling = false; // guards quitAndInstall re-entry
let _startupCheckDone = false;

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

// === File-system IPC handlers (used by hourly export + shutdown backup) ===

ipcMain.handle('pick-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory']
    });
    if (result.canceled || !result.filePaths.length) return null;
    return { path: result.filePaths[0] };
});

ipcMain.handle('save-file', async (event, dirPath, fileName, content) => {
    try {
        if (!isAllowedDataFile(fileName)) {
            return { ok: false, error: 'Refused: file name not allowed (' + fileName + ')' };
        }
        const filePath = path.join(dirPath, fileName);
        await fs.promises.writeFile(filePath, content, 'utf8');
        return { ok: true, path: filePath };
    } catch (err) {
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

ipcMain.handle('get-desktop-path', async () => {
    return { path: app.getPath('desktop') };
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
    if (_updateEnabled && !_startupCheckDone) {
        _startupCheckDone = true;
        setTimeout(() => { if (_updateEnabled) runUpdateCheck(); }, 5000);
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
            autoUpdater.quitAndInstall(false, true);
            return true;
        } catch (err) {
            console.error('quitAndInstall error:', err);
        }
    }
    return false;
}

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
        if (!installPendingUpdate()) app.exit(0);
    });

    // Signal the renderer to build and save the shutdown backup.
    mainWindow.webContents.send('app-quit');
});

app.whenReady().then(() => {
    createWindow();
    setupAutoUpdater();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
