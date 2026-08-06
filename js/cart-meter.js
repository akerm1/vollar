
// ============================================================
// METER QUANTITY PROMPT - WITH DECIMAL SUPPORT & SOUND
// ============================================================
function showMeterQuantityPrompt(product) {
    // ==========================================
    // PLAY SOUND WHEN METER PROMPT APPEARS
    // ==========================================
    if (typeof playScan === 'function') {
        playScan();
    }
    
    if (window.meterPromptActive) {
        closeMeterPrompt();
    }
    
    const existingPrompt = document.getElementById('meter-quantity-prompt');
    if (existingPrompt) existingPrompt.remove();

    window.meterPromptActive = true;
    window.meterPendingProduct = product;

    const overlay = document.createElement('div');
    overlay.id = 'meter-quantity-prompt';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 99999;
        display: flex;
        justify-content: center;
        align-items: center;
        backdrop-filter: blur(4px);
    `;

    const promptBox = document.createElement('div');
    promptBox.style.cssText = `
        background: white;
        border-radius: 16px;
        padding: 32px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        text-align: center;
        animation: slideUp 0.3s ease-out;
    `;

    promptBox.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 12px;">📏</div>
        <h3 style="color: var(--primary); font-size: 20px; margin-bottom: 8px;">${escapeHtml(product.name)}</h3>
        <p style="color: #666; font-size: 14px; margin-bottom: 16px;">${t('enterMeterQty')}</p>
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 16px;">
            <input type="text" id="meter-quantity-input" 
                   inputmode="decimal"
                   style="width: 150px; padding: 12px 16px; border: 2px solid #e0e0e0; border-radius: 10px; font-size: 24px; text-align: center; font-family: var(--font-family);"
                   placeholder="0"
                   autofocus>
            <span style="font-size: 20px; font-weight: 600; color: #555;">m</span>
        </div>
        <div style="display: flex; gap: 10px;">
            <button id="meter-confirm-btn" style="flex: 2; padding: 12px 24px; background: var(--primary-gradient); color: white; border: none; border-radius: 10px; font-weight: 600; font-size: 16px; cursor: pointer; transition: var(--transition);">
               ${t('confirmQty')}
            </button>
            <button id="meter-cancel-btn" style="flex: 1; padding: 12px 24px; background: #e0e0e0; color: #555; border: none; border-radius: 10px; font-weight: 600; font-size: 16px; cursor: pointer; transition: var(--transition);">
               ${t('cancel')}
            </button>
        </div>
        <div style="margin-top: 12px; font-size: 12px; color: #999;">
           ${t('stockAvailable', { stock: product.stock })}
        </div>
        <div style="margin-top: 8px; font-size: 11px; color: #bbb;">
           ${t('decimalHint')}
        </div>
    `;

    overlay.appendChild(promptBox);
    document.body.appendChild(overlay);

    const input = document.getElementById('meter-quantity-input');
    if (input) {
        setTimeout(() => {
            input.focus();
            input.select();
        }, 150);
        
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmMeterQuantity();
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                closeMeterPrompt();
                showToast(t('cancelled'), 'info');
            }
        });
    }

    // ==========================================
    // GLOBAL KEYBOARD INTERCEPTION
    // ==========================================
    let scanBuffer = '';
    let scanTimer = null;
    let keyTimes = [];
    let isDecimalEntered = false;
    
    const globalKeyHandler = function(e) {
        if (!window.meterPromptActive) return;
        
        const input = document.getElementById('meter-quantity-input');
        if (!input) return;
        
        const now = Date.now();
        
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            confirmMeterQuantity();
            return;
        }
        
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            closeMeterPrompt();
            showToast(t('cancelled'), 'info');
            return;
        }
        
        if (e.key === 'Backspace') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            const currentValue = input.value;
            if (currentValue.length > 0) {
                if (currentValue.charAt(currentValue.length - 1) === '.') {
                    isDecimalEntered = false;
                }
                input.value = currentValue.slice(0, -1);
            }
            return;
        }
        
        if (e.key === 'Delete') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return;
        }
        
        if (e.key.length === 1) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            keyTimes.push(now);
            if (keyTimes.length > 5) keyTimes.shift();
            
            if (keyTimes.length >= 3) {
                const timeSpan = keyTimes[keyTimes.length - 1] - keyTimes[0];
                if (timeSpan < 100) {
                    scanBuffer += e.key;
                    
                    if (scanTimer) clearTimeout(scanTimer);
                    scanTimer = setTimeout(() => {
                        if (scanBuffer.length > 2) {
                            const scannedBarcode = scanBuffer;
                            scanBuffer = '';
                            keyTimes = [];
                            saveMeterItemAndProcessScan(scannedBarcode);
                        }
                    }, 150);
                    return;
                }
            }
            
            const char = e.key;
            
            if (/[\d]/.test(char)) {
                input.value += char;
            } else if (char === '.' || char === ',') {
                if (!isDecimalEntered) {
                    if (input.value === '' || input.value === '0') {
                        input.value = '0.';
                    } else {
                        input.value += '.';
                    }
                    isDecimalEntered = true;
                }
            } else {
                scanBuffer += char;
                
                if (scanTimer) clearTimeout(scanTimer);
                scanTimer = setTimeout(() => {
                    if (scanBuffer.length > 2) {
                        const scannedBarcode = scanBuffer;
                        scanBuffer = '';
                        keyTimes = [];
                        saveMeterItemAndProcessScan(scannedBarcode);
                    } else {
                        scanBuffer = '';
                    }
                }, 150);
            }
        }
    };
    
    document.addEventListener('keydown', globalKeyHandler, true);
    window._meterKeyHandler = globalKeyHandler;

    document.getElementById('meter-confirm-btn')?.addEventListener('click', confirmMeterQuantity);
    document.getElementById('meter-cancel-btn')?.addEventListener('click', function() {
        closeMeterPrompt();
        showToast(t('cancelled'), 'info');
    });

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            closeMeterPrompt();
            showToast(t('cancelled'), 'info');
        }
    });
}

// ============================================================
// CONFIRM METER QUANTITY
// ============================================================
function confirmMeterQuantity() {
    const input = document.getElementById('meter-quantity-input');
    let value = input?.value || '0';
    
    value = value.replace(',', '.');
    const qty = parseFloat(value);
    
    if (isNaN(qty) || qty <= 0) {
        showToast(t('invalidQuantity'), 'warning');
        playError();
        if (input) {
            input.value = '';
            input.focus();
            input.select();
        }
        return;
    }
    
    if (window.meterPendingProduct && qty > window.meterPendingProduct.stock) {
        showToast(t('insufficientStock', { name: window.meterPendingProduct.name, stock: window.meterPendingProduct.stock }), 'error');
        playError();
        if (input) {
            input.focus();
            input.select();
        }
        return;
    }
    
    if (window.meterPendingProduct) {
        const product = window.meterPendingProduct;
        closeMeterPrompt();
        addToCartWithQuantity(product, qty);
    }
}

// ============================================================
// SAVE METER ITEM AND PROCESS NEW SCAN
// ============================================================
function saveMeterItemAndProcessScan(scannedBarcode) {
    const meterInput = document.getElementById('meter-quantity-input');
    let qty = 0;
    if (meterInput) {
        let value = meterInput.value;
        value = value.replace(',', '.');
        const inputValue = parseFloat(value);
        if (!isNaN(inputValue) && inputValue > 0) {
            qty = inputValue;
        }
    }
    
    if (window.meterPendingProduct) {
        if (qty > 0) {
            addToCartWithQuantity(window.meterPendingProduct, qty);
        } else {
            closeMeterPrompt();
            setTimeout(() => {
                if (typeof window.processCompleteBarcodeInternal === 'function') {
                    window.processCompleteBarcodeInternal(scannedBarcode);
                }
            }, 100);
            return;
        }
    }
    
    closeMeterPrompt();
    
    setTimeout(() => {
        if (typeof window.processCompleteBarcodeInternal === 'function') {
            window.processCompleteBarcodeInternal(scannedBarcode);
        } else if (typeof window.handleCheckoutScan === 'function') {
            window.handleCheckoutScan(scannedBarcode);
        }
    }, 100);
}

// ============================================================
// CLOSE METER PROMPT
// ============================================================
function closeMeterPrompt() {
    if (window._meterKeyHandler) {
        document.removeEventListener('keydown', window._meterKeyHandler, true);
        window._meterKeyHandler = null;
    }
    
    const prompt = document.getElementById('meter-quantity-prompt');
    if (prompt) {
        prompt.remove();
    }
    window.meterPromptActive = false;
    window.meterPendingProduct = null;
    
    setTimeout(() => {
        if (!formInputActive) {
            lockFocus();
        }
    }, 200);
}
