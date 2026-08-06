// ============================================================
// PRINT: Direct Print - Single Method (No Popup)
// ============================================================

// ============================================================
// ENSURE GLOBAL REGISTRATION
// ============================================================
console.log('🖨️ print.js loading...');

// Register printCart function immediately
if (typeof window.printCart !== 'function') {
    window.printCart = async function() {
        console.log('🖨️ printCart called via window');
        await printReceipt(null);
    };
}

// ============================================================
// GET CART DATA
// ============================================================
function getCartData() {
    if (typeof window.cart !== 'undefined' && window.cart) {
        if (Array.isArray(window.cart) && window.cart.length > 0) {
            return window.cart;
        }
    }
    if (typeof window.getCart === 'function') {
        const cart = window.getCart();
        if (cart && Array.isArray(cart) && cart.length > 0) {
            return cart;
        }
    }
    return [];
}

// ============================================================
// BUILD SALE DATA FROM CART
// ============================================================
function buildSaleDataFromCart(cartItems) {
    if (!cartItems || cartItems.length === 0) {
        return null;
    }
    
    let subtotal = 0;
    const items = cartItems.map(item => {
        const hasReduction = item.reducedPrice !== null && item.reducedPrice !== undefined && item.reducedPrice < item.price;
        const price = hasReduction ? item.reducedPrice : item.price;
        const qty = item.qty || 1;
        subtotal += price * qty;
        return {
            name: item.name || 'Produit',
            reference: item.reference || '—',
            qty: qty,
            originalPrice: item.price || 0,
            reducedPrice: hasReduction ? item.reducedPrice : null,
            soldPrice: price
        };
    });
    
    const grandTotal = subtotal;
    
    let customerName = t('regularCustomer');
    const customerNameEl = document.getElementById('checkout-customer-name');
    if (customerNameEl) {
        customerName = customerNameEl.textContent || t('regularCustomer');
    }
    
    let isDebt = false;
    const paymentStatusDisplay = document.getElementById('payment-status-display');
    if (paymentStatusDisplay) {
        const statusText = paymentStatusDisplay.textContent || '';
        if (statusText.includes(t('notPaid')) || statusText.includes('❌')) {
            isDebt = true;
        }
    }
    
    return {
        items: items,
        subtotal: subtotal,
        grandTotal: grandTotal,
        isDebt: isDebt,
        remainingAmount: isDebt ? grandTotal : 0,
        customerName: customerName,
        amountPaid: isDebt ? 0 : grandTotal
    };
}

// ============================================================
// CREATE PRINTABLE RECEIPT HTML (NO AUTO-CLOSE SCRIPT)
// ============================================================
function createReceiptHTML(finalSaleData) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR');
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const currency = 'DA';
    const shopName = (typeof getShopName === 'function') ? getShopName() : 'SAMTEX CHABET';
    const showLogo    = window.__printLogoEnabled !== false;
    const showVAT     = window.__printVATDetailsEnabled === true;
    const showQR      = window.__printQREnabled === true;
    const vatRate     = (typeof settings !== 'undefined' && settings.vatRate) ? settings.vatRate : 0;
    
    let itemsHTML = '';
    finalSaleData.items.forEach((item) => {
        const original = item.originalPrice || item.soldPrice || 0;
        const reduced = (item.reducedPrice !== null && item.reducedPrice !== undefined) ? item.reducedPrice : null;
        const unitPrice = reduced !== null ? reduced : original;
        const qty = item.qty || 1;
        const lineTotal = unitPrice * qty;
        const name = item.name || 'Produit';
        const reference = item.reference || '—';
        
        const priceDisplay = reduced !== null 
            ? `<span class="strike">${original.toFixed(0)}</span> ${reduced.toFixed(0)}`
            : `${original.toFixed(0)}`;
        
        const variantDisplay = item.variantName ? `<span class="item-variant">🎨 ${item.variantName}</span>` : '';
        itemsHTML += `
            <div class="item">
                <span class="item-ref">${reference}</span>
                <span class="item-name">${name}${variantDisplay}</span>
                <span class="item-price">${priceDisplay}×${qty}</span>
                <span class="item-total">${lineTotal.toFixed(0)}</span>
            </div>
        `;
    });
    
    const grandTotal = finalSaleData.grandTotal || 0;
    const isDebt = finalSaleData.isDebt || false;
    const customerName = finalSaleData.customerName || t('regularCustomer');
    const amountPaid = finalSaleData.amountPaid || 0;
    const remainingAmount = finalSaleData.remainingAmount || 0;
    const totalItems = finalSaleData.items.reduce((sum, item) => sum + (item.qty || 1), 0);

    // Settings: printQREnabled — QR code sur le ticket (n° ticket + date + total)
    let qrHTML = '';
    if (showQR && typeof window.qrToTable === 'function') {
        const qrPayload = [
            shopName,
            'Date: ' + dateStr + ' ' + timeStr,
            'Total: ' + grandTotal.toFixed(0) + ' ' + currency,
            '#N' + String(Math.floor(Date.now() / 1000)).slice(-6)
        ].join(' | ');
        const qrTable = window.qrToTable(qrPayload);
        qrHTML = `
            <div class="qr-wrapper">
                ${qrTable}
                <div class="qr-caption">SCAN ME</div>
            </div>
        `;
    }
    
    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Reçu</title>
<style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
        margin:0;
        padding:3mm 6mm;
        background:#fff;
        color:#000;
        font-family: 'Courier New', Courier, monospace;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        font-size:9pt;
    }
    .receipt {
        max-width:100%;
        margin:0 auto;
    }
    .center { text-align:center; }
    .bold { font-weight:700; }
    .strike { text-decoration:line-through; color:#999; font-size:9pt; }
    .rule { border:none; border-top:1px solid #000; margin:2px 0; }
    .rule-dashed { border:none; border-top:1px dashed #999; margin:2px 0; }
    .rule-thick { border:none; border-top:2px solid #000; margin:3px 0; }
    
    /* HEADER */
    .band {
        text-align:center;
        padding-bottom:2px;
        margin-bottom:3px;
        border-bottom:2px double #000;
    }
    .band .shop-name { 
        font-size:14pt; 
        font-weight:900; 
        letter-spacing:1px;
    }
    .band .shop-logo {
        font-size:16pt;
        font-weight:900;
        letter-spacing:1px;
        background:#000;
        color:#fff;
        display:inline-block;
        padding:2px 10px;
        margin-bottom:2px;
    }
    .vat-details {
        font-size:8pt;
        padding:2px 4px;
        border-bottom:1px solid #000;
        margin-bottom:2px;
    }
    .band .tagline { 
        font-size:8pt; 
        font-weight:600;
        letter-spacing:0.5px;
    }
    .band .datetime {
        font-size:8pt;
        margin-top:1px;
    }
    
    /* CUSTOMER */
    .customer-row {
        display:flex;
        justify-content:space-between;
        padding:1px 0;
        font-size:9pt;
        border-bottom:1px solid #000;
        margin-bottom:2px;
    }
    .customer-row .label { font-weight:600; }
    .customer-row .value { font-weight:700; }
    
    /* ITEMS */
    .item {
        display:flex;
        justify-content:space-between;
        align-items:center;
        padding:1.5px 0;
        border-bottom:1px dotted #ddd;
        font-size:9pt;
        gap:1px;
    }
    .item:last-child {
        border-bottom:1px solid #000;
    }
    .item-ref {
        flex: 0 0 12%;
        font-size:9pt;
        font-weight:600;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
    }
    .item-name {
        flex: 1 1 auto;
        font-size:9pt;
        font-weight:600;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
        padding:0 2px;
    }
    .item-price {
        flex: 0 0 24%;
        font-size:9pt;
        text-align:center;
        white-space:nowrap;
    }
    .item-total {
        flex: 0 0 12%;
        font-size:9pt;
        text-align:right;
        font-weight:700;
        white-space:nowrap;
    }
    
    .items-count {
        text-align:right;
        font-size:7pt;
        color:#666;
        padding:1px 0;
        margin-top:1px;
    }
    
    /* TOTALS */
    .grand-total {
        border-top:2px double #000;
        border-bottom:2px double #000;
        padding:2px 4px;
        margin:2px 0;
        font-size:12pt;
        font-weight:900;
        display:flex;
        justify-content:space-between;
        background:#f5f5f5;
    }
    .debt-amount {
        font-size:9pt;
        font-weight:700;
        text-align:center;
        padding:1.5px;
        color:#c92a2a;
        border:1px solid #ff6b6b;
        margin:1.5px 0;
        background:transparent;
    }
    .paid-amount {
        font-size:9pt;
        font-weight:700;
        text-align:center;
        padding:1.5px;
        color:#2b8a3e;
        border:1px solid #51cf66;
        margin:1.5px 0;
        background:transparent;
    }
    
    /* STATUS */
    .status {
        text-align:center;
        font-weight:900;
        font-size:11pt;
        letter-spacing:1px;
        padding:2px;
        border:2px solid #000;
        margin:2px 0;
        background:#f0f0f0;
    }
    .status.paid {
        color:#2b8a3e;
        border-color:#2b8a3e;
        background:#e6f7e6;
    }
    .status.debt {
        color:#c92a2a;
        border-color:#c92a2a;
        background:#fde8e8;
    }
    
    /* FOOTER */
    .footer {
        margin-top:3px;
        text-align:center;
        border-top:1px solid #000;
        padding-top:2px;
    }
    .footer .thanks {
        font-size:10pt;
        font-weight:900;
    }
    .footer .small {
        font-size:7pt;
        color:#666;
    }
    .footer .number {
        font-size:7pt;
        color:#999;
    }
    
    .stars {
        text-align:center;
        font-size:7pt;
        color:#888;
        letter-spacing:2px;
        padding:1px 0;
    }

    .qr-wrapper {
        text-align:center;
        margin:3px 0;
        padding:2px;
        border:1px solid #000;
    }
    .qr-wrapper .qr-grid {
        image-rendering: pixelated;
        width: 96px;
        height: 96px;
        margin: 0 auto;
    }
    .qr-caption {
        font-size:7pt;
        font-weight:700;
        letter-spacing:2px;
        margin-top:1px;
    }

    @page {
        size: auto;
        margin: 0;
    }
    @media print {
        body { padding: 3mm 6mm; }
        .item { break-inside: avoid; }
    }
</style>
</head>
<body>
<div class="receipt">
    <!-- HEADER -->
    <div class="band">
        ${showLogo ? `
        <div class="shop-logo">🪡 ${shopName}</div>
        <div class="tagline">✦ TICKET DE CAISSE ✦</div>
        <div class="datetime">${dateStr}  ${timeStr}</div>
        ` : `
        <div class="tagline">✦ TICKET DE CAISSE ✦</div>
        <div class="datetime">${dateStr}  ${timeStr}</div>
        `}
    </div>
    
    <!-- CUSTOMER -->
    <div class="customer-row">
        <span class="label">Client</span>
        <span class="value">${customerName}</span>
    </div>
    
    <hr class="rule">
    
    <!-- ITEMS HEADER -->
    <div style="display:flex;justify-content:space-between;font-size:9pt;font-weight:700;padding:1px 0;border-bottom:1px solid #000;background:#f5f5f5;">
        <span style="flex:0 0 12%;">Réf</span>
        <span style="flex:1 1 auto;padding-left:2px;">Article</span>
        <span style="flex:0 0 24%;text-align:center;">Prix</span>
        <span style="flex:0 0 12%;text-align:right;">Total</span>
    </div>
    
    <!-- ITEMS -->
    ${itemsHTML}
    
    <div class="items-count">${totalItems} article${totalItems > 1 ? 's' : ''}</div>
    
    <!-- TOTALS -->
    <div class="grand-total">
        <span>TOTAL</span>
        <span>${grandTotal.toFixed(0)} ${currency}</span>
    </div>
    ${showVAT && vatRate > 0 ? `
        <div class="vat-details">
            <div style="display:flex;justify-content:space-between;">
                <span>Total HT</span>
                <span>${(grandTotal / (1 + vatRate / 100)).toFixed(2)} ${currency}</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
                <span>TVA ${vatRate}%</span>
                <span>${(grandTotal - grandTotal / (1 + vatRate / 100)).toFixed(2)} ${currency}</span>
            </div>
        </div>
    ` : ''}
    ${isDebt ? `
        <div class="debt-amount">⚠ RESTE : ${remainingAmount.toFixed(0)} ${currency}</div>
    ` : `
        <div class="paid-amount">✓ PAYÉ : ${amountPaid.toFixed(0)} ${currency}</div>
    `}
    ${qrHTML}
    
    <!-- STATUS -->
    <hr class="rule-thick">
    <div class="status ${isDebt ? 'debt' : 'paid'}">
        ${isDebt ? t('notPaid').toUpperCase() : t('paid').toUpperCase()}
    </div>
    <hr class="rule-thick">
    
    <div class="stars">✦ ✦ ✦ ✦ ✦</div>
    
    <!-- FOOTER -->
    <div class="footer">
        <div class="thanks">MERCI !</div>
        <div class="small">À bientôt</div>
        <div class="number">#${String(Math.floor(Date.now() / 1000)).slice(-6)}</div>
    </div>
</div>
</body>
</html>`;
}

// ============================================================
// PRINT OVERLAY — impression sans <iframe>
// ============================================================
// Chromium logue "Unsafe attempt to load URL file://..." dès qu'une page
// ouverte via file:// contient une <iframe>. On évite toute <frame> : on injecte
// une <div> pleine page dans le document courant, on imprime via window.print(),
// puis on retire la <div>. VR ›@media print› ne garde que l'overlay visible.

function _stripDocShell(html) {
    return String(html)
        .replace(/^<!DOCTYPE[^>]*>/i, '')
        .replace(/<html[^>]*>/gi, '')
        .replace(/<\/html>/gi, '')
        .replace(/<head[^>]*>/gi, '')
        .replace(/<\/head>/gi, '')
        .replace(/<body[^>]*>/gi, '')
        .replace(/<\/body>/gi, '');
}

function insertPrintOverlay(receiptHTML) {
    removePrintOverlay();
    const injectCss = [
        '@media screen { #print-printRegion { display:none !important; width:0 !important; height:0 !important; } }',
        '@media print {',
        '  body > *:not(#print-printRegion) { display:none !important; }',
        '  #print-printRegion { display:block !important; }',
        '}'
    ].join('\n');
    const wrapper = document.createElement('div');
    wrapper.id = 'print-printRegion';
    wrapper.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;overflow:visible;';
    wrapper.innerHTML = '<style>' + injectCss + '</style>' + _stripDocShell(receiptHTML);
    document.body.appendChild(wrapper);
}

function removePrintOverlay() {
    const el = document.getElementById('print-printRegion');
    if (el && el.parentNode) el.parentNode.removeChild(el);
}

// ============================================================
// GET OR CREATE PRINT IFRAME (SINGLE INSTANCE)
// ============================================================
let printIframe = null;

function getPrintIframe() {
    if (!printIframe) {
        printIframe = document.createElement('iframe');
        printIframe.id = 'print-iframe';
        printIframe.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:0;height:0;border:none;';
        document.body.appendChild(printIframe);
        console.log('🖨️ Print iframe created');
    }
    return printIframe;
}

// ============================================================
// DIRECT PRINT - SINGLE METHOD (NO POPUP)
// ============================================================
async function printReceipt(saleData) {
    try {
        console.log('🖨️ Direct printing...');
        
        let finalSaleData = null;
        
        if (saleData && saleData.items && saleData.items.length > 0) {
            finalSaleData = saleData;
        } else {
            const cartItems = getCartData();
            if (cartItems && cartItems.length > 0) {
                finalSaleData = buildSaleDataFromCart(cartItems);
            } else {
                if (typeof window.dbGetAll === 'function') {
                    try {
                        const sales = await window.dbGetAll('sales');
                        if (sales && sales.length > 0) {
                            const lastSale = sales[sales.length - 1];
                            if (lastSale.items && lastSale.items.length > 0) {
                                finalSaleData = {
                                    items: lastSale.items.map(item => ({
                                        name: item.name || 'Produit',
                                        reference: item.reference || '—',
                                        qty: item.qty || 1,
                                        originalPrice: item.originalPrice || item.soldPrice || 0,
                                        reducedPrice: (item.reducedPrice !== null && item.reducedPrice !== undefined && item.reducedPrice < item.originalPrice) ? item.reducedPrice : null,
                                        soldPrice: item.soldPrice || item.originalPrice || 0,
                                        variantName: item.variantName || undefined
                                    })),
                                    grandTotal: lastSale.grandTotal || 0,
                                    subtotal: lastSale.subtotal || 0,
                                    amountPaid: lastSale.amountPaid || 0,
                                    isDebt: lastSale.isDebt || false,
                                    remainingAmount: lastSale.remainingAmount || 0,
                                    customerName: lastSale.customerName || t('regularCustomer')
                                };
                            }
                        }
                    } catch (dbError) {
                        console.error('DB error:', dbError);
                    }
                }
            }
        }
        
        if (!finalSaleData || !finalSaleData.items || finalSaleData.items.length === 0) {
            showToast(t('noArticlesPrint'), 'error');
            return { success: false };
        }
        
        // Create the receipt HTML (without any auto-print or auto-close scripts)
        const receiptHTML = createReceiptHTML(finalSaleData);

        // Impression via une <div> pleine page dans le document courant (pas de
        // <iframe>) : sur une page ouverte via file://, Chromium logue
        // "Unsafe attempt to load URL file://... from frame with URL file://..."
        // dès qu'un iframe existe. Avec un overlay + window.print(), plus d'iframe.
        insertPrintOverlay(receiptHTML);

        // Print after content loads
        const printTwice = window.__printTwoCopies === true;
        setTimeout(function() {
            try {
                window.print();
                if (printTwice) {
                    setTimeout(function() {
                        try {
                            window.print();
                        } catch (e2) {
                            console.error('Second print error:', e2);
                        }
                    }, 700);
                }
                removePrintOverlay();
                showToast(t('printSent'), 'success');
            } catch (e) {
                removePrintOverlay();
                console.error('Print error:', e);
                showToast(t('printError'), 'error');
            }
        }, 300);
        
        return { success: true };
        
    } catch (error) {
        console.error('Print error:', error);
        showToast(t('error') + ': ' + error.message, 'error');
        return { success: false };
    }
}

// ============================================================
// REPRINT FROM HISTORY
// ============================================================
window.printSale = async function(sale) {
    if (!sale || !sale.items) {
        showToast(t('printFunctionUnavailable'), 'error');
        return;
    }
    let items = sale.items;
    if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch { items = []; }
    }
    if (!items || items.length === 0) {
        showToast(t('noArticlesPrint'), 'error');
        return;
    }
    const printData = {
        items: items.map(item => ({
            name: item.name || 'Produit',
            reference: item.reference || item.barcode || '—',
            qty: item.qty || item.quantity || 1,
            originalPrice: item.originalPrice || item.soldPrice || item.price || 0,
            reducedPrice: (item.reducedPrice !== null && item.reducedPrice !== undefined && item.reducedPrice < (item.originalPrice || item.soldPrice || item.price)) ? item.reducedPrice : null,
            soldPrice: item.soldPrice || item.price || 0,
            variantName: item.variantName || undefined
        })),
        grandTotal: sale.grandTotal || 0,
        subtotal: sale.subtotal || 0,
        amountPaid: sale.amountPaid || 0,
        isDebt: sale.isDebt || false,
        remainingAmount: sale.remainingAmount || 0,
        customerName: sale.customerName || t('regularCustomer')
    };
    await printReceipt(printData);
};

// ============================================================
// EXPOSE FUNCTIONS
// ============================================================
window.printReceipt = printReceipt;
window.printCart = async function() {
    console.log('🖨️ printCart called - Direct print');
    await printReceipt(null);
};
window.testPrint = async function() {
    console.log('🖨️ testPrint called');
    const testData = {
        grandTotal: 1510,
        amountPaid: 1510,
        isDebt: false,
        remainingAmount: 0,
        customerName: 'Fatima Benali',
        items: [
            { name: 'Mouchoir 50pcs', reference: 'MO-050', qty: 2, originalPrice: 150, reducedPrice: null },
            { name: 'Écharpe en soie', reference: 'EC-SOIE-12', qty: 1, originalPrice: 950, reducedPrice: 850 },
            { name: 'Ruban satiné 3m', reference: 'RB-SAT-3M', qty: 3, originalPrice: 120, reducedPrice: null },
            { name: 'Boutons perle lot', reference: 'BP-010', qty: 4, originalPrice: 85, reducedPrice: 75 }
        ]
    };
    await printReceipt(testData);
};

console.log('🖨️ Print module loaded - SINGLE METHOD (No Popup)');
console.log('💡 Type testPrint() to test');
console.log('💡 Type printCart() to print current cart');
console.log('💡 Press Down Arrow ⬇️ to print');