
// ============================================================
// DELETE PRODUCT
// ============================================================
async function deleteProduct(barcode) {
    if (typeof requireAdminPin === 'function' && !await requireAdminPin()) return;
    if (!confirm(t('confirmDeleteProduct', { barcode: barcode }))) return;
    
    try {
        const product = await dbGet('products', barcode);
        await dbDelete('products', barcode);

        // Delete associated variants
        try {
            const allVariants = await dbGetAll('product_variants');
            const productVariants = allVariants.filter(v => v.parentBarcode === barcode);
            for (const v of productVariants) {
                await dbDelete('product_variants', v.id);
            }
        } catch (e) {
            console.warn('Error cleaning up variants:', e);
        }

        if (typeof logAudit === 'function') {
            await logAudit('PRODUCT_DELETED', `Produit: ${barcode} (${product ? product.name : '?'})`);
        }
        showToast(t('productDeleted'), 'success');
        await loadInventory();
        await loadCategoriesList();
        await (window.createAutoBackup || (() => Promise.resolve()))();
    } catch (error) {
        console.error('Delete product error:', error);
        showToast(t('deleteFailed'), 'error');
    }
}

// ============================================================
// BULK DELETE PRODUCTS
// ============================================================
async function bulkDeleteProducts() {
    if (typeof requireAdminPin === 'function' && !await requireAdminPin()) return;
    if (!confirm(t('deleteAllProductsConfirm'))) return;
    if (!confirm(t('confirmDeleteAllProductsAgain'))) return;
    
    try {
        const products = await dbGetAll('products');
        await dbClear('products');
        if (typeof logAudit === 'function') {
            await logAudit('PRODUCT_BULK_DELETED', `${products.length} produits supprimés`);
        }
        showToast(t('allProductsDeleted'), 'success');
        await loadInventory();
        await loadCategoriesList();
        await (window.createAutoBackup || (() => Promise.resolve()))();
    } catch (error) {
        console.error('Bulk delete error:', error);
        showToast(t('deleteFailed'), 'error');
    }
}

// ============================================================
// SETUP BULK DELETE PRODUCTS
// ============================================================
function setupBulkDeleteProducts() {
    const btn = DOM.btnBulkDelete;
    if (btn) {
        try {
            const newBtn = btn.cloneNode(true);
            if (btn.parentNode) {
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.addEventListener('click', bulkDeleteProducts);
            } else {
                btn.addEventListener('click', bulkDeleteProducts);
            }
        } catch (e) {
            console.warn('setupBulkDeleteProducts: fallback attach', e);
            try { btn.addEventListener('click', bulkDeleteProducts); } catch (er) {}
        }
    }
}
