// ============================================================
// KEYBOARD: Global Keyboard Shortcuts
// ============================================================
function setupKeyboardShortcuts() {
    // ============================================================
    // TAB KEY - Focus on reduced price of last item
    // ============================================================
    document.addEventListener('keydown', function(e) {
        // Check for Tab key
        if (e.key === 'Tab' || e.keyCode === 9 || e.which === 9) {
            // Get the active element
            const activeEl = document.activeElement;
            const tag = activeEl ? activeEl.tagName : '';
            const id = activeEl ? activeEl.id : '';
            
            // Check if we're in an input field (except scanner receiver)
            const isInput = (tag === 'INPUT' || tag === 'TEXTAREA' || (activeEl && activeEl.isContentEditable));
            const isScannerInput = id === 'scanner-receiver' || id === 'manual-barcode';
            
            // Only intercept Tab when NOT in an input field
            if (isInput && !isScannerInput) {
                // Let Tab work normally in input fields
                return;
            }
            
            // Only trigger in checkout view
            if (currentView !== 'checkout') {
                return;
            }
            
            // Check if cart has items
            if (window.cart && window.cart.length > 0) {
                // Prevent default Tab behavior
                e.preventDefault();
                e.stopPropagation();
                
                // Focus on the reduced price input of the last item
                const reducedInputs = document.querySelectorAll('.reduced-price-input');
                if (reducedInputs.length > 0) {
                    // Get the last input (which corresponds to the last item)
                    const lastInput = reducedInputs[reducedInputs.length - 1];
                    lastInput.focus();
                    lastInput.select();
                    
                    // Get the item name for feedback
                    const lastItem = window.cart[window.cart.length - 1];
                    showToast(t('editReducedPriceFor', {name: lastItem.name}), 'info');
                    
                    if (typeof playScan === 'function') {
                        playScan();
                    }
                    
                    console.log(`📝 Focused on reduced price for: ${lastItem.name}`);
                }
            } else {
                // Cart is empty - show notification
                showToast(t('cartEmptyAddFirst'), 'info');
                if (typeof playError === 'function') {
                    playError();
                }
            }
        }
    }, true); // Use capture phase

    // ============================================================
    // DELETE KEY - Remove last item from cart
    // ============================================================
    document.addEventListener('keydown', function(e) {
        // Check for Delete key
        if (e.key === 'Delete' || e.keyCode === 46 || e.which === 46) {
            console.log('🗑️ Delete key detected');
            
            // Get the active element
            const activeEl = document.activeElement;
            const tag = activeEl ? activeEl.tagName : '';
            const id = activeEl ? activeEl.id : '';
            
            console.log('Active element:', tag, id);
            
            // Check if we're in an input field (except scanner receiver)
            const isInput = (tag === 'INPUT' || tag === 'TEXTAREA' || (activeEl && activeEl.isContentEditable));
            const isScannerInput = id === 'scanner-receiver' || id === 'manual-barcode';
            
            // If we're in a regular input field, let Delete work normally
            if (isInput && !isScannerInput) {
                console.log('In input field, letting Delete work normally');
                return;
            }
            
            // Only trigger in checkout view
            if (currentView !== 'checkout') {
                console.log('Not in checkout view');
                return;
            }
            
            // Check if cart has items
            if (window.cart && window.cart.length > 0) {
                // Prevent default delete behavior
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                
                // Get the last item
                const lastItem = window.cart[window.cart.length - 1];
                const itemName = lastItem.name;
                const itemQty = lastItem.qty;
                
                // Remove the last item from cart
                window.cart.pop();
                renderCart();
                
                // Show feedback
                const unitDisplay = lastItem.unit === 'mètre' ? 'm' : '';
                showToast(t('itemRemoved', {qty: itemQty, unit: unitDisplay, name: itemName}), 'warning');
                
                // Play a sound effect
                if (typeof playError === 'function') {
                    playError();
                }
                
                console.log(`🗑️ Removed last item: ${itemQty} ${itemName} (${lastItem.barcode})`);
                console.log(`Cart now has ${window.cart.length} items`);
            } else {
                // Cart is empty - show notification
                e.preventDefault();
                e.stopPropagation();
                showToast(t('cartAlreadyEmpty'), 'info');
                if (typeof playError === 'function') {
                    playError();
                }
                console.log('Cart is empty');
            }
        }
    }, true); // Use capture phase

    // ============================================================
    // SPACE BAR - Complete transaction and start new one
    // Also handles quick customer mode hiding
    // ============================================================
    document.addEventListener('keydown', async function(e) {
        const isSpace = (e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space');
        if (!isSpace) return;

        const activeEl = document.activeElement;
        const id = activeEl ? activeEl.id : '';
        const tag = activeEl ? activeEl.tagName : '';

        const isRealInput = (tag === 'INPUT' || tag === 'TEXTAREA' || (activeEl && activeEl.isContentEditable))
                            && id !== 'scanner-receiver';

        if (isRealInput) {
            if (!(id === 'manual-barcode' && activeEl.value.length === 0)) {
                return;
            }
        }

        e.preventDefault();
        e.stopPropagation();

        console.log('🔄 Space bar pressed - active element:', id || tag);

        if (currentView === 'checkout') {
            // ==========================================
            // CHECK FOR QUICK CUSTOMER MODE FIRST
            // ==========================================
            if (window.quickCustomerMode && window.quickCart && window.quickCart.length > 0) {
                console.log('⚡ Quick customer mode - completing sale and hiding panel...');
                completeQuickCustomerSale();
                // The completeQuickCustomerSale function handles hiding the panel
                return;
            }
            
            // If quick mode is active but cart is empty, just hide it
            if (window.quickCustomerMode && (!window.quickCart || window.quickCart.length === 0)) {
                console.log('⚡ Quick customer mode - empty cart, hiding panel...');
                window.quickCustomerMode = false;
                window.quickCustomerActive = false;
                const btn = document.getElementById('btn-quick-customer-mode');
                if (btn) {
                    btn.textContent = t('quickClientLabel');
                    btn.classList.remove('btn-warning');
                    btn.classList.add('btn-secondary');
                }
                updateQuickCustomerLayout();
                renderCart();
                showToast(t('quickClientOff'), 'info');
                return;
            }
            
            // Normal transaction
            if (window.cart && window.cart.length > 0) {
                console.log('✅ Completing transaction...');
                const completed = await completeTransaction();
                if (completed !== false) {
                    setTimeout(() => { resetForNewTransaction(); }, 800);
                }
            } else {
                console.log('🔄 Cart empty, resetting...');
                resetForNewTransaction();
                showToast(t('newTransaction'), 'info');
            }
        }
    }, true);

    // ============================================================
    // PAGE UP KEY - Open/close fast client panel
    // ============================================================
    document.addEventListener('keydown', function(e) {
        if (e.key !== 'PageUp') return;

        const activeEl = document.activeElement;
        const tag = activeEl ? activeEl.tagName : '';
        const isInput = (tag === 'INPUT' || tag === 'TEXTAREA' || (activeEl && activeEl.isContentEditable));
        const isScannerInput = activeEl && (activeEl.id === 'scanner-receiver' || activeEl.id === 'manual-barcode');

        if (isInput && !isScannerInput) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        console.log('⚡ Page Up pressed - toggling fast client panel');

        if (currentView !== 'checkout') {
            showToast(t('usePageUpInCheckout'), 'info');
            return;
        }

        const btn = document.getElementById('btn-quick-customer-mode');
        if (window.quickCustomerMode) {
            window.quickCustomerMode = false;
            window.quickCustomerActive = false;
            if (btn) {
                btn.textContent = t('quickClientLabel');
                btn.classList.remove('btn-warning');
                btn.classList.add('btn-secondary');
            }
            updateQuickCustomerLayout();
            renderCart();
            showToast(t('quickClientOff'), 'info');
        } else {
            window.quickCustomerMode = true;
            window.quickCustomerActive = true;
            window.quickCustomerSnapshot = {
                mainCart: JSON.parse(JSON.stringify(window.cart)),
                quickCart: JSON.parse(JSON.stringify(window.quickCart)),
                customer: DOM.customerSelect ? DOM.customerSelect.value : ''
            };
            if (btn) {
                btn.textContent = t('quickClientOnLabel');
                btn.classList.add('btn-warning');
                btn.classList.remove('btn-secondary');
            }
            updateQuickCustomerLayout();
            renderCart();
            showToast(t('quickClientOn'), 'info');
        }
    }, true);

    // ============================================================
    // PAGE DOWN KEY - PRINT COMMAND
    // ============================================================
    document.addEventListener('keydown', function(e) {
        if (e.key === 'PageDown') {
            const activeEl = document.activeElement;
            const tag = activeEl ? activeEl.tagName : '';
            const isInput = (tag === 'INPUT' || tag === 'TEXTAREA' || (activeEl && activeEl.isContentEditable));

            const isScannerInput = activeEl && (activeEl.id === 'scanner-receiver' || activeEl.id === 'manual-barcode');

            if (isInput && !isScannerInput) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            console.log('📄 Page Down pressed - Print command triggered');

            if (currentView === 'checkout') {
                if (window.cart && window.cart.length > 0) {
                    if (typeof window.printCart === 'function') {
                        console.log('🖨️ Printing via Page Down...');
                        window.printCart();
                        showToast(t('printing'), 'info');
                    } else {
                        console.warn('🖨️ printCart not available');
                        showToast(t('printFunctionUnavailable'), 'error');
                        if (typeof playError === 'function') playError();
                    }
                } else {
                    showToast(t('cartEmptyAddFirst'), 'error');
                    if (typeof playError === 'function') playError();
                }
            } else {
                showToast(t('usePageDownInCheckout'), 'info');
            }
        }
    }, true);
    // Ctrl+M - Focus manual barcode
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'm') {
            e.preventDefault();
            const manualInput = DOM.manualBarcode;
            if (manualInput) {
                manualInput.focus();
                manualInput.select();
                showToast(t('enterBarcodeManually'), 'info');
                playScan();
            }
        }
    });

    // Ctrl+Shift+R - Focus reduced price of last item (alternative shortcut)
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && (e.key === 'r' || e.key === 'R')) {
            e.preventDefault();
            
            if (currentView === 'checkout' && window.cart && window.cart.length > 0) {
                const reducedInputs = document.querySelectorAll('.reduced-price-input');
                if (reducedInputs.length > 0) {
                    const lastInput = reducedInputs[reducedInputs.length - 1];
                    lastInput.focus();
                    lastInput.select();
                    
                    const lastItem = window.cart[window.cart.length - 1];
                    showToast(t('reducedPriceFor', {name: lastItem.name}), 'info');
                    
                    if (typeof playScan === 'function') {
                        playScan();
                    }
                }
            }
        }
    });

    // ============================================================
    // ENTER KEY - REMOVED from keyboard.js to let scanner.js handle it
    // ============================================================
    // The Enter key is now handled EXCLUSIVELY by scanner.js
    // to avoid conflicts with the manual barcode input

    // Ctrl shortcuts for navigation
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'i') { e.preventDefault(); switchView('inventory'); }
        if (e.ctrlKey && e.key === 'c') { e.preventDefault(); switchView('checkout'); }
        if (e.ctrlKey && e.key === 'a') { e.preventDefault(); switchView('analytics'); }
        if (e.ctrlKey && e.key === 's') { e.preventDefault(); switchView('settings'); }
        if (e.ctrlKey && e.key === 'u') { e.preventDefault(); switchView('customers'); }
        if (e.ctrlKey && e.shiftKey && e.key === 'F') { e.preventDefault(); switchView('suppliers'); }
        if (e.ctrlKey && e.shiftKey && e.key === 'U') { e.preventDefault(); switchView('users'); }
        if (e.ctrlKey && e.shiftKey && e.key === 'R') {
            e.preventDefault();
            resetScanner();
            showToast(t('scannerReset'), 'info');
        }
    });

    // Prevent space from triggering button clicks
    document.addEventListener('keyup', function(e) {
        if (e.key === ' ' || e.key === 'Spacebar' || e.code === 'Space') {
            const activeEl = document.activeElement;
            if (activeEl && activeEl.tagName === 'BUTTON') {
                e.preventDefault();
                e.stopPropagation();
            }
        }
    });
}

function resetForNewTransaction() {
    console.log('🔄 Resetting for new transaction...');

    window.cart = [];
    renderCart();
    customerAskShown = false;

    paymentStatus = 'paid';
    resetPaymentButtons();

    if (DOM.amountPaidInput) DOM.amountPaidInput.value = '0';
    if (DOM.customerSelect) DOM.customerSelect.value = '';
    if (DOM.checkoutCustomerName) DOM.checkoutCustomerName.textContent = t('regularCustomer');
    window.quickCart = [];
    window.quickCustomerMode = false;
    window.quickCustomerActive = false;
    window.quickCustomerSnapshot = null;
    const quickBtn = document.getElementById('btn-quick-customer-mode');
    if (quickBtn) {
        quickBtn.textContent = t('quickClientLabel');
        quickBtn.classList.remove('btn-warning');
        quickBtn.classList.add('btn-secondary');
    }
    updateQuickCustomerLayout();

    const manualInput = DOM.manualBarcode;
    if (manualInput) manualInput.value = '';

    resetScanner();
    showTransactionResetIndicator();
    setTimeout(lockFocus, 100);
}

function showTransactionResetIndicator() {
    const existing = document.getElementById('space-indicator');
    if (existing) existing.remove();

    const indicator = document.createElement('div');
    indicator.id = 'space-indicator';
    indicator.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(46, 204, 113, 0.95);
        color: white;
        padding: 10px 24px;
        border-radius: 30px;
        font-size: 16px;
        font-weight: 700;
        z-index: 99999;
        box-shadow: 0 4px 30px rgba(46, 204, 113, 0.4);
        animation: fadeInOut 2s ease-in-out;
        pointer-events: none;
        font-family: var(--font-family);
        border: 2px solid rgba(255,255,255,0.2);
    `;
    indicator.textContent = t('newTransaction');
    document.body.appendChild(indicator);

    setTimeout(() => {
        if (indicator.parentNode) {
            indicator.style.opacity = '0';
            setTimeout(() => { if (indicator.parentNode) indicator.remove(); }, 500);
        }
    }, 2000);
}