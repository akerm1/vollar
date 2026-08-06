
// ============================================================
// OPEN EDIT MODAL - WITH PURCHASE PRICE & DECIMAL STOCK
// ============================================================
async function openEditModal(barcode) {
    try {
        const product = await dbGet('products', barcode);
        if (!product) {
            showToast(t('productLoadError'), 'error');
            return;
        }

        if (DOM.editBarcode) DOM.editBarcode.value = product.barcode;
        if (DOM.editReference) DOM.editReference.value = product.reference || '';
        if (DOM.editName) DOM.editName.value = product.name;
        if (DOM.editCategory) {
            await loadCategoriesList();
            DOM.editCategory.value = product.category || '';
        }
        if (DOM.editUnit) DOM.editUnit.value = product.unit || 'pièce';
        if (DOM.editPrice) DOM.editPrice.value = product.price;
        const editPurchasePrice = document.getElementById('edit-purchase-price');
        if (editPurchasePrice) {
            editPurchasePrice.value = product.purchasePrice || product.price * 0.7;
        }
        if (DOM.editStock) {
            // FIXED: Display stock with proper decimal precision
            DOM.editStock.value = product.stock;
            // Set step attribute based on unit
            DOM.editStock.step = product.unit === 'mètre' ? '0.1' : '1';
        }
        if (DOM.editSupplier) {
            DOM.editSupplier.value = product.supplierId || '';
        }
        if (DOM.editMinStock) {
            DOM.editMinStock.value = product.minimumStock !== undefined ? product.minimumStock : 5;
        }
        if (DOM.editImagePreview) {
            DOM.editImagePreview.innerHTML = product.imageData || product.imagePath
                ? `<img src="${product.imageData || product.imagePath}" alt="${escapeHtml(product.name)}">`
                : '';
        }

        // Settings: trackBatchesEnabled — lot & date de péremption
        const editBatchNumber = document.getElementById('edit-batch-number');
        if (editBatchNumber) editBatchNumber.value = product.batchNumber || '';
        const editExpiryDate = document.getElementById('edit-expiry-date');
        if (editExpiryDate) editExpiryDate.value = product.expiryDate || '';

        if (DOM.editModal) DOM.editModal.classList.add('active');
    } catch (error) {
        console.error('Open edit modal error:', error);
        showToast(t('productLoadError'), 'error');
    }
}

// ============================================================
// SETUP EDIT FORM - WITH PURCHASE PRICE & DECIMAL STOCK
// ============================================================
function setupEditForm() {
    const form = DOM.editForm;
    if (!form) return;

    const preview = DOM.editImagePreview;
    if (DOM.editImage) {
        DOM.editImage.addEventListener('change', function() {
            const file = this.files && this.files[0];
            if (!file) {
                if (preview) preview.innerHTML = '';
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                showToast(t('imageTooLarge'), 'warning');
                this.value = '';
                return;
            }
            const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowed.includes(file.type)) {
                showToast(t('unsupportedFormat'), 'warning');
                this.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = function() {
                if (preview) {
                    preview.innerHTML = `<img src="${reader.result}" alt="${t('previewAlt')}">`;
                }
            };
            reader.readAsDataURL(file);
        });
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const barcode = DOM.editBarcode.value.trim();
        const reference = DOM.editReference.value.trim();
        const name = DOM.editName.value.trim();
        let category = DOM.editCategory.value.trim();
        const unit = DOM.editUnit.value;
        const price = parseFloat(DOM.editPrice.value);
        const editPurchasePrice = document.getElementById('edit-purchase-price');
        const purchasePrice = parseFloat(editPurchasePrice?.value) || price * 0.7;
        // FIXED: Allow decimal values for stock
        const stock = parseFloat(DOM.editStock.value);

        if (!barcode || !name || isNaN(price) || isNaN(purchasePrice) || isNaN(stock)) {
            showToast(t('fillRequiredFields'), 'warning');
            return;
        }

        if (category === '__new__') {
            const newCategory = prompt(t('categoryPrompt'));
            if (newCategory && newCategory.trim()) {
                category = newCategory.trim();
                await addNewCategory(category);
            } else {
                showToast(t('invalidCategoryName'), 'warning');
                return;
            }
        }

        let imageData = '';
        let imagePath = '';
        if (DOM.editImage && DOM.editImage.files && DOM.editImage.files[0]) {
            const file = DOM.editImage.files[0];
            if (file.size > 2 * 1024 * 1024) {
                showToast(t('imageTooLarge'), 'warning');
                return;
            }
            const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowed.includes(file.type)) {
                showToast(t('unsupportedFormat'), 'warning');
                return;
            }
            imageData = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error('Image read failed'));
                reader.readAsDataURL(file);
            });
        }

        const existing = await dbGet('products', barcode);
        const product = {
            barcode: barcode,
            reference: reference || '',
            name: name,
            category: category || 'Non catégorisé',
            unit: unit,
            price: price,
            purchasePrice: purchasePrice,
            stock: stock,
            supplierId: DOM.editSupplier ? (parseInt(DOM.editSupplier.value) || null) : (existing?.supplierId || null),
            minimumStock: DOM.editMinStock ? (parseInt(DOM.editMinStock.value) || 5) : (existing?.minimumStock || 5),
            imageData: imageData || existing?.imageData || '',
            imagePath: imagePath || existing?.imagePath || '',
            batchNumber: document.getElementById('edit-batch-number') ? document.getElementById('edit-batch-number').value.trim() : '',
            expiryDate: document.getElementById('edit-expiry-date') ? document.getElementById('edit-expiry-date').value : ''
        };

        try {
            await dbPut('products', product);
            showToast(t('productUpdatedMsg', { name: product.name }), 'success');
            if (typeof logAudit === 'function') {
                await logAudit('PRODUCT_EDITED', `Produit: ${barcode} (${name})`);
            }
            if (DOM.editModal) DOM.editModal.classList.remove('active');
            if (preview) preview.innerHTML = '';
            if (DOM.editImage) DOM.editImage.value = '';
            await loadInventory();
            await loadCategoriesList();
            await (window.createAutoBackup || (() => Promise.resolve()))();
        } catch (error) {
            console.error('Update product error:', error);
            showToast(t('updateError'), 'error');
        }
    });

    if (DOM.btnCloseModal) {
        DOM.btnCloseModal.addEventListener('click', function() {
            if (DOM.editModal) DOM.editModal.classList.remove('active');
        });
    }

    if (DOM.editModal) {
        DOM.editModal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    }
}
