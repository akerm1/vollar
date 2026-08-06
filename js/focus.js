// ============================================================
// FOCUS: Focus Management
// ============================================================
function lockFocus() {
    const activeEl = document.activeElement;
    if (activeEl && activeEl.tagName === 'SELECT') {
        return;
    }
    
    if (!focusLockEnabled) return;
    if (formInputActive) return;
    if (!DOM.scannerInput) return;
    
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
        return;
    }
    
    if (activeEl && activeEl.id === 'manual-barcode') {
        return;
    }
    
    if (activeEl && activeEl.closest && activeEl.closest('#barcode-suggestions')) {
        return;
    }
    
    if (document.activeElement !== DOM.scannerInput) {
        DOM.scannerInput.focus();
    }
}

function setupFocusManagement() {
    document.addEventListener('click', function(e) {
        const target = e.target;
        if (target.tagName === 'SELECT' || target.closest('select')) {
            return;
        }
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') {
            return;
        }
        if (target.closest && target.closest('#barcode-suggestions')) {
            return;
        }
        lockFocus();
    });

    document.addEventListener('mousedown', function(e) {
        const target = e.target;
        if (target.tagName === 'SELECT' || target.closest('select')) {
            focusLockEnabled = false;
            formInputActive = true;
            return;
        }
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
            focusLockEnabled = false;
            formInputActive = true;
            setTimeout(() => {
                focusLockEnabled = true;
                formInputActive = false;
            }, 300);
            return;
        }
    });

    // Only lock focus when no input/textarea/select is focused
    setInterval(() => {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
            return;
        }
        // Don't steal focus if manual-barcode has content (user is searching)
        const manualInput = document.getElementById('manual-barcode');
        if (manualInput && manualInput.value.length > 0) {
            return;
        }
        lockFocus();
    }, 3000);

    document.addEventListener('focusin', function(e) {
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
            if (target.id === 'scanner-receiver') return;
            if (target.id === 'manual-barcode') return;
            focusLockEnabled = false;
            formInputActive = true;
        }
    });

    document.addEventListener('focusout', function(e) {
        const target = e.target;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
            if (target.id === 'scanner-receiver') return;
            if (target.id === 'manual-barcode') return;
            const delay = target.tagName === 'SELECT' ? 800 : 300;
            setTimeout(() => {
                const nowActive = document.activeElement;
                if (nowActive && (nowActive.tagName === 'SELECT' || nowActive.tagName === 'INPUT' || nowActive.tagName === 'TEXTAREA')) {
                    return;
                }
                focusLockEnabled = true;
                formInputActive = false;
            }, delay);
        }
    });
}
