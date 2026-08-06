
// ============================================================
// UPDATE CART QTY - Now supports direct quantity setting
// ============================================================
function updateCartQty(index, delta, target = 'main') {
    const cart = target === 'quick' ? window.quickCart : window.cart;
    if (index < 0 || index >= cart.length) return;
    const newQty = cart[index].qty + delta;
    if (newQty <= 0) {
        cart.splice(index, 1);
    } else {
        cart[index].qty = newQty;
    }
    renderCart();
}

// ============================================================
// SET CART QTY - Directly set quantity from input
// ============================================================
function setCartQty(index, newQty, target = 'main') {
    const cart = target === 'quick' ? window.quickCart : window.cart;
    if (index < 0 || index >= cart.length) return;
    
    const qty = parseFloat(newQty);
    if (isNaN(qty) || qty <= 0) {
        // If invalid or zero, remove the item
        cart.splice(index, 1);
    } else {
        cart[index].qty = qty;
    }
    renderCart();
}

// ============================================================
// REMOVE FROM CART
// ============================================================
function removeFromCart(index, target = 'main') {
    const cart = target === 'quick' ? window.quickCart : window.cart;
    if (index < 0 || index >= cart.length) return;
    cart.splice(index, 1);
    renderCart();
}

function updateReducedPrice(index, newPrice, target = 'main') {
    const cart = target === 'quick' ? window.quickCart : window.cart;
    if (index < 0 || index >= cart.length) return;
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) {
        cart[index].reducedPrice = null;
    } else {
        cart[index].reducedPrice = price;
    }
    renderCart();
}

// Settings: confirmClearEnabled — si false (défaut), vide le panier sans demande de confirmation ; si true, affiche une boîte de dialogue "Vider ?"
function clearCart() {
    const targetCart = window.quickCustomerMode ? window.quickCart : window.cart;
    if (targetCart.length === 0) return;
    if (!settings.confirmClearEnabled || confirm(t('clear') + ' ?')) {
        if (window.quickCustomerMode) {
            window.quickCart = [];
        } else {
            window.cart = [];
        }
        customerAskShown = false;
        renderCart();
        updateLastScannedItem(null);
        showToast(t('cartCleared'), 'info');
    }
}

// ============================================================
// CALCULATE TOTALS
// ============================================================
function calculateTotals(target = 'main') {
    const cart = target === 'quick' ? window.quickCart : window.cart;
    let subtotal = 0;
    cart.forEach(item => {
        const effectivePrice = item.reducedPrice !== null && item.reducedPrice < item.price
            ? item.reducedPrice
            : item.price;
        subtotal += effectivePrice * item.qty;
    });

    // Apply promotions
    var discount = 0;
    if (typeof calculateCartDiscounts === 'function' && cart.length > 0) {
        var productsCache = window._productsCache || [];
        if (productsCache.length === 0 && typeof dbGetAll === 'function') {
            // sync fallback - cache should be populated elsewhere
        }
        var promoResult = calculateCartDiscounts(cart, productsCache);
        if (promoResult && promoResult.totalDiscount > 0) {
            // Only apply promo discount to items that don't have a manual reduced price
            var promoOnlyDiscount = 0;
            promoResult.itemDiscounts.forEach(function(result, index) {
                var cartItem = cart[index];
                if (cartItem && (cartItem.reducedPrice === null || cartItem.reducedPrice >= cartItem.price)) {
                    promoOnlyDiscount += result.discountAmount * cartItem.qty;
                }
            });
            discount = promoOnlyDiscount;
        }
    }

    const grandTotal = subtotal - discount;
    return { subtotal, grandTotal: Math.max(0, grandTotal), discount };
}
