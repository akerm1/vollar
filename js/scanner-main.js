
// ============================================================
// RESET SCANNER
// ============================================================
function resetScanner() {
    try {
        const scannerEl = document.getElementById('scanner-receiver');
        const manualEl  = document.getElementById('manual-barcode');

        if (scannerEl) scannerEl.value = '';
        if (manualEl)  manualEl.value  = '';

        if (barcodeInputTimer)  { clearTimeout(barcodeInputTimer);  barcodeInputTimer  = null; }
        if (searchDebounceTimer){ clearTimeout(searchDebounceTimer); searchDebounceTimer = null; }

        closeSuggestions();

        if (scannerEl) setTimeout(() => { try { scannerEl.focus(); } catch (_) {} }, 50);
        console.log('Scanner reset');
    } catch (err) {
        console.warn('resetScanner error:', err);
    }
}

// ============================================================
// SETUP ENTRY POINT
// ============================================================
function setupScannerListeners() {
    try {
        setupScannerReceiver();
        setupManualBarcode();
        setupKeyboardRedirect(); // NEW: Global keyboard redirect
        console.log('✅ Scanner system ready');
        console.log('   💡 Type any letter → auto-search in manual barcode');
        console.log('   📦 Scan barcode → auto-add to cart');
    } catch (err) {
        console.warn('setupScannerListeners error:', err);
    }
}

// ============================================================
// LEGACY ALIASES (other files may call these)
// ============================================================
async function handleCheckoutScan(input)  { return routeBarcode(input); }
async function processCheckoutScan(input) { return addProductByBarcode(input); }
async function processCompleteBarcode(barcode) {
    const cleaned = cleanBarcode(barcode);
    const view = typeof window.currentView !== 'undefined' ? window.currentView : 'checkout';
    if      (view === 'checkout')  await addProductByBarcode(cleaned);
    else if (view === 'inventory') handleInventoryScan(cleaned);
}

// ============================================================
// EXPOSE GLOBALLY
// ============================================================
window.handleCheckoutScan      = handleCheckoutScan;
window.processCheckoutScan     = processCheckoutScan;
window.processCompleteBarcode  = processCompleteBarcode;
window.getCachedProducts       = getCachedProducts;
window.refreshProductsCache    = refreshProductsCache;
window.fastSearch              = fastSearch;
window.showSearchSuggestions   = showSearchSuggestions;
window.cleanBarcode            = cleanBarcode;
window.resetScanner            = resetScanner;
window.selectSuggestion        = selectSuggestion;
window.unselectSuggestion      = unselectSuggestion;
window.navigateSuggestions     = navigateSuggestions;
window.selectCurrentSuggestion = selectCurrentSuggestion;
window.setupScannerListeners   = setupScannerListeners;
window.routeBarcode            = routeBarcode;
window.addProductByBarcode     = addProductByBarcode;

// double-click indicator resets scanner
try {
    const indicator = document.querySelector('.brand .indicator');
    if (indicator) {
        indicator.addEventListener('dblclick', () => {
            resetScanner();
            if (typeof showToast === 'function') showToast(t('scannerReset'), 'info');
        });
    }
} catch (_) {}

console.log('🚀 scanner.js loaded with keyboard redirect');
