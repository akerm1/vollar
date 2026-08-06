
// ============================================================
// START APPLICATION
// ============================================================
async function bootstrapApp() {
    try {
        if (!useSQLite()) {
            db = await openDB();
        }
        await migrateToSQLite();
        await createDefaultAdmin();

        const hasSession = await refreshSession();
        if (hasSession) {
            if (currentUser.mustChangePin) {
                showChangePinModal();
            } else {
                initApp();
            }
        } else {
            showLockScreen();
        }
    } catch (error) {
        console.error('Bootstrap error:', error);
        showLockScreen();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapApp);
} else {
    bootstrapApp();
}
