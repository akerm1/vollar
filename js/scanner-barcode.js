
// ============================================================
// BARCODE UTILITIES
// ============================================================
function getScannerPrefixes() {
    let prefixes = (typeof BARCODE_CONFIG !== 'undefined' && BARCODE_CONFIG.prefixes) ? BARCODE_CONFIG.prefixes : [];
    if (settings && settings.scannerPrefixes) {
        const custom = String(settings.scannerPrefixes).split(',').map(s => s.trim()).filter(Boolean);
        if (custom.length) prefixes = custom;
    }
    return prefixes;
}

// Chars de fin de code que le récepteur peut laisser collés (selon la programmation du scanner)
const CONTROL_CHARS = ['\r', '\n', '\t', '\u001d', '\u001e', '\u001f', '\u0000'];

function stripTrailingSuffix(raw) {
    let s = raw;
    const term = (settings && settings.scannerTerminalSuffix) ? settings.scannerTerminalSuffix : 'auto';
    let chars = [];
    if (term === 'enter') chars = ['\r', '\n'];
    else if (term === 'tab') chars = ['\t'];
    else if (term === 'none') chars = [];
    else chars = CONTROL_CHARS; // 'auto' → retirer tout caractère de contrôle ou suffixe connu en fin

    let changed = true;
    while (changed) {
        changed = false;
        for (const c of chars) {
            if (s.length && s.endsWith(c)) { s = s.substring(0, s.length - c.length); changed = true; }
        }
        // 'auto' : retire aussi la valeur compète si elle se termine par un bloc de contrôle collé (ex: ]C1)
        if (term === 'auto') {
            const labels = (typeof BARCODE_CONFIG !== 'undefined') ? BARCODE_CONFIG.prefixes || [] : [];
            for (const l of labels) {
                if (l.length >= 2 && s.endsWith(l)) { s = s.substring(0, s.length - l.length); changed = true; }
            }
        }
    }
    return s;
}

function cleanBarcode(raw) {
    if (!raw) return '';
    let s = raw.trim();
    const prefixes = getScannerPrefixes();
    for (const p of prefixes) { while (s.startsWith(p)) s = s.substring(p.length); }
    s = stripTrailingSuffix(s);
    return s;
}

// ============================================================
// PARSE A QUANTITY-PREFIXED SCAN  (e.g. "3x123456" or "2*456")
// Returns { qty, barcode } or null when there's no prefix.
// ============================================================
function parseQtyPrefixedBarcode(raw) {
    if (!raw) return null;
    const m = raw.match(/^(\d+(?:[.,]\d+)?)\s*[xX*]\s*(.+)$/);
    if (!m) return null;
    const qty = parseFloat(m[1].replace(',', '.'));
    const barcode = m[2].trim();
    if (!isNaN(qty) && qty > 0 && barcode) return { qty, barcode };
    return null;
}

// ============================================================
// ADD PRODUCT TO CART BY BARCODE  (the only add path)
// ============================================================
async function addProductByBarcode(barcode) {
    if (!barcode) return;

    // Settings: autoAddQtyEnabled — ajoute automatiquement la quantité scannée
    // (format "3x123456") sans demande de confirmation. Sinon, on demande.
    let qtyPrefixed = null;
    if (settings.autoAddQtyEnabled) {
        qtyPrefixed = parseQtyPrefixedBarcode(barcode);
    }
    if (qtyPrefixed) {
        barcode = qtyPrefixed.barcode;
    }

    const cleaned = cleanBarcode(barcode);

    try {
        // Check if this barcode belongs to a variant first
        let allVariants = [];
        if (typeof dbGetAll === 'function') {
            try { allVariants = await dbGetAll('product_variants'); } catch (_) { allVariants = []; }
        }
        const directVariant = allVariants.find(v => v.barcode && (v.barcode === cleaned || v.barcode === barcode.trim()));
        
        if (directVariant) {
            const parentBarcode = directVariant.parentBarcode;
            let product = await dbGet('products', parentBarcode);
            if (!product) {
                const all = await getCachedProducts();
                product = all.find(p => p.barcode === parentBarcode) || null;
            }
            if (!product) {
                if (typeof playError === 'function') playError();
                if (typeof showToast === 'function') showToast(t('barcodeNotFound', { barcode: cleaned }), 'error');
                return;
            }
            if (typeof addVariantToCart === 'function') {
                addVariantToCart(product, directVariant, qtyPrefixed ? qtyPrefixed.qty : undefined);
            } else {
                if (typeof addToCart === 'function') addToCart(product, qtyPrefixed ? qtyPrefixed.qty : undefined);
            }
            return;
        }

        let product = await dbGet('products', cleaned);

        // fallback: search cache (handles alphanumeric barcodes)
        if (!product) {
            const all = await getCachedProducts();
            product = all.find(p => p.barcode === cleaned || p.barcode === barcode.trim()) || null;
        }

        if (product) {
            // Check if product has variants
            const variants = allVariants.filter(v => v.parentBarcode === (product.barcode || cleaned));
            if (variants.length > 0) {
                if (typeof showVariantPicker === 'function') {
                    showVariantPicker(product, variants);
                    return;
                }
            }

            if (product.stock <= 0) {
                if (typeof playError === 'function') playError();
                if (typeof showToast === 'function') showToast(t('outOfStock', { name: product.name }), 'error');
                return;
            }
            if (typeof addToCart === 'function') addToCart(product, qtyPrefixed ? qtyPrefixed.qty : undefined);
            // addToCart already calls playScan + showToast
        } else {
            if (typeof playError === 'function') playError();
            if (typeof showToast === 'function') showToast(t('barcodeNotFound', { barcode: cleaned }), 'error');
        }
    } catch (err) {
        console.error('addProductByBarcode error:', err);
        if (typeof playError === 'function') playError();
        if (typeof showToast === 'function') showToast(t('scanError'), 'error');
    }
}

// ============================================================
// INVENTORY SCAN HANDLER
// ============================================================
function handleInventoryScan(barcode) {
    if (typeof focusLockEnabled !== 'undefined') focusLockEnabled = false;
    const formBarcode = document.getElementById('form-barcode');
    if (formBarcode) {
        formBarcode.value = barcode;
        if (typeof showToast   === 'function') showToast(t('scanBarcode'), 'info');
        if (typeof playScan    === 'function') playScan();
    }
    setTimeout(() => {
        const formName = document.getElementById('form-name');
        if (formName) { formName.focus(); formName.select(); }
        setTimeout(() => { if (typeof focusLockEnabled !== 'undefined') focusLockEnabled = true; }, 1000);
    }, 150);
}

// ============================================================
// ROUTE A SCANNED / ENTERED BARCODE TO THE RIGHT VIEW
// ============================================================
function routeBarcode(barcode) {
    if (!barcode) return;
    const view = typeof window.currentView !== 'undefined' ? window.currentView : 'checkout';
    if      (view === 'checkout')  addProductByBarcode(barcode);
    else if (view === 'inventory') handleInventoryScan(barcode);
    else {
        if (typeof showToast   === 'function') showToast(t('scannerInactive'), 'warning');
        if (typeof playWarning === 'function') playWarning();
    }
}
