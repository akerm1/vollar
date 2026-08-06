let _currentVariantParentBarcode = '';

async function loadVariants(parentBarcode) {
    try {
        const all = await dbGetAll('product_variants');
        return all.filter(v => v.parentBarcode === parentBarcode);
    } catch (err) {
        console.error('loadVariants error:', err);
        return [];
    }
}

async function openVariantManager(barcode) {
    _currentVariantParentBarcode = barcode;
    const product = await dbGet('products', barcode);
    if (!product) {
        showToast(t('productLoadError'), 'error');
        return;
    }
    if (DOM.variantParentBarcode) DOM.variantParentBarcode.value = barcode;
    if (DOM.variantProductName) DOM.variantProductName.textContent = t('variantFor', { name: product.name });
    if (DOM.variantForm) DOM.variantForm.reset();
    if (DOM.variantId) DOM.variantId.value = '';
    if (DOM.variantModal) DOM.variantModal.classList.add('active');
    await renderVariantList(barcode);
}

async function renderVariantList(parentBarcode) {
    const container = DOM.variantList;
    if (!container) return;
    const variants = await loadVariants(parentBarcode);
    if (variants.length === 0) {
        container.innerHTML = `<p class="empty-state">${t('noVariants')}</p>`;
        return;
    }
    let html = '';
    variants.forEach(v => {
        const priceStr = v.price != null ? `${v.price.toFixed(2)} DA` : '—';
        const stockStr = v.stock != null ? v.stock : '—';
        const barcodeStr = v.barcode || '—';
        html += `
            <div class="variant-item">
                <div class="info">
                    <span class="name">${escapeHtml(v.name)} <span class="type-badge">${escapeHtml(v.type || '')}</span></span>
                    <div class="details">
                        ${t('tableSalePrice')}: ${priceStr} | ${t('tableStock')}: ${stockStr} | ${t('tableBarcode')}: ${barcodeStr}
                    </div>
                </div>
                <div class="actions">
                    <button class="btn-variant-edit" data-variant-id="${v.id}">✏️</button>
                    <button class="btn-variant-delete" data-variant-id="${v.id}">🗑️</button>
                </div>
            </div>`;
    });
    container.innerHTML = html;

    container.querySelectorAll('.btn-variant-edit').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = parseInt(this.dataset.variantId);
            const variant = variants.find(v => v.id === id);
            if (variant) populateVariantForm(variant);
        });
    });

    container.querySelectorAll('.btn-variant-delete').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = parseInt(this.dataset.variantId);
            const variant = variants.find(v => v.id === id);
            if (!variant) return;
            if (!confirm(t('variantDeleteConfirm', { name: variant.name }))) return;
            try {
                await dbDelete('product_variants', id);
                showToast(t('variantDeleted'), 'success');
                await renderVariantList(parentBarcode);
            } catch (err) {
                console.error('delete variant error:', err);
                showToast(t('deleteFailed'), 'error');
            }
        });
    });
}

function populateVariantForm(variant) {
    if (DOM.variantId) DOM.variantId.value = variant.id;
    if (DOM.variantName) DOM.variantName.value = variant.name || '';
    if (DOM.variantType) DOM.variantType.value = variant.type || 'Couleur';
    if (DOM.variantPrice) DOM.variantPrice.value = variant.price != null ? variant.price : '';
    if (DOM.variantStock) DOM.variantStock.value = variant.stock != null ? variant.stock : '';
    if (DOM.variantBarcode) DOM.variantBarcode.value = variant.barcode || '';
}

function setupVariantForm() {
    const form = DOM.variantForm;
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const parentBarcode = DOM.variantParentBarcode ? DOM.variantParentBarcode.value : '';
        const name = DOM.variantName ? DOM.variantName.value.trim() : '';
        const type = DOM.variantType ? DOM.variantType.value : 'Couleur';
        const priceVal = DOM.variantPrice ? DOM.variantPrice.value : '';
        const stockVal = DOM.variantStock ? DOM.variantStock.value : '';
        const barcodeVal = DOM.variantBarcode ? DOM.variantBarcode.value.trim() : '';
        const existingId = DOM.variantId ? DOM.variantId.value : '';

        if (!parentBarcode || !name) {
            showToast(t('fillRequiredFields'), 'warning');
            return;
        }

        const variant = {
            parentBarcode: parentBarcode,
            name: name,
            type: type,
            price: priceVal !== '' ? parseFloat(priceVal) : null,
            stock: stockVal !== '' ? parseFloat(stockVal) : null,
            barcode: barcodeVal || ''
        };

        if (existingId) {
            variant.id = parseInt(existingId);
        }

        try {
            await dbPut('product_variants', variant);
            showToast(t('variantSaved'), 'success');
            form.reset();
            if (DOM.variantId) DOM.variantId.value = '';
            if (DOM.variantParentBarcode) DOM.variantParentBarcode.value = parentBarcode;
            await renderVariantList(parentBarcode);
        } catch (err) {
            console.error('save variant error:', err);
            showToast(t('saveFailed'), 'error');
        }
    });

    const closeBtn = DOM.btnCloseVariantModal;
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            if (DOM.variantModal) DOM.variantModal.classList.remove('active');
        });
    }

    if (DOM.variantModal) {
        DOM.variantModal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    }
}

function showVariantPicker(product, variants) {
    const modal = DOM.variantPickerModal;
    const list = DOM.variantPickerList;
    const title = DOM.variantPickerTitle;
    if (!modal || !list) return;

    if (title) {
        title.textContent = t('chooseVariant') + ' - ' + escapeHtml(product.name);
    }

    let html = '';
    variants.forEach(v => {
        const priceStr = v.price != null ? `${v.price.toFixed(2)} DA` : `${product.price.toFixed(2)} DA`;
        const stockVal = v.stock != null ? v.stock : product.stock;
        const stockClass = stockVal <= 0 ? 'color:#e74c3c' : 'color:#2ecc71';
        const disabled = stockVal <= 0;
        html += `
            <button class="variant-picker-btn${disabled ? ' out-of-stock' : ''}" data-variant-id="${v.id}" style="${v.type === 'Couleur' ? 'border-left:5px solid ' + getColorHex(v.name) + ';' : ''}">
                <div class="info">
                    <span class="name">${escapeHtml(v.name)}</span>
                    <span class="type-tag">${escapeHtml(v.type || '')}</span>
                </div>
                <div class="side">
                    <span class="stock" style="${stockClass}">${t('tableStock')}: ${stockVal}</span>
                    <span class="price">${priceStr}</span>
                </div>
            </button>`;
    });

    list.innerHTML = html;

    list.querySelectorAll('.variant-picker-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const variantId = parseInt(this.dataset.variantId);
            const variant = variants.find(v => v.id === variantId);
            if (!variant) return;
            closeVariantPicker();
            if (typeof addVariantToCart === 'function') {
                addVariantToCart(product, variant);
            }
        });
    });

    modal.classList.add('active');
}

function closeVariantPicker() {
    const modal = DOM.variantPickerModal;
    if (modal) modal.classList.remove('active');
}

function getColorHex(colorName) {
    const map = {
        'rouge': '#e74c3c', 'red': '#e74c3c',
        'bleu': '#3498db', 'blue': '#3498db',
        'vert': '#2ecc71', 'green': '#2ecc71',
        'jaune': '#f1c40f', 'yellow': '#f1c40f',
        'noir': '#2c3e50', 'black': '#2c3e50',
        'blanc': '#ecf0f1', 'white': '#ecf0f1',
        'violet': '#9b59b6', 'purple': '#9b59b6',
        'orange': '#e67e22',
        'rose': '#e91e63', 'pink': '#e91e63',
        'gris': '#95a5a6', 'gray': '#95a5a6', 'grey': '#95a5a6',
        'marron': '#795548', 'brown': '#795548',
        'beige': '#f5f5dc',
        'turquoise': '#1abc9c',
        'doré': '#ffd700', 'gold': '#ffd700',
        'argent': '#c0c0c0', 'silver': '#c0c0c0'
    };
    return map[colorName.toLowerCase()] || 'var(--primary)';
}

function addVariantToCart(product, variant, requestedQty) {
    const effectivePrice = variant.price != null ? variant.price : product.price;
    const effectiveStock = variant.stock != null ? variant.stock : product.stock;

    const qty = (requestedQty !== undefined && requestedQty !== null) ? requestedQty : 1;
    if (qty <= 0) {
        showToast(t('quantityZero'), 'warning');
        if (typeof playError === 'function') playError();
        return;
    }

    // Settings: negativeStock — pour les variantes aussi : 'allow' ignore le stock, 'prevent' bloque, 'warn' avertit
    if (effectiveStock < qty) {
        if (settings.negativeStock === 'prevent') {
            showToast(t('insufficientStock', { name: product.name + ' (' + variant.name + ')', stock: effectiveStock }), 'error');
            if (typeof playError === 'function') playError();
            return;
        }
        if (settings.negativeStock === 'warn') {
            showToast(t('stockWarning', { name: product.name + ' (' + variant.name + ')', stock: effectiveStock }), 'warning');
        }
    }

    const variantKey = variant.barcode || (product.barcode + '-var-' + variant.id);
    const targetCart = window.quickCustomerMode ? window.quickCart : window.cart;
    const existing = targetCart.find(item => item.variantKey === variantKey);
    if (existing) {
        // Settings: negativeStock — idem pour quantité cumulée (déjà en panier variante + nouvel ajout)
        if (existing.qty + qty > effectiveStock) {
            if (settings.negativeStock === 'prevent') {
                showToast(t('insufficientStock', { name: product.name + ' (' + variant.name + ')', stock: effectiveStock }), 'error');
                if (typeof playError === 'function') playError();
                return;
            }
            if (settings.negativeStock === 'warn') {
                showToast(t('stockWarning', { name: product.name + ' (' + variant.name + ')', stock: effectiveStock }), 'warning');
            }
        }
        existing.qty += qty;
    } else {
        targetCart.push({
            barcode: product.barcode,
            variantKey: variantKey,
            name: product.name,
            variantName: variant.name,
            price: effectivePrice,
            purchasePrice: product.purchasePrice || product.price,
            reference: product.reference || '',
            reducedPrice: null,
            unit: product.unit || 'pièce',
            qty: qty
        });
    }

    if (typeof updateLastScannedItem === 'function') {
        updateLastScannedItem(product);
    }

    if (typeof renderCart === 'function') renderCart();
    if (typeof playScan === 'function') playScan();
    showToast(t('variantAddedToCart', { name: product.name, variant: variant.name }), 'success');
}

window.openVariantManager = openVariantManager;
window.loadVariants = loadVariants;
window.showVariantPicker = showVariantPicker;
window.closeVariantPicker = closeVariantPicker;
window.addVariantToCart = addVariantToCart;

console.log('🎨 Variants module loaded');
