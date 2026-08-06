// ============================================================
// INVENTORY: Complete Inventory Management with Categories
// ============================================================

// ============================================================
// INVENTORY SEARCH STATE
// ============================================================
let _inventorySearchQuery = '';

function getFilteredInventoryProducts(products) {
    const q = _inventorySearchQuery.toLowerCase().trim();
    if (!q) return products;
    return products.filter(function(p) {
        const name = (p.name || '').toLowerCase();
        const barcode = (p.barcode || '').toLowerCase();
        const category = (p.category || '').toLowerCase();
        const reference = (p.reference || '').toLowerCase();
        return name.includes(q) || barcode.includes(q) || category.includes(q) || reference.includes(q);
    });
}

// ============================================================
// RENDER INVENTORY TABLE (reusable, used by search filter)
// ============================================================
function renderInventoryTable(products) {
    const tbody = DOM.inventoryBody;
    if (!tbody) return;

    if (!products || products.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" style="text-align:center; color:#999; padding:40px 0;">${_inventorySearchQuery ? t('noProductsFound') : t('noProducts')}</td></tr>`;
        return;
    }

    try {
    let html = '';
    products.forEach(product => {
            const stockClass = product.stock <= 0 ? 'stock-critical' : 
                              product.stock <= (product.minimumStock || settings.lowStockThreshold) ? 'stock-low' : '';
            
            const unitDisplay = product.unit === 'mètre' ? 'm' : (product.unit || 'pièce');
            const purchasePrice = product.purchasePrice || product.price * 0.7;
            const profitPerUnit = (product.price - purchasePrice).toFixed(2);
            const margin = product.price > 0 ? (((product.price - purchasePrice) / product.price) * 100).toFixed(1) : '0.0';

            // Settings: trackBatchesEnabled — badge lot & péremption
            let batchBadge = '';
            if (settings.trackBatchesEnabled && (product.batchNumber || product.expiryDate)) {
                let expiryLabel = '';
                if (product.expiryDate) {
                    const daysLeft = Math.floor((new Date(product.expiryDate + 'T00:00:00') - new Date()) / 86400000);
                    expiryLabel = daysLeft < 0
                        ? `<span style="color:var(--danger);font-weight:700;">⏰ Expiré</span>`
                        : daysLeft <= 30
                            ? `<span style="color:var(--warning);font-weight:700;">⏳ ${daysLeft}j</span>`
                            : `<span style="color:var(--success);">🗓 ${product.expiryDate}</span>`;
                }
                batchBadge = `<div style="font-size:11px;color:#888;line-height:1.4;">${product.batchNumber ? `LOT ${escapeHtml(product.batchNumber)}` : ''} ${expiryLabel}</div>`;
            }
            
            const imageCell = product.imageData || product.imagePath
                ? `<img src="${product.imageData || product.imagePath}" alt="${escapeHtml(product.name)}" style="width:44px;height:44px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;">`
                : `<div style="width:44px;height:44px;border-radius:8px;background:linear-gradient(135deg,#f7f7ff,#ecefff);display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--primary);">${escapeHtml((product.name || '?').trim().charAt(0).toUpperCase() || '?')}</div>`;

            html += `
                <tr>
                    <td>${imageCell}</td>
                    <td><strong>${escapeHtml(product.barcode)}</strong></td>
                    <td>${escapeHtml(product.name)}${batchBadge}</td>
                    <td><span class="category-tag" style="
                        background: ${getCategoryColor(product.category)};
                        padding: 2px 10px;
                        border-radius: 12px;
                        font-size: 12px;
                        color: white;
                        display: inline-block;
                    ">${escapeHtml(product.category || 'Non catégorisé')}</span></td>
                    <td>${unitDisplay}</td>
                    <td style="font-weight:600;color:var(--primary);">${product.price.toFixed(2)}</td>
                    <td class="sensitive-price" style="font-weight:600;color:var(--danger);">${purchasePrice.toFixed(2)}</td>
                    <td class="sensitive-price" style="font-weight:600;color:var(--success);">${profitPerUnit}</td>
                    <td class="sensitive-price" style="font-weight:600;color:${margin >= 30 ? 'var(--success)' : margin >= 15 ? 'var(--warning)' : 'var(--danger)'};">${margin}%</td>
                    <td class="${stockClass}">${settings.inventoryAutoSaveEnabled
                        ? `<input class="stock-inline-input" type="number" min="0" step="${product.unit === 'mètre' ? '0.1' : '1'}" value="${product.stock}" data-barcode="${escapeHtml(product.barcode)}" style="width:90px;padding:4px 6px;border:1px solid #e5e7eb;border-radius:6px;font-size:13px;">`
                        : `${product.stock} ${unitDisplay}`}</td>
                    <td>
                        <button class="btn-variant-product" data-barcode="${escapeHtml(product.barcode)}" title="${t('variants')}" style="background:none;border:none;cursor:pointer;font-size:16px;padding:4px 6px;">🎨</button>
                        <button class="btn-edit-product" data-barcode="${escapeHtml(product.barcode)}" title="${t('supplierEditTitle')}">✏️</button>
                        <button class="btn-delete-product" data-barcode="${escapeHtml(product.barcode)}" title="${t('supplierDeleteTitle')}">🗑️</button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;

        // Settings: inventoryAutoSaveEnabled — édition du stock en ligne, sauvegardée automatiquement
        if (settings.inventoryAutoSaveEnabled) {
            tbody.querySelectorAll('.stock-inline-input').forEach(input => {
                input.addEventListener('change', function() {
                    const barcode = this.dataset.barcode;
                    const newStock = parseFloat(this.value);
                    if (isNaN(newStock) || newStock < 0) {
                        showToast(t('invalidStock'), 'warning');
                        loadInventory();
                        return;
                    }
                    updateProductStock(barcode, newStock);
                });
                input.addEventListener('keydown', function(e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        this.blur();
                    }
                });
            });
        }

        // Edit buttons
        tbody.querySelectorAll('.btn-edit-product').forEach(btn => {
            btn.addEventListener('click', function() {
                const barcode = this.dataset.barcode;
                openEditModal(barcode);
            });
        });

        // Delete buttons
        tbody.querySelectorAll('.btn-delete-product').forEach(btn => {
            btn.addEventListener('click', function() {
                const barcode = this.dataset.barcode;
                deleteProduct(barcode);
            });
        });

        // Variants buttons
        tbody.querySelectorAll('.btn-variant-product').forEach(btn => {
            btn.addEventListener('click', function() {
                const barcode = this.dataset.barcode;
                if (typeof openVariantManager === 'function') {
                    openVariantManager(barcode);
                }
            });
        });
    } catch (error) {
        console.error('Render inventory table error:', error);
    }
}

// ============================================================
// UPDATE STOCK (inline auto-save when inventoryAutoSaveEnabled)
// ============================================================
async function updateProductStock(barcode, newStock) {
    try {
        const product = await dbGet('products', barcode);
        if (!product) {
            showToast(t('productLoadError'), 'error');
            return;
        }
        product.stock = newStock;
        await dbPut('products', product);
        showToast(t('stockUpdatedMsg', { name: product.name }), 'success');
        if (typeof logAudit === 'function') {
            await logAudit('STOCK_UPDATED', `Produit: ${barcode} → ${newStock}`);
        }
        refreshProductsCache();
        loadInventory();
        await (window.createAutoBackup || (() => Promise.resolve()))();
    } catch (error) {
        console.error('Update stock error:', error);
        showToast(t('updateError'), 'error');
    }
}

// ============================================================
// LOAD INVENTORY
// ============================================================
async function loadInventory() {
    try {
        const products = await dbGetAll('products');
        window.productsCache = products || [];
        window._productsCache = products || [];
        const filtered = getFilteredInventoryProducts(products || []);
        updateInventoryStats(products || []);
        renderInventoryTable(filtered);
        loadCategoriesList();
        updateCategoryFilter();
        // removed renderProductGrid - product grid eliminated

        const searchInput = document.getElementById('inventory-search');
        const clearBtn = document.getElementById('btn-clear-inventory-search');
        if (searchInput && !searchInput._bound) {
            searchInput._bound = true;
            searchInput.addEventListener('input', function() {
                _inventorySearchQuery = this.value.trim();
                if (clearBtn) clearBtn.style.display = _inventorySearchQuery ? 'inline-block' : 'none';
                const prods = getFilteredInventoryProducts(window.productsCache || []);
                renderInventoryTable(prods);
            });
        }
        if (clearBtn && !clearBtn._bound) {
            clearBtn._bound = true;
            clearBtn.addEventListener('click', function() {
                const si = document.getElementById('inventory-search');
                if (si) si.value = '';
                _inventorySearchQuery = '';
                this.style.display = 'none';
                const prods = getFilteredInventoryProducts(window.productsCache || []);
                renderInventoryTable(prods);
            });
        }
    } catch (error) {
        console.error('Load inventory error:', error);
        showToast(t('loadFailed'), 'error');
    }
}

// ============================================================
// GET CATEGORY COLOR
// ============================================================
function getCategoryColor(category) {
    const colors = {
        'Mouchoirs': '#6C63FF',
        'Écharpes': '#FF6B6B',
        'Tissus': '#2ECC71',
        'Rubans': '#FFA502',
        'Dentelles': '#E056A0',
        'Boutons': '#3498DB',
        'Fils': '#1ABC9C',
        'Fermetures Éclair': '#E74C3C',
        'Élastiques': '#F39C12',
        'Perles': '#9B59B6',
        'Accessoires': '#2C3E50'
    };
    return colors[category] || '#6C63FF';
}

// ============================================================
// UPDATE INVENTORY STATS
// ============================================================
function updateInventoryStats(products) {
    if (DOM.invProductCount) DOM.invProductCount.textContent = `${products.length} produits`;
    
    const lowStockCount = products.filter(p => p.stock <= (p.minimumStock || settings.lowStockThreshold)).length;
    if (DOM.invLowStockCount) DOM.invLowStockCount.textContent = `${lowStockCount} stock bas`;
    
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);
    if (DOM.invTotalValue) DOM.invTotalValue.textContent = `${totalValue.toFixed(2)} ${settings.currency} valeur totale`;
}
