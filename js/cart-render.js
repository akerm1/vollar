
// ============================================================
// RENDER CART - With editable quantity inputs
// ============================================================
function renderCart() {
    // Use flexible element selection to work with both old and new structure
    const cartBody = document.getElementById('cart-table-body') ||
                    document.querySelector('.cart-table tbody') ||
                    document.querySelector('#view-checkout tbody');

    const checkoutSubtotal = document.getElementById('checkout-subtotal') ||
                           document.querySelector('.totals-row .value') ||
                           document.getElementById('cart-subtotal');

    const checkoutGrandtotal = document.getElementById('checkout-grandtotal') ||
                             document.querySelector('.totals-row.grand .value') ||
                             document.getElementById('cart-grand-total');

    const amountPaidInput = document.getElementById('amount-paid') ||
                          document.querySelector('.payment-row input[type="number"]') ||
                          document.getElementById('amount-tendered');

    const remainingAmount = document.getElementById('remaining-amount') ||
                          document.querySelector('.payment-row .value') ||
                          document.getElementById('change-amount');

    const cartCount = document.getElementById('cart-count') ||
                    document.querySelector('.cart-summary span') ||
                    document.getElementById('cart-item-count');

    if (!cartBody) {
        console.warn('Cart body element not found');
        return;
    }

    const mainCart = window.cart || [];
    const quickCart = window.quickCart || [];

    if (mainCart.length === 0) {
        DOM.cartBody.innerHTML = `<tr><td colspan="8" class="empty-cart-msg">${t('emptyCart')}</td></tr>`;


        
    } else {
        let html = '';
        var promoCache = window._productsCache || [];
        var promoResult = typeof calculateCartDiscounts === 'function' ? calculateCartDiscounts(mainCart, promoCache) : null;
        mainCart.forEach((item, index) => {
            const effectivePrice = item.reducedPrice !== null && item.reducedPrice < item.price ? item.reducedPrice : item.price;
            const subtotal = effectivePrice * item.qty;
            const hasDiscount = item.reducedPrice !== null && item.reducedPrice < item.price;
            const referenceDisplay = item.reference ? `<span style="font-size:11px; color:#999; display:block;">${escapeHtml(item.reference)}</span>` : '';
            const unitDisplay = item.unit === 'mètre' ? 'm' : (item.unit || 'pièce');
            const step = (item.unit === 'mètre' || settings.allowDecimals === true) ? '0.1' : '1';

            var promoBadge = '';
            if (promoResult && promoResult.itemDiscounts.has(index)) {
                var promoInfo = promoResult.itemDiscounts.get(index);
                promoBadge = `<span style="display:inline-block;background:var(--success);color:white;font-size:10px;font-weight:600;padding:1px 6px;border-radius:8px;margin-left:4px;">🏷️ ${escapeHtml(promoInfo.promotionName)}</span>`;
            }
            
            const variantHtml = item.variantName ? `<span style="font-size:12px;color:#888;display:block;">🎨 ${escapeHtml(item.variantName)}</span>` : '';
            html += `
                <tr>
                    <td><strong>${escapeHtml(item.name)}</strong>${variantHtml}${referenceDisplay}${promoBadge}</td>
                    <td>${escapeHtml(item.barcode)}</td>
                    <td>${unitDisplay}</td>
                    <td>${hasDiscount ? `<span class="original-price">${item.price.toFixed(2)}</span><span class="price-with-discount">${effectivePrice.toFixed(2)}</span>` : `${item.price.toFixed(2)}`}</td>
                    <td><input type="number" class="reduced-price-input ${hasDiscount ? 'has-discount' : ''}" data-index="${index}" value="${item.reducedPrice !== null ? item.reducedPrice : ''}" placeholder="${t('price')}" step="${step}" min="0"></td>
                    <td>
                        <div class="qty-controls">
                            <button class="btn-qty" data-index="${index}" data-delta="${(item.unit === 'mètre' || settings.allowDecimals === true) ? '-0.1' : '-1'}">−</button>
                            <input type="number" class="qty-input" data-index="${index}" data-target="main" value="${item.qty}" step="${step}" min="0" style="
                                width: 55px;
                                padding: 4px 6px;
                                border: 2px solid #e0e0e0;
                                border-radius: 6px;
                                text-align: center;
                                font-size: 14px;
                                font-weight: 600;
                                font-family: var(--font-family);
                                background: white;
                                transition: var(--transition);
                            ">
                            <button class="btn-qty" data-index="${index}" data-delta="${(item.unit === 'mètre' || settings.allowDecimals === true) ? '0.1' : '1'}">+</button>
                        </div>
                    </td>
                    <td>${subtotal.toFixed(2)}</td>
                    <td><button class="btn-delete-row" data-index="${index}">✕</button></td>
                </tr>`;
        });
        DOM.cartBody.innerHTML = html;
    }

    const quickBody = document.getElementById('quick-cart-table-body');
    if (quickBody) {
        if (quickCart.length === 0) {
            quickBody.innerHTML = '<tr><td colspan="8" class="empty-cart-msg">' + t('quickCartEmpty') + '</td></tr>';
        } else {
            let html = '';
            quickCart.forEach((item, index) => {
                const effectivePrice = item.reducedPrice !== null && item.reducedPrice < item.price ? item.reducedPrice : item.price;
                const subtotal = effectivePrice * item.qty;
                const hasDiscount = item.reducedPrice !== null && item.reducedPrice < item.price;
                const referenceDisplay = item.reference ? `<span style="font-size:11px; color:#999; display:block;">${escapeHtml(item.reference)}</span>` : '';
                const unitDisplay = item.unit === 'mètre' ? 'm' : (item.unit || 'pièce');
                const step = (item.unit === 'mètre' || settings.allowDecimals === true) ? '0.1' : '1';
                
                const variantHtml = item.variantName ? `<span style="font-size:12px;color:#888;display:block;">🎨 ${escapeHtml(item.variantName)}</span>` : '';
                html += `
                    <tr>
                        <td><strong>${escapeHtml(item.name)}</strong>${variantHtml}${referenceDisplay}</td>
                        <td>${escapeHtml(item.barcode)}</td>
                        <td>${unitDisplay}</td>
                        <td>${hasDiscount ? `<span class="original-price">${item.price.toFixed(2)}</span><span class="price-with-discount">${effectivePrice.toFixed(2)}</span>` : `${item.price.toFixed(2)}`}</td>
                        <td><input type="number" class="reduced-price-input quick-reduced-price-input ${hasDiscount ? 'has-discount' : ''}" data-index="${index}" data-target="quick" value="${item.reducedPrice !== null ? item.reducedPrice : ''}" placeholder="${t('price')}" step="${step}" min="0"></td>
                        <td>
                            <div class="qty-controls">
                                <button class="btn-qty" data-index="${index}" data-delta="${(item.unit === 'mètre' || settings.allowDecimals === true) ? '-0.1' : '-1'}" data-target="quick">−</button>
                                <input type="number" class="qty-input" data-index="${index}" data-target="quick" value="${item.qty}" step="${step}" min="0" style="
                                    width: 55px;
                                    padding: 4px 6px;
                                    border: 2px solid #e0e0e0;
                                    border-radius: 6px;
                                    text-align: center;
                                    font-size: 14px;
                                    font-weight: 600;
                                    font-family: var(--font-family);
                                    background: white;
                                    transition: var(--transition);
                                ">
                                <button class="btn-qty" data-index="${index}" data-delta="${(item.unit === 'mètre' || settings.allowDecimals === true) ? '0.1' : '1'}" data-target="quick">+</button>
                            </div>
                        </td>
                        <td>${subtotal.toFixed(2)}</td>
                        <td><button class="btn-delete-row" data-index="${index}" data-target="quick">✕</button></td>
                    </tr>`;
            });
            quickBody.innerHTML = html;
        }
    }

    // ============================================================
    // EVENT LISTENERS FOR QUANTITY BUTTONS
    // ============================================================
    document.querySelectorAll('.btn-qty').forEach(btn => {
        // Remove any existing listeners by cloning and replacing
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            const delta = parseFloat(this.dataset.delta);
            updateCartQty(index, delta, this.dataset.target === 'quick' ? 'quick' : 'main');
        });
    });

    // ============================================================
    // EVENT LISTENERS FOR QUANTITY INPUTS (Direct editing)
    // ============================================================
    document.querySelectorAll('.qty-input').forEach(input => {
        // Remove any existing listeners by cloning and replacing
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        
        newInput.addEventListener('change', function() {
            const index = parseInt(this.dataset.index);
            const target = this.dataset.target === 'quick' ? 'quick' : 'main';
            const value = this.value;
            setCartQty(index, value, target);
        });
        
        newInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.blur();
            }
        });
        
        // Handle focus to select all text for easy editing
        newInput.addEventListener('focus', function() {
            this.select();
        });
    });

    // ============================================================
    // EVENT LISTENERS FOR DELETE BUTTONS
    // ============================================================
    document.querySelectorAll('.btn-delete-row').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', function() {
            const index = parseInt(this.dataset.index);
            removeFromCart(index, this.dataset.target === 'quick' ? 'quick' : 'main');
        });
    });

    // ============================================================
    // EVENT LISTENERS FOR REDUCED PRICE INPUTS
    // ============================================================
    document.querySelectorAll('.reduced-price-input').forEach(input => {
        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);
        
        newInput.addEventListener('change', function() {
            const index = parseInt(this.dataset.index);
            const value = parseFloat(this.value);
            const target = this.dataset.target === 'quick' ? 'quick' : 'main';
            if (isNaN(value) || value < 0) {
                this.value = '';
                updateReducedPrice(index, null, target);
            } else {
                updateReducedPrice(index, value, target);
            }
        });
        
        newInput.addEventListener('input', function() {
            const index = parseInt(this.dataset.index);
            const value = parseFloat(this.value);
            const target = this.dataset.target === 'quick' ? 'quick' : 'main';
            const cart = target === 'quick' ? window.quickCart : window.cart;
            if (!isNaN(value) && value >= 0) {
                const item = cart[index];
                if (item && value < item.price) {
                    this.classList.add('has-discount');
                } else {
                    this.classList.remove('has-discount');
                }
            } else {
                this.classList.remove('has-discount');
            }
        });
    });

    // Update totals
    const mainTotals = calculateTotals('main');
    const quickTotals = calculateTotals('quick');
    if (DOM.checkoutSubtotal) DOM.checkoutSubtotal.textContent = `${mainTotals.subtotal.toFixed(2)} ${settings.currency}`;

    // Show discount row
    var discountRow = document.getElementById('checkout-discount-row');
    if (discountRow) {
        if (mainTotals.discount > 0) {
            discountRow.style.display = 'flex';
            discountRow.querySelector('.value').textContent = `-${mainTotals.discount.toFixed(2)} ${settings.currency}`;
        } else {
            discountRow.style.display = 'none';
        }
    }

    if (DOM.checkoutGrandtotal) DOM.checkoutGrandtotal.textContent = `${mainTotals.grandTotal.toFixed(2)} ${settings.currency}`;
    if (DOM.cartCount) DOM.cartCount.textContent = `${mainCart.length + quickCart.length}`;
    const mainTotalEl = document.getElementById('main-cart-total');
    if (mainTotalEl) mainTotalEl.textContent = `${mainTotals.grandTotal.toFixed(2)} ${settings.currency}`;
    const quickTotalEl = document.getElementById('quick-cart-total');
    if (quickTotalEl) quickTotalEl.textContent = `${quickTotals.grandTotal.toFixed(2)} ${settings.currency}`;
    updateRemainingAmount();
}

function updateRemainingAmount() {
    if (!DOM.checkoutGrandtotal || !DOM.amountPaidInput || !DOM.remainingAmount) return;
    const totalText = DOM.checkoutGrandtotal.textContent || '0';
    const total = parseFloat(totalText) || 0;
    const paid = parseFloat(DOM.amountPaidInput.value) || 0;
    const remaining = Math.max(0, total - paid);
    DOM.remainingAmount.textContent = `${remaining.toFixed(2)} ${settings.currency}`;
    if (remaining === 0) {
        DOM.remainingAmount.style.color = 'var(--success)';
    } else if (remaining > 0) {
        DOM.remainingAmount.style.color = 'var(--danger)';
    }
}
