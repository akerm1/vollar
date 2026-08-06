// ============================================================
// UTILS: Utility Functions
// ============================================================

// ============================================================
// ESCAPE HTML
// ============================================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================
// TOAST NOTIFICATIONS
// ============================================================
function showToast(message, type = 'info') {
    const container = DOM.toastContainer;
    if (!container) {
        console.log('Toast:', message, type);
        return;
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(40px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ============================================================
// RESET PAYMENT BUTTONS
// ============================================================
function resetPaymentButtons() {
    paymentStatus = 'paid';
    const display = DOM.paymentStatusDisplay;
    if (display) {
        display.textContent = t('paid');
        display.style.color = 'var(--success)';
    }
}

// ============================================================
// UPDATE PAYMENT STATUS DISPLAY
// ============================================================
function updatePaymentStatusDisplay() {
    const display = DOM.paymentStatusDisplay;
    if (display) {
        if (paymentStatus === 'paid') {
            display.textContent = t('paid');
            display.style.color = 'var(--success)';
        } else {
            display.textContent = t('notPaidDisplay');
            display.style.color = 'var(--danger)';
        }
    }
}

// ============================================================
// PARTIAL PAYMENT HELPERS - FIXED
// ============================================================
function updatePartialPaymentRemaining() {
    const amountInput = DOM.partialPaymentAmount;
    const remainingDisplay = DOM.partialPaymentRemaining;
    
    if (!amountInput || !remainingDisplay) {
        console.log('⚠️ Partial payment elements not found');
        return;
    }
    
    const customerId = viewingCustomerId;
    if (!customerId) {
        remainingDisplay.textContent = `0.00 ${settings.currency}`;
        return;
    }
    
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
        remainingDisplay.textContent = `0.00 ${settings.currency}`;
        return;
    }
    
    const totalDebt = customer.debts ? customer.debts.reduce((sum, d) => sum + d.remainingAmount, 0) : 0;
    const paymentAmount = parseFloat(amountInput.value) || 0;
    const remaining = Math.max(0, totalDebt - paymentAmount);
    
    remainingDisplay.textContent = `${remaining.toFixed(2)} ${settings.currency}`;
    
    if (remaining === 0) {
        remainingDisplay.style.color = 'var(--success)';
    } else {
        remainingDisplay.style.color = 'var(--danger)';
    }
}

// ============================================================
// PREVENT FOCUS STEALING ON DROPDOWNS
// ============================================================
function preventFocusStealing(element) {
    if (!element) return;
    
    element.addEventListener('mousedown', function(e) {
        e.stopPropagation();
        focusLockEnabled = false;
        setTimeout(() => {
            focusLockEnabled = true;
        }, 300);
    });
    
    element.addEventListener('focus', function() {
        focusLockEnabled = false;
        formInputActive = true;
    });
    
    element.addEventListener('blur', function() {
        setTimeout(() => {
            focusLockEnabled = true;
            formInputActive = false;
        }, 300);
    });
}