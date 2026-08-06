
// ============================================================
// SETUP PRODUCT FORM - WITH PURCHASE PRICE & DECIMAL STOCK
// ============================================================
function setupProductForm() {
    const form = DOM.productForm;
    if (!form) return;

    loadCategoriesList();

    // Settings: autoBarcodeEnabled — génère un code-barres EAN-13 scannable
    // dès que le champ est vide et que l'utilisateur saisit le nom.
    function autoFillBarcode() {
        if (!settings.autoBarcodeEnabled) return;
        const field = DOM.formBarcode;
        if (!field || field.value.trim()) return;
        field.value = generateEAN13Barcode();
        showToast(t('autoBarcodeGenerated', { barcode: field.value }), 'info');
    }

    const nameField = DOM.formName;
    if (nameField) {
        nameField.addEventListener('blur', autoFillBarcode);
        nameField.addEventListener('input', function() {
            if (!DOM.formBarcode || DOM.formBarcode.value.trim()) return;
            autoFillBarcode();
        });
    }

    const preview = DOM.formImagePreview;
    if (DOM.formImage) {
        DOM.formImage.addEventListener('change', function() {
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
        
        const barcode = DOM.formBarcode.value.trim();
        const reference = DOM.formReference.value.trim();
        const name = DOM.formName.value.trim();
        let category = DOM.formCategory.value.trim();
        const unit = DOM.formUnit.value;
        const price = parseFloat(DOM.formPrice.value);
        const purchasePriceInput = document.getElementById('form-purchase-price');
        const purchasePrice = parseFloat(purchasePriceInput?.value) || price * 0.7;
        // FIXED: Allow decimal values for stock (important for meter products)
        const stock = parseFloat(DOM.formStock.value);

        // Settings: autoBarcodeEnabled — génère automatiquement un code-barres si le champ est vide
        let effectiveBarcode = barcode;
        if (!effectiveBarcode && settings.autoBarcodeEnabled) {
            effectiveBarcode = generateEAN13Barcode();
            if (DOM.formBarcode) DOM.formBarcode.value = effectiveBarcode;
        }

        if (!effectiveBarcode) {
            showToast(t('barcodeRequired'), 'warning');
            DOM.formBarcode.focus();
            return;
        }
        if (!name) {
            showToast(t('productNameRequired'), 'warning');
            DOM.formName.focus();
            return;
        }
        if (isNaN(price) || price < 0) {
            showToast(t('invalidSellPrice'), 'warning');
            DOM.formPrice.focus();
            return;
        }
        if (isNaN(purchasePrice) || purchasePrice < 0) {
            showToast(t('invalidPurchasePrice'), 'warning');
            if (purchasePriceInput) purchasePriceInput.focus();
            return;
        }
        if (isNaN(stock) || stock < 0) {
            showToast(t('invalidStock'), 'warning');
            DOM.formStock.focus();
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
        if (DOM.formImage && DOM.formImage.files && DOM.formImage.files[0]) {
            const file = DOM.formImage.files[0];
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

        const existing = await dbGet('products', effectiveBarcode);
        if (existing) {
            showToast(t('barcodeExists', { name: existing.name }), 'warning');
            DOM.formBarcode.focus();
            DOM.formBarcode.select();
            return;
        }

        const product = {
            barcode: effectiveBarcode,
            reference: reference || '',
            name: name,
            category: category || 'Non catégorisé',
            unit: unit,
            price: price,
            purchasePrice: purchasePrice,
            stock: stock,
            supplierId: DOM.formSupplier ? (parseInt(DOM.formSupplier.value) || null) : null,
            minimumStock: DOM.formMinStock ? (parseInt(DOM.formMinStock.value) || 5) : 5,
            batchNumber: document.getElementById('form-batch-number') ? document.getElementById('form-batch-number').value.trim() : '',
            expiryDate: document.getElementById('form-expiry-date') ? document.getElementById('form-expiry-date').value : '',
            imageData: imageData || '',
            imagePath: imagePath || ''
        };

        try {
            await dbPut('products', product);
            showToast(t('productAddedToStock', { name: product.name }), 'success');
            if (typeof logAudit === 'function') {
                await logAudit('PRODUCT_CREATED', `Produit: ${effectiveBarcode} (${name})`);
            }
            form.reset();
            if (preview) preview.innerHTML = '';
            if (DOM.formImage) DOM.formImage.value = '';
            await loadInventory();
            await loadCategoriesList();
            await (window.createAutoBackup || (() => Promise.resolve()))();
            
            if (DOM.formBarcode) DOM.formBarcode.focus();
        } catch (error) {
            console.error('Save product error:', error);
            showToast(t('saveFailed'), 'error');
        }
    });

    const categorySelect = DOM.formCategory;
    if (categorySelect) {
        categorySelect.addEventListener('change', function() {
            if (this.value === '__new__') {
            const newCategory = prompt(t('categoryPrompt'));
                if (newCategory && newCategory.trim()) {
                    addNewCategory(newCategory.trim()).then(() => {
                        loadCategoriesList();
                        setTimeout(() => {
                            const options = this.querySelectorAll('option');
                            options.forEach(opt => {
                                if (opt.value === newCategory.trim()) {
                                    this.value = newCategory.trim();
                                }
                            });
                        }, 100);
                    });
                } else {
                    this.value = '';
                }
            }
        });
    }

    form.addEventListener('reset', function() {
        if (DOM.formFeedback) DOM.formFeedback.textContent = '';
        setTimeout(() => {
            if (DOM.formBarcode) DOM.formBarcode.focus();
        }, 100);
    });
}

// ============================================================
// GENERATE EAN-13 BARCODE (scannable, unique, with check digit)
// ============================================================
function generateEAN13Barcode() {
    const prefix = '20'; // in-house prefix
    const ts = Date.now().toString().slice(-9);          // 9 digits from timestamp
    const rand = String(Math.floor(Math.random() * 100000)).padStart(5, '0'); // 5 random digits
    const base = prefix + ts + rand;                     // 2 + 9 + 5 = 16 → trim to 12 data digits
    const data = base.slice(0, 12);

    // EAN-13 check digit: weight 1 on odd positions, 3 on even positions
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        const d = parseInt(data.charAt(i), 10);
        sum += (i % 2 === 0) ? d : d * 3;
    }
    const check = (10 - (sum % 10)) % 10;
    return data + check;
}

window.generateEAN13Barcode = generateEAN13Barcode;
