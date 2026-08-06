
// ============================================================
// UPDATE LAST SCANNED ITEM DISPLAY
// ============================================================
function updateLastScannedItem(product) {
    const container = document.getElementById('last-scanned-item');
    if (!container) return;
    
    if (product) {
        const unitDisplay = product.unit === 'mètre' ? 'm' : '';
        container.innerHTML = `
            <div class="item-details">
                <div class="item-name">${escapeHtml(product.name)}</div>
                <div class="item-price">${product.price.toFixed(2)} DA ${unitDisplay ? '<span class="unit">/ ' + unitDisplay + '</span>' : ''}</div>
            </div>
        `;
    } else {
        container.innerHTML = '<span class="empty">' + t('waitingScan') + '</span>';
    }
}

// ============================================================
// ADD TO CART - WITH METER SUPPORT
// ============================================================
async function addToCart(product, quantity) {
    if (quantity !== undefined && quantity !== null) {
        return addToCartWithQuantity(product, quantity);
    }
    
    if (product.unit === 'mètre') {
        showMeterQuantityPrompt(product);
        return;
    }

    addToCartWithQuantity(product, 1);
}

function addToCartWithQuantity(product, qty) {
    if (qty <= 0) {
        showToast(t('quantityZero'), 'warning');
        playError();
        return;
    }
    
    // Settings: negativeStock — 'allow': pas de blocage, 'prevent': blocage (comportement par défaut avant), 'warn': avertit mais autorise
    if (product.stock < qty) {
        if (settings.negativeStock === 'prevent') {
            showToast(t('insufficientStock', { name: product.name, stock: product.stock }), 'error');
            playError();
            return;
        }
        if (settings.negativeStock === 'warn') {
            showToast(t('stockWarning', { name: product.name, stock: product.stock }), 'warning');
        }
    }

    const targetCart = window.quickCustomerMode ? window.quickCart : window.cart;
    customerAskShown = false;
    const existing = targetCart.find(item => item.barcode === product.barcode);
    if (existing) {
        // Settings: negativeStock — idem pour la quantité cumulée (déjà en panier + nouvel ajout)
        if (existing.qty + qty > product.stock) {
            if (settings.negativeStock === 'prevent') {
                showToast(t('insufficientStock', { name: product.name, stock: product.stock }), 'error');
                playError();
                return;
            }
            if (settings.negativeStock === 'warn') {
                showToast(t('stockWarning', { name: product.name, stock: product.stock }), 'warning');
            }
        }
        existing.qty += qty;
    } else {
        targetCart.push({
            barcode: product.barcode,
            name: product.name,
            price: product.price,
            purchasePrice: product.purchasePrice || product.price,
            reference: product.reference || '',
            reducedPrice: null,
            unit: product.unit || 'pièce',
            qty: qty,
            category: product.category || '',
            supplierId: product.supplierId != null ? product.supplierId : null
        });
    }
    
    // Update the last scanned item display
    updateLastScannedItem(product);
    
    renderCart();
    playScan();
    const unitDisplay = product.unit === 'mètre' ? 'm' : '';
    const locationLabel = window.quickCustomerMode ? t('toQuickCart') : t('toCart');
    showToast(t('addedToCartQty', { qty, unit: unitDisplay, name: product.name, location: locationLabel }), 'success');
}
