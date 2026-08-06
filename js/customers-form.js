
// ============================================================
// SETUP CUSTOMER FORM
// ============================================================
function setupCustomerForm() {
    if (!DOM.customerForm) return;

    DOM.customerForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const name = DOM.customerName.value.trim();
        const phone = DOM.customerPhone.value.trim();
        const address = DOM.customerAddress.value.trim();

        if (!name) {
            DOM.customerFeedback.textContent = '⚠️ Le nom est requis';
            DOM.customerFeedback.style.color = 'var(--danger)';
            return;
        }

        try {
            const newCustomer = {
                name: name,
                phone: phone || '',
                address: address || '',
                createdAt: new Date().toISOString(),
                debts: []
            };

            const id = await dbPut('customers', newCustomer);
            console.log('✅ Customer saved with ID:', id);
            if (typeof logAudit === 'function') {
                await logAudit('CUSTOMER_CREATED', `Client: ${name}`);
            }
            
            DOM.customerFeedback.textContent = t('customerSaved', { name: name });
            DOM.customerFeedback.style.color = 'var(--success)';
            showToast(t('customerSaved', { name: name }), 'success');
            playSuccess();

            DOM.customerForm.reset();
            await loadCustomers();
            await createAutoBackup();

        } catch (error) {
            console.error('Save customer error:', error);
            DOM.customerFeedback.textContent = t('registrationFailed', { error: error.message });
            DOM.customerFeedback.style.color = 'var(--danger)';
            showToast(t('saveFailed'), 'error');
        }
    });
}

// ============================================================
// SETUP CUSTOMER SEARCH
// ============================================================
function setupCustomerSearch() {
    if (DOM.customerSearch) {
        DOM.customerSearch.addEventListener('input', function() {
            renderCustomersList();
        });
    }
}

// ============================================================
// SETUP NEW CUSTOMER BUTTON
// ============================================================
function setupNewCustomerButton() {
    if (DOM.btnNewCustomer) {
        DOM.btnNewCustomer.addEventListener('click', function() {
            switchView('customers');
            setTimeout(() => {
                if (DOM.customerName) DOM.customerName.focus();
            }, 300);
        });
    }
}

// ============================================================
// SETUP BULK DELETE CUSTOMERS
// ============================================================
function setupBulkDeleteCustomers() {
    if (DOM.btnBulkDeleteCustomers) {
        DOM.btnBulkDeleteCustomers.addEventListener('click', async function() {
            if (typeof requireAdminPin === 'function' && !await requireAdminPin()) return;
            if (confirm(t('deleteAllCustomersConfirm'))) {
                try {
                    const count = customers.length;
                    await dbClear('customers');
                    customers = [];
                    if (typeof logAudit === 'function') {
                        await logAudit('CUSTOMER_BULK_DELETED', `${count} clients supprimés`);
                    }
                    renderCustomersList();
                    populateCustomerSelect();
                    showToast(t('allCustomersDeleted'), 'success');
                    await createAutoBackup();
                } catch (error) {
                    console.error('Bulk delete customers error:', error);
                    showToast(t('deleteFailed'), 'error');
                }
            }
        });
    }
}
