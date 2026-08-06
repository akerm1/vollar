
// ============================================================
// PAY DEBT BUTTON
// ============================================================
function setupPayDebtButton() {
    if (!DOM.btnPayDebt) return;

    DOM.btnPayDebt.addEventListener('click', async function() {
        const customerId = parseInt(this.dataset.customerId);
        if (!customerId) {
            showToast(t('noClientSelected'), 'error');
            return;
        }
        
        const checkboxes = document.querySelectorAll('.debt-checkbox:checked');
        if (checkboxes.length > 0) {
            await window._customer.paySelected(customerId);
        } else {
            await window._customer.payAll(customerId);
        }
    });
}

// ============================================================
// PARTIAL PAYMENT HANDLER
// ============================================================
function setupPartialPayment() {
    const amountInput = DOM.partialPaymentAmount;
    const btnPartial = DOM.btnPartialPayment;
    
    if (amountInput) {
        amountInput.addEventListener('input', function() {
            try {
                updatePartialPaymentRemaining();
            } catch (e) {
                console.log('⚠️ updatePartialPaymentRemaining not available yet');
            }
        });
        
        amountInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const btn = DOM.btnPartialPayment;
                if (btn) btn.click();
            }
        });
    }
    
    if (btnPartial) {
        btnPartial.addEventListener('click', function() {
            const customerId = viewingCustomerId;
            if (!customerId) {
                showToast(t('noClientSelected'), 'error');
                return;
            }
            window._customer.partialPay(customerId);
        });
    }
}

// ============================================================
// CUSTOMER MODAL CLOSE
// ============================================================
function setupCustomerModalClose() {
    if (DOM.btnCloseCustomerModal) {
        DOM.btnCloseCustomerModal.addEventListener('click', function() {
            if (DOM.customerDetailModal) DOM.customerDetailModal.classList.remove('active');
        });
    }

    if (DOM.customerDetailModal) {
        DOM.customerDetailModal.addEventListener('click', function(e) {
            if (e.target === this) {
                DOM.customerDetailModal.classList.remove('active');
            }
        });
    }
}
