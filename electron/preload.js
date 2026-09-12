// ============================================================
// VOLLAR POS — Electron preload
// Exposes a minimal, safe API to the renderer via contextBridge.
// All file-system access goes through the main process (IPC).
// ============================================================

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vollarApp', {
    isDesktop: true,

    // Open the app's user-data folder in the OS file manager.
    openDataFolder: () => ipcRenderer.invoke('open-data-folder'),

    // Pick a folder for hourly exports (shows native OS dialog).
    pickFolder: () => ipcRenderer.invoke('pick-folder'),

    // Write a file: returns { ok, path, error }.
    saveFile: (dirPath, fileName, content) =>
        ipcRenderer.invoke('save-file', dirPath, fileName, content),

    // List files in a directory: returns { files: [{name, mtime}] }.
    listFiles: (dirPath) => ipcRenderer.invoke('list-files', dirPath),

    // Delete a single file.
    deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),

    // Read one of the app's own backup files back (restore panel).
    readBackupFile: (dirPath, fileName) =>
        ipcRenderer.invoke('read-backup-file', dirPath, fileName),

    // Get the user's Desktop path for fallback saves.
    getDesktopPath: () => ipcRenderer.invoke('get-desktop-path'),

    // --- Quit lifecycle (shutdown backup) ---
    // Listen for a quit signal from the main process.
    onAppQuit: (callback) => {
        ipcRenderer.on('app-quit', () => callback());
    },
    // Signal the main process that the renderer has finished its shutdown work.
    quitReady: () => ipcRenderer.send('renderer-quit-ready'),

    // --- Auto-update ---
    // Tell the main process whether auto-update is enabled (Mises à jour auto).
    setUpdateEnabled: (enabled) => ipcRenderer.invoke('update-prefs', !!enabled),
    // Force a check for updates now (Settings > Système).
    checkForUpdates: () => ipcRenderer.invoke('update-check'),
    // Install the downloaded update (restart).
    installUpdate: () => ipcRenderer.invoke('update-install'),
    // Current update state: { portable, version, pending }.
    getUpdateState: () => ipcRenderer.invoke('update-state'),
    // Subscribe to update status events; returns an unsubscribe function.
    onUpdateStatus: (callback) => {
        const listener = (event, payload) => callback(payload);
        ipcRenderer.on('update-status', listener);
        return () => ipcRenderer.removeListener('update-status', listener);
    }
});
