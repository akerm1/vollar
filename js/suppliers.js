// ============================================================
// SUPPLIERS: Supplier Management, Purchase Orders, Low Stock
// ============================================================

let _suppliersEditingId = null;

// ============================================================
// SUPPLIER CRUD
// ============================================================

async function loadSuppliers() {
    try {
        suppliers = await dbGetAll('suppliers');
        suppliers.sort(function(a, b) { return (a.name || '').localeCompare(b.name || ''); });
        renderSupplierList();
        populateSupplierDropdowns();
        renderLowStockPanel();
        updateLowStockBadge();
    } catch (e) {
        console.error('Load suppliers error:', e);
    }
}

function renderSupplierList(filter) {
    const container = document.getElementById('suppliers-list');
    if (!container) return;

    let list = suppliers;
    if (filter) {
        const q = filter.toLowerCase();
        list = suppliers.filter(function(s) {
            return (s.name || '').toLowerCase().includes(q) ||
                   (s.phone || '').includes(q) ||
                   (s.nif || '').includes(q);
        });
    }

    if (!list || list.length === 0) {
        container.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">' + t('noSupplierRegistered') + '</div>';
        return;
    }

    let html = '';
    list.forEach(function(s) {
        html += `
            <div style="padding:12px 16px;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center;transition:background 0.15s;" onmouseover="this.style.background='#f8f9ff'" onmouseout="this.style.background='white'">
                <div>
                    <div style="font-weight:700;color:#333;">${escapeHtml(s.name)}</div>
                    <div style="font-size:12px;color:#888;margin-top:2px;">
                        ${s.phone ? '📱 ' + escapeHtml(s.phone) : ''}
                        ${s.address ? ' • 📍 ' + escapeHtml(s.address) : ''}
                        ${s.email ? ' • 📧 ' + escapeHtml(s.email) : ''}
                        ${s.nif ? ' • 🏛️ NIF: ' + escapeHtml(s.nif) : ''}
                    </div>
                </div>
                <div style="display:flex;gap:6px;">
                    <button onclick="editSupplier(${s.id})" style="padding:4px 10px;background:var(--warning);color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;" title="${t('supplierEditTitle')}">✏️</button>
                    <button onclick="deleteSupplier(${s.id})" style="padding:4px 10px;background:var(--danger);color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;" title="${t('supplierDeleteTitle')}">🗑</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function setupSupplierForm() {
    const form = document.getElementById('supplier-form');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveSupplier();
    });

    const searchInput = document.getElementById('supplier-search');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            renderSupplierList(this.value.trim());
        });
    }
}

async function saveSupplier() {
    const name = document.getElementById('supplier-name').value.trim();
    if (!name) {
        showToast(t('supplierNameRequired'), 'warning');
        return;
    }

    const data = {
        name: name,
        phone: document.getElementById('supplier-phone').value.trim(),
        address: document.getElementById('supplier-address').value.trim(),
        email: document.getElementById('supplier-email').value.trim(),
        nif: document.getElementById('supplier-nif').value.trim()
    };

    try {
        if (_suppliersEditingId) {
            data.id = _suppliersEditingId;
            await dbPut('suppliers', data);
            showToast(t('supplierUpdated'), 'success');
            _suppliersEditingId = null;
            document.getElementById('btn-save-supplier').textContent = '💾 Enregistrer';
        } else {
            await dbPut('suppliers', data);
            showToast(t('supplierAdded'), 'success');
        }

        const form = document.getElementById('supplier-form');
        if (form) form.reset();
        _suppliersEditingId = null;
        document.getElementById('btn-save-supplier').textContent = '💾 Enregistrer';
        await loadSuppliers();
    } catch (e) {
        console.error('Save supplier error:', e);
        showToast(t('saveFailedExcl'), 'error');
    }
}

async function editSupplier(id) {
    const supplier = await dbGet('suppliers', id);
    if (!supplier) {
        showToast(t('supplierNotFound'), 'error');
        return;
    }

    document.getElementById('supplier-name').value = supplier.name || '';
    document.getElementById('supplier-phone').value = supplier.phone || '';
    document.getElementById('supplier-address').value = supplier.address || '';
    document.getElementById('supplier-email').value = supplier.email || '';
    document.getElementById('supplier-nif').value = supplier.nif || '';

    _suppliersEditingId = id;
    document.getElementById('btn-save-supplier').textContent = t('supplierEditBtn');
    document.getElementById('supplier-name').focus();
}

async function deleteSupplier(id) {
    const supplier = await dbGet('suppliers', id);
    if (!supplier) return;

    if (!confirm(t('supplierConfirmDelete', { name: supplier.name }))) return;

    try {
        await dbDelete('suppliers', id);
        showToast(t('supplierDeleted'), 'success');
        await loadSuppliers();
    } catch (e) {
        console.error('Delete supplier error:', e);
        showToast(t('deleteFailed'), 'error');
    }
}

// ============================================================
// POPULATE ALL SUPPLIER DROPDOWNS
// ============================================================
function populateSupplierDropdowns() {
    const selects = [
        document.getElementById('form-supplier'),
        document.getElementById('edit-supplier'),
        document.getElementById('reception-supplier'),
        document.getElementById('purchase-filter-supplier')
    ];

    selects.forEach(function(sel) {
        if (!sel) return;
        const currentVal = sel.value;
        const isFilter = sel.id === 'purchase-filter-supplier';
        let html = isFilter ? '<option value="">' + t('allSuppliers') + '</option>' : '<option value="">' + t('noSupplierOption') + '</option>';
        suppliers.forEach(function(s) {
            html += `<option value="${s.id}">${escapeHtml(s.name)}</option>`;
        });
        sel.innerHTML = html;
        sel.value = currentVal;
    });
}

// ============================================================
// PURCHASE ORDERS (BONS DE RÉCEPTION)
// ============================================================

function setupReceptionForm() {
    const form = document.getElementById('reception-form');
    if (!form) return;

    const dateInput = document.getElementById('reception-date');
    if (dateInput) {
        dateInput.value = new Date().toISOString().split('T')[0];
    }

    const addBtn = document.getElementById('btn-add-reception-item');
    if (addBtn) {
        addBtn.addEventListener('click', function() {
            addReceptionItemRow();
        });
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        await saveReception();
    });

    const filterBtn = document.getElementById('btn-filter-purchases');
    if (filterBtn) {
        filterBtn.addEventListener('click', function() {
            loadPurchaseHistory();
        });
    }

    addReceptionItemRow();
}

function addReceptionItemRow() {
    const container = document.getElementById('reception-items-container');
    if (!container) return;

    const index = container.querySelectorAll('.reception-item-row').length;

    const row = document.createElement('div');
    row.className = 'reception-item-row';
    row.style.cssText = 'display:flex;gap:6px;align-items:center;padding:6px 0;border-bottom:1px solid #f5f5f5;flex-wrap:wrap;';

    row.innerHTML = `
        <div style="flex:3;min-width:120px;position:relative;">
            <input type="text" class="ri-search" placeholder="${t('productPlaceholder')}" style="width:100%;padding:4px 8px;border:1px solid #e0e0e0;border-radius:4px;font-size:13px;" autocomplete="off">
            <div class="ri-suggestions" style="display:none;position:absolute;top:100%;left:0;right:0;background:white;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 4px 4px;max-height:150px;overflow-y:auto;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.15);"></div>
        </div>
        <input type="hidden" class="ri-barcode" value="">
        <input type="text" class="ri-name" placeholder="${t('fullName')}" readonly style="flex:2;min-width:80px;padding:4px 8px;border:1px solid #e0e0e0;border-radius:4px;font-size:13px;background:#f9f9f9;">
        <input type="number" class="ri-qty" value="1" min="0.01" step="0.01" placeholder="${t('qtyPlaceholder')}" style="flex:0 0 60px;padding:4px 8px;border:1px solid #e0e0e0;border-radius:4px;font-size:13px;">
        <input type="number" class="ri-price" step="0.01" min="0" placeholder="${t('pricePlaceholder')}" style="flex:0 0 80px;padding:4px 8px;border:1px solid #e0e0e0;border-radius:4px;font-size:13px;">
        <span class="ri-subtotal" style="flex:0 0 70px;text-align:right;font-weight:700;color:var(--primary);font-size:13px;">0.00</span>
        <button type="button" class="ri-remove" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:16px;padding:4px;" title="${t('removeItemTitle')}">✕</button>
    `;

    container.appendChild(row);

    // Search listener
    const searchInput = row.querySelector('.ri-search');
    const suggestionsDiv = row.querySelector('.ri-suggestions');
    let debounce = null;

    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        if (debounce) clearTimeout(debounce);
        if (!query) { suggestionsDiv.style.display = 'none'; return; }
        debounce = setTimeout(async function() {
            try {
                const results = await fastSearch(query);
                if (!results.length) {
                    suggestionsDiv.innerHTML = '<div style="padding:8px;color:#999;text-align:center;font-size:12px;">' + t('noProductItem') + '</div>';
                    suggestionsDiv.style.display = 'block';
                    return;
                }
                let html = '';
                results.slice(0, 10).forEach(function(p) {
                    html += `
                        <div class="ri-suggestion-item" data-barcode="${escapeHtml(p.barcode)}" data-name="${escapeHtml(p.name)}" data-price="${p.purchasePrice || p.price * 0.7}" style="padding:6px 10px;cursor:pointer;border-bottom:1px solid #f5f5f5;font-size:12px;display:flex;justify-content:space-between;" onmouseover="this.style.background='#f0f4ff'" onmouseout="this.style.background='white'">
                            <span>${escapeHtml(p.name)}</span>
                            <span style="color:#999;">Stock: ${p.stock}</span>
                        </div>
                    `;
                });
                suggestionsDiv.innerHTML = html;
                suggestionsDiv.style.display = 'block';

                suggestionsDiv.querySelectorAll('.ri-suggestion-item').forEach(function(item) {
                    item.addEventListener('click', function() {
                        const r = this.closest('.reception-item-row');
                        r.querySelector('.ri-barcode').value = this.dataset.barcode;
                        r.querySelector('.ri-name').value = this.dataset.name;
                        r.querySelector('.ri-price').value = this.dataset.price;
                        searchInput.value = '';
                        suggestionsDiv.style.display = 'none';
                        r.querySelector('.ri-qty').focus();
                        _updateReceptionTotals();
                    });
                });
            } catch (err) {
                console.error('Reception search error:', err);
            }
        }, 80);
    });

    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') suggestionsDiv.style.display = 'none';
        if (e.key === 'Enter') {
            e.preventDefault();
            const first = suggestionsDiv.querySelector('.ri-suggestion-item');
            if (first) first.click();
        }
    });

    document.addEventListener('click', function(e) {
        if (!suggestionsDiv.contains(e.target) && e.target !== searchInput) {
            suggestionsDiv.style.display = 'none';
        }
    });

    // Remove button
    row.querySelector('.ri-remove').addEventListener('click', function() {
        row.remove();
        _updateReceptionTotals();
    });

    // Price/qty change updates subtotal
    row.querySelector('.ri-qty').addEventListener('input', _updateReceptionTotals);
    row.querySelector('.ri-price').addEventListener('input', _updateReceptionTotals);
}

function _updateReceptionTotals() {
    const rows = document.querySelectorAll('.reception-item-row');
    let total = 0;
    rows.forEach(function(r) {
        const qty = parseFloat(r.querySelector('.ri-qty').value) || 0;
        const price = parseFloat(r.querySelector('.ri-price').value) || 0;
        const sub = qty * price;
        r.querySelector('.ri-subtotal').textContent = sub.toFixed(2);
        total += sub;
    });
    const totalEl = document.getElementById('reception-total');
    if (totalEl) totalEl.textContent = total.toFixed(2);
}

async function saveReception() {
    const supplierId = parseInt(document.getElementById('reception-supplier').value) || null;
    const date = document.getElementById('reception-date').value;
    const invoiceRef = document.getElementById('reception-invoice').value.trim();

    if (!supplierId) {
        showToast(t('selectSupplier'), 'warning');
        return;
    }
    if (!date) {
        showToast(t('selectDate'), 'warning');
        return;
    }

    const rows = document.querySelectorAll('.reception-item-row');
    const items = [];
    let totalCost = 0;

    rows.forEach(function(r) {
        const barcode = r.querySelector('.ri-barcode').value.trim();
        const name = r.querySelector('.ri-name').value.trim();
        const qty = parseFloat(r.querySelector('.ri-qty').value) || 0;
        const price = parseFloat(r.querySelector('.ri-price').value) || 0;
        if (barcode && name && qty > 0 && price >= 0) {
            items.push({ barcode: barcode, name: name, qty: qty, purchasePrice: price });
            totalCost += qty * price;
        }
    });

    if (items.length === 0) {
        showToast(t('addAtLeastOneItem'), 'warning');
        return;
    }

    if (!confirm(t('confirmSaveReception', { count: items.length, total: totalCost.toFixed(2) }))) {
        return;
    }

    try {
        // Update stock and purchasePrice for each product
        for (const item of items) {
            const product = await dbGet('products', item.barcode);
            if (product) {
                product.stock = (product.stock || 0) + item.qty;
                if (item.purchasePrice > 0) {
                    product.purchasePrice = item.purchasePrice;
                }
                await dbPut('products', product);
            } else {
                // Product not found — create a new one
                const newProduct = {
                    barcode: item.barcode,
                    reference: '',
                    name: item.name,
                    category: 'Non catégorisé',
                    unit: 'pièce',
                    price: item.purchasePrice * 1.3,
                    purchasePrice: item.purchasePrice,
                    stock: item.qty,
                    supplierId: supplierId,
                    minimumStock: 5,
                    imageData: '',
                    imagePath: ''
                };
                await dbPut('products', newProduct);
            }
        }

        // Save purchase record
        const purchase = {
            supplierId: supplierId,
            supplierName: (await dbGet('suppliers', supplierId))?.name || 'Inconnu',
            date: date,
            invoiceRef: invoiceRef,
            items: items,
            totalCost: totalCost,
            createdAt: new Date().toISOString()
        };
        await dbPut('purchases', purchase);

        showToast(t('receptionSaved') + items.length + ' ' + t('itemsAddedToStock'), 'success');
        playSuccess();

        // Reset form
        document.getElementById('reception-items-container').innerHTML = '';
        document.getElementById('reception-invoice').value = '';
        document.getElementById('reception-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('reception-total').textContent = '0.00';
        addReceptionItemRow();

        // Refresh everything
        await loadPurchaseHistory();
        await loadInventory();
        await refreshProductGrid();
        await renderLowStockPanel();
        updateLowStockBadge();
        await (window.createAutoBackup || function() { return Promise.resolve(); })();
    } catch (e) {
        console.error('Save reception error:', e);
        showToast(t('receptionErrorToast'), 'error');
    }
}

// ============================================================
// PURCHASE HISTORY
// ============================================================

async function loadPurchaseHistory() {
    const container = document.getElementById('purchase-history-container');
    if (!container) return;

    try {
        let allPurchases = await dbGetAll('purchases');
        if (!allPurchases || allPurchases.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">' + t('noReceptionRecorded') + '</div>';
            return;
        }

        // Apply filters
        const filterSupplier = document.getElementById('purchase-filter-supplier')?.value || '';
        const filterFrom = document.getElementById('purchase-filter-from')?.value || '';
        const filterTo = document.getElementById('purchase-filter-to')?.value || '';

        let filtered = allPurchases;
        if (filterSupplier) {
            filtered = filtered.filter(function(p) { return String(p.supplierId) === filterSupplier; });
        }
        if (filterFrom) {
            filtered = filtered.filter(function(p) { return p.date >= filterFrom; });
        }
        if (filterTo) {
            filtered = filtered.filter(function(p) { return p.date <= filterTo; });
        }

        filtered.sort(function(a, b) { return (b.date || '').localeCompare(a.date || ''); });

        if (filtered.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">' + t('noReceptionForFilters') + '</div>';
            return;
        }

        let html = '';
        filtered.forEach(function(p) {
            const dateDisplay = new Date(p.date + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
            const itemList = (p.items || []).map(function(it) {
                return it.name + ' ×' + it.qty;
            }).join(', ');

            html += `
                <div style="padding:12px 16px;border-bottom:1px solid #f0f0f0;transition:background 0.15s;" onmouseover="this.style.background='#f8f9ff'" onmouseout="this.style.background='white'">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                        <div>
                            <div style="font-weight:700;color:#333;">${escapeHtml(p.supplierName || t('unknownSupplier'))}</div>
                            <div style="font-size:12px;color:#888;margin-top:2px;">📅 ${dateDisplay}${p.invoiceRef ? t('facturePrefix') + escapeHtml(p.invoiceRef) : ''}</div>
                            <div style="font-size:12px;color:#555;margin-top:4px;max-width:400px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(itemList)}">${escapeHtml(itemList)}</div>
                            <div style="font-size:11px;color:#999;margin-top:2px;">${(p.items || []).length} ${t('articlesCountSuffix')}</div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-weight:700;color:var(--primary);font-size:15px;">${(p.totalCost || 0).toFixed(2)} DA</div>
                            <button onclick="deletePurchase(${p.id})" style="margin-top:4px;padding:3px 8px;background:#ffebee;border:1px solid var(--danger);border-radius:4px;color:var(--danger);cursor:pointer;font-size:11px;">🗑</button>
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    } catch (e) {
        console.error('Load purchase history error:', e);
        container.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">' + t('loadingError') + '</div>';
    }
}

async function deletePurchase(id) {
    if (!confirm(t('receiptDeleteConfirm'))) return;

    try {
        await dbDelete('purchases', id);
        showToast(t('receptionDeleted'), 'success');
        await loadPurchaseHistory();
    } catch (e) {
        console.error('Delete purchase error:', e);
        showToast(t('deleteFailed'), 'error');
    }
}

// ============================================================
// LOW STOCK ALERTS
// ============================================================

async function renderLowStockPanel() {
    const container = document.getElementById('low-stock-panel');
    if (!container) return;

    try {
        const allProducts = await dbGetAll('products');
        const lowStockProducts = allProducts.filter(function(p) {
            const threshold = p.minimumStock || settings.lowStockThreshold || 5;
            return p.stock <= threshold;
        });

        if (lowStockProducts.length === 0) {
            container.innerHTML = '<div style="text-align:center;color:var(--success);padding:20px;"><div style="font-size:24px;margin-bottom:4px;">✅</div>' + t('aboveThreshold') + '</div>';
            return;
        }

        let html = '';
        lowStockProducts.forEach(function(p) {
            const threshold = p.minimumStock || settings.lowStockThreshold || 5;
            const supplier = p.supplierId ? suppliers.find(function(s) { return s.id === p.supplierId; }) : null;
            const stockClass = p.stock <= 0 ? 'stock-critical' : 'stock-low';

            html += `
                <div style="padding:8px 14px;border-bottom:1px solid #f5f5f5;display:flex;justify-content:space-between;align-items:center;">
                    <div>
                        <span style="font-weight:600;color:#333;">${escapeHtml(p.name)}</span>
                        <span class="${stockClass}" style="margin-left:6px;font-size:12px;">${p.stock} ${t('remainingCount')}</span>
                        <span style="font-size:11px;color:#999;">${t('thresholdLabel')}${threshold}</span>
                    </div>
                    <div style="font-size:11px;color:#888;">
                        ${supplier ? '🏷️ ' + escapeHtml(supplier.name) : ''}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    } catch (e) {
        console.error('Render low stock panel error:', e);
        container.innerHTML = '<div style="text-align:center;color:#999;padding:10px;">' + t('errorTitle') + '</div>';
    }
}

async function updateLowStockBadge() {
    try {
        const allProducts = await dbGetAll('products');
        const count = allProducts.filter(function(p) {
            const threshold = p.minimumStock || settings.lowStockThreshold || 5;
            return p.stock <= threshold;
        }).length;

        // Update analytics low stock card if it exists
        const el = document.getElementById('analytics-low-stock-count');
        if (el) el.textContent = count;

        // Update inventory low stock stat
        const invEl = document.getElementById('inv-low-stock-count');
        if (invEl) invEl.textContent = count;

        // Update nav tab badge
        const tabs = document.querySelectorAll('.nav-tab');
        tabs.forEach(function(tab) {
            if (tab.dataset.view === 'suppliers') {
                let badge = tab.querySelector('.low-stock-badge');
                if (count > 0) {
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.className = 'low-stock-badge';
                        badge.style.cssText = 'background:var(--danger);color:white;border-radius:50%;min-width:18px;height:18px;display:inline-flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;margin-left:4px;padding:0 4px;';
                        tab.appendChild(badge);
                    }
                    badge.textContent = count;
                } else if (badge) {
                    badge.remove();
                }
            }
        });
    } catch (e) {
        console.error('Update low stock badge error:', e);
    }
}

// ============================================================
// WINDOW EXPORTS
// ============================================================
window.loadSuppliers = loadSuppliers;
window.renderSupplierList = renderSupplierList;
window.setupSupplierForm = setupSupplierForm;
window.saveSupplier = saveSupplier;
window.editSupplier = editSupplier;
window.deleteSupplier = deleteSupplier;
window.populateSupplierDropdowns = populateSupplierDropdowns;
window.setupReceptionForm = setupReceptionForm;
window.addReceptionItemRow = addReceptionItemRow;
window.saveReception = saveReception;
window.loadPurchaseHistory = loadPurchaseHistory;
window.deletePurchase = deletePurchase;
window.renderLowStockPanel = renderLowStockPanel;
window.updateLowStockBadge = updateLowStockBadge;

console.log('🏷️ Suppliers module loaded');
