// ============================================================
// ANALYTICS UI: UI Components and Event Handlers
// ============================================================

// ============================================================
// ANALYTICS COLLAPSE PREFERENCE - persisted per browser
// Default: every section is open. The user's choice is remembered.
// ============================================================
const ANALYTICS_COLLAPSE_KEY = 'analyticsCollapsedSections';

function _getAnalyticsCollapsed() {
    try {
        const raw = localStorage.getItem(ANALYTICS_COLLAPSE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') return parsed;
        }
    } catch (e) {}
    return {};
}

function _saveAnalyticsCollapsed(collapsed) {
    try { localStorage.setItem(ANALYTICS_COLLAPSE_KEY, JSON.stringify(collapsed)); } catch (e) {}
    _persistAnalyticsPrefsDebounced();
}

// ============================================================
// PERSISTANCE EN BASE (survit aux changements de stockage et
// aux migrations, incluse dans les sauvegardes). Le localStorage
// reste le cache rapide de lecture ; la base est la source durable.
// ============================================================
const ANALYTICS_PREFS_DB_KEY = 'analyticsUiPrefs';
let _analyticsPersistTimer = null;
function _persistAnalyticsPrefsDebounced() {
    if (_analyticsPersistTimer) return;
    _analyticsPersistTimer = setTimeout(function () {
        _analyticsPersistTimer = null;
        if (typeof dbPut !== 'function') return;
        let collapsed = {};
        let order = null;
        try {
            collapsed = JSON.parse(localStorage.getItem(ANALYTICS_COLLAPSE_KEY) || '{}') || {};
        } catch (e) { collapsed = {}; }
        try {
            order = JSON.parse(localStorage.getItem(ANALYTICS_ORDER_KEY) || 'null') || null;
        } catch (e) { order = null; }
        dbPut('settings', { key: ANALYTICS_PREFS_DB_KEY, value: { collapsed: collapsed, order: order } })
            .catch(function (err) { console.error('Persist analytics prefs to DB error:', err); });
    }, 400);
}

// Charge les préférences dashboard depuis la base puis rafraîchit le localStorage.
async function loadAnalyticsPrefsFromDb() {
    try {
        if (typeof dbGet !== 'function') return;
        const rec = await dbGet('settings', ANALYTICS_PREFS_DB_KEY);
        if (!rec || !rec.value) return;
        const v = rec.value;
        if (v.collapsed && typeof v.collapsed === 'object') {
            try { localStorage.setItem(ANALYTICS_COLLAPSE_KEY, JSON.stringify(v.collapsed)); } catch (e) {}
        }
        if (Array.isArray(v.order)) {
            try { localStorage.setItem(ANALYTICS_ORDER_KEY, JSON.stringify(v.order)); } catch (e) {}
        }
    } catch (err) {
        console.error('Load analytics prefs from DB error:', err);
    }
}
window.loadAnalyticsPrefsFromDb = loadAnalyticsPrefsFromDb;

function toggleAnalyticsSection(key) {
    const body = document.getElementById('acc-body-' + key);
    if (!body) return;
    const collapsed = _getAnalyticsCollapsed();
    const isHidden = body.style.display === 'none';
    body.style.display = isHidden ? '' : 'none';
    collapsed[key] = !isHidden;
    _saveAnalyticsCollapsed(collapsed);
    const arrow = document.getElementById('acc-arrow-' + key);
    if (arrow) arrow.textContent = isHidden ? '▼' : '▶';
    // Redraw the chart only when the section is being EXPANDED; a redraw while
    // hidden reads a 0-size canvas and wipes the drawing to a blank 1×1.
    if (isHidden && key === 'chart' && typeof window.refreshCharts === 'function') {
        setTimeout(function() { window.refreshCharts(); }, 60);
    }
}

window.toggleAnalyticsSection = toggleAnalyticsSection;

// Set a section to open/collapsed without toggling (idempotent, persisted)
function setAnalyticsSectionState(key, open) {
    const body = document.getElementById('acc-body-' + key);
    if (!body) return;
    const shouldHide = open === false;
    const isHidden = body.style.display === 'none';
    if (isHidden === shouldHide) {
        body.style.display = shouldHide ? 'none' : '';
        const collapsed = _getAnalyticsCollapsed();
        collapsed[key] = shouldHide;
        _saveAnalyticsCollapsed(collapsed);
        const arrow = document.getElementById('acc-arrow-' + key);
        if (arrow) arrow.textContent = shouldHide ? '▶' : '▼';
        if (!shouldHide && key === 'chart' && typeof window.refreshCharts === 'function') {
            setTimeout(function() { window.refreshCharts(); }, 60);
        }
    }
}

window.setAnalyticsSectionState = setAnalyticsSectionState;

// Guard window.refreshCharts against redrawing while the chart section is
// collapsed: a hidden canvas reports 0 size, which would wipe the drawing.
(function() {
    if (typeof window.refreshCharts !== 'function') return;
    const originalRefreshCharts = window.refreshCharts;
    window.refreshCharts = function() {
        const body = document.getElementById('acc-body-chart');
        if (body && body.style.display === 'none') return;
        return originalRefreshCharts.apply(this, arguments);
    };
})();

// ============================================================
// SECTION ORDER - persisted reordering of the dashboard sections
// ============================================================
const ANALYTICS_ORDER_KEY = 'analyticsSectionOrder';
const ANALYTICS_SECTION_KEYS = ['chart', 'period', 'kpi', 'payments', 'inventory', 'clients', 'daily'];
const DEFAULT_ANALYTICS_ORDER = ['period', 'kpi', 'payments', 'inventory', 'clients', 'daily', 'chart'];

function _getAnalyticsOrder() {
    let order = null;
    try {
        const raw = localStorage.getItem(ANALYTICS_ORDER_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) order = parsed;
        }
    } catch (e) {}
    if (!order) order = DEFAULT_ANALYTICS_ORDER.slice();
    ANALYTICS_SECTION_KEYS.forEach(function(k) { if (order.indexOf(k) === -1) order.push(k); });
    order = order.filter(function(k) { return ANALYTICS_SECTION_KEYS.indexOf(k) !== -1; });
    return order;
}

function _saveAnalyticsOrder(order) {
    try { localStorage.setItem(ANALYTICS_ORDER_KEY, JSON.stringify(order)); } catch (e) {}
    _persistAnalyticsPrefsDebounced();
}

// Move the DOM sections so they match the given order (appendChild relocates)
function _applyAnalyticsOrder(order) {
    const stack = document.getElementById('analytics-order-stack');
    if (!stack) return;
    order.forEach(function(key) {
        const el = stack.querySelector('.ad-collapsible[data-section-key="' + key + '"]');
        if (el) stack.appendChild(el);
    });
    _saveAnalyticsOrder(order);
}

// Move a section up (delta=-1) or down (delta=+1)
function moveAnalyticsSection(key, delta) {
    const order = _getAnalyticsOrder();
    const idx = order.indexOf(key);
    if (idx < 0) return;
    const newIdx = idx + delta;
    if (newIdx < 0 || newIdx >= order.length) return;
    order.splice(idx, 1);
    order.splice(newIdx, 0, key);
    _applyAnalyticsOrder(order);
}

window.moveAnalyticsSection = moveAnalyticsSection;

// Drag & drop reordering: the grip (☰) starts the drag; dropping onto
// another section inserts before/after it based on the cursor position.
let _analyticsDragKey = null;
let _analyticsDropAfter = false;

function _initAnalyticsOrderUI() {
    const stack = document.getElementById('analytics-order-stack');
    if (!stack) return;
    stack.querySelectorAll('.ad-collapsible').forEach(function(section) {
        const key = section.getAttribute('data-section-key');
        const grip = section.querySelector('.ad-grip');
        if (grip) {
            grip.addEventListener('dragstart', function(e) {
                _analyticsDragKey = key;
                try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', key); } catch (e2) {}
                section.classList.add('ad-dragging');
            });
            grip.addEventListener('dragend', function() {
                _analyticsDragKey = null;
                stack.querySelectorAll('.ad-collapsible').forEach(function(s) { s.classList.remove('ad-dragging', 'ad-drop-target'); });
            });
        }
        section.addEventListener('dragover', function(e) {
            if (!_analyticsDragKey || _analyticsDragKey === key) return;
            e.preventDefault();
            try { e.dataTransfer.dropEffect = 'move'; } catch (e2) {}
            const rect = section.getBoundingClientRect();
            _analyticsDropAfter = (e.clientY - rect.top) > rect.height / 2;
            stack.querySelectorAll('.ad-collapsible').forEach(function(s) { s.classList.remove('ad-drop-target'); });
            section.classList.add('ad-drop-target');
        });
        section.addEventListener('drop', function(e) {
            e.preventDefault();
            if (!_analyticsDragKey) return;
            const from = _analyticsDragKey;
            const order = _getAnalyticsOrder().filter(function(k) { return k !== from; });
            const idx = order.indexOf(key);
            order.splice(_analyticsDropAfter ? idx + 1 : idx, 0, from);
            _applyAnalyticsOrder(order);
            _analyticsDragKey = null;
            stack.querySelectorAll('.ad-collapsible').forEach(function(s) { s.classList.remove('ad-dragging', 'ad-drop-target'); });
        });
        section.addEventListener('dragleave', function(e) {
            if (!section.contains(e.relatedTarget)) section.classList.remove('ad-drop-target');
        });
    });
}

// Build one collapsible section: grip + collapse button + up/down arrows + body
function _analyticsSectionHtml(key, title, subtitle, bodyHtml, collapsed) {
    const isCollapsed = collapsed[key] === true;
    return '<div class="ad-collapsible" data-section-key="' + key + '">' +
        '<div class="ad-collapse-head">' +
            '<span class="ad-grip" draggable="true" title="Déplacer">☰</span>' +
            '<button type="button" class="ad-collapse-btn" onclick="toggleAnalyticsSection(\'' + key + '\')">' +
                '<span class="ad-collapse-arrow" id="acc-arrow-' + key + '">' + (isCollapsed ? '▶' : '▼') + '</span>' +
                '<span class="ad-collapse-title">' + title + '</span>' +
                (subtitle ? '<span class="ad-collapse-sub">' + subtitle + '</span>' : '') +
            '</button>' +
            '<span class="ad-reorder">' +
                '<button type="button" onclick="moveAnalyticsSection(\'' + key + '\', -1)" title="Monter">▲</button>' +
                '<button type="button" onclick="moveAnalyticsSection(\'' + key + '\', 1)" title="Descendre">▼</button>' +
            '</span>' +
        '</div>' +
        '<div class="ad-collapse-body" id="acc-body-' + key + '"' + (isCollapsed ? ' style="display:none;"' : '') + '>' + bodyHtml + '</div>' +
    '</div>';
}

// The chart section (#ac-section) is created by analytics-charts.js and inserted
// after the dashboard; move it into its collapsible slot in the order stack here.
function captureAnalyticsChart() {
    const ac = document.getElementById('ac-section');
    const slot = document.getElementById('analytics-chart-slot');
    if (!ac || !slot) return;
    if (ac.parentNode === slot) return;
    slot.appendChild(ac);
    const collapsed = _getAnalyticsCollapsed();
    const body = document.getElementById('acc-body-chart');
    if (body && collapsed['chart'] === true) body.style.display = 'none';
    const arrow = document.getElementById('acc-arrow-chart');
    if (arrow && collapsed['chart'] === true) arrow.textContent = '▶';
}

window.captureAnalyticsChart = captureAnalyticsChart;

// ============================================================
// CREATE MODERN ANALYTICS DASHBOARD
// ============================================================
function createModernAnalyticsDashboard() {
    const container = document.querySelector('#view-analytics');
    if (!container) { console.warn('Analytics container not found'); return; }
    if (document.getElementById('analytics-modern-dashboard')) return;
    
    const todayStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const collapsed = _getAnalyticsCollapsed();
    const order = _getAnalyticsOrder();

    let sectionsHtml = '';
    order.forEach(function(key) {
        sectionsHtml += _buildAnalyticsSection(key, collapsed);
    });

    const html = '<div id="analytics-modern-dashboard" class="analytics-dashboard-modern">' +
        '<div class="ad-header">' +
            '<div class="ad-header-left">' +
                '<h2 class="ad-title">📊 Tableau de Bord</h2>' +
                '<span class="ad-date">' + todayStr + '</span>' +
            '</div>' +
            '<div class="ad-header-actions"><button class="btn btn-success btn-sm" id="btn-refresh-analytics">🔄 Rafraîchir</button></div>' +
        '</div>' +
        '<div id="analytics-order-stack" class="analytics-order-stack">' + sectionsHtml + '</div>' +
    '</div>';
    
    container.innerHTML = html;
    _initAnalyticsOrderUI();
    
    DOM.analyticsTotalDebt = document.getElementById('analytics-total-debt');
    DOM.analyticsCustomersWithDebt = document.getElementById('analytics-customers-with-debt');
    DOM.analyticsTransactions = document.getElementById('analytics-transactions');
    DOM.analyticsRevenue = document.getElementById('analytics-revenue');
    DOM.analyticsItemsSold = document.getElementById('analytics-items-sold');
    DOM.analyticsAverage = document.getElementById('analytics-avg-order');
    
    const refreshBtn = document.getElementById('btn-refresh-analytics');
    if (refreshBtn) refreshBtn.addEventListener('click', async function() { showToast('🔄 Rafraîchissement...', 'info'); await refreshAnalytics(); showToast('✅ Données à jour', 'success'); });
    
    console.log('✅ Analytics dashboard created');
}

// Build the body of one analytics section, in the currently saved order
function _buildAnalyticsSection(key, collapsed) {
    switch (key) {
        case 'chart':
            return _analyticsSectionHtml('chart', '📈 Graphique', '', '<div id="analytics-chart-slot" class="ad-chart-slot"></div>', collapsed);
        case 'period':
            return _analyticsSectionHtml('period', '📅 Périodes', '',
                '<div class="ad-period-grid">' +
                    _periodCard('today', '📅', 'Aujourd\'hui', 'analytics-today-revenue', 'analytics-today-profit', 'analytics-today-sales', 'analytics-today-items') +
                    _periodCard('week', '📊', 'Cette semaine', 'analytics-week-revenue', 'analytics-week-profit', 'analytics-week-sales', 'analytics-week-items') +
                    _periodCard('month', '📈', 'Ce mois', 'analytics-month-revenue', 'analytics-month-profit', 'analytics-month-sales', 'analytics-month-items') +
                    _periodCard('total', '🏆', 'Total', 'analytics-total-revenue', 'analytics-total-profit', 'analytics-total-sales', 'analytics-total-items') +
                '</div>', collapsed);
        case 'kpi':
            return _analyticsSectionHtml('kpi', '💡 Indicateurs', '',
                '<div class="ad-kpi-strip">' +
                    '<div class="kpi-item"><span class="kpi-icon">💰</span><div><div class="kpi-label">Panier moyen</div><div id="analytics-avg-order" class="kpi-value">0 DA</div></div></div>' +
                    '<div class="kpi-item"><span class="kpi-icon">📈</span><div><div class="kpi-label">Marge totale</div><div id="analytics-total-margin" class="kpi-value profit">0%</div></div></div>' +
                    '<div class="kpi-item"><span class="kpi-icon">🧾</span><div><div class="kpi-label">Transactions</div><div id="analytics-transactions" class="kpi-value">0</div></div></div>' +
                    '<div class="kpi-item"><span class="kpi-icon">💳</span><div><div class="kpi-label">Dettes clients</div><div id="analytics-total-debt" class="kpi-value debt">0 DA</div></div></div>' +
                    '<div class="kpi-item"><span class="kpi-icon">👥</span><div><div class="kpi-label">Clients endettés</div><div id="analytics-customers-with-debt" class="kpi-value">0</div></div></div>' +
                '</div>', collapsed);
        case 'inventory':
            return _analyticsSectionHtml('inventory', '📦 Stock', '',
                '<div class="ad-inv-strip">' +
                    '<div class="inv-item"><span class="inv-icon">💎</span><div class="inv-info"><span class="inv-lbl">Stock vente</span><span id="analytics-inv-value" class="inv-val">0 DA</span></div></div>' +
                    '<div class="inv-item"><span class="inv-icon">🏷️</span><div class="inv-info"><span class="inv-lbl">Stock achat</span><span id="analytics-inv-cost" class="inv-val">0 DA</span></div></div>' +
                    '<div class="inv-item"><span class="inv-icon">💰</span><div class="inv-info"><span class="inv-lbl">Bénéfice potentiel</span><span id="analytics-inv-profit" class="inv-val profit">0 DA</span></div></div>' +
                    '<div class="inv-item"><span class="inv-icon">📦</span><div class="inv-info"><span class="inv-lbl">Stock total</span><span id="analytics-inv-count" class="inv-val">0</span></div></div>' +
                '</div>', collapsed);
        case 'clients':
            return _analyticsSectionHtml('clients', '👥 Derniers clients', '(48h — cliquez pour voir les achats)',
                '<div id="last-sold-items" class="last-sold-grid"></div>', collapsed);
        case 'daily':
            return _analyticsSectionHtml('daily', '📅 Détail par jour', '',
                '<div class="ad-details-section"><div id="daily-breakdown-container" class="ad-daily-container"><div class="ad-loading">Chargement des données journalières...</div></div></div>', collapsed);
        case 'payments':
            return _analyticsSectionHtml('payments', '💳 Détail par moyen de paiement', '(coordonnées / références de chaque paiement)',
                '<div class="ad-details-section"><div id="payment-details-container" class="ad-daily-container"><div class="ad-loading">Chargement des paiements...</div></div></div>', collapsed);
        default:
            return '';
    }
}

function _periodCard(cls, icon, title, revId, profId, salesId, itemsId) {
    return '<div class="period-card ' + cls + '">' +
        '<div class="period-top"><span class="period-icon">' + icon + '</span><span class="period-title">' + title + '</span></div>' +
        '<div class="period-body">' +
            '<div class="pm-row"><span class="pm-label">Recette</span><span id="' + revId + '" class="pm-value">0 DA</span></div>' +
            '<div class="pm-row"><span class="pm-label">Profit</span><span id="' + profId + '" class="pm-value profit">0 DA</span></div>' +
            '<div class="pm-row pm-mini"><span>Ventes: <strong id="' + salesId + '">0</strong></span><span>Articles: <strong id="' + itemsId + '">0</strong></span></div>' +
        '</div></div>';
}

// ============================================================
function _getDailyRowClass(dayIndex) {
    return 'db-row-c' + (dayIndex % 10);
}

// ============================================================
// RENDER DAILY BREAKDOWN - DAYS GROUPED + CLICKABLE
// Each day row shows the daily summary (détail par jour).
// Clicking a day expands the list of sales for that day.
// Today's date is expanded by default.
// ============================================================
async function renderDailyBreakdown(sales) {
    const container = document.getElementById('daily-breakdown-container');
    if (!container) return;
    
    if (!sales || sales.length === 0) {
        container.innerHTML = `
            <div class="db-empty">
                <div class="db-empty-icon">📅</div>
                <p>Aucune donnée journalière disponible</p>
            </div>
        `;
        return;
    }
    
    // Group sales by day
    const dailyData = {};
    
    for (const sale of sales) {
        // Check actual payment status - use pre-calculated if available
        let result;
        if (sale._actualRevenue !== undefined) {
            result = {
                actualRevenue: sale._actualRevenue,
                actualProfit: sale._actualProfit || 0,
                isPaid: sale._isPaid === true,
                isPartial: sale._isPartial === true,
                remainingAmount: sale._remainingAmount || 0,
                amountPaid: sale._amountPaid || 0
            };
        } else {
            result = await calculateActualRevenueAndProfit(sale);
        }
        
        const date = new Date(sale.timestamp);
        const dateKey = date.toISOString().split('T')[0];
        const displayDate = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        
        if (!dailyData[dateKey]) {
            dailyData[dateKey] = {
                date: dateKey,
                displayDate: displayDate,
                revenue: 0,
                profit: 0,
                discount: 0,
                sales: 0,
                items: 0,
                salesList: []
            };
        }
        
        const day = dailyData[dateKey];
        day.salesList.push({ sale: sale, result: result });
        
        if (result.actualRevenue > 0) {
            day.revenue += result.actualRevenue;
            day.profit += result.actualProfit;
            day.discount += (typeof getSaleDiscountInfo === 'function' ? getSaleDiscountInfo(sale).total : 0);
            day.sales += 1;
            day.items += sale.items.reduce(function(sum, item) {
                return sum + (item.qty || 0);
            }, 0);
        }
    }
    
    // Convert to array and sort by date (newest first)
    const dailyArray = Object.values(dailyData).sort(function(a, b) {
        return b.date.localeCompare(a.date);
    });
    
    // Calculate totals
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalDiscount = 0;
    let totalSales = 0;
    let totalItems = 0;
    
    dailyArray.forEach(function(day) {
        totalRevenue += day.revenue;
        totalProfit += day.profit;
        totalDiscount += day.discount;
        totalSales += day.sales;
        totalItems += day.items;
    });
    
    const totalMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0;
    const todayKey = new Date().toISOString().split('T')[0];
    
    let html = `
        <table class="db-table">
            <thead class="db-thead">
                <tr>
                    <th class="db-th db-th-left">Date</th>
                    <th class="db-th db-th-right">Ventes</th>
                    <th class="db-th db-th-right">Articles</th>
                    <th class="db-th db-th-right">Remise (DA)</th>
                    <th class="db-th db-th-right">Recette (DA)</th>
                    <th class="db-th db-th-right">Profit (DA)</th>
                    <th class="db-th db-th-right">Marge (%)</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    dailyArray.forEach(function(day, dayIndex) {
        const margin = day.revenue > 0 ? (day.profit / day.revenue * 100) : 0;
        const isToday = day.date === todayKey;
        const arrowId = 'db-arrow-' + day.date;
        const detailId = 'db-detail-' + day.date;
        
        html += `
            <tr class="db-tr ${_getDailyRowClass(dayIndex)} db-day-row" data-date="${day.date}" onclick="toggleDayDetail('${day.date}')">
                <td class="db-td db-td-date">
                    <span id="${arrowId}" class="db-day-arrow"${isToday ? ' style="transform:rotate(90deg);"' : ''}>▶</span>
                    ${day.displayDate}
                    ${isToday ? '<span class="sh-today-badge" style="margin-left:6px;">Aujourd\'hui</span>' : ''}
                </td>
                <td class="db-td db-td-right">${day.sales}</td>
                <td class="db-td db-td-right">${day.items}</td>
                <td class="db-td db-td-discount">${day.discount.toFixed(2)}</td>
                <td class="db-td db-td-revenue">${day.revenue.toFixed(2)}</td>
                <td class="db-td db-td-profit">${day.profit.toFixed(2)}</td>
                <td class="db-td db-td-margin">${margin.toFixed(1)}%</td>
            </tr>
            <tr class="db-detail-row" id="${detailId}" data-date="${day.date}" style="display:${isToday ? 'table-row' : 'none'};">
                <td colspan="7" class="db-detail-cell">${_renderDaySalesHtml(day)}</td>
            </tr>
        `;
    });
    
    html += `
                <tr class="db-total-row">
                    <td class="db-total-label">📊 TOTAL</td>
                    <td class="db-total-value">${totalSales}</td>
                    <td class="db-total-value">${totalItems}</td>
                    <td class="db-total-discount">${totalDiscount.toFixed(2)}</td>
                    <td class="db-total-revenue">${totalRevenue.toFixed(2)}</td>
                    <td class="db-total-profit">${totalProfit.toFixed(2)}</td>
                    <td class="db-total-margin">${totalMargin.toFixed(1)}%</td>
                </tr>
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

// ============================================================
// RENDER THE SALES LIST OF A DAY (expanded detail)
// ============================================================
function _renderDaySalesHtml(day) {
    if (!day.salesList.length) {
        return '<div class="db-day-empty">Aucune vente ce jour</div>';
    }
    
    const rows = day.salesList.map(function(entry) {
        const sale = entry.sale;
        const result = entry.result;
        const saleDate = new Date(sale.timestamp);
        const formattedTime = saleDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const itemSummary = sale.items.map(function(item) {
            var summary = item.name + '×' + item.qty;
            if (item.soldPrice != null && item.originalPrice != null && item.soldPrice < item.originalPrice) {
                summary += ' (−' + ((item.originalPrice - item.soldPrice) * (item.qty || 0)).toFixed(2) + ')';
            }
            return summary;
        }).join(', ');
        const quickBadge = sale.quickCustomerSale ? ' ⚡' : '';
        
        let discBadge = '';
        if (typeof getSaleDiscountInfo === 'function') {
            const discInfo = getSaleDiscountInfo(sale);
            if (discInfo.total > 0) {
                discBadge = '<span class="sh-disc-badge" title="Remise totale : ' + discInfo.total.toFixed(2) + ' ' + settings.currency + '">🏷️ −' + discInfo.total.toFixed(2) + '</span>';
            }
        }
        
        const actualRevenue = result.actualRevenue || 0;
        const actualProfit = result.actualProfit || 0;
        const remainingAmount = result.remainingAmount || 0;
        const isPaid = result.isPaid;
        const isPartial = result.isPartial;
        
        let statusText = '✅ Payé';
        let statusClass = 'status-paid';
        if (!isPaid) {
            if (isPartial) {
                statusText = '⏳ Partiel';
                statusClass = 'status-partial';
            } else {
                statusText = '⚠️ Dette';
                statusClass = 'status-debt';
            }
        } else if (sale.isDebt) {
            statusText = '✅ Payé (dette)';
        }
        
        return `
            <div class="sh-sale-row">
                <span class="sh-time">${formattedTime}</span>
                <span class="sh-id">#${sale.id}${quickBadge}</span>
                <span class="sh-summary" title="${escapeHtml(itemSummary)}">${sale.customerName || 'Client régulier'} — ${escapeHtml(itemSummary)}</span>
                <span class="sh-revenue">${actualRevenue.toFixed(2)}</span>
                <span class="sh-remaining ${remainingAmount > 0 ? 'sh-negative' : 'sh-positive'}">${remainingAmount.toFixed(2)}</span>
                <span class="sh-profit">${actualProfit.toFixed(2)}</span>
                <span class="${statusClass} sh-status-badge">${statusText}</span>
                ${discBadge}
                <div class="sh-actions">
                    <button class="sh-btn sh-btn-restore" onclick="event.stopPropagation();restoreTransactionToCart(${sale.id})" title="Charger">↩</button>
                    <button class="sh-btn sh-btn-move" onclick="event.stopPropagation();showMoveSaleModal(${sale.id})" title="Déplacer">📅</button>
                    <button class="sh-btn sh-btn-edit" onclick="event.stopPropagation();openEditSaleModal(${sale.id})" title="Modifier">✏️</button>
                    <button class="sh-btn sh-btn-delete" onclick="event.stopPropagation();deleteSale(${sale.id})" title="Supprimer">🗑</button>
                </div>
            </div>
        `;
    });
    
    return '<div class="db-day-sales">' + rows.join('') + '</div>';
}

// ============================================================
// TOGGLE DAY DETAIL (accordion in Détail par jour)
// ============================================================
function toggleDayDetail(dateKey) {
    const detailRow = document.getElementById('db-detail-' + dateKey);
    const arrow = document.getElementById('db-arrow-' + dateKey);
    if (!detailRow) return;
    const open = detailRow.style.display === 'table-row';
    detailRow.style.display = open ? 'none' : 'table-row';
    if (arrow) arrow.style.transform = open ? 'rotate(0deg)' : 'rotate(90deg)';
}

window.toggleDayDetail = toggleDayDetail;

// ============================================================
// PAYMENT DETAILS - per-sale method + coordinates (coordonnées)
// ============================================================
function _formatPaymentMethodLabel(methodId) {
    if (typeof window.getPaymentMethodById === 'function') {
        const m = window.getPaymentMethodById(methodId);
        if (m) return (m.icon ? m.icon + ' ' : '') + (m.label || methodId);
    }
    return methodId || 'Espèces';
}

function _formatPaymentDetails(methodId, details) {
    details = details || {};
    const m = (typeof window.getPaymentMethodById === 'function') ? window.getPaymentMethodById(methodId) : null;
    const parts = [];

    if (!m) {
        Object.keys(details).forEach(function(k) {
            const v = details[k];
            if (v !== undefined && v !== null && String(v) !== '' && k !== 'linkedToCustomer') {
                parts.push(escapeHtml(k) + ': <strong>' + escapeHtml(String(v)) + '</strong>');
            }
        });
        return parts.length ? parts.join('<span style="color:#ccc;margin:0 6px;">•</span>') : '<span style="color:#bbb;">—</span>';
    }

    if (m.kind === 'cash') {
        if (details.cashReceived != null) parts.push(t('amountReceived') + ' <strong>' + Number(details.cashReceived).toFixed(2) + '</strong>');
        if (details.changeDue != null) parts.push('Rendu: <strong>' + Number(details.changeDue).toFixed(2) + '</strong>');
    } else if (m.kind === 'credit') {
        return '<em style="color:#c92a2a;">' + t('paymentCreditLabel') + '</em>';
    } else {
        (m.fields || []).forEach(function(f) {
            const v = details[f.key];
            if (v !== undefined && v !== null && String(v).trim() !== '') {
                parts.push(escapeHtml(f.label) + ': <strong>' + escapeHtml(String(v)) + '</strong>');
            }
        });
    }
    return parts.length ? parts.join('<span style="color:#ccc;margin:0 6px;">•</span>') : '<span style="color:#bbb;">—</span>';
}

function renderPaymentDetails(sales) {
    const container = document.getElementById('payment-details-container');
    if (!container) return;
    if (!sales || !sales.length) {
        container.innerHTML = '<div class="db-empty"><div class="db-empty-icon">💳</div><p>Aucun paiement enregistré</p></div>';
        return;
    }

    // Totaux par moyen pour la bande de résumé
    const methodTotals = {};
    const methodSales = {};
    sales.forEach(function(sale) {
        const methodId = sale.paymentMethod || 'especes';
        const paid = (sale._amountPaid != null ? sale._amountPaid : sale.amountPaid) || 0;
        if (!methodTotals[methodId]) { methodTotals[methodId] = 0; methodSales[methodId] = 0; }
        methodTotals[methodId] += paid;
        methodSales[methodId]++;
    });

    const rows = sales.map(function(sale) {
        const saleDate = new Date(sale.timestamp);
        const dateStr = saleDate.toLocaleDateString('fr-FR');
        const timeStr = saleDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const methodId = sale.paymentMethod || 'especes';
        const paid = (sale._amountPaid != null ? sale._amountPaid : sale.amountPaid) || 0;
        const remaining = (sale._remainingAmount != null ? sale._remainingAmount : sale.remainingAmount) || 0;
        const isPaid = sale._isPaid !== false;
        const isPartial = sale._isPartial === true;

        let statusTxt = '✅ ' + t('statusPaid'), statusCls = 'status-paid';
        if (isPartial) { statusTxt = '⏳ Partiel'; statusCls = 'status-partial'; }
        else if (!isPaid && remaining > 0) { statusTxt = '⚠️ Dette'; statusCls = 'status-debt'; }

        return '<tr>' +
            '<td style="padding:6px;white-space:nowrap;border-bottom:1px solid #f0f0f0;">' + dateStr + '<br><span style="color:#999;font-size:11px;">' + timeStr + '</span></td>' +
            '<td style="padding:6px;border-bottom:1px solid #f0f0f0;"><span style="color:#777;">#' + sale.id + '</span></td>' +
            '<td style="padding:6px;border-bottom:1px solid #f0f0f0;">' + escapeHtml(sale.customerName || 'Client régulier') + '</td>' +
            '<td style="padding:6px;border-bottom:1px solid #f0f0f0;font-weight:600;">' + _formatPaymentMethodLabel(methodId) + '</td>' +
            '<td style="padding:6px;border-bottom:1px solid #f0f0f0;">' + _formatPaymentDetails(methodId, sale.paymentDetails) + '</td>' +
            '<td style="padding:6px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;">' + Number(paid).toFixed(2) + ' ' + (settings.currency || 'DA') + '</td>' +
            '<td style="padding:6px;border-bottom:1px solid #f0f0f0;text-align:center;"><span class="' + statusCls + '">' + statusTxt + '</span></td>' +
        '</tr>';
    }).join('');

    const summaryKeys = Object.keys(methodTotals);
    const summaryChips = summaryKeys.map(function(mid) {
        return '<div style="display:flex;flex-direction:column;align-items:center;padding:8px 14px;border:1px solid #ececec;border-radius:10px;background:#fafafa;min-width:120px;">' +
            '<span style="font-size:13px;font-weight:700;white-space:nowrap;">' + _formatPaymentMethodLabel(mid) + '</span>' +
            '<span style="font-size:15px;font-weight:800;margin-top:2px;">' + Number(methodTotals[mid]).toFixed(2) + ' ' + (settings.currency || 'DA') + '</span>' +
            '<span style="font-size:11px;color:#999;">' + methodSales[mid] + ' vente(s)</span>' +
        '</div>';
    }).join('');

    container.innerHTML =
        '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;">' + summaryChips + '</div>' +
        '<div style="overflow-x:auto;"><table class="db-table" style="width:100%;border-collapse:collapse;">' +
        '<thead><tr>' +
            '<th class="db-th" style="text-align:left;">Date</th>' +
            '<th class="db-th" style="text-align:left;">N°</th>' +
            '<th class="db-th" style="text-align:left;">Client</th>' +
            '<th class="db-th" style="text-align:left;">Moyen</th>' +
            '<th class="db-th" style="text-align:left;">Coordonnées / Référence</th>' +
            '<th class="db-th" style="text-align:right;">Montant</th>' +
            '<th class="db-th" style="text-align:center;">Statut</th>' +
        '</tr></thead><tbody>' + rows + '</tbody></table></div>';
}

window.renderPaymentDetails = renderPaymentDetails;

// ============================================================
// UPDATE LAST SOLD ITEMS - uses pre-processed data when available
// ============================================================
async function updateLastSoldItems(allSales, customerMap, usePreprocessed, debtIndex) {
    try {
        const container = document.getElementById('last-sold-items');
        if (!container) return;

        const sales = allSales || await dbGetAll('sales');

        if (!sales || sales.length === 0) {
            container.innerHTML = '<div class="empty-last-sold">Aucune vente récente</div>';
            return;
        }
        
        const now = new Date();
        const nowMs = now.getTime();
        const fortyEightHoursAgoMs = nowMs - 48 * 60 * 60 * 1000;
        
        if (!usePreprocessed) {
            // Full path: filter + enrich
            const recentSales = sales.filter(function(sale) {
                return new Date(sale.timestamp).getTime() >= fortyEightHoursAgoMs;
            });
            if (recentSales.length === 0) {
                container.innerHTML = '<div class="empty-last-sold">Aucune vente dans les dernières 48 heures</div>';
                return;
            }
            const results = await Promise.all(recentSales.map(sale =>
                calculateActualRevenueAndProfit(sale, customerMap, debtIndex)
            ));
            await _renderLastSoldCards(recentSales, results, nowMs);
        } else {
            // Fast path: already enriched
            const recentSales = [];
            for (let i = 0; i < sales.length; i++) {
                const s = sales[i];
                const ts = s._ts || new Date(s.timestamp).getTime();
                if (ts >= fortyEightHoursAgoMs) {
                    recentSales.push(s);
                }
            }
            if (recentSales.length === 0) {
                container.innerHTML = '<div class="empty-last-sold">Aucune vente dans les dernières 48 heures</div>';
                return;
            }
            await _renderLastSoldCards(recentSales, null, nowMs);
        }
        
    } catch (e) {
        console.error('Failed to load last sold items:', e);
    }
}

async function _renderLastSoldCards(recentSales, results, nowMs) {
    const container = document.getElementById('last-sold-items');
    if (!container) return;
    
    // Enrich sales with display data
    const enrichedSales = [];
    for (let i = 0; i < recentSales.length; i++) {
        const sale = recentSales[i];
        const saleMs = sale._ts || new Date(sale.timestamp).getTime();
        const seconds = Math.floor((nowMs - saleMs) / 1000);
        let timeAgo;
        if (seconds < 60) timeAgo = "à l'instant";
        else if (seconds < 3600) timeAgo = 'il y a ' + Math.floor(seconds / 60) + ' min';
        else if (seconds < 86400) timeAgo = 'il y a ' + Math.floor(seconds / 3600) + 'h';
        else timeAgo = 'il y a ' + Math.floor(seconds / 86400) + 'j';
        
        let actualRevenue, isPaid, isPartial, remainingAmount, amountPaid;
        if (results) {
            const r = results[i];
            actualRevenue = r.actualRevenue;
            isPaid = r.isPaid;
            isPartial = r.isPartial;
            remainingAmount = r.remainingAmount;
            amountPaid = r.amountPaid;
        } else {
            actualRevenue = sale._actualRevenue || 0;
            isPaid = sale._isPaid === true;
            isPartial = sale._isPartial === true;
            remainingAmount = sale._remainingAmount || 0;
            amountPaid = sale._amountPaid || 0;
        }
        
        enrichedSales.push({
            id: sale.id,
            customerName: sale.customerName || 'Client régulier',
            items: sale.items,
            timestamp: sale.timestamp,
            timeAgo: timeAgo,
            _actualRevenue: actualRevenue,
            _isPaid: isPaid,
            _isPartial: isPartial,
            _remainingAmount: remainingAmount,
            _amountPaid: amountPaid,
            isDebt: sale.isDebt,
            debtEntry: sale.debtEntry,
            isActuallyDebt: remainingAmount > 0
        });
    }
    
    // Group by customer (most recent sale per customer)
    const customerSalesMap = new Map();
    enrichedSales.sort(function(a, b) {
        return (b._ts || new Date(b.timestamp).getTime()) - (a._ts || new Date(a.timestamp).getTime());
    });
    for (let i = 0; i < enrichedSales.length; i++) {
        const sale = enrichedSales[i];
        if (!customerSalesMap.has(sale.customerName)) {
            customerSalesMap.set(sale.customerName, []);
        }
        customerSalesMap.get(sale.customerName).push(sale);
    }
    
    function getInitials(name) {
        if (!name || name === 'Client régulier') return '👤';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    }
    
    const parts = [];
    let count = 0;
    const maxItems = 15;
    
    for (const [customerName, customerSales] of customerSalesMap) {
        if (count >= maxItems) break;
        
        const latestSale = customerSales[0];
        const itemsList = latestSale.items.map(function(item) {
            return '<span class="item-tag">' + escapeHtml(item.name) + ' × ' + item.qty + '</span>';
        }).join(' ');
        
        const displayAmount = latestSale._actualRevenue || 0;
        const totalAmount = displayAmount.toFixed(2);
        const isActuallyDebt = latestSale.isActuallyDebt;
        const isPartial = latestSale._isPartial;
        
        const statusClass = isActuallyDebt ? (isPartial ? 'status-partial' : 'status-debt') : 'status-paid';
        const statusText = isActuallyDebt ? (isPartial ? 'Partiel' : 'Dette') : 'Payé';
        const initials = getInitials(customerName);
        
        let discBadge = '';
        if (typeof getSaleDiscountInfo === 'function') {
            const discInfo = getSaleDiscountInfo(latestSale);
            if (discInfo.total > 0) {
                discBadge = '<span class="ls-disc-badge" title="Remise totale : ' + discInfo.total.toFixed(2) + ' ' + settings.currency + '">🏷️ −' + discInfo.total.toFixed(2) + '</span>';
            }
        }
        
        parts.push(`
            <div class="ls-card ${statusClass}" data-customer="${escapeHtml(customerName)}" data-sale-id="${latestSale.id}">
                <div class="ls-avatar">${initials}</div>
                <div class="ls-main">
                    <div class="ls-top-row">
                        <span class="ls-client-name" onclick="window.viewCustomerLastPurchase('${escapeHtml(customerName)}', ${latestSale.id})">
                            ${escapeHtml(customerName)}
                        </span>
                        <span class="ls-badge ${statusClass}">
                            <span class="ls-badge-dot"></span>${statusText}
                        </span>
                        <span class="ls-time">${latestSale.timeAgo || 'Récent'}</span>
                    </div>
                    <div class="ls-items-list">${itemsList || '<span class="ls-no-items">Aucun article</span>'}</div>
                </div>
                <div class="ls-right">
                    <div class="ls-price-tag">
                        <span class="ls-price-val">${totalAmount}</span>
                        <span class="ls-price-cur">${settings.currency || 'DA'}</span>
                    </div>
                    ${discBadge}
                    <div class="ls-actions">
                        <button type="button" class="ls-act-btn ls-act-restore" onclick="event.stopPropagation(); restoreTransactionToCart(${latestSale.id})" title="Charger dans le panier">
                            ↩
                        </button>
                        <button type="button" class="ls-act-btn ls-act-edit" onclick="event.stopPropagation(); openEditSaleModal(${latestSale.id})" title="Modifier">
                            ✏️
                        </button>
                        <button type="button" class="ls-act-btn ls-act-delete" onclick="event.stopPropagation(); deleteSale(${latestSale.id})" title="Supprimer">
                            🗑
                        </button>
                    </div>
                </div>
            </div>
        `);
        count++;
    }
    
    container.innerHTML = parts.join('') || '<div class="empty-last-sold">Aucune vente récente</div>';
}

// ============================================================
// DELETE SALE - WITH STOCK RESTORATION
// FIX 1: Debt removal now checks ALL sales with a customerId, not just
//         sale.isDebt === true. A paid-off debt still leaves a record
//         in customer.debts (with remainingAmount=0) that must be cleaned up.
// FIX 2: After delete, refreshAnalytics() + loadInventory() + loadCustomers()
//         are all called so every view stays in sync.
// ============================================================
async function deleteSale(saleId) {
    if (!confirm('⚠️ Supprimer la vente #' + saleId + ' ?\n\nLes articles seront RESTITUÉS au stock.')) return;
    
    try {
        const sale = await dbGet('sales', Number(saleId));
        if (!sale) {
            showToast('❌ Vente introuvable', 'error');
            return;
        }
        
        console.log('🗑️ Deleting sale #' + saleId + ' and restoring stock...');
        console.log('📋 Sale items:', sale.items);
        
        // ============================================================
        // STEP 1: RESTORE STOCK
        // ============================================================
        let itemsRestored = 0;
        const restoredItems = [];
        
        for (const item of sale.items) {
            const barcode = item.barcode;
            const qty = item.qty || 0;
            
            console.log(`📦 Processing item: ${item.name}, barcode: ${barcode}, qty: ${qty}`);
            
            if (barcode && qty > 0) {
                try {
                    const product = await dbGet('products', barcode);
                    if (product) {
                        const oldStock = product.stock || 0;
                        product.stock = oldStock + qty;
                        await dbPut('products', product);
                        itemsRestored += qty;
                        restoredItems.push({
                            name: product.name,
                            qty: qty,
                            oldStock: oldStock,
                            newStock: product.stock
                        });
                        console.log(`✅ ${qty} unités restituées pour ${product.name} (stock: ${oldStock} → ${product.stock})`);
                    } else {
                        console.warn(`⚠️ Produit avec code-barres ${barcode} non trouvé dans la base de données`);
                    }
                } catch (err) {
                    console.error(`❌ Erreur lors de la restitution du produit ${barcode}:`, err);
                }
            } else {
                console.warn(`⚠️ Item sans code-barres ou quantité invalide:`, item);
            }
        }
        
        // ============================================================
        // STEP 2: Remove debt from customer if ANY debt entry exists
        // FIX: Previously only ran when sale.isDebt === true.
        //      Paid-off debts also have a customer debt record that must
        //      be removed so the customer history stays clean.
        // ============================================================
        if (sale.customerId) {
            try {
                const customer = await dbGet('customers', sale.customerId);
                if (customer && customer.debts) {
                    const debtIndex = customer.debts.findIndex(d => d.saleId === sale.id);
                    if (debtIndex !== -1) {
                        customer.debts.splice(debtIndex, 1);
                        if (customer.debts.length === 0) {
                            customer.debts = [];
                        }
                        await dbPut('customers', customer);
                        console.log('✅ Debt entry removed from customer:', customer.name);
                    }
                }
            } catch (err) {
                console.error('❌ Erreur lors de la suppression de la dette:', err);
            }
        }
        
        // ============================================================
        // STEP 3: Delete the sale
        // ============================================================
        await dbDelete('sales', Number(saleId));
        
        // ============================================================
        // STEP 4: Show detailed confirmation
        // ============================================================
        let message = `✅ Vente #${saleId} supprimée`;
        if (itemsRestored > 0) {
            message += ` - ${itemsRestored} article(s) restitués en stock`;
            if (restoredItems.length > 0 && restoredItems.length <= 3) {
                const details = restoredItems.map(r => `${r.name} (+${r.qty})`).join(', ');
                message += ` (${details})`;
            }
        } else {
            message += ` ⚠️ Aucun stock restitué (produits introuvables)`;
        }
        showToast(message, 'success');
        playSuccess();
        
        // ============================================================
        // STEP 5: Refresh everything — analytics, inventory, customers
        // ============================================================
        await loadInventory();
        await loadCustomers();
        await refreshAnalytics();
        await (window.createAutoBackup || (function() { return Promise.resolve(); }))();
        
        console.log(`✅ Sale #${saleId} deleted successfully, ${itemsRestored} items restored`);
        
    } catch (error) {
        console.error('❌ Delete sale error:', error);
        showToast('❌ Erreur lors de la suppression: ' + error.message, 'error');
        playError();
    }
}

// ============================================================
// DELETE ALL SALES - WITH STOCK RESTORATION
// ============================================================
async function deleteAllSales() {
    if (!confirm('⚠️⚠️⚠️ Supprimer TOUTES les ventes ?\n\nTous les articles seront RESTITUÉS au stock.')) return;
    if (!confirm('Êtes-vous absolument sûr ?')) return;
    
    try {
        const sales = await dbGetAll('sales');
        
        // RESTORE ALL STOCK
        let totalItemsRestored = 0;
        const stockRestore = {};
        
        for (const sale of sales) {
            for (const item of sale.items) {
                const barcode = item.barcode;
                const qty = item.qty || 0;
                if (barcode && qty > 0) {
                    if (!stockRestore[barcode]) stockRestore[barcode] = 0;
                    stockRestore[barcode] += qty;
                    totalItemsRestored += qty;
                }
            }
        }
        
        // Apply stock restoration
        for (const [barcode, qty] of Object.entries(stockRestore)) {
            const product = await dbGet('products', barcode);
            if (product) {
                product.stock = (product.stock || 0) + qty;
                await dbPut('products', product);
            }
        }
        
        // Remove all customer debts
        for (const sale of sales) {
            if (sale.customerId) {
                const customer = await dbGet('customers', sale.customerId);
                if (customer && customer.debts) {
                    customer.debts = customer.debts.filter(d => d.saleId !== sale.id);
                    if (customer.debts.length === 0) {
                        customer.debts = undefined;
                    }
                    await dbPut('customers', customer);
                }
            }
        }
        
        // Clear all sales
        await dbClear('sales');
        
        showToast(`✅ Toutes les ventes supprimées - ${totalItemsRestored} article(s) restitués en stock`, 'success');
        playSuccess();
        await loadInventory();
        await loadCustomers();
        await refreshAnalytics();
        await (window.createAutoBackup || (function() { return Promise.resolve(); }))();
        
    } catch (error) {
        console.error('Delete all sales error:', error);
        showToast('❌ Erreur lors de la suppression', 'error');
        playError();
    }
}

// ============================================================
// CLEAR ALL SALES - WITH STOCK RESTORATION
// ============================================================
async function clearAllSales() {
    if (!confirm('⚠️⚠️⚠️ Supprimer TOUTES les ventes ?\n\nTous les articles seront RESTITUÉS au stock.\n\n⚠️ Cette action est irréversible !')) return;
    if (!confirm('Êtes-vous absolument sûr ?')) return;
    
    try {
        const sales = await dbGetAll('sales');
        
        // RESTORE ALL STOCK
        let totalItemsRestored = 0;
        const stockRestore = {};
        
        for (const sale of sales) {
            for (const item of sale.items) {
                const barcode = item.barcode;
                const qty = item.qty || 0;
                if (barcode && qty > 0) {
                    if (!stockRestore[barcode]) stockRestore[barcode] = 0;
                    stockRestore[barcode] += qty;
                    totalItemsRestored += qty;
                }
            }
        }
        
        // Apply stock restoration
        for (const [barcode, qty] of Object.entries(stockRestore)) {
            const product = await dbGet('products', barcode);
            if (product) {
                product.stock = (product.stock || 0) + qty;
                await dbPut('products', product);
            }
        }
        
        // Remove all customer debts
        for (const sale of sales) {
            if (sale.customerId) {
                const customer = await dbGet('customers', sale.customerId);
                if (customer && customer.debts) {
                    customer.debts = customer.debts.filter(d => d.saleId !== sale.id);
                    if (customer.debts.length === 0) {
                        customer.debts = undefined;
                    }
                    await dbPut('customers', customer);
                }
            }
        }
        
        // Clear all sales
        await dbClear('sales');
        
        showToast(`✅ Toutes les ventes supprimées - ${totalItemsRestored} article(s) restitués en stock`, 'success');
        playSuccess();
        await loadInventory();
        await loadCustomers();
        await refreshAnalytics();
        await (window.createAutoBackup || (function() { return Promise.resolve(); }))();
        
    } catch (error) {
        console.error('Clear all sales error:', error);
        showToast('❌ Échec de la suppression', 'error');
        playError();
    }
}

// ============================================================
// RESTORE TRANSACTION TO CART
// ============================================================
async function restoreTransactionToCart(saleId) {
    try {
        const sale = await dbGet('sales', Number(saleId));
        if (!sale) {
            showToast('❌ Vente introuvable', 'error');
            return;
        }

        if (window.cart && window.cart.length > 0) {
            if (!confirm('⚠️ Le panier contient ' + window.cart.length + ' articles.\n\nRemplacer par la vente #' + saleId + ' ?')) {
                return;
            }
        }

        window.cart = (sale.items || []).map(function(item) {
            return {
                barcode: item.barcode || 'temp_' + Date.now() + '_' + Math.random(),
                name: item.name,
                price: item.originalPrice || item.soldPrice || 0,
                purchasePrice: item.purchasePrice || item.originalPrice || 0,
                reference: item.reference || '',
                reducedPrice: item.reducedPrice !== undefined && item.reducedPrice !== null ? item.reducedPrice : null,
                unit: item.unit || 'pièce',
                qty: item.qty || 1
            };
        });
        
        window.quickCart = [];
        window.quickCustomerMode = false;
        window.quickCustomerActive = false;
        updateQuickCustomerLayout();
        
        const btn = document.getElementById('btn-quick-customer-mode');
        if (btn) {
            btn.textContent = '⚡ Client rapide';
            btn.classList.remove('btn-warning');
            btn.classList.add('btn-secondary');
        }
        
        renderCart();
        if (DOM.customerSelect && sale.customerId) {
            DOM.customerSelect.value = String(sale.customerId);
        }
        updateCheckoutCustomerDisplay();
        showToast('♻️ Vente #' + saleId + ' chargée dans le panier', 'info');
        switchView('checkout');
    } catch (error) {
        console.error('Restore transaction error:', error);
        showToast('❌ Impossible de restaurer cette vente', 'error');
    }
}

// ============================================================
// VIEW CUSTOMER LAST PURCHASE
// ============================================================
window.viewCustomerLastPurchase = async function(customerName, saleId) {
    try {
        const sales = await dbGetAll('sales');
        const customerSales = sales.filter(function(s) {
            return (s.customerName === customerName || (customerName === 'Client régulier' && !s.customerName)) &&
                s.id === saleId;
        });
        
        if (customerSales.length === 0) {
            showToast('❌ Vente non trouvée', 'error');
            return;
        }
        
        const sale = customerSales[0];
        
        let detailModal = document.getElementById('purchase-detail-modal');
        if (!detailModal) {
            detailModal = document.createElement('div');
            detailModal.id = 'purchase-detail-modal';
            detailModal.className = 'modal-overlay';
            detailModal.innerHTML = `
                <div class="modal modal-large">
                    <h3 id="purchase-detail-title">🛒 Détails de l'achat</h3>
                    <div id="purchase-detail-content" style="padding: 16px 0; font-size: 14px; line-height: 1.8;"></div>
                    <div style="display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap;">
                        <button class="btn btn-primary" id="btn-restore-to-cart">↩ Charger dans le panier</button>
                        <button class="btn btn-warning" id="btn-restore-edit-items">📝 Modifier les articles</button>
                        <button class="btn btn-danger" id="btn-delete-purchase" onclick="deleteSale(${saleId})">🗑 Supprimer</button>
                        <button class="btn btn-secondary" id="btn-close-purchase-modal">Fermer</button>
                    </div>
                </div>
            `;
            document.body.appendChild(detailModal);
            
            document.getElementById('btn-close-purchase-modal').addEventListener('click', function() {
                detailModal.classList.remove('active');
            });
            
            detailModal.addEventListener('click', function(e) {
                if (e.target === this) {
                    this.classList.remove('active');
                }
            });
        }
        
        detailModal.dataset.saleId = saleId;
        
        const date = new Date(sale.timestamp).toLocaleString('fr-FR');
        
        // Use live payment status instead of stale sale fields
        const liveStatus = await calculateActualRevenueAndProfit(sale);
        const actualRevenue = liveStatus.actualRevenue;
        const isDebt = liveStatus.remainingAmount > 0;
        const debtStatusText = isDebt ? '⚠️ Dette restante: ' + liveStatus.remainingAmount.toFixed(2) + ' ' + settings.currency : '✅ Payé';
        const debtStatusColor = isDebt ? 'var(--danger)' : 'var(--success)';
        
        const content = document.getElementById('purchase-detail-content');
        if (content) {
            content.innerHTML = `
                <div style="background: linear-gradient(135deg, #f8f7ff 0%, #f0efff 100%); border-radius: 12px; padding: 16px 20px; margin-bottom: 16px;">
                    <p><strong>👤 Client:</strong> ${escapeHtml(customerName)}</p>
                    <p><strong>📅 Date:</strong> ${date}</p>
                    <p><strong>💰 Total:</strong> ${actualRevenue.toFixed(2)} ${settings.currency}</p>
                    <p><strong>💳 Statut:</strong> <span style="color:${debtStatusColor};font-weight:700;">${debtStatusText}</span></p>
                    ${liveStatus.actualProfit !== undefined ? '<p><strong>📈 Profit:</strong> ' + liveStatus.actualProfit.toFixed(2) + ' ' + settings.currency + '</p>' : ''}
                </div>
                <h4 style="margin: 12px 0 8px 0;">📦 Articles achetés:</h4>
                <div style="background: white; border: 1px solid #f0f0f0; border-radius: 8px; padding: 12px 16px;">
                    ${sale.items.map(function(item) {
                        const lineTotal = ((item.soldPrice || item.price || 0) * item.qty).toFixed(2);
                        const isDiscounted = item.soldPrice != null && item.originalPrice != null && item.soldPrice < item.originalPrice;
                        const discMark = isDiscounted
                            ? ' <span style="color:#8e44ad;font-size:11px;font-weight:600;">🏷️ −' + ((item.originalPrice - item.soldPrice) * (item.qty || 0)).toFixed(2) + '</span>'
                            : '';
                        return `
                            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f5f5f5;">
                                <span><strong>${escapeHtml(item.name)}</strong> × ${item.qty} ${item.unit || 'pièce'}${discMark}</span>
                                <span style="font-weight: 600; color: var(--primary);">${lineTotal} ${settings.currency}</span>
                            </div>
                        `;
                    }).join('')}
                    ${typeof getSaleDiscountInfo === 'function' && getSaleDiscountInfo(sale).total > 0 ? `
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; font-weight: 600; color: #8e44ad; border-top: 1px dashed #8e44ad;">
                            <span>🏷️ Remise totale (promo + prix réduit)</span>
                            <span>−${getSaleDiscountInfo(sale).total.toFixed(2)} ${settings.currency}</span>
                        </div>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between; padding: 10px 0; font-weight: 700; font-size: 16px; border-top: 2px solid var(--primary); margin-top: 8px;">
                        <span>Total</span>
                        <span style="color: var(--primary);">${actualRevenue.toFixed(2)} ${settings.currency}</span>
                    </div>
                    ${sale.isDebt && (sale.remainingAmount || 0) > 0 ? `
                        <div style="display: flex; justify-content: space-between; padding: 8px 0; font-weight: 700; color: var(--danger); border-top: 1px dashed var(--danger);">
                            <span>⚠️ Reste à payer</span>
                            <span>${(sale.remainingAmount || 0).toFixed(2)} ${settings.currency}</span>
                        </div>
                    ` : ''}
                </div>
            `;
        }
        
        document.getElementById('purchase-detail-title').textContent = '🛒 Détails de l\'achat - ' + escapeHtml(customerName);
        
        const restoreBtn = document.getElementById('btn-restore-to-cart');
        if (restoreBtn) {
            const newRestoreBtn = restoreBtn.cloneNode(true);
            restoreBtn.parentNode.replaceChild(newRestoreBtn, restoreBtn);
            newRestoreBtn.addEventListener('click', function() {
                const id = detailModal.dataset.saleId;
                detailModal.classList.remove('active');
                restoreTransactionToCart(id);
            });
        }
        
        const editBtn = document.getElementById('btn-restore-edit-items');
        if (editBtn) {
            const newEditBtn = editBtn.cloneNode(true);
            editBtn.parentNode.replaceChild(newEditBtn, editBtn);
            newEditBtn.addEventListener('click', function() {
                const id = detailModal.dataset.saleId;
                detailModal.classList.remove('active');
                openEditSaleModal(id);
            });
        }
        
        detailModal.classList.add('active');
        
    } catch (error) {
        console.error('View customer purchase error:', error);
        showToast('❌ Erreur lors du chargement des détails', 'error');
    }
};

// ============================================================
// EDIT SALE MODAL - PRODUCT SEARCH FOR NEW ITEM ROWS
// ============================================================
function _createEditSaleItemRowHtml(index) {
    return `
        <div class="edit-sale-item" data-index="${index}" style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid #f5f5f5;flex-wrap:wrap;position:relative;">
            <input type="hidden" class="edit-item-barcode" value="">
            <div class="edit-item-search-wrap" style="flex:2;min-width:120px;position:relative;">
                <input type="text" class="edit-item-search" placeholder="🔍 Rechercher un produit..." style="width:100%;padding:4px 8px;border:1px solid #e0e0e0;border-radius:4px;font-size:13px;" autocomplete="off">
                <div class="edit-item-suggestions" style="display:none;position:absolute;top:100%;left:0;right:0;background:white;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 4px 4px;max-height:180px;overflow-y:auto;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.15);"></div>
            </div>
            <input type="text" class="edit-item-name" placeholder="Nom" style="flex:2;min-width:80px;padding:4px 8px;border:1px solid #e0e0e0;border-radius:4px;font-size:13px;" readonly>
            <input type="number" class="edit-item-qty" value="1" step="0.01" min="0.01" placeholder="Qté" style="flex:0 0 60px;padding:4px 8px;border:1px solid #e0e0e0;border-radius:4px;font-size:13px;">
            <input type="number" class="edit-item-price" step="0.01" min="0" placeholder="Prix" style="flex:0 0 80px;padding:4px 8px;border:1px solid #e0e0e0;border-radius:4px;font-size:13px;">
            <button class="btn-remove-item" data-index="${index}" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:16px;padding:4px;border-radius:4px;">✕</button>
        </div>
    `;
}

function _attachEditSaleItemSearchListeners(row) {
    const searchInput = row.querySelector('.edit-item-search');
    const suggestionsDiv = row.querySelector('.edit-item-suggestions');
    if (!searchInput || !suggestionsDiv) return;

    let debounceTimer = null;

    searchInput.addEventListener('input', function() {
        const query = this.value.trim();
        if (debounceTimer) clearTimeout(debounceTimer);
        if (!query) { suggestionsDiv.style.display = 'none'; return; }
        debounceTimer = setTimeout(async function() {
            try {
                const results = await fastSearch(query);
                if (!results.length) {
                    suggestionsDiv.innerHTML = '<div style="padding:8px 12px;color:#999;text-align:center;font-size:12px;">Aucun produit trouvé</div>';
                    suggestionsDiv.style.display = 'block';
                    return;
                }
                let html = '';
                results.slice(0, 10).forEach(function(p) {
                    const stockLabel = p.stock <= 0 ? '<span style="color:var(--danger);">Hors stock</span>' : 'Stock: ' + p.stock;
                    html += `
                        <div class="edit-suggestion-item" data-barcode="${escapeHtml(p.barcode)}" data-name="${escapeHtml(p.name)}" data-price="${p.price}" data-unit="${escapeHtml(p.unit || 'pièce')}" data-purchase="${p.purchasePrice || p.price * 0.7}" data-ref="${escapeHtml(p.reference || '')}"
                            style="padding:8px 12px;cursor:pointer;border-bottom:1px solid #f5f5f5;font-size:13px;display:flex;justify-content:space-between;align-items:center;transition:background 0.15s;"
                            onmouseover="this.style.background='#f0f4ff'" onmouseout="this.style.background='white'">
                            <div>
                                <div style="font-weight:600;color:#333;">${escapeHtml(p.name)}</div>
                                <div style="font-size:11px;color:#888;margin-top:2px;">${escapeHtml(p.barcode)} ${p.reference ? ' • ' + escapeHtml(p.reference) : ''}</div>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-weight:700;color:var(--primary);font-size:14px;">${p.price.toFixed(2)} DA</div>
                                <div style="font-size:11px;color:#999;">${stockLabel}</div>
                            </div>
                        </div>
                    `;
                });
                suggestionsDiv.innerHTML = html;
                suggestionsDiv.style.display = 'block';

                suggestionsDiv.querySelectorAll('.edit-suggestion-item').forEach(function(item) {
                    item.addEventListener('click', function() {
                        const row = this.closest('.edit-sale-item');
                        row.querySelector('.edit-item-barcode').value = this.dataset.barcode;
                        row.querySelector('.edit-item-name').value = this.dataset.name;
                        row.querySelector('.edit-item-price').value = this.dataset.price;
                        row.querySelector('.edit-item-name').setAttribute('data-unit', this.dataset.unit);
                        row.querySelector('.edit-item-name').setAttribute('data-purchase', this.dataset.purchase);
                        row.querySelector('.edit-item-name').setAttribute('data-ref', this.dataset.ref);
                        searchInput.value = '';
                        suggestionsDiv.style.display = 'none';
                        row.querySelector('.edit-item-qty').focus();
                    });
                });
            } catch (err) {
                console.error('Edit sale search error:', err);
            }
        }, 80);
    });

    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            suggestionsDiv.style.display = 'none';
        }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            const items = suggestionsDiv.querySelectorAll('.edit-suggestion-item');
            if (!items.length) return;
            const active = suggestionsDiv.querySelector('.edit-suggestion-item.active');
            let idx = 0;
            if (active) {
                idx = Array.from(items).indexOf(active);
                if (e.key === 'ArrowDown') idx = Math.min(idx + 1, items.length - 1);
                else idx = Math.max(idx - 1, 0);
            }
            items.forEach(function(it) { it.classList.remove('active'); it.style.background = 'white'; });
            items[idx].classList.add('active');
            items[idx].style.background = '#f0f4ff';
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            const active = suggestionsDiv.querySelector('.edit-suggestion-item.active') || suggestionsDiv.querySelector('.edit-suggestion-item');
            if (active) active.click();
        }
    });

    searchInput.addEventListener('focus', function() {
        if (this.value.trim()) {
            const event = new Event('input', { bubbles: true });
            this.dispatchEvent(event);
        }
    });

    document.addEventListener('click', function(e) {
        if (!suggestionsDiv.contains(e.target) && e.target !== searchInput) {
            suggestionsDiv.style.display = 'none';
        }
    });
}

function _addEditSaleItemRow(container) {
    const index = container.querySelectorAll('.edit-sale-item').length;
    const tmp = document.createElement('div');
    tmp.innerHTML = _createEditSaleItemRowHtml(index);
    const newRow = tmp.firstElementChild;

    const addBtn2 = container.querySelector('#btn-add-item-row');
    if (addBtn2) {
        addBtn2.parentNode.insertBefore(newRow, addBtn2);
    } else {
        container.appendChild(newRow);
    }

    _attachEditSaleItemSearchListeners(newRow);

    newRow.querySelector('.btn-remove-item').onclick = function() {
        newRow.remove();
    };

    newRow.querySelector('.edit-item-search').focus();
}

// ============================================================
// OPEN EDIT SALE MODAL - FIXED
// ============================================================
async function openEditSaleModal(saleId) {
    try {
        const sale = await dbGet('sales', Number(saleId));
        if (!sale) {
            showToast('❌ Vente introuvable', 'error');
            return;
        }
        
        // Check if modal already exists
        let modal = document.getElementById('edit-sale-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'edit-sale-modal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal modal-large" style="max-width:700px;max-height:90vh;overflow-y:auto;">
                    <h3 id="edit-sale-title">✏️ Modifier la vente #<span id="edit-sale-id-display"></span></h3>
                    <div style="margin:16px 0;">
                        <div class="form-group">
                            <label for="edit-sale-customer">Client</label>
                            <div style="display:flex;gap:8px;align-items:center;">
                                <select id="edit-sale-customer" style="flex:2;padding:8px 12px;border:2px solid #e0e0e0;border-radius:var(--radius-sm);font-size:14px;font-family:var(--font-family);cursor:pointer;">
                                    <option value="">🔄 Client régulier (sans profil)</option>
                                </select>
                                <button type="button" class="btn btn-sm btn-primary" id="btn-edit-sale-new-customer" style="flex:0 1 auto;white-space:nowrap;">➕ Nouveau</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="edit-sale-status">Statut de paiement</label>
                            <select id="edit-sale-status">
                                <option value="paid">✅ Payé</option>
                                <option value="debt">⚠️ Dette</option>
                                <option value="partial">⏳ Partiel</option>
                            </select>
                        </div>
                        <div style="display:flex;gap:12px;">
                            <div class="form-group" style="flex:1;">
                                <label for="edit-sale-amount-paid">Montant payé (DA)</label>
                                <input type="number" id="edit-sale-amount-paid" step="0.01" min="0">
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label for="edit-sale-total">Total (DA)</label>
                                <input type="number" id="edit-sale-total" step="0.01" min="0" readonly style="background:#f5f5f5;">
                            </div>
                        </div>
                    </div>
                    <h4 style="margin:12px 0 8px 0;">📦 Articles</h4>
                    <div id="edit-sale-items-container" style="max-height:300px;overflow-y:auto;border:1px solid #f0f0f0;border-radius:8px;padding:8px;"></div>
                    <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;">
                        <button class="btn btn-primary" id="btn-save-sale-edit">💾 Sauvegarder</button>
                        <button class="btn btn-danger" id="btn-delete-sale-from-modal">🗑 Supprimer</button>
                        <button class="btn btn-secondary" id="btn-close-sale-edit">Annuler</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            
            // Close modal events
            document.getElementById('btn-close-sale-edit').addEventListener('click', function() {
                modal.classList.remove('active');
            });
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
            document.getElementById('btn-save-sale-edit').addEventListener('click', async function() {
                await saveSaleEdit();
            });
            // FIX: Use modal.dataset.saleId (updated every open) instead of a
            //      baked-in onclick that always referenced the first sale opened.
            document.getElementById('btn-delete-sale-from-modal').addEventListener('click', async function() {
                const currentId = modal.dataset.saleId;
                if (currentId) {
                    modal.classList.remove('active');
                    await deleteSale(currentId);
                }
            });
        }
        
        // Store current sale ID
        modal.dataset.saleId = saleId;
        
        // Make sure elements exist before setting values
        const idDisplay = document.getElementById('edit-sale-id-display');
        const customerSelect = document.getElementById('edit-sale-customer');
        const amountPaidInput = document.getElementById('edit-sale-amount-paid');
        const totalInput = document.getElementById('edit-sale-total');
        
        if (idDisplay) idDisplay.textContent = saleId;
        
        // Populate customer dropdown with existing customers
        if (customerSelect) {
            customerSelect.innerHTML = '<option value="">🔄 Client régulier (sans profil)</option>';
            const allCustomers = await dbGetAll('customers');
            const sorted = [...allCustomers].sort((a, b) => a.name.localeCompare(b.name));
            sorted.forEach(c => {
                const option = document.createElement('option');
                option.value = c.id;
                option.textContent = `${c.name} ${c.phone ? '📱 ' + c.phone : ''}`;
                customerSelect.appendChild(option);
            });
            // Set the current customer
            customerSelect.value = sale.customerId || '';
        }
        
        // Setup "Nouveau" button for adding new customer from edit modal
        const newCustBtn = document.getElementById('btn-edit-sale-new-customer');
        if (newCustBtn) {
            const freshBtn = newCustBtn.cloneNode(true);
            newCustBtn.parentNode.replaceChild(freshBtn, newCustBtn);
            freshBtn.addEventListener('click', function() {
                modal.classList.remove('active');
                switchView('customers');
                setTimeout(() => {
                    const nameInput = document.getElementById('customer-name');
                    if (nameInput) nameInput.focus();
                }, 300);
            });
        }
        if (amountPaidInput) amountPaidInput.value = sale.amountPaid || 0;
        if (totalInput) totalInput.value = sale.grandTotal || 0;
        
        // Set status
        const statusSelect = document.getElementById('edit-sale-status');
        if (statusSelect) {
            if (sale.isDebt) {
                if (sale.remainingAmount > 0 && sale.amountPaid > 0) {
                    statusSelect.value = 'partial';
                } else {
                    statusSelect.value = 'debt';
                }
            } else {
                statusSelect.value = 'paid';
            }
            
            // Auto-update amountPaid when status changes
            const freshStatusSelect = statusSelect.cloneNode(true);
            statusSelect.parentNode.replaceChild(freshStatusSelect, statusSelect);
            freshStatusSelect.addEventListener('change', function() {
                const amtInput = document.getElementById('edit-sale-amount-paid');
                const totalVal = parseFloat(document.getElementById('edit-sale-total').value) || 0;
                if (this.value === 'paid') {
                    if (amtInput) amtInput.value = totalVal;
                } else if (this.value === 'debt') {
                    if (amtInput) amtInput.value = 0;
                }
                // partial: leave amountPaid as-is
            });
        }
        
        // Render items
        const itemsContainer = document.getElementById('edit-sale-items-container');
        if (itemsContainer) {
            let itemsHtml = '';
            if (sale.items && sale.items.length > 0) {
                sale.items.forEach(function(item, index) {
                    itemsHtml += `
                        <div class="edit-sale-item" data-index="${index}" style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid #f5f5f5;flex-wrap:wrap;">
                            <input type="hidden" class="edit-item-barcode" value="${escapeHtml(item.barcode || '')}">
                            <div class="edit-item-search-wrap" style="flex:2;min-width:120px;position:relative;">
                                <input type="text" class="edit-item-search" placeholder="🔍 Rechercher..." style="width:100%;padding:4px 8px;border:1px solid #e0e0e0;border-radius:4px;font-size:13px;" autocomplete="off">
                                <div class="edit-item-suggestions" style="display:none;position:absolute;top:100%;left:0;right:0;background:white;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 4px 4px;max-height:180px;overflow-y:auto;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.15);"></div>
                            </div>
                            <input type="text" class="edit-item-name" value="${escapeHtml(item.name)}" placeholder="Nom" style="flex:2;min-width:80px;padding:4px 8px;border:1px solid #e0e0e0;border-radius:4px;font-size:13px;">
                            <input type="number" class="edit-item-qty" value="${item.qty}" step="0.01" min="0" placeholder="Qté" style="flex:0 0 60px;padding:4px 8px;border:1px solid #e0e0e0;border-radius:4px;font-size:13px;">
                            <input type="number" class="edit-item-price" value="${item.soldPrice || item.price || 0}" step="0.01" min="0" placeholder="Prix" style="flex:0 0 80px;padding:4px 8px;border:1px solid #e0e0e0;border-radius:4px;font-size:13px;">
                            <button class="btn-remove-item" data-index="${index}" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:16px;padding:4px;border-radius:4px;">✕</button>
                        </div>
                    `;
                });
            }
            itemsHtml += '<div style="margin-top:8px;"><button id="btn-add-item-row" style="padding:6px 14px;background:var(--primary-gradient);color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;">➕ Ajouter un article</button></div>';
            itemsContainer.innerHTML = itemsHtml;

            // Attach search listeners to existing item rows
            itemsContainer.querySelectorAll('.edit-sale-item').forEach(function(row) {
                _attachEditSaleItemSearchListeners(row);
                row.querySelector('.btn-remove-item').onclick = function() { row.remove(); };
            });

            // Add item button
            const addBtn = document.getElementById('btn-add-item-row');
            if (addBtn) {
                addBtn.addEventListener('click', function() {
                    _addEditSaleItemRow(itemsContainer);
                });
            }
        }
        
        // Show modal
        modal.classList.add('active');
        const titleElement = document.getElementById('edit-sale-title');
        if (titleElement) {
            titleElement.textContent = '✏️ Modifier la vente #' + saleId;
        }
        window._currentEditSaleId = saleId;
        
    } catch (error) {
        console.error('Open edit sale modal error:', error);
        showToast('❌ Erreur lors du chargement', 'error');
    }
}

// ============================================================
// SAVE SALE EDIT
// ============================================================
async function saveSaleEdit() {
    try {
        const saleId = window._currentEditSaleId;
        if (!saleId) {
            showToast('❌ Aucune vente sélectionnée', 'error');
            return;
        }
        
        const sale = await dbGet('sales', Number(saleId));
        if (!sale) {
            showToast('❌ Vente introuvable', 'error');
            return;
        }
        
        const customerSelect = document.getElementById('edit-sale-customer');
        const selectedCustomerId = customerSelect ? parseInt(customerSelect.value) || null : null;
        const customerName = selectedCustomerId ? (customers.find(c => c.id === selectedCustomerId)?.name || 'Client régulier') : 'Client régulier';
        const amountPaid = parseFloat(document.getElementById('edit-sale-amount-paid').value) || 0;
        const status = document.getElementById('edit-sale-status').value;
        
        const itemElements = document.querySelectorAll('.edit-sale-item');
        const items = [];
        let total = 0;
        let totalProfit = 0;
        
        const allProducts = await dbGetAll('products');
        
        // ============================================================
        // STEP 1: Build a map of original items by barcode for stock diff
        // ============================================================
        const originalItemMap = {}; // barcode -> qty sold originally
        for (const oldItem of (sale.items || [])) {
            const bc = oldItem.barcode || '';
            if (bc) {
                originalItemMap[bc] = (originalItemMap[bc] || 0) + (oldItem.qty || 0);
            }
        }
        
        for (const el of itemElements) {
            const name = el.querySelector('.edit-item-name').value.trim();
            const qty = parseFloat(el.querySelector('.edit-item-qty').value) || 0;
            const price = parseFloat(el.querySelector('.edit-item-price').value) || 0;
            
            if (name && qty > 0 && price >= 0) {
                const subtotal = price * qty;
                total += subtotal;
                
                // Try to get barcode from hidden field first, then fall back to product lookup by name
                const barcodeInput = el.querySelector('.edit-item-barcode');
                let barcode = barcodeInput ? barcodeInput.value.trim() : '';
                
                // Also read data attributes set by product search selection
                const nameInput = el.querySelector('.edit-item-name');
                const searchSelectedUnit = nameInput ? (nameInput.getAttribute('data-unit') || '') : '';
                const searchSelectedPurchase = nameInput ? parseFloat(nameInput.getAttribute('data-purchase')) || 0 : 0;
                const searchSelectedRef = nameInput ? (nameInput.getAttribute('data-ref') || '') : '';
                
                let purchasePrice = 0;
                let unit = 'pièce';
                let reference = '';
                
                // Find matching product by barcode or name
                let product = barcode ? allProducts.find(function(p) { return p.barcode === barcode; }) : null;
                if (!product) {
                    product = allProducts.find(function(p) { return p.name === name; });
                    if (product) barcode = product.barcode || barcode;
                }
                
                if (product) {
                    purchasePrice = product.purchasePrice || product.price * 0.7;
                    unit = product.unit || 'pièce';
                    reference = product.reference || '';
                } else if (searchSelectedUnit || searchSelectedPurchase) {
                    // Use data from search selection
                    purchasePrice = searchSelectedPurchase || price * 0.7;
                    unit = searchSelectedUnit || 'pièce';
                    reference = searchSelectedRef || '';
                } else {
                    purchasePrice = price * 0.7;
                }
                
                const itemProfit = (price - purchasePrice) * qty;
                totalProfit += itemProfit;
                
                items.push({
                    barcode: barcode,
                    name: name,
                    qty: qty,
                    soldPrice: price,
                    originalPrice: price,
                    purchasePrice: purchasePrice,
                    profit: itemProfit,
                    reference: reference,
                    unit: unit
                });
            }
        }
        
        // ============================================================
        // STEP 2: Build new item map and calculate stock delta
        // ============================================================
        const newItemMap = {}; // barcode -> qty in updated sale
        for (const newItem of items) {
            const bc = newItem.barcode || '';
            if (bc) {
                newItemMap[bc] = (newItemMap[bc] || 0) + (newItem.qty || 0);
            }
        }
        
        // Collect all barcodes from both old and new items
        const allBarcodes = new Set([...Object.keys(originalItemMap), ...Object.keys(newItemMap)]);
        
        let stockRestoredCount = 0;
        let stockDeductedCount = 0;
        
        for (const bc of allBarcodes) {
            if (!bc) continue;
            const oldQty = originalItemMap[bc] || 0;
            const newQty = newItemMap[bc] || 0;
            const delta = oldQty - newQty; // positive = need to restore stock, negative = need to deduct
            
            if (Math.abs(delta) < 0.0001) continue; // no change
            
            try {
                const product = await dbGet('products', bc);
                if (product) {
                    const prevStock = product.stock || 0;
                    product.stock = Math.max(0, prevStock + delta);
                    await dbPut('products', product);
                    if (delta > 0) {
                        stockRestoredCount += delta;
                        console.log(`✅ Stock restored for ${product.name}: +${delta} (${prevStock} → ${product.stock})`);
                    } else {
                        stockDeductedCount += Math.abs(delta);
                        console.log(`📉 Stock deducted for ${product.name}: ${delta} (${prevStock} → ${product.stock})`);
                    }
                }
            } catch (err) {
                console.error(`❌ Stock adjustment error for barcode ${bc}:`, err);
            }
        }
        
        if (items.length === 0) {
            showToast('⚠️ Aucun article valide', 'warning');
            return;
        }
        
        // Capture old customer ID BEFORE updating the sale
        const oldCustomerId = sale.customerId;
        
        sale.customerId = selectedCustomerId;
        sale.customerName = customerName || 'Client régulier';
        sale.items = items;
        sale.grandTotal = total;
        sale.totalProfit = totalProfit;
        sale.amountPaid = amountPaid;
        sale.remainingAmount = total - amountPaid;
        
        if (status === 'paid') {
            sale.isDebt = false;
            sale.paymentStatus = 'paid';
            sale.remainingAmount = 0;
            sale.amountPaid = total;
        } else if (status === 'debt') {
            sale.isDebt = true;
            sale.paymentStatus = 'unpaid';
            sale.remainingAmount = total - amountPaid;
        } else if (status === 'partial') {
            sale.isDebt = true;
            sale.paymentStatus = 'unpaid';
            sale.remainingAmount = total - amountPaid;
        }
        
        // ============================================================
        // STEP 4: Sync customer debt records
        // If the customer changed, remove debt from old customer and add to new one
        // ============================================================
        const newCustomerId = selectedCustomerId;
        
        // Remove debt from old customer if customer changed
        if (oldCustomerId && oldCustomerId !== newCustomerId) {
            try {
                const oldCustomer = await dbGet('customers', oldCustomerId);
                if (oldCustomer && oldCustomer.debts) {
                    const debtIndex = oldCustomer.debts.findIndex(d => d.saleId === sale.id);
                    if (debtIndex !== -1) {
                        oldCustomer.debts.splice(debtIndex, 1);
                        if (oldCustomer.debts.length === 0) oldCustomer.debts = [];
                        await dbPut('customers', oldCustomer);
                        console.log('✅ Debt removed from old customer:', oldCustomer.name);
                    }
                }
            } catch (e) {
                console.error('Error removing debt from old customer:', e);
            }
        }
        
        // Update or add debt for new customer
        if (newCustomerId && sale.remainingAmount > 0) {
            try {
                const newCustomer = await dbGet('customers', newCustomerId);
                if (newCustomer) {
                    if (!newCustomer.debts) newCustomer.debts = [];
                    const existingDebtIndex = newCustomer.debts.findIndex(d => d.saleId === sale.id);
                    
                    const debtEntry = {
                        saleId: sale.id,
                        date: sale.timestamp,
                        items: items.map(item => ({
                            name: item.name,
                            qty: item.qty,
                            unit: item.unit || 'pièce',
                            originalPrice: item.originalPrice,
                            soldPrice: item.soldPrice,
                            reducedPrice: item.reducedPrice,
                            reference: item.reference || ''
                        })),
                        totalAmount: total,
                        paidAmount: sale.amountPaid,
                        remainingAmount: sale.remainingAmount,
                        status: sale.remainingAmount <= 0 ? 'paid' : 'pending'
                    };
                    
                    if (existingDebtIndex !== -1) {
                        newCustomer.debts[existingDebtIndex] = debtEntry;
                    } else {
                        newCustomer.debts.push(debtEntry);
                    }
                    await dbPut('customers', newCustomer);
                    console.log('✅ Debt synced for customer:', newCustomer.name);
                }
            } catch (e) {
                console.error('Error syncing debt for new customer:', e);
            }
        } else if (newCustomerId && sale.remainingAmount <= 0) {
            // If fully paid, remove any existing debt entry for this sale from new customer
            try {
                const newCustomer = await dbGet('customers', newCustomerId);
                if (newCustomer && newCustomer.debts) {
                    const debtIndex = newCustomer.debts.findIndex(d => d.saleId === sale.id);
                    if (debtIndex !== -1) {
                        newCustomer.debts.splice(debtIndex, 1);
                        if (newCustomer.debts.length === 0) newCustomer.debts = [];
                        await dbPut('customers', newCustomer);
                    }
                }
            } catch (e) {
                console.error('Error cleaning up debt:', e);
            }
        }
        
        await dbPut('sales', sale);
        
        let toastMsg = '✅ Vente #' + saleId + ' mise à jour';
        if (stockRestoredCount > 0) toastMsg += ` — ${stockRestoredCount} article(s) restitués au stock`;
        if (stockDeductedCount > 0) toastMsg += ` — ${stockDeductedCount} article(s) déduits du stock`;
        showToast(toastMsg, 'success');
        playSuccess();
        document.getElementById('edit-sale-modal').classList.remove('active');
        await loadInventory();
        await loadCustomers();
        await refreshAnalytics();
        await (window.createAutoBackup || (function() { return Promise.resolve(); }))();
        
    } catch (error) {
        console.error('Save sale edit error:', error);
        showToast('❌ Erreur lors de la sauvegarde', 'error');
        playError();
    }
}

// ============================================================
// EXPORT FUNCTIONS
// ============================================================
function exportCSV() {
    showToast('📥 Export CSV en cours...', 'info');
    if (typeof window.exportCSV === 'function') {
        window.exportCSV();
    }
}

function exportJSON() {
    showToast('📄 Export JSON en cours...', 'info');
    if (typeof window.exportJSON === 'function') {
        window.exportJSON();
    }
}

// ============================================================
// MOVE SALE TO ANOTHER DAY
// ============================================================
async function showMoveSaleModal(saleId) {
    try {
        const sale = await dbGet('sales', Number(saleId));
        if (!sale) {
            showToast('❌ Vente introuvable', 'error');
            return;
        }

        const currentDate = new Date(sale.timestamp);
        const dateStr = currentDate.toISOString().split('T')[0];

        let modal = document.getElementById('move-sale-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'move-sale-modal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal" style="max-width:420px;">
                    <h3>📅 Déplacer la vente</h3>
                    <p style="font-size:14px;color:#666;margin:8px 0 16px 0;">Choisissez la nouvelle date pour cette vente.</p>
                    <div class="form-group">
                        <label for="move-sale-date">Nouvelle date</label>
                        <input type="date" id="move-sale-date" style="width:100%;padding:10px 14px;border:2px solid #e0e0e0;border-radius:var(--radius-sm);font-size:15px;font-family:var(--font-family);">
                    </div>
                    <div style="display:flex;gap:10px;margin-top:16px;">
                        <button class="btn btn-primary" id="btn-confirm-move-sale" style="flex:2;">📅 Déplacer</button>
                        <button class="btn btn-secondary" id="btn-cancel-move-sale" style="flex:1;">Annuler</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            document.getElementById('btn-cancel-move-sale').addEventListener('click', function() {
                modal.classList.remove('active');
            });
            modal.addEventListener('click', function(e) {
                if (e.target === modal) modal.classList.remove('active');
            });
        }

        modal.dataset.saleId = saleId;
        const dateInput = document.getElementById('move-sale-date');
        dateInput.value = dateStr;

        const confirmBtn = document.getElementById('btn-confirm-move-sale');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        newConfirmBtn.addEventListener('click', async function() {
            const newDate = document.getElementById('move-sale-date').value;
            if (!newDate) {
                showToast('⚠️ Veuillez choisir une date', 'warning');
                return;
            }
            modal.classList.remove('active');
            await moveSaleToDate(saleId, newDate);
        });

        modal.classList.add('active');
        dateInput.focus();
    } catch (error) {
        console.error('Move sale modal error:', error);
        showToast('❌ Erreur lors du chargement', 'error');
    }
}

async function moveSaleToDate(saleId, newDateStr) {
    try {
        const sale = await dbGet('sales', Number(saleId));
        if (!sale) {
            showToast('❌ Vente introuvable', 'error');
            return;
        }

        const oldDate = new Date(sale.timestamp);
        const newDate = new Date(newDateStr + 'T' + oldDate.toTimeString().slice(0, 8));
        
        sale.timestamp = newDate.toISOString();
        await dbPut('sales', sale);

        const oldDateDisplay = oldDate.toLocaleDateString('fr-FR');
        const newDateDisplay = newDate.toLocaleDateString('fr-FR');
        showToast(`✅ Vente #${saleId} déplacée du ${oldDateDisplay} au ${newDateDisplay}`, 'success');
        playSuccess();

        await refreshAnalytics();
        await (window.createAutoBackup || (function() { return Promise.resolve(); }))();
    } catch (error) {
        console.error('Move sale error:', error);
        showToast('❌ Erreur lors du déplacement', 'error');
        playError();
    }
}

// ============================================================
// SETUP ANALYTICS VIEW
// ============================================================
function setupAnalyticsView() {
    createModernAnalyticsDashboard();
    loadAnalytics();
    // Initialize advanced charts section
    if (typeof window.initAnalyticsCharts === 'function') {
        window.initAnalyticsCharts();
    }
    if (typeof window.captureAnalyticsChart === 'function') {
        window.captureAnalyticsChart();
    }
}

// ============================================================
// WINDOW EXPORTS - ALL FUNCTIONS
// ============================================================
window.createModernAnalyticsDashboard = createModernAnalyticsDashboard;
window.setupAnalyticsView = setupAnalyticsView;
window.renderDailyBreakdown = renderDailyBreakdown;
window.updateLastSoldItems = updateLastSoldItems;
window.deleteSale = deleteSale;
window.deleteAllSales = deleteAllSales;
window.clearAllSales = clearAllSales;
window.restoreTransactionToCart = restoreTransactionToCart;
window.openEditSaleModal = openEditSaleModal;
window.saveSaleEdit = saveSaleEdit;
window.showMoveSaleModal = showMoveSaleModal;
window.moveSaleToDate = moveSaleToDate;
window.exportCSV = exportCSV;
window.exportJSON = exportJSON;

console.log('📊 Analytics UI loaded with stock restoration for all delete actions');