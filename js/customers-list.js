// ============================================================
// CUSTOMERS: Customer Management - UPDATED with delete button
// ============================================================

// ============================================================
// LOAD CUSTOMERS
// ============================================================
async function loadCustomers() {
    try {
        customers = await dbGetAll('customers');
        console.log('✅ Customers loaded:', customers.length);
        renderCustomersList();
        populateCustomerSelect();
    } catch (error) {
        console.error('Load customers error:', error);
        showToast(t('clientLoadError'), 'error');
    }
}

// ============================================================
// RENDER CUSTOMERS LIST
// ============================================================
function renderCustomersList() {
    if (!DOM.customersList) return;
    const searchTerm = DOM.customerSearch ? DOM.customerSearch.value.toLowerCase() : '';
    const filtered = customers.filter(c => 
        c.name.toLowerCase().includes(searchTerm) ||
        (c.phone && c.phone.includes(searchTerm))
    );

    if (filtered.length === 0) {
        DOM.customersList.innerHTML = `
            <div style="text-align:center; color:#999; padding:40px 0; font-size:16px;">
                <div style="font-size:48px; margin-bottom:16px;">👤</div>
                ${t('noCustomers')}
            </div>
        `;
        return;
    }

    let html = '';
    filtered.forEach(customer => {
        const totalDebt = customer.debts ? customer.debts.reduce((sum, d) => sum + d.remainingAmount, 0) : 0;
        const hasDebt = totalDebt > 0;
        
        html += `
            <div class="customer-item" data-id="${customer.id}" style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 14px 16px;
                border-bottom: 1px solid #f0f0f0;
                cursor: pointer;
                transition: all 0.2s;
                border-radius: 8px;
                margin-bottom: 4px;
                background: ${hasDebt ? '#fff5f5' : 'white'};
            " onmouseover="this.style.background='#f8f9ff'" onmouseout="this.style.background='${hasDebt ? '#fff5f5' : 'white'}'">
                <div class="info" style="flex: 1;">
                    <div class="name" style="font-weight: 600; font-size: 15px; color: var(--primary);">
                        ${escapeHtml(customer.name)}
                        ${hasDebt ? '<span style="color: var(--danger); font-size: 12px; margin-left: 8px;">' + t('debtLabel') + '</span>' : ''}
                    </div>
                    <div class="phone" style="font-size: 13px; color: #666; margin-top: 2px;">
                        ${customer.phone || t('noPhone')}
                        ${customer.address ? ` • 📍 ${escapeHtml(customer.address)}` : ''}
                    </div>
                </div>
                ${hasDebt ? `
                    <div class="debt" style="
                        background: #ffebee;
                        padding: 4px 14px;
                        border-radius: 20px;
                        font-weight: 700;
                        color: var(--danger);
                        font-size: 14px;
                        margin-right: 12px;
                    ">
                        ${totalDebt.toFixed(2)} ${settings.currency}
                    </div>
                ` : ''}
                <div class="actions" style="display: flex; gap: 8px;">
                    <button class="view-btn" onclick="window._customer.view(${customer.id})" style="
                        background: none;
                        border: none;
                        cursor: pointer;
                        padding: 6px 10px;
                        border-radius: 6px;
                        font-size: 16px;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='#e8eaf6'" onmouseout="this.style.background='none'">
                        👁️
                    </button>
                    <button class="delete-btn" onclick="window._customer.delete(${customer.id})" style="
                        background: none;
                        border: none;
                        cursor: pointer;
                        padding: 6px 10px;
                        border-radius: 6px;
                        font-size: 16px;
                        transition: all 0.2s;
                    " onmouseover="this.style.background='#ffebee'" onmouseout="this.style.background='none'">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    });

    DOM.customersList.innerHTML = html;
}
