// ============================================================
// ANALYTICS CORE: Core Analytics Functions
// ============================================================

// ============================================================
// IN-MEMORY CACHE - Avoid reprocessing on every tab switch
// ============================================================
let _analyticsCache = {
    processedSales: null,
    metrics: null,
    lastSalesCount: 0,
    lastCustomersCount: 0,
    lastProductsCount: 0,
    debtIndex: null,
    isValid: false
};

function _invalidateAnalyticsCache() {
    _analyticsCache = {
        processedSales: null,
        metrics: null,
        lastSalesCount: 0,
        lastCustomersCount: 0,
        lastProductsCount: 0,
        debtIndex: null,
        isValid: false
    };
}

function _buildDebtIndex(customersData) {
    // Build O(1) lookup: customerId -> Map<saleId, debtEntry>
    const index = new Map();
    customersData.forEach(c => {
        if (c.debts && c.debts.length) {
            const saleMap = new Map();
            c.debts.forEach(d => {
                if (d.saleId) saleMap.set(d.saleId, d);
            });
            if (saleMap.size) index.set(c.id, saleMap);
        }
    });
    return index;
}

// ============================================================
// GLOBAL REFRESH FUNCTION - Call this after any data change
// ============================================================
async function refreshAnalytics() {
    console.log('🔄 Refreshing analytics...');
    _invalidateAnalyticsCache();
    await loadAnalytics();
    if (typeof window.refreshCharts === 'function') {
        await window.refreshCharts();
    }
    console.log('✅ Analytics refreshed successfully');
}

// ============================================================
// GET ACTUAL PAYMENT STATUS FROM CUSTOMER DEBTS
// ============================================================
async function getActualPaymentStatus(sale, customerMap, debtIndex) {
    // First try to check customer debt records (authoritative source)
    if (sale.customerId) {
        try {
            const customer = customerMap ? customerMap.get(sale.customerId) : await dbGet('customers', sale.customerId);
            if (customer && customer.debts) {
                const debtEntry = customer.debts.find(d => d.saleId === sale.id);
                if (debtEntry) {
                    const remainingAmount = debtEntry.remainingAmount || 0;
                    const amountPaid = debtEntry.paidAmount || 0;
                    const isPartial = amountPaid > 0 && remainingAmount > 0;
                    return {
                        isPaid: remainingAmount <= 0,
                        isPartial: isPartial,
                        amountPaid: amountPaid,
                        remainingAmount: remainingAmount,
                        debtEntry: debtEntry
                    };
                }
            }
        } catch (error) {
            console.error('Error checking customer debt:', error);
        }
    }
    
    // Fallback: check the sale's own payment fields
    // This handles sales with no customer that were marked as debt/unpaid,
    // and sales where the customer record doesn't have a matching debt entry.
    const saleIsDebt = sale.isDebt === true;
    const salePaymentStatus = sale.paymentStatus;
    const saleAmountPaid = sale.amountPaid || 0;
    const saleRemaining = sale.remainingAmount || 0;
    const grandTotal = sale.grandTotal || 0;
    
    if (saleIsDebt || salePaymentStatus === 'credit' || salePaymentStatus === 'unpaid') {
        // This sale was explicitly marked as unpaid/debt
        // Recalculate remaining from grandTotal to handle stale data
        const effectiveRemaining = Math.max(0, grandTotal - saleAmountPaid);
        
        if (saleAmountPaid > 0 && effectiveRemaining > 0) {
            // Partial payment
            return {
                isPaid: false,
                isPartial: true,
                amountPaid: saleAmountPaid,
                remainingAmount: effectiveRemaining
            };
        } else if (effectiveRemaining > 0 || saleAmountPaid === 0) {
            // Fully unpaid (no amount paid, or remaining > 0)
            return {
                isPaid: false,
                isPartial: false,
                amountPaid: saleAmountPaid,
                remainingAmount: effectiveRemaining || grandTotal
            };
        }
        // If amountPaid >= grandTotal, sale is effectively settled → fall through to paid
    }
    
    // Fully paid (default)
    return {
        isPaid: true,
        isPartial: false,
        amountPaid: saleAmountPaid || grandTotal,
        remainingAmount: 0
    };
}

// ============================================================
// CALCULATE ACTUAL REVENUE AND PROFIT FOR A SALE
// FIX: Partial payments now count the paid portion toward revenue/profit.
//      Only fully unpaid sales (amountPaid === 0) show 0 revenue/profit.
// ============================================================
async function calculateActualRevenueAndProfit(sale, customerMap) {
    const status = await getActualPaymentStatus(sale, customerMap);
    const grandTotal = sale.grandTotal || 0;
    
    // Fully paid
    if (status.isPaid) {
        return {
            actualRevenue: grandTotal,
            actualProfit: sale.totalProfit || 0,
            isPaid: true,
            isPartial: false,
            remainingAmount: 0,
            amountPaid: grandTotal
        };
    }
    
    // Partially paid — count only the paid portion
    if (status.isPartial) {
        const amountPaid = status.amountPaid || 0;
        const profitRatio = grandTotal > 0 ? (amountPaid / grandTotal) : 0;
        const partialProfit = (sale.totalProfit || 0) * profitRatio;
        return {
            actualRevenue: amountPaid,
            actualProfit: partialProfit,
            isPaid: false,
            isPartial: true,
            remainingAmount: status.remainingAmount,
            amountPaid: amountPaid
        };
    }
    
    // Fully unpaid — 0 revenue, 0 profit
    return {
        actualRevenue: 0,
        actualProfit: 0,
        isPaid: false,
        isPartial: false,
        remainingAmount: status.remainingAmount,
        amountPaid: 0
    };
}

// ============================================================
// GET SALE DISCOUNT INFO - promo discount + per-item manual discount
// ============================================================
function getSaleDiscountInfo(sale) {
    var promoDiscount = sale.discount || 0;
    var manualDiscount = 0;
    var discountedItems = 0;
    var items = sale.items || [];
    for (var i = 0; i < items.length; i++) {
        var it = items[i];
        var diff = (it.originalPrice || 0) - (it.soldPrice != null ? it.soldPrice : (it.originalPrice || 0));
        if (diff > 0) {
            manualDiscount += diff * (it.qty || 0);
            discountedItems++;
        }
    }
    return {
        promo: promoDiscount,
        manual: manualDiscount,
        total: promoDiscount + manualDiscount,
        discountedItems: discountedItems
    };
}

// ============================================================
// LOAD ANALYTICS - Complete with real-time payment status
// ============================================================
async function loadAnalytics() {
    try {
        console.log('📊 Loading analytics with real-time payment tracking...');
        const [sales, products, customersData] = await Promise.all([
            dbGetAll('sales'),
            dbGetAll('products'),
            dbGetAll('customers')
        ]);
        
        // Build customer lookup map once (avoids per-sale dbGet)
        const customerMap = new Map();
        customersData.forEach(c => customerMap.set(c.id, c));
        
        // Build debt index for O(1) payment status lookup
        const debtIndex = _buildDebtIndex(customersData);
        
        // ============================================================
// DATE RANGES
        // ============================================================
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        const startOfWeek = new Date(today);
        const dayOffset = today.getDay() === 0 ? 6 : today.getDay() - 1;
        startOfWeek.setDate(today.getDate() - dayOffset);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        
        // ============================================================
        // CACHE CHECK - Skip reprocess if data unchanged
        // ============================================================
        if (_analyticsCache.isValid &&
            _analyticsCache.lastSalesCount === sales.length &&
            _analyticsCache.lastCustomersCount === customersData.length &&
            _analyticsCache.lastProductsCount === products.length) {
            const cache = _analyticsCache;
            updateMetricCards(cache.metrics);
            updateInventoryMetrics(products);
            updateCard('analytics-total-debt', cache.totalDebtText);
            updateCard('analytics-customers-with-debt', cache.customersWithDebt);
            if (cache.mainTableHtml) {
                const tbody = document.getElementById('analytics-table-body');
                if (tbody) tbody.innerHTML = cache.mainTableHtml;
            }
            await updateLastSoldItems(cache.processedSales, customerMap, true, debtIndex);
            const scheduleIdle = (fn) => {
                if (window.requestIdleCallback) requestIdleCallback(fn, { timeout: 2000 });
                else setTimeout(fn, 0);
            };
            scheduleIdle(() => renderDailyBreakdown(cache.processedSales));
            scheduleIdle(() => renderPaymentDetails(cache.processedSales));
            console.log('✅ Analytics loaded from cache (data unchanged)');
            return;
        }
        
        // ============================================================
        // PROCESS EACH SALE WITH REAL-TIME PAYMENT STATUS (parallel)
        // ============================================================
        sales.forEach(s => { s._ts = new Date(s.timestamp).getTime(); });
        const sortedSales = sales.sort((a, b) => b._ts - a._ts);
        
        const results = await Promise.all(sortedSales.map(sale =>
            calculateActualRevenueAndProfit(sale, customerMap, debtIndex)
        ));
        const processedSales = [];
        
        let totalRevenue = 0, totalItemsSold = 0, totalProfit = 0, totalSales = 0;
        let todayRevenue = 0, todayProfit = 0, todayItemsSold = 0, todaySales = 0;
        let weekRevenue = 0, weekProfit = 0, weekItemsSold = 0, weekSales = 0;
        let monthRevenue = 0, monthProfit = 0, monthItemsSold = 0, monthSales = 0;
        
        const todayMs = today.getTime();
        const tomorrowMs = todayMs + 86400000;
        const startOfWeekMs = startOfWeek.getTime();
        const endOfWeekMs = endOfWeek.getTime();
        const startOfMonthMs = startOfMonth.getTime();
        const endOfMonthMs = endOfMonth.getTime();
        
        for (let i = 0; i < sortedSales.length; i++) {
            const sale = sortedSales[i];
            const result = results[i];
            sale._actualRevenue = result.actualRevenue;
            sale._actualProfit = result.actualProfit;
            sale._isPaid = result.isPaid;
            sale._isPartial = result.isPartial;
            sale._remainingAmount = result.remainingAmount;
            sale._amountPaid = result.amountPaid;
            processedSales.push(sale);
            
            if (result.actualRevenue > 0) {
                totalRevenue += result.actualRevenue;
                totalProfit += result.actualProfit;
                totalSales++;
                
                let itemCount = 0;
                const items = sale.items;
                for (let j = 0; j < items.length; j++) {
                    itemCount += items[j].qty || 0;
                }
                totalItemsSold += itemCount;
                
                const ts = sale._ts;
                if (ts >= todayMs && ts < tomorrowMs) {
                    todayRevenue += result.actualRevenue;
                    todayProfit += result.actualProfit;
                    todayItemsSold += itemCount;
                    todaySales++;
                }
                if (ts >= startOfWeekMs && ts <= endOfWeekMs) {
                    weekRevenue += result.actualRevenue;
                    weekProfit += result.actualProfit;
                    weekItemsSold += itemCount;
                    weekSales++;
                }
                if (ts >= startOfMonthMs && ts <= endOfMonthMs) {
                    monthRevenue += result.actualRevenue;
                    monthProfit += result.actualProfit;
                    monthItemsSold += itemCount;
                    monthSales++;
                }
            }
        }
        
        // ============================================================
        // RENDER SALES TABLE
        // ============================================================
        const tbody = document.getElementById('analytics-table-body');
        let mainTableHtml = '';
        if (tbody) {
            const customerMapForTable = new Map();
            processedSales.forEach(sale => {
                const cust = sale.customerName || 'Client régulier';
                if (!customerMapForTable.has(cust)) customerMapForTable.set(cust, []);
                customerMapForTable.get(cust).push(sale);
            });
            
            const parts = [];
            let grandTotalRevenue = 0;
            let grandTotalProfit = 0;
            
            customerMapForTable.forEach((salesForCustomer, cust) => {
                parts.push('<tr class="customer-group-header"><td colspan="10"><strong>' + cust + '</strong></td></tr>');
                let customerTotalRevenue = 0;
                let customerTotalProfit = 0;
                
                salesForCustomer.forEach(sale => {
                    const saleDate = new Date(sale.timestamp);
                    const formattedDate = saleDate.toLocaleString('fr-FR');
                    const items = sale.items;
                    let itemSummary = '';
                    for (let j = 0; j < items.length; j++) {
                        if (j > 0) itemSummary += ', ';
                        const it = items[j];
                        itemSummary += it.name + '×' + it.qty;
                        if (it.soldPrice != null && it.originalPrice != null && it.soldPrice < it.originalPrice) {
                            const lineDisc = (it.originalPrice - it.soldPrice) * (it.qty || 0);
                            itemSummary += ' (−' + lineDisc.toFixed(2) + ')';
                        }
                    }
                    const quickBadge = sale.quickCustomerSale ? '<span class="quick-sale-badge">⚡</span>' : '';
                    
                    const actualRevenue = sale._actualRevenue || 0;
                    const actualProfit = sale._actualProfit || 0;
                    const isPaid = sale._isPaid === true;
                    const isPartial = sale._isPartial === true;
                    const remainingAmount = sale._remainingAmount || 0;
                    const amountPaid = sale._amountPaid || 0;
                    
                    const discInfo = getSaleDiscountInfo(sale);
                    const discBadge = discInfo.total > 0
                        ? '<span class="an-badge an-badge-promo" title="Remise totale : ' + discInfo.total.toFixed(2) + ' ' + settings.currency + ' (' + discInfo.discountedItems + ' article(s) concerné(s))">🏷️ −' + discInfo.total.toFixed(2) + '</span>'
                        : '';
                    
                    customerTotalRevenue += actualRevenue;
                    customerTotalProfit += actualProfit;
                    grandTotalRevenue += actualRevenue;
                    grandTotalProfit += actualProfit;
                    
                    let statusText = '✅ Payé', statusClass = 'status-paid';
                    if (!isPaid) {
                        if (isPartial) { statusText = '⏳ Partiel'; statusClass = 'status-partial'; }
                        else { statusText = '⚠️ Non Payé'; statusClass = 'status-debt'; }
                    }
                    
                    const unpaidBadge = !isPaid && !isPartial ? '<span class="an-badge an-badge-unpaid">Non payé</span>' : '';
                    const partBadge = isPartial ? '<span class="an-badge an-badge-partial">Partiel</span>' : '';
                    const paidDebtBadge = isPaid && sale.isDebt ? '<span class="an-badge an-badge-paid">Payée</span>' : '';
                    
                    const rowClass = 'analytics-sale-row' + (sale.quickCustomerSale ? ' quick-sale-row' : '') + (isPaid ? ' debt-paid' : ' debt-unpaid');
                    const partsRow = [
                        '<tr data-sale-id="', sale.id, '" class="', rowClass, '">',
                        '<td><div class="sale-id-row"><span class="sale-id">#', sale.id, quickBadge, '</span>',
                        unpaidBadge, partBadge, paidDebtBadge, discBadge,
                        '<button type="button" class="an-btn an-btn-restore" data-sale-id="', sale.id, '" title="Restaurer">↩</button>',
                        '<button type="button" class="an-btn an-btn-edit" data-sale-id="', sale.id, '" title="Modifier">✏️</button>',
                        '<button type="button" class="an-btn an-btn-delete" data-sale-id="', sale.id, '" title="Supprimer">🗑</button></div></td>',
                        '<td><div class="date-cell"><div class="date-main">', formattedDate.split(' ')[0], '</div><div class="date-time">', formattedDate.split(' ')[1] || '', '</div></div></td>',
                        '<td class="customer-cell">', cust, '</td>',
                        '<td class="items-cell" title="', itemSummary, '">', itemSummary, '</td>',
                        '<td class="amount-cell"><strong>', actualRevenue.toFixed(2), '</strong></td>',
                        '<td class="amount-cell paid">', amountPaid.toFixed(2), '</td>',
                        '<td class="amount-cell', (remainingAmount > 0 ? ' remaining' : ''), '">', remainingAmount.toFixed(2), '</td>',
                        '<td class="profit-cell ', (actualProfit >= 0 ? 'positive' : 'negative'), '">', actualProfit.toFixed(2), '</td>',
                        '<td class="margin-cell">', (sale.grandTotal > 0 ? ((sale.totalProfit || 0) / sale.grandTotal * 100).toFixed(1) : '0.0'), '%</td>',
                        '<td class="status-cell"><span class="', statusClass, '">', statusText, '</span></td></tr>'
                    ];
                    parts.push(partsRow.join(''));
                });
                
                parts.push('<tr class="customer-total-row"><td colspan="4" class="ctr-label">Sous-total ' + cust + ':</td><td class="ctr-revenue">' + customerTotalRevenue.toFixed(2) + '</td><td colspan="2"></td><td class="ctr-profit">' + customerTotalProfit.toFixed(2) + '</td><td colspan="2"></td></tr>');
            });
            
            const totalMargin = grandTotalRevenue > 0 ? (grandTotalProfit / grandTotalRevenue * 100) : 0;
            parts.push('<tr class="grand-total-row"><td colspan="4" class="gtr-label">📊 TOTAL GÉNÉRAL:</td><td class="gtr-revenue">' + grandTotalRevenue.toFixed(2) + '</td><td colspan="2"></td><td class="gtr-profit">' + grandTotalProfit.toFixed(2) + '</td><td class="gtr-margin">' + totalMargin.toFixed(1) + '%</td><td></td></tr>');
            
            mainTableHtml = parts.join('') || '<tr><td colspan="10" class="empty-state"><div class="empty-icon">📊</div><div class="empty-text">Aucune vente enregistrée</div></td></tr>';
            tbody.innerHTML = mainTableHtml;
            
            if (!tbody.dataset.listenerAttached) {
                tbody.dataset.listenerAttached = 'true';
                tbody.addEventListener('click', function(e) {
                    const restoreBtn = e.target.closest('.an-btn-restore');
                    if (restoreBtn) { e.stopPropagation(); restoreTransactionToCart(restoreBtn.dataset.saleId); return; }
                    const editBtn = e.target.closest('.an-btn-edit');
                    if (editBtn) { e.stopPropagation(); openEditSaleModal(editBtn.dataset.saleId); return; }
                    const deleteBtn = e.target.closest('.an-btn-delete');
                    if (deleteBtn) { e.stopPropagation(); deleteSale(deleteBtn.dataset.saleId); return; }
                    const row = e.target.closest('.analytics-sale-row');
                    if (row && !e.target.closest('button')) { restoreTransactionToCart(row.dataset.saleId); }
                });
            }
        }
        
        // ============================================================
        // DEBT CARDS
        // ============================================================
        let totalDebt = 0;
        let customersWithDebt = 0;
        customersData.forEach(c => {
            if (c.debts) {
                const customerDebt = c.debts.reduce((sum, d) => sum + d.remainingAmount, 0);
                if (customerDebt > 0) { totalDebt += customerDebt; customersWithDebt++; }
            }
        });
        const totalDebtText = totalDebt.toFixed(2) + ' ' + settings.currency;
        updateCard('analytics-total-debt', totalDebtText);
        updateCard('analytics-customers-with-debt', customersWithDebt);
        
        // ============================================================
        // UPDATE METRIC CARDS
        // ============================================================
        const avgOrder = totalSales > 0 ? totalRevenue / totalSales : 0;
        const totalMarginOverall = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0;
        
        updateMetricCards({
            today: { revenue: todayRevenue, profit: todayProfit, items: todayItemsSold, sales: todaySales },
            week: { revenue: weekRevenue, profit: weekProfit, items: weekItemsSold, sales: weekSales },
            month: { revenue: monthRevenue, profit: monthProfit, items: monthItemsSold, sales: monthSales },
            total: { revenue: totalRevenue, profit: totalProfit, items: totalItemsSold, sales: totalSales, avgOrder: avgOrder, margin: totalMarginOverall }
        });
        
        // ============================================================
        // UPDATE INVENTORY METRICS
        // ============================================================
        updateInventoryMetrics(products);
        
        // ============================================================
        // UPDATE LAST SOLD ITEMS
        // ============================================================
        await updateLastSoldItems(processedSales, customerMap, true, debtIndex);
        
        // ============================================================
        // DEFER HEAVY SECTIONS
        // ============================================================
        const scheduleIdle = (fn) => {
            if (window.requestIdleCallback) requestIdleCallback(fn, { timeout: 2000 });
            else setTimeout(fn, 0);
        };
        scheduleIdle(() => renderDailyBreakdown(processedSales));
        scheduleIdle(() => renderPaymentDetails(processedSales));
        
        // ============================================================
        // STORE IN CACHE
        // ============================================================
        _analyticsCache = {
            processedSales: processedSales,
            metrics: {
                today: { revenue: todayRevenue, profit: todayProfit, items: todayItemsSold, sales: todaySales },
                week: { revenue: weekRevenue, profit: weekProfit, items: weekItemsSold, sales: weekSales },
                month: { revenue: monthRevenue, profit: monthProfit, items: monthItemsSold, sales: monthSales },
                total: { revenue: totalRevenue, profit: totalProfit, items: totalItemsSold, sales: totalSales, avgOrder: avgOrder, margin: totalMarginOverall }
            },
            mainTableHtml: mainTableHtml,
            totalDebtText: totalDebtText,
            customersWithDebt: customersWithDebt,
            lastSalesCount: sales.length,
            lastCustomersCount: customersData.length,
            lastProductsCount: products.length,
            debtIndex: debtIndex,
            isValid: true
        };
        
        console.log('✅ Analytics loaded successfully with real-time payment tracking');
        console.log('📊 Total Revenue: ' + totalRevenue.toFixed(2) + ' DA (paid + partial)');
        console.log('💰 Total Profit: ' + totalProfit.toFixed(2) + ' DA');
        console.log('📈 Total Margin: ' + totalMarginOverall.toFixed(1) + '%');
        console.log('👥 Customers with debt: ' + customersWithDebt);
        console.log('💳 Total debt: ' + totalDebt.toFixed(2) + ' DA');
    } catch (error) {
        console.error('❌ Load analytics error:', error);
        showToast('❌ Échec du chargement des analytics', 'error');
    }
}

// ============================================================
// UPDATE METRIC CARDS
// ============================================================
function updateMetricCards(data) {
    const currency = settings.currency || 'DA';
    
    updateCard('analytics-today-revenue', `${data.today.revenue.toFixed(2)} ${currency}`);
    updateCard('analytics-today-profit', `${data.today.profit.toFixed(2)} ${currency}`);
    updateCard('analytics-today-items', data.today.items);
    updateCard('analytics-today-sales', data.today.sales);
    
    updateCard('analytics-week-revenue', `${data.week.revenue.toFixed(2)} ${currency}`);
    updateCard('analytics-week-profit', `${data.week.profit.toFixed(2)} ${currency}`);
    updateCard('analytics-week-items', data.week.items);
    updateCard('analytics-week-sales', data.week.sales);
    
    updateCard('analytics-month-revenue', `${data.month.revenue.toFixed(2)} ${currency}`);
    updateCard('analytics-month-profit', `${data.month.profit.toFixed(2)} ${currency}`);
    updateCard('analytics-month-items', data.month.items);
    updateCard('analytics-month-sales', data.month.sales);
    
    updateCard('analytics-total-revenue', `${data.total.revenue.toFixed(2)} ${currency}`);
    updateCard('analytics-total-profit', `${data.total.profit.toFixed(2)} ${currency}`);
    updateCard('analytics-total-items', data.total.items);
    updateCard('analytics-total-sales', data.total.sales);
    updateCard('analytics-avg-order', `${data.total.avgOrder.toFixed(2)} ${currency}`);
    updateCard('analytics-total-margin', `${data.total.margin.toFixed(1)}%`);
}

function updateCard(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

// ============================================================
// UPDATE INVENTORY METRICS
// ============================================================
function updateInventoryMetrics(products) {
    let totalSellValue = 0, totalPurchaseValue = 0, totalItems = 0;
    
    products.forEach(product => {
        const purchasePrice = product.purchasePrice || product.price * 0.7;
        totalSellValue += product.price * product.stock;
        totalPurchaseValue += purchasePrice * product.stock;
        totalItems += product.stock;
    });
    
    const potentialProfit = totalSellValue - totalPurchaseValue;
    const margin = totalSellValue > 0 ? (potentialProfit / totalSellValue * 100) : 0;
    
    updateCard('analytics-inv-value', `${totalSellValue.toFixed(2)} ${settings.currency}`);
    updateCard('analytics-inv-cost', `${totalPurchaseValue.toFixed(2)} ${settings.currency}`);
    updateCard('analytics-inv-profit', `${potentialProfit.toFixed(2)} ${settings.currency}`);
    updateCard('analytics-inv-margin', `${margin.toFixed(1)}%`);
    updateCard('analytics-inv-count', `${products.length} produits • ${totalItems} unités`);
}

// ============================================================
// GET TIME AGO
// ============================================================
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return "à l'instant";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `il y a ${days}j`;
}

// ============================================================
// EXPOSE CORE FUNCTIONS
// ============================================================
window.loadAnalytics = loadAnalytics;
window.refreshAnalytics = refreshAnalytics;
window.updateCard = updateCard;
window.updateMetricCards = updateMetricCards;
window.updateInventoryMetrics = updateInventoryMetrics;
window.getTimeAgo = getTimeAgo;
window.getActualPaymentStatus = getActualPaymentStatus;
window.calculateActualRevenueAndProfit = calculateActualRevenueAndProfit;
window.getSaleDiscountInfo = getSaleDiscountInfo;
window.invalidateAnalyticsCache = _invalidateAnalyticsCache;

console.log('📊 Analytics Core loaded with real-time payment tracking');