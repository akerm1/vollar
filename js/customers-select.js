
// ============================================================
// POPULATE CUSTOMER SELECT
// ============================================================
function populateCustomerSelect() {
    if (!DOM.customerSelect) {
        console.log('⚠️ Customer select element not found');
        return;
    }
    
    console.log('🔄 Populating customer select with', customers.length, 'customers');
    
    const currentValue = DOM.customerSelect.value;
    
    DOM.customerSelect.innerHTML = '<option value="">' + t('regularCustomerProfile') + '</option>';
    
    if (!customers || customers.length === 0) {
        console.log('ℹ️ No customers to populate');
        return;
    }
    
    const sorted = [...customers].sort((a, b) => a.name.localeCompare(b.name));
    
    sorted.forEach(c => {
        const option = document.createElement('option');
        option.value = c.id;
        const totalDebt = c.debts ? c.debts.reduce((sum, d) => sum + d.remainingAmount, 0) : 0;
        const debtInfo = totalDebt > 0 ? ` 🔴 (${totalDebt.toFixed(2)} ${settings.currency})` : '';
        option.textContent = `${c.name} ${c.phone ? '📱 ' + c.phone : ''}${debtInfo}`;
        DOM.customerSelect.appendChild(option);
    });
    
    if (currentValue) {
        const exists = Array.from(DOM.customerSelect.options).some(opt => opt.value === currentValue);
        if (exists) {
            DOM.customerSelect.value = currentValue;
        }
    }
    
    console.log('✅ Customer select populated with', sorted.length, 'customers');
}

function updateCheckoutCustomerDisplay() {
    if (!DOM.checkoutCustomerName) return;
    const selectedId = DOM.customerSelect && DOM.customerSelect.value ? parseInt(DOM.customerSelect.value) : null;
    if (selectedId) {
        const customer = customers.find(c => c.id === selectedId);
        DOM.checkoutCustomerName.textContent = customer ? customer.name : t('regularCustomerShort');
    } else {
        DOM.checkoutCustomerName.textContent = t('regularCustomerShort');
    }
}

// ============================================================
// SETUP CUSTOMER SELECT
// ============================================================
function setupCustomerSelect() {
    console.log('🔧 Setting up customer select...');
    
    if (!DOM.customerSelect) {
        console.log('⚠️ Customer select not found');
        return;
    }
    
    const newSelect = DOM.customerSelect.cloneNode(true);
    DOM.customerSelect.parentNode.replaceChild(newSelect, DOM.customerSelect);
    DOM.customerSelect = newSelect;
    
    populateCustomerSelect();
    
    DOM.customerSelect.addEventListener('change', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const selectedId = parseInt(this.value);
        console.log('📋 Customer selected:', selectedId);
        
        if (selectedId) {
            const customer = customers.find(c => c.id === selectedId);
            if (customer) {
                updateCheckoutCustomerDisplay();
                const totalDebt = customer.debts ? customer.debts.reduce((sum, d) => sum + d.remainingAmount, 0) : 0;
                if (totalDebt > 0) {
                    showToast(t('customerHasDebt', { total: totalDebt.toFixed(2) + ' ' + settings.currency }), 'warning');
                }
            }
        } else {
            updateCheckoutCustomerDisplay();
        }
    });
    
    DOM.customerSelect.addEventListener('mousedown', function(e) {
        e.stopPropagation();
        focusLockEnabled = false;
        setTimeout(() => {
            focusLockEnabled = true;
        }, 300);
    });
    
    DOM.customerSelect.addEventListener('focus', function(e) {
        focusLockEnabled = false;
        formInputActive = true;
    });
    
    DOM.customerSelect.addEventListener('blur', function(e) {
        setTimeout(() => {
            focusLockEnabled = true;
            formInputActive = false;
        }, 300);
    });
    
    console.log('✅ Customer select setup complete');
}
