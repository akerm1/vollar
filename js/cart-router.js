
// ============================================================
// VIEW ROUTER
// ============================================================
function switchView(viewId) {
    if (typeof hasPermission === 'function') {
        const viewPermissions = {
            checkout: null,
            inventory: 'inventory.view',
            customers: 'customers.view',
            suppliers: 'suppliers.view',
            analytics: 'analytics.view',
            settings: 'settings.view',
            users: 'users.view',
            promotions: null
        };
        const requiredPerm = viewPermissions[viewId];
        if (requiredPerm && !hasPermission(requiredPerm)) {
            showToast(t('accessDenied'), 'error');
            return;
        }
    }

    if (!DOM.views) return;
    Object.values(DOM.views).forEach(v => {
        if (v) v.classList.remove('active');
    });
    if (DOM.views[viewId]) DOM.views[viewId].classList.add('active');
    currentView = viewId;
    
    // Reset scroll position to top when switching views
    var mainContainer = document.querySelector('.main-container');
    if (mainContainer) mainContainer.scrollTop = 0;
    
    if (DOM.navTabs) {
        DOM.navTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.view === viewId);
        });
    }
    
    if (viewId === 'checkout') {
        customerAskShown = false;
        renderCart();
        if (typeof applySettings === 'function') applySettings(); // Applique quickCustomerEnabled (visibilité bouton), autoFocusScanner, compactMode, etc.
    }
    if (viewId === 'inventory') loadInventory();
    if (viewId === 'customers') loadCustomers();
    if (viewId === 'suppliers') {
        loadSuppliers();
        loadPurchaseHistory();
        renderLowStockPanel();
    }
    if (viewId === 'analytics') {
        if (typeof setupAnalyticsView === 'function') {
            setupAnalyticsView();
        }
    }
    if (viewId === 'settings') {
        if (typeof loadSettings === 'function') loadSettings();
        if (typeof renderThemeSelector === 'function') renderThemeSelector();
        if (typeof renderStructureSelector === 'function') renderStructureSelector();
        if (typeof setupSettingsTabs === 'function') setupSettingsTabs();
        if (typeof setupSettingsButtons === 'function') setupSettingsButtons();
    }
    if (viewId === 'users') {
        if (hasPermission('users.view')) {
            if (typeof loadUsers === 'function') loadUsers();
        } else {
            if (typeof loadSelfProfile === 'function') loadSelfProfile();
        }
    }
    if (viewId === 'promotions') {
        if (typeof loadPromotions === 'function') {
            loadPromotions().then(function() {
                renderPromotionsScreen();
            });
        }
    }
    
    resetScanner();

    setTimeout(() => {
        if (!formInputActive) {
            lockFocus();
        }
    }, 100);
}

// ============================================================
// EXPOSE FUNCTIONS GLOBALLY
// ============================================================
window.closeMeterPrompt = closeMeterPrompt;
window.meterPromptActive = false;
window.meterPendingProduct = null;
window.addToCart = addToCart;
window.addToCartWithQuantity = addToCartWithQuantity;
window.renderCart = renderCart;
window.clearCart = clearCart;
window.calculateTotals = calculateTotals;
window.updateRemainingAmount = updateRemainingAmount;
window.switchView = switchView;
window.saveMeterItemAndProcessScan = saveMeterItemAndProcessScan;
window.confirmMeterQuantity = confirmMeterQuantity;
window.updateLastScannedItem = updateLastScannedItem;
window.toggleQuickCustomerMode = toggleQuickCustomerMode;
window.completeQuickCustomerSale = completeQuickCustomerSale;
window.restoreQuickCustomerCart = restoreQuickCustomerCart;
window.setCartQty = setCartQty;
window.updateCartQty = updateCartQty;
window.removeFromCart = removeFromCart;

console.log('📦 Cart module loaded with editable quantity inputs');
