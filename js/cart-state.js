// ============================================================
// CART: Cart Operations (with Reduced Price & Meter Support)
// ============================================================
window.cart = [];
window.quickCart = [];
window.quickCustomerMode = false;
window.quickCustomerSnapshot = null;
window.quickCustomerActive = false;
window.getCart = function() { return window.cart || []; };
window.getQuickCart = function() { return window.quickCart || []; };
window.meterPendingProduct = null;
window.meterPromptActive = false;
window.isLetterSearchMode = false;

// Snapshot de la caisse (pré-rechargement) pour ne pas perdre le panier
// quand un changement de structure/thème force un location.reload().
window.cartSnapshotKey = 'pos_cart_snapshot';
window.snapshotCart = function() {
    try {
        const data = JSON.stringify({
            cart: window.cart || [],
            quickCart: window.quickCart || [],
            quickCustomerSnapshot: window.quickCustomerSnapshot || null,
            quickCustomerMode: !!window.quickCustomerMode,
            quickCustomerActive: !!window.quickCustomerActive,
            meterPendingProduct: window.meterPendingProduct || null,
            meterPromptActive: !!window.meterPromptActive
        });
        sessionStorage.setItem(window.cartSnapshotKey, data);
    } catch (e) {
        console.error('Cart snapshot error:', e);
    }
};
window.restoreCartSnapshot = function() {
    try {
        const raw = sessionStorage.getItem(window.cartSnapshotKey);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (Array.isArray(data.cart)) window.cart = data.cart;
        if (Array.isArray(data.quickCart)) window.quickCart = data.quickCart;
        if (data.quickCustomerSnapshot) window.quickCustomerSnapshot = data.quickCustomerSnapshot;
        window.quickCustomerMode = !!data.quickCustomerMode;
        window.quickCustomerActive = !!data.quickCustomerActive;
        if (data.meterPendingProduct) window.meterPendingProduct = data.meterPendingProduct;
        window.meterPromptActive = !!data.meterPromptActive;
        sessionStorage.removeItem(window.cartSnapshotKey);
    } catch (e) {
        console.error('Cart restore error:', e);
    }
};
