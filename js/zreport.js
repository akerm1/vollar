// ============================================================
// Z-REPORT: Daily Cash Register Closure (Rapport Z)
// ============================================================

// ============================================================
// CHECK IF A DAY IS LOCKED (has a Z-report)
// ============================================================
async function isDayLocked(dateString) {
    try {
        const reports = await dbGetAll('zreports');
        return reports.some(function(r) {
            return r.date === dateString && r.locked === true;
        });
    } catch (e) {
        console.error('isDayLocked error:', e);
        return false;
    }
}

// ============================================================
// CHECK DAY LOCK FROM A TIMESTAMP — used by analytics-view guards
// Returns true if the sale's date is locked.
// ============================================================
async function checkDayLock(saleTimestamp) {
    if (!saleTimestamp) return false;
    const dateKey = new Date(saleTimestamp).toISOString().split('T')[0];
    return await isDayLocked(dateKey);
}

// ============================================================
// GET TODAY'S DATE STRING (YYYY-MM-DD)
// ============================================================
function _todayString() {
    return new Date().toISOString().split('T')[0];
}

// ============================================================
// GENERATE Z-REPORT FOR TODAY
// Builds the report from all sales on the current day, stores
// it in the zreports store, and returns the report object.
// ============================================================
async function generateZReport() {
    const todayKey = _todayString();
    const sales = await dbGetAll('sales');

    const todaySales = sales.filter(function(s) {
        const d = new Date(s.timestamp);
        return d.toISOString().split('T')[0] === todayKey;
    });

    let totalRevenue = 0;
    let totalCost = 0;
    let totalProfit = 0;
    let totalSalesCount = 0;
    let totalItems = 0;
    let totalDiscounts = 0;
    const paymentBreakdown = {};
    (typeof window.getConfiguredPaymentMethods === 'function' ? window.getConfiguredPaymentMethods() : []).forEach(function(m) {
        paymentBreakdown[m.id] = 0;
    });
    let totalPaid = 0;
    let totalRemaining = 0;

    for (const sale of todaySales) {
        const result = await calculateActualRevenueAndProfit(sale);
        if (result.actualRevenue > 0) {
            totalRevenue += result.actualRevenue;
            totalProfit += result.actualProfit;
            totalSalesCount++;
            totalItems += sale.items.reduce(function(sum, item) {
                return sum + (item.qty || 0);
            }, 0);
            totalPaid += result.amountPaid || 0;
            totalRemaining += result.remainingAmount || 0;
            totalDiscounts += sale.discount || 0;

            const pm = sale.paymentMethod || 'especes';
            if (!paymentBreakdown.hasOwnProperty(pm)) paymentBreakdown[pm] = 0;
            paymentBreakdown[pm] += result.actualRevenue;
        }
    }

    totalCost = totalRevenue - totalProfit;

    const openingFloat = (typeof settings !== 'undefined' && settings.openingFloat) ? parseFloat(settings.openingFloat) || 0 : 0;

    const report = {
        date: todayKey,
        generatedAt: new Date().toISOString(),
        locked: true,
        openingFloat: openingFloat,
        totalRevenue: totalRevenue,
        totalCost: totalCost,
        totalProfit: totalProfit,
        totalSalesCount: totalSalesCount,
        totalItems: totalItems,
        totalPaid: totalPaid,
        totalRemaining: totalRemaining,
        totalDiscounts: totalDiscounts,
        paymentBreakdown: paymentBreakdown,
        cashInDrawer: openingFloat + paymentBreakdown.especes - (paymentBreakdown.credit || 0)
    };

    await dbPut('zreports', report);
    console.log('✅ Z-Report generated and stored:', report);
    return report;
}

// ============================================================
// GET Z-REPORT HISTORY (sorted newest first)
// ============================================================
async function getZReportHistory() {
    const reports = await dbGetAll('zreports');
    return reports.sort(function(a, b) {
        return (b.date || '').localeCompare(a.date || '');
    });
}

// ============================================================
// CREATE PRINTABLE HTML FOR Z-REPORT
// ============================================================
function _zreportPaymentRows(paymentBreakdown) {
    paymentBreakdown = paymentBreakdown || {};
    const methods = (typeof window.getConfiguredPaymentMethods === 'function') ? window.getConfiguredPaymentMethods() : [];
    const known = {};
    methods.forEach(function(m) { known[m.id] = true; });
    const rows = methods.map(function(m) {
        return '<div class="row"><span class="label">' + (m.icon || '💳') + ' ' + (m.label || m.id) + ':</span><span class="value">' + ((paymentBreakdown[m.id] || 0)).toFixed(2) + ' DA</span></div>';
    });
    Object.keys(paymentBreakdown).forEach(function(id) {
        if (!known[id] && (paymentBreakdown[id] || 0) > 0) {
            rows.push('<div class="row"><span class="label">💳 ' + id + ':</span><span class="value">' + (paymentBreakdown[id] || 0).toFixed(2) + ' DA</span></div>');
        }
    });
    return rows.join('');
}

function createZReportHTML(report) {
    const dateDisplay = report.date
        ? new Date(report.date + 'T12:00:00').toLocaleDateString('fr-FR', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        })
        : 'Date inconnue';
    const generatedDisplay = report.generatedAt
        ? new Date(report.generatedAt).toLocaleString('fr-FR')
        : '—';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Rapport Z - ${report.date}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Courier New', monospace;
                font-size: 13px;
                width: 80mm;
                padding: 4mm;
                color: #000;
                line-height: 1.5;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .big { font-size: 16px; }
            .separator { border-top: 1px dashed #000; margin: 4mm 0; }
            .double-separator { border-top: 2px solid #000; margin: 4mm 0; }
            .row { display: flex; justify-content: space-between; padding: 2px 0; }
            .row .label { flex: 1; }
            .row .value { text-align: right; font-weight: bold; }
            .section-title { font-weight: bold; font-size: 13px; margin: 3mm 0 2mm 0; text-decoration: underline; }
            @media print {
                body { width: 80mm; padding: 3mm; }
            }
        </style>
    </head>
    <body>
        <div class="center">
            <div class="big bold">RAPPORT Z</div>
            <div class="bold">Clôture de caisse</div>
            <div>${dateDisplay}</div>
            <div style="font-size:11px;">Généré le ${generatedDisplay}</div>
        </div>

        <div class="separator"></div>

        <div class="section-title">OUVERTURE</div>
        <div class="row">
            <span class="label">Fond de caisse:</span>
            <span class="value">${(report.openingFloat || 0).toFixed(2)} DA</span>
        </div>

        <div class="double-separator"></div>

        <div class="section-title">RÉSUMÉ DES VENTES</div>
        <div class="row">
            <span class="label">Nombre de ventes:</span>
            <span class="value">${report.totalSalesCount || 0}</span>
        </div>
        <div class="row">
            <span class="label">Articles vendus:</span>
            <span class="value">${report.totalItems || 0}</span>
        </div>
        <div class="row">
            <span class="label">Recette totale:</span>
            <span class="value">${(report.totalRevenue || 0).toFixed(2)} DA</span>
        </div>
        <div class="row">
            <span class="label">${t('purchaseCostLabel')}</span>
            <span class="value">${(report.totalCost || 0).toFixed(2)} DA</span>
        </div>
        <div class="row">
            <span class="label">Bénéfice net:</span>
            <span class="value">${(report.totalProfit || 0).toFixed(2)} DA</span>
        </div>
        <div class="row">
            <span class="label">Remises / Promos:</span>
            <span class="value" style="color:#e74c3c;">-${(report.totalDiscounts || 0).toFixed(2)} DA</span>
        </div>

        <div class="double-separator"></div>

        <div class="section-title">DÉTAIL PAR MOYEN DE PAIEMENT</div>
        ${_zreportPaymentRows(report.paymentBreakdown)}

        <div class="double-separator"></div>

        <div class="section-title">SOLDE CAISSE</div>
        <div class="row">
            <span class="label">Fond de caisse:</span>
            <span class="value">${(report.openingFloat || 0).toFixed(2)} DA</span>
        </div>
        <div class="row">
            <span class="label">+ Espèces reçues:</span>
            <span class="value">${(report.paymentBreakdown.especes || 0).toFixed(2)} DA</span>
        </div>
        <div class="row">
            <span class="label">− Crédit accordé:</span>
            <span class="value">−${(report.paymentBreakdown.credit || 0).toFixed(2)} DA</span>
        </div>
        <div class="separator"></div>
        <div class="row bold big">
            <span class="label">💵 TOTAL EN CAISSE:</span>
            <span class="value">${(report.cashInDrawer || 0).toFixed(2)} DA</span>
        </div>

        <div class="double-separator"></div>

        <div class="section-title">ENCAISSÉ vs DÛ</div>
        <div class="row">
            <span class="label">Total encaissé:</span>
            <span class="value">${(report.totalPaid || 0).toFixed(2)} DA</span>
        </div>
        <div class="row">
            <span class="label">Reste à recevoir:</span>
            <span class="value">${(report.totalRemaining || 0).toFixed(2)} DA</span>
        </div>

        <div class="double-separator"></div>

        <div class="center" style="font-size:11px;margin-top:4mm;">
            <div>Merci pour votre travail !</div>
            <div class="bold">— ${(typeof getShopName === 'function') ? getShopName() : 'POS'} —</div>
        </div>
    </body>
    </html>`;
}

// ============================================================
// PRINT Z-REPORT (reuses the iframe pattern from print.js)
// ============================================================
function printZReport(report) {
    if (!report) {
        showToast(t('noReportToPrint'), 'error');
        return;
    }
    const html = createZReportHTML(report);

    // Impression sans <iframe> : sur une page file://, Chromium logue
    // "Unsafe attempt to load URL file://..." dès qu'un iframe existe.
    // On injecte une <div> pleine page et on imprime le document courant.
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
    wrapper.innerHTML = '<style>' + injectCss + '</style>' + String(html)
        .replace(/^<!DOCTYPE[^>]*>/i, '')
        .replace(/<html[^>]*>/gi, '').replace(/<\/html>/gi, '')
        .replace(/<head[^>]*>/gi, '').replace(/<\/head>/gi, '')
        .replace(/<body[^>]*>/gi, '').replace(/<\/body>/gi, '');
    document.body.appendChild(wrapper);

    setTimeout(function() {
        try {
            window.print();
            removePrintOverlay();
            showToast(t('zReportPrintSent'), 'success');
        } catch (e) {
            removePrintOverlay();
            console.error('Print Z-report error:', e);
            showToast(t('printError'), 'error');
        }
    }, 400);
}

// ============================================================
// PERFORM CLOSING — main entry point from the button
// Shows confirmation, generates report, prints, refreshes UI
// ============================================================
async function performClosing() {
    const todayKey = _todayString();

    // Check if already locked
    if (await isDayLocked(todayKey)) {
        showToast(t('zReportAlreadyClosed'), 'warning');
        return;
    }

    // Check if there are any sales today
    const sales = await dbGetAll('sales');
    const todaySales = sales.filter(function(s) {
        return new Date(s.timestamp).toISOString().split('T')[0] === todayKey;
    });

    if (todaySales.length === 0) {
        if (!confirm(t('zReportNoSales'))) {
            return;
        }
    } else {
        if (!confirm(
            t('zReportClosingConfirm', {count: todaySales.length})
        )) {
            return;
        }
    }

    try {
        showToast(t('zReportGenerating'), 'info');
        const report = await generateZReport();

        // Print the report
        printZReport(report);

        // Mark all today's sales as locked
        for (const sale of todaySales) {
            sale._dayLocked = true;
            await dbPut('sales', sale);
        }

        showToast(t('zReportDone'), 'success');

        if (typeof logAudit === 'function') {
            await logAudit('Z_REPORT_GENERATED', `Rapport Z du ${todayKey} - ${todaySales.length} vente(s)`);
        }

        // Refresh the UI
        if (typeof window.renderZReportHistory === 'function') {
            await window.renderZReportHistory();
        }
        if (typeof window.refreshAnalytics === 'function') {
            await window.refreshAnalytics();
        }
    } catch (error) {
        console.error('Perform closing error:', error);
        showToast(t('zReportError') + error.message, 'error');
    }
}

// ============================================================
// WINDOW EXPORTS
// ============================================================
window.isDayLocked = isDayLocked;
window.checkDayLock = checkDayLock;
window.generateZReport = generateZReport;
window.getZReportHistory = getZReportHistory;
window.createZReportHTML = createZReportHTML;
window.printZReport = printZReport;
window.performClosing = performClosing;

console.log('🔒 Z-Report module loaded');
