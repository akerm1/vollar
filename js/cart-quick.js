
function updateQuickCustomerLayout() {
    const splitContainer = document.querySelector('.checkout-cart-split');
    const quickPanel = document.querySelector('.quick-panel');
    if (splitContainer) {
        splitContainer.classList.toggle('quick-mode', Boolean(window.quickCustomerMode));
    }
    if (quickPanel) {
        quickPanel.classList.toggle('active', Boolean(window.quickCustomerMode));
    }
}

// Settings: quickCustomerEnabled — si false, le bouton "Client rapide" est masqué et cette fonction est immédiatement interrompue
function toggleQuickCustomerMode() {
    if (settings.quickCustomerEnabled === false) {
        showToast('Client rapide désactivé dans les paramètres', 'warning');
        return;
    }
    window.quickCustomerMode = !window.quickCustomerMode;
    const btn = document.getElementById('btn-quick-customer-mode');
    if (btn) {
        btn.textContent = window.quickCustomerMode ? '⚡ Client rapide ON' : '⚡ Client rapide';
        btn.classList.toggle('btn-warning', window.quickCustomerMode);
        btn.classList.toggle('btn-secondary', !window.quickCustomerMode);
    }
    updateQuickCustomerLayout();

    if (!window.quickCustomerMode) {
        if (window.quickCart.length > 0) {
            if (confirm('⚡ Terminer le mode client rapide ? Les articles rapides resteront dans le panier rapide.')) {
                window.quickCustomerActive = false;
                // Hide quick panel
                updateQuickCustomerLayout();
                showToast(t('quickClientOff'), 'info');
            } else {
                // Re-enable quick mode if user cancels
                window.quickCustomerMode = true;
                if (btn) {
                    btn.textContent = '⚡ Client rapide ON';
                    btn.classList.add('btn-warning');
                    btn.classList.remove('btn-secondary');
                }
                updateQuickCustomerLayout();
                return;
            }
        } else {
            window.quickCustomerActive = false;
            updateQuickCustomerLayout();
            showToast(t('quickClientOff'), 'info');
        }
    } else {
        window.quickCustomerActive = true;
        window.quickCustomerSnapshot = {
            mainCart: JSON.parse(JSON.stringify(window.cart)),
            quickCart: JSON.parse(JSON.stringify(window.quickCart)),
            customer: DOM.customerSelect ? DOM.customerSelect.value : ''
        };
        showToast(t('quickClientOn'), 'info');
    }
    renderCart();
}

async function completeQuickCustomerSale() {
    if (!window.quickCustomerActive || window.quickCart.length === 0) {
        showToast(t('quickClientNothing'), 'info');
        return;
    }

    await completeTransaction(true);
    showToast(t('quickClientDone'), 'success');
    
    // ==========================================
    // AFTER COMPLETION: Hide quick panel and switch back to main cart
    // ==========================================
    window.quickCustomerMode = false;
    window.quickCustomerActive = false;
    const btn = document.getElementById('btn-quick-customer-mode');
    if (btn) {
        btn.textContent = '⚡ Client rapide';
        btn.classList.remove('btn-warning');
        btn.classList.add('btn-secondary');
    }
    updateQuickCustomerLayout();
    renderCart();
    lockFocus();
}

function restoreQuickCustomerCart() {
    if (!window.quickCustomerSnapshot) return;
    window.cart = JSON.parse(JSON.stringify(window.quickCustomerSnapshot.mainCart));
    window.quickCart = JSON.parse(JSON.stringify(window.quickCustomerSnapshot.quickCart));
    if (DOM.customerSelect) DOM.customerSelect.value = window.quickCustomerSnapshot.customer || '';
    updateCheckoutCustomerDisplay();
    renderCart();
    showToast(t('cartRestored'), 'info');
}
