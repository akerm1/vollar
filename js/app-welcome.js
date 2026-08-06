// ============================================================
// WELCOME — Configuration de première utilisation
// Montre un mini-assistant (nom du magasin + dossier de sauvegarde)
// tant que le nom du magasin n'est pas configuré.
// ============================================================

function maybeShowWelcome() {
    try {
        if (settings && settings.shopName && String(settings.shopName).trim()) {
            return; // déjà configuré
        }
        const modal = document.getElementById('welcome-modal');
        if (!modal) return;

        const nameInput = document.getElementById('welcome-shop-name');
        const phoneInput = document.getElementById('welcome-shop-phone');
        const errEl = document.getElementById('welcome-error');
        if (nameInput) nameInput.value = (settings && settings.shopName) ? settings.shopName : '';
        if (phoneInput) phoneInput.value = (settings && settings.shopPhone) ? settings.shopPhone : '';
        if (errEl) errEl.textContent = '';
        modal.classList.add('active');
    } catch (e) {
        console.error('maybeShowWelcome error:', e);
    }
}

function closeWelcome() {
    const modal = document.getElementById('welcome-modal');
    if (modal) modal.classList.remove('active');
}

async function saveWelcome(e) {
    e.preventDefault();
    const nameInput = document.getElementById('welcome-shop-name');
    const phoneInput = document.getElementById('welcome-shop-phone');
    const errEl = document.getElementById('welcome-error');

    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) {
        if (errEl) errEl.textContent = 'Le nom du magasin est obligatoire.';
        return;
    }

    try {
        const updates = {
            shopName: name,
            shopPhone: phoneInput ? phoneInput.value.trim() : (settings ? settings.shopPhone : '')
        };
        for (const [key, value] of Object.entries(updates)) {
            if (typeof dbPut === 'function') await dbPut('settings', { key, value });
            if (settings) settings[key] = value;
        }

        if (typeof applyBrand === 'function') applyBrand();
        if (typeof updateSettingsInfo === 'function') updateSettingsInfo();

        closeWelcome();
        if (typeof showToast === 'function') showToast('Bienvenue ! La caisse est configurée.', 'success');
    } catch (error) {
        console.error('saveWelcome error:', error);
        if (errEl) errEl.textContent = 'Erreur lors de l\'enregistrement. Réessayez.';
    }
}

// ============================================================
// EXPOSE GLOBALEMENT
// ============================================================
window.maybeShowWelcome = maybeShowWelcome;
window.saveWelcome = saveWelcome;
window.closeWelcome = closeWelcome;