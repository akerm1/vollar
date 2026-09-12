// === DESKTOP AUTO-UPDATE BOOT =============================================
// Appears last in the script list so app-update.js (which defines initAppUpdate)
// is always loaded first. In the browser build vollarApp is absent and
// initAppUpdate() no-ops, so this is safe in the verify.js sandbox too.
try {
    if (typeof initAppUpdate === 'function') initAppUpdate();
} catch (e) {
    console.error('initAppUpdate error:', e);
}