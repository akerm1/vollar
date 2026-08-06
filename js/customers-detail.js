
// ============================================================
// CUSTOMER DETAIL MODAL - UPDATED with delete button
// ============================================================
window._customer = {
    view: async function(id) {
        try {
            console.log('👁️ Viewing customer:', id);
            
            const customer = customers.find(c => c.id === id);
            if (!customer) {
                showToast(t('clientNotFound'), 'error');
                return;
            }
            
            viewingCustomerId = id;
            
            if (DOM.customerDetailName) {
                DOM.customerDetailName.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 32px;">👤</span>
                        <div>
                            <div style="font-size: 22px; font-weight: 700;">${escapeHtml(customer.name)}</div>
                            <div style="font-size: 14px; color: #666; font-weight: 400;">
                        ${customer.phone || t('noPhone')}
                            </div>
                        </div>
                    </div>
                `;
            }
            
            if (DOM.detailPhone) DOM.detailPhone.textContent = customer.phone || '-';
            if (DOM.detailAddress) DOM.detailAddress.textContent = customer.address || '-';
            if (DOM.detailDate) DOM.detailDate.textContent = customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('fr-FR') : '-';

            const totalDebt = customer.debts ? customer.debts.reduce((sum, d) => sum + d.remainingAmount, 0) : 0;
            
            if (DOM.detailTotalDebt) {
                DOM.detailTotalDebt.textContent = `${totalDebt.toFixed(2)} ${settings.currency}`;
                DOM.detailTotalDebt.style.color = totalDebt > 0 ? 'var(--danger)' : 'var(--success)';
            }

            const partialSection = DOM.partialPaymentSection;
            if (partialSection) {
                if (totalDebt > 0) {
                    partialSection.style.display = 'block';
                    const amountInput = DOM.partialPaymentAmount;
                    if (amountInput) {
                        amountInput.value = '';
                        amountInput.max = totalDebt;
                        amountInput.placeholder = `Max: ${totalDebt.toFixed(2)}`;
                    }
                    try {
                        updatePartialPaymentRemaining();
                    } catch (e) {
                        console.log('⚠️ updatePartialPaymentRemaining not available yet');
                    }
                } else {
                    partialSection.style.display = 'none';
                }
            }

            // Render debts table with DELETE button
            if (!customer.debts || customer.debts.length === 0) {
                if (DOM.customerDebtsBody) {
                    DOM.customerDebtsBody.innerHTML = `
                        <tr>
                            <td colspan="8" style="text-align:center; color:#999; padding:30px 0;">
                                <div style="font-size: 48px; margin-bottom: 12px;">✅</div>
                                ${t('noDebt')}
                            </td>
                        </tr>
                    `;
                }
                if (DOM.btnPayDebt) DOM.btnPayDebt.style.display = 'none';
            } else {
                let html = '';
                let hasUnpaid = false;
                
                customer.debts.forEach((debt, index) => {
                    const isUnpaid = debt.remainingAmount > 0;
                    if (isUnpaid) hasUnpaid = true;
                    
                    const debtDate = new Date(debt.date);
                    const dateStr = debtDate.toLocaleDateString('fr-FR') + ' ' + debtDate.toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
                    
                    html += `
                        <tr style="${isUnpaid ? 'background: #fff5f5;' : ''}">
                            <td>
                                ${isUnpaid ? `
                                    <input type="checkbox" class="debt-checkbox" data-index="${index}" style="
                                        width: 18px;
                                        height: 18px;
                                        cursor: pointer;
                                        accent-color: var(--primary);
                                    ">
                                ` : '✅'}
                            </td>
                            <td>${dateStr}</td>
                            <td>${debt.items.map(i => `${escapeHtml(i.name)}×${i.qty}`).join(', ')}</td>
                            <td><strong>${debt.totalAmount.toFixed(2)}</strong></td>
                            <td>${debt.paidAmount.toFixed(2)}</td>
                            <td style="color: ${isUnpaid ? 'var(--danger)' : 'var(--success)'}; font-weight: 700;">
                                ${debt.remainingAmount.toFixed(2)}
                            </td>
                            <td>
                                ${isUnpaid ? t('pending') : t('paidStatus')}
                            </td>
                            <td>
                                <button onclick="event.stopPropagation(); deleteSale(${debt.saleId})" style="
                                    background: none;
                                    border: none;
                                    color: var(--danger);
                                    cursor: pointer;
                                    font-size: 16px;
                                    padding: 4px 8px;
                                    border-radius: 4px;
                                    transition: all 0.2s;
                                " onmouseover="this.style.background='#ffebee'" onmouseout="this.style.background='none'"
                                title="${t('confirmDeleteSaleTransaction')}">
                                    🗑
                                </button>
                            </td>
                        </tr>
                    `;
                });
                
                if (DOM.customerDebtsBody) DOM.customerDebtsBody.innerHTML = html;
                
                if (DOM.btnPayDebt) {
                    DOM.btnPayDebt.style.display = hasUnpaid ? 'block' : 'none';
                    DOM.btnPayDebt.dataset.customerId = id;
                    DOM.btnPayDebt.innerHTML = hasUnpaid ? t('paySelected') : t('allDebtsPaidShort');
                }
            }

            if (DOM.customerDetailModal) {
                DOM.customerDetailModal.classList.add('active');
            }
            
            console.log('✅ Customer detail modal opened for:', customer.name);
            
        } catch (error) {
            console.error('View customer error:', error);
            showToast(t('clientLoadError') + ': ' + error.message, 'error');
        }
    },
    
    delete: async function(id) {
        if (typeof requireAdminPin === 'function' && !await requireAdminPin()) return;
        if (confirm(t('confirmDeleteCustomer'))) {
            try {
                const customer = await dbGet('customers', id);
                await dbDelete('customers', id);
                if (typeof logAudit === 'function') {
                    await logAudit('CUSTOMER_DELETED', `Client: ${customer ? customer.name : 'ID ' + id}`);
                }
                showToast(t('customerDeleted'), 'success');
                await loadCustomers();
                await createAutoBackup();
            } catch (error) {
                console.error('Delete customer error:', error);
                showToast(t('deleteFailed'), 'error');
            }
        }
    },
    
    paySelected: async function(customerId) {
        const checkboxes = document.querySelectorAll('.debt-checkbox:checked');
        if (checkboxes.length === 0) {
            showToast(t('selectDebt'), 'warning');
            return;
        }
        
        const customer = customers.find(c => c.id === customerId);
        if (!customer) {
            showToast(t('clientNotFound'), 'error');
            return;
        }
        
        const selectedIndices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.index));
        const selectedDebts = customer.debts.filter((d, i) => selectedIndices.includes(i));
        const totalToPay = selectedDebts.reduce((sum, d) => sum + d.remainingAmount, 0);
        
        if (confirm(t('payDebtsConfirm', { count: selectedDebts.length, total: totalToPay.toFixed(2), currency: settings.currency }))) {
            try {
                selectedDebts.forEach(debt => {
                    debt.remainingAmount = 0;
                    debt.paidAmount = debt.totalAmount;
                    debt.status = 'paid';
                });
                
                await dbPut('customers', customer);
                await loadCustomers();
                await window._customer.view(customerId);
                showToast(t('debtPaid', { count: selectedDebts.length }), 'success');
                playSuccess();
                await createAutoBackup();
                // FIX: Always refresh analytics so revenue/profit update immediately,
                //      regardless of which tab is currently active.
                await refreshAnalytics();
            } catch (error) {
                console.error('Pay selected debts error:', error);
                showToast(t('paymentFailed'), 'error');
            }
        }
    },
    
    payAll: async function(customerId) {
        const customer = customers.find(c => c.id === customerId);
        if (!customer) {
            showToast(t('clientNotFound'), 'error');
            return;
        }
        
        const unpaidDebts = customer.debts.filter(d => d.remainingAmount > 0);
        if (unpaidDebts.length === 0) {
            showToast(t('noUnpaidDebt'), 'info');
            return;
        }
        
        const totalRemaining = unpaidDebts.reduce((sum, d) => sum + d.remainingAmount, 0);
        if (confirm(t('markAllDebtsPaid', { total: totalRemaining.toFixed(2), currency: settings.currency }))) {
            try {
                unpaidDebts.forEach(debt => {
                    debt.remainingAmount = 0;
                    debt.paidAmount = debt.totalAmount;
                    debt.status = 'paid';
                });
                
                await dbPut('customers', customer);
                await loadCustomers();
                await window._customer.view(customerId);
                showToast(t('allDebtsPaid'), 'success');
                playSuccess();
                await createAutoBackup();
                // FIX: Always refresh analytics so revenue/profit update immediately.
                await refreshAnalytics();
            } catch (error) {
                console.error('Pay all debts error:', error);
                showToast(t('paymentFailed'), 'error');
            }
        }
    },

    partialPay: async function(customerId) {
        const customer = customers.find(c => c.id === customerId);
        if (!customer) {
            showToast(t('clientNotFound'), 'error');
            return;
        }

        const amountInput = DOM.partialPaymentAmount;
        const paymentAmount = parseFloat(amountInput.value) || 0;

        if (paymentAmount <= 0) {
            showToast(t('invalidAmount'), 'warning');
            return;
        }

        const totalDebt = customer.debts ? customer.debts.reduce((sum, d) => sum + d.remainingAmount, 0) : 0;

        if (paymentAmount > totalDebt) {
            showToast(t('amountExceedsDebt', { total: totalDebt.toFixed(2) + ' ' + settings.currency }), 'warning');
            return;
        }

        if (confirm(`Appliquer un paiement de ${paymentAmount.toFixed(2)} ${settings.currency} sur la dette de ${customer.name} ?\nDette restante: ${(totalDebt - paymentAmount).toFixed(2)} ${settings.currency}`)) {
            try {
                let remainingToPay = paymentAmount;

                const unpaidDebts = customer.debts
                    .filter(d => d.remainingAmount > 0)
                    .sort((a, b) => new Date(a.date) - new Date(b.date));

                for (const debt of unpaidDebts) {
                    if (remainingToPay <= 0) break;

                    const debtRemaining = debt.remainingAmount;
                    if (remainingToPay >= debtRemaining) {
                        remainingToPay -= debtRemaining;
                        debt.remainingAmount = 0;
                        debt.paidAmount = debt.totalAmount;
                        debt.status = 'paid';
                    } else {
                        debt.remainingAmount -= remainingToPay;
                        debt.paidAmount += remainingToPay;
                        remainingToPay = 0;
                    }
                }

                await dbPut('customers', customer);
                await loadCustomers();
                await window._customer.view(customerId);
                
                const newTotalDebt = customer.debts.reduce((sum, d) => sum + d.remainingAmount, 0);
                showToast(t('partialPaymentApplied', { 
                    amount: paymentAmount.toFixed(2) + ' ' + settings.currency,
                    remaining: newTotalDebt.toFixed(2) + ' ' + settings.currency 
                }), 'success');
                playSuccess();
                await createAutoBackup();
                // FIX: Always refresh analytics so partial revenue counts immediately.
                await refreshAnalytics();

            } catch (error) {
                console.error('Partial payment error:', error);
                showToast(t('partialPaymentError'), 'error');
                playError();
            }
        }
    }
};
