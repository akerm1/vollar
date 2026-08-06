// ============================================================
// ANALYTICS CHARTS: Pure Canvas Chart Module for SamtexChabet
// ============================================================
(function () {
    'use strict';

    // ============================================================
    // COLOR PALETTES
    // ============================================================
    const PALETTES = {
        modern: ['#6366f1', '#8b5cf6', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185', '#f87171', '#fb923c', '#fbbf24'],
        ocean: ['#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22d3ee', '#67e8f9', '#a5f3fc', '#0891b2', '#0e7490', '#155e75'],
        sunset: ['#f97316', '#ef4444', '#eab308', '#f59e0b', '#d97706', '#b45309', '#92400e', '#dc2626', '#ea580c', '#f59e0b'],
        forest: ['#22c55e', '#16a34a', '#15803d', '#166534', '#4ade80', '#86efac', '#bbf7d0', '#a3e635', '#65a30d', '#365314'],
        fire: ['#ef4444', '#f97316', '#eab308', '#dc2626', '#f87171', '#fb923c', '#fbbf24', '#b91c1c', '#c2410c', '#a16207'],
        purple: ['#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#9333ea', '#a855f7', '#d946ef'],
        monochrome: ['#111827', '#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb', '#f3f4f6', '#f9fafb'],
        pastel: ['#fda4af', '#f9a8d4', '#d8b4fe', '#a5b4fc', '#93c5fd', '#86efac', '#fde68a', '#fed7aa', '#fecaca', '#e9d5ff']
    };

    // ============================================================
    // CHART TYPES LIST
    // ============================================================
    const CHART_TYPES = [
        { id: 'bar', label: 'Bar' },
        { id: 'horizontalBar', label: 'Horizontal Bar' },
        { id: 'line', label: 'Line' },
        { id: 'area', label: 'Area' },
        { id: 'pie', label: 'Pie' },
        { id: 'doughnut', label: 'Doughnut' },
        { id: 'radar', label: 'Radar' },
        { id: 'stackedBar', label: 'Stacked Bar' },
        { id: 'scatter', label: 'Scatter' }
    ];

    // ============================================================
    // METRICS LIST
    // ============================================================
    const METRICS = [
        { id: 'revenue', label: 'Revenue' },
        { id: 'profit', label: 'Profit' },
        { id: 'items', label: 'Items Sold' },
        { id: 'sales', label: 'Sales Count' },
        { id: 'margin', label: 'Margin %' },
        { id: 'debt', label: 'Outstanding Debt' },
        { id: 'customers', label: 'By Customer' },
        { id: 'products', label: 'By Product' },
        { id: 'categories', label: 'By Category' },
        { id: 'hourly', label: 'By Hour of Day' },
        { id: 'dayOfWeek', label: 'By Day of Week' },
        { id: 'paymentStatus', label: 'Payment Status' },
        { id: 'revenueVsProfit', label: 'Revenue vs Profit' },
        { id: 'itemsVsRevenue', label: 'Items vs Revenue' },
        { id: 'topProducts', label: 'Top Products' },
        { id: 'topCustomers', label: 'Top Customers' }
    ];

    const DATE_RANGES = [
        { value: '7', label: '7J' },
        { value: '14', label: '14J' },
        { value: '30', label: '30J' },
        { value: '60', label: '60J' },
        { value: '90', label: '90J' },
        { value: '180', label: '180J' },
        { value: '365', label: '1A' },
        { value: 'all', label: 'Tout' }
    ];

    const PALETTE_KEYS = Object.keys(PALETTES);

    // ============================================================
    // STATE
    // ============================================================
    const S = {
        chartType: 'bar',
        metric: 'revenue',
        dateRange: '30',
        customFrom: '',
        customTo: '',
        palette: 'modern',
        showGrid: true,
        showLabels: true,
        showLegend: true,
        animate: true,
        fontSize: 13,
        lineWidth: 2,
        pointRadius: 3,
        fillOpacity: 25,
        borderRadius: 6
    };

    let _cachedData = null;

    // ============================================================
    // HELPER: EASE OUT CUBIC
    // ============================================================
    function easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    // ============================================================
    // HELPER: Format number with currency
    // ============================================================
    function fmtNum(n) {
        if (n == null || isNaN(n)) return '0';
        return n.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
    }

    // ============================================================
    // HELPER: Get canvas context with DPR
    // ============================================================
    function getCtx(canvas) {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx._w = rect.width;
        ctx._h = rect.height;
        return ctx;
    }

    // ============================================================
    // HELPER: Rounded rect path
    // ============================================================
    function roundedRect(ctx, x, y, w, h, r) {
        if (r > h / 2) r = h / 2;
        if (r > w / 2) r = w / 2;
        if (r < 0) r = 0;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    // ============================================================
    // HELPER: Shadow
    // ============================================================
    function addShadow(ctx) {
        ctx.shadowColor = 'rgba(0,0,0,0.08)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
    }

    function clearShadow(ctx) {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    // ============================================================
    // HELPER: Hex to rgba
    // ============================================================
    function hexToRGBA(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    // ============================================================
    // HELPER: Bezier spline for smooth curves
    // ============================================================
    function bezierCurveThrough(ctx, points) {
        if (points.length < 2) return;
        ctx.moveTo(points[0].x, points[0].y);
        if (points.length === 2) {
            ctx.lineTo(points[1].x, points[1].y);
            return;
        }
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[Math.max(0, i - 1)];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[Math.min(points.length - 1, i + 2)];
            const tension = 0.3;
            const cp1x = p1.x + (p2.x - p0.x) * tension;
            const cp1y = p1.y + (p2.y - p0.y) * tension;
            const cp2x = p2.x - (p3.x - p1.x) * tension;
            const cp2y = p2.y - (p3.y - p1.y) * tension;
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p2.x, p2.y);
        }
    }

    // ============================================================
    // DATA GATHERING
    // ============================================================
    async function _gatherData() {
        const [rawSales, products, customersData] = await Promise.all([
            dbGetAll('sales'),
            dbGetAll('products'),
            dbGetAll('customers')
        ]);

        const now = new Date();
        let fromDate = null;
        let toDate = null;

        if (S.dateRange !== 'all') {
            const days = parseInt(S.dateRange) || 30;
            fromDate = new Date(now);
            fromDate.setDate(fromDate.getDate() - days);
            fromDate.setHours(0, 0, 0, 0);
        }
        if (S.customFrom) {
            fromDate = new Date(S.customFrom + 'T00:00:00');
        }
        if (S.customTo) {
            toDate = new Date(S.customTo + 'T23:59:59.999');
        }

        const allDays = {};
        const byCustomer = {};
        const byProduct = {};
        const byCategory = {};
        const byHour = new Array(24).fill(0);
        const byDayOfWeek = new Array(7).fill(0);
        let paymentPaid = 0, paymentPartial = 0, paymentUnpaid = 0;
        let totalRevenue = 0, totalProfit = 0, totalItems = 0, totalSalesCount = 0;
        let totalDebt = 0;

        const sorted = rawSales.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        for (const sale of sorted) {
            const saleDate = new Date(sale.timestamp);
            if (fromDate && saleDate < fromDate) continue;
            if (toDate && saleDate > toDate) continue;

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

            const dateKey = saleDate.toISOString().split('T')[0];
            const itemsCount = (sale.items || []).reduce((s, i) => s + (i.qty || 0), 0);

            if (!allDays[dateKey]) {
                allDays[dateKey] = { date: dateKey, revenue: 0, profit: 0, items: 0, sales: 0 };
            }
            allDays[dateKey].revenue += result.actualRevenue;
            allDays[dateKey].profit += result.actualProfit;
            allDays[dateKey].items += itemsCount;
            allDays[dateKey].sales++;

            totalRevenue += result.actualRevenue;
            totalProfit += result.actualProfit;
            totalItems += itemsCount;
            totalSalesCount++;
            if (result.remainingAmount > 0) totalDebt += result.remainingAmount;

            if (result.isPaid) paymentPaid++;
            else if (result.isPartial) paymentPartial++;
            else paymentUnpaid++;

            const hour = saleDate.getHours();
            byHour[hour] += itemsCount;

            const dow = saleDate.getDay();
            byDayOfWeek[dow] += itemsCount;

            const custName = sale.customerName || 'Client régulier';
            if (!byCustomer[custName]) byCustomer[custName] = { revenue: 0, profit: 0, items: 0, sales: 0 };
            byCustomer[custName].revenue += result.actualRevenue;
            byCustomer[custName].profit += result.actualProfit;
            byCustomer[custName].items += itemsCount;
            byCustomer[custName].sales++;

            if (sale.items) {
                for (const item of sale.items) {
                    const pname = item.name || 'Inconnu';
                    if (!byProduct[pname]) byProduct[pname] = { revenue: 0, profit: 0, items: 0, sales: 0 };
                    byProduct[pname].revenue += (item.soldPrice || item.price || 0) * (item.qty || 0);
                    const prod = products.find(p => p.barcode === item.barcode);
                    const pp = prod ? (prod.purchasePrice || prod.price * 0.7) : ((item.purchasePrice || 0));
                    byProduct[pname].profit += ((item.soldPrice || item.price || 0) - pp) * (item.qty || 0);
                    byProduct[pname].items += (item.qty || 0);
                    byProduct[pname].sales++;

                    const cat = prod ? (prod.category || 'Autre') : 'Autre';
                    if (!byCategory[cat]) byCategory[cat] = { revenue: 0, profit: 0, items: 0, sales: 0 };
                    byCategory[cat].revenue += (item.soldPrice || item.price || 0) * (item.qty || 0);
                    byCategory[cat].profit += ((item.soldPrice || item.price || 0) - pp) * (item.qty || 0);
                    byCategory[cat].items += (item.qty || 0);
                    byCategory[cat].sales++;
                }
            }
        }

        const dailyArr = Object.values(allDays).sort((a, b) => a.date.localeCompare(b.date));
        const bestDayRevenue = Math.max(...dailyArr.map(d => d.revenue), 1);

        let todayRev = 0, weekRev = 0, monthRev = 0;
        let todayProfit = 0, weekProfit = 0, monthProfit = 0;
        let todayItems = 0, weekItems = 0, monthItems = 0;
        const todayKey = new Date().toISOString().split('T')[0];
        const weekStart = new Date();
        const dayOff = weekStart.getDay() === 0 ? 6 : weekStart.getDay() - 1;
        weekStart.setDate(weekStart.getDate() - dayOff);
        weekStart.setHours(0, 0, 0, 0);
        const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        for (const d of dailyArr) {
            const dd = new Date(d.date + 'T12:00:00');
            if (d.date === todayKey) { todayRev = d.revenue; todayProfit = d.profit; todayItems = d.items; }
            if (dd >= weekStart) { weekRev += d.revenue; weekProfit += d.profit; weekItems += d.items; }
            if (dd >= monthStart) { monthRev += d.revenue; monthProfit += d.profit; monthItems += d.items; }
        }

        return {
            daily: dailyArr,
            byCustomer: Object.entries(byCustomer).sort((a, b) => b[1].revenue - a[1].revenue),
            byProduct: Object.entries(byProduct).sort((a, b) => b[1].revenue - a[1].revenue),
            byCategory: Object.entries(byCategory).sort((a, b) => b[1].revenue - a[1].revenue),
            byHour,
            byDayOfWeek,
            payment: { paid: paymentPaid, partial: paymentPartial, unpaid: paymentUnpaid },
            totals: { revenue: totalRevenue, profit: totalProfit, items: totalItems, sales: totalSalesCount, debt: totalDebt },
            bestDayRevenue,
            today: { revenue: todayRev, profit: todayProfit, items: todayItems },
            week: { revenue: weekRev, profit: weekProfit, items: weekItems },
            month: { revenue: monthRev, profit: monthProfit, items: monthItems }
        };
    }

    // ============================================================
    // PREPARE CHART DATA BASED ON METRIC
    // ============================================================
    function prepareChartData(data) {
        const metric = S.metric;
        const cur = (typeof settings !== 'undefined' && settings.currency) ? settings.currency : 'DA';

        switch (metric) {
            case 'revenue':
                return {
                    type: 'time',
                    labels: data.daily.map(d => d.date),
                    values: data.daily.map(d => d.revenue),
                    title: `Daily Revenue (${cur})`,
                    format: v => fmtNum(v) + ' ' + cur
                };
            case 'profit':
                return {
                    type: 'time',
                    labels: data.daily.map(d => d.date),
                    values: data.daily.map(d => d.profit),
                    title: `Daily Profit (${cur})`,
                    format: v => fmtNum(v) + ' ' + cur
                };
            case 'items':
                return {
                    type: 'time',
                    labels: data.daily.map(d => d.date),
                    values: data.daily.map(d => d.items),
                    title: 'Daily Items Sold',
                    format: v => String(Math.round(v))
                };
            case 'sales':
                return {
                    type: 'time',
                    labels: data.daily.map(d => d.date),
                    values: data.daily.map(d => d.sales),
                    title: 'Daily Sales Count',
                    format: v => String(Math.round(v))
                };
            case 'margin':
                return {
                    type: 'time',
                    labels: data.daily.map(d => d.date),
                    values: data.daily.map(d => d.revenue > 0 ? (d.profit / d.revenue * 100) : 0),
                    title: 'Daily Margin %',
                    format: v => v.toFixed(1) + '%'
                };
            case 'debt': {
                const debtDays = data.daily.map(d => {
                    let r = 0;
                    return d;
                });
                return {
                    type: 'time',
                    labels: data.daily.map(d => d.date),
                    values: data.daily.map(() => 0),
                    title: `Outstanding Debt: ${fmtNum(data.totals.debt)} ${cur}`,
                    format: v => fmtNum(v) + ' ' + cur
                };
            }
            case 'customers':
                return {
                    type: 'category',
                    labels: data.byCustomer.slice(0, 12).map(c => c[0]),
                    values: data.byCustomer.slice(0, 12).map(c => c[1].revenue),
                    title: `Revenue by Customer (${cur})`,
                    format: v => fmtNum(v) + ' ' + cur
                };
            case 'products':
                return {
                    type: 'category',
                    labels: data.byProduct.slice(0, 12).map(p => p[0]),
                    values: data.byProduct.slice(0, 12).map(p => p[1].revenue),
                    title: `Revenue by Product (${cur})`,
                    format: v => fmtNum(v) + ' ' + cur
                };
            case 'categories':
                return {
                    type: 'category',
                    labels: data.byCategory.map(c => c[0]),
                    values: data.byCategory.map(c => c[1].revenue),
                    title: `Revenue by Category (${cur})`,
                    format: v => fmtNum(v) + ' ' + cur
                };
            case 'hourly':
                return {
                    type: 'fixed',
                    labels: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}h`),
                    values: data.byHour,
                    title: 'Items Sold by Hour',
                    format: v => String(Math.round(v))
                };
            case 'dayOfWeek': {
                const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
                return {
                    type: 'fixed',
                    labels: dayNames,
                    values: data.byDayOfWeek,
                    title: 'Items Sold by Day of Week',
                    format: v => String(Math.round(v))
                };
            }
            case 'paymentStatus':
                return {
                    type: 'pie',
                    labels: ['Paid', 'Partial', 'Unpaid'],
                    values: [data.payment.paid, data.payment.partial, data.payment.unpaid],
                    title: 'Payment Status Breakdown',
                    colors: ['#22c55e', '#f59e0b', '#ef4444'],
                    format: v => String(Math.round(v))
                };
            case 'revenueVsProfit':
                return {
                    type: 'dualTime',
                    labels: data.daily.map(d => d.date),
                    values1: data.daily.map(d => d.revenue),
                    values2: data.daily.map(d => d.profit),
                    label1: 'Revenue',
                    label2: 'Profit',
                    title: `Revenue vs Profit (${cur})`,
                    format: v => fmtNum(v) + ' ' + cur
                };
            case 'itemsVsRevenue':
                return {
                    type: 'scatter',
                    points: data.daily.map(d => ({ x: d.items, y: d.revenue })),
                    title: `Items vs Revenue (${cur})`,
                    formatX: v => String(Math.round(v)),
                    formatY: v => fmtNum(v) + ' ' + cur
                };
            case 'topProducts':
                return {
                    type: 'category',
                    labels: data.byProduct.slice(0, 10).map(p => p[0]),
                    values: data.byProduct.slice(0, 10).map(p => p[1].revenue),
                    title: `Top Products by Revenue (${cur})`,
                    format: v => fmtNum(v) + ' ' + cur
                };
            case 'topCustomers':
                return {
                    type: 'category',
                    labels: data.byCustomer.slice(0, 10).map(c => c[0]),
                    values: data.byCustomer.slice(0, 10).map(c => c[1].revenue),
                    title: `Top Customers by Revenue (${cur})`,
                    format: v => fmtNum(v) + ' ' + cur
                };
            default:
                return {
                    type: 'time',
                    labels: data.daily.map(d => d.date),
                    values: data.daily.map(d => d.revenue),
                    title: 'Revenue',
                    format: v => fmtNum(v)
                };
        }
    }

    // ============================================================
    // CHART DRAWING: BAR
    // ============================================================
    function drawBar(canvas, cd, animate) {
        const ctx = getCtx(canvas);
        const w = ctx._w, h = ctx._h;
        const pad = { top: 40, right: 20, bottom: 60, left: 70 };
        const chartW = w - pad.left - pad.right;
        const chartH = h - pad.top - pad.bottom;
        const colors = PALETTES[S.palette];
        const n = cd.values.length;
        if (n === 0) return;

         const maxVal = Math.max(...cd.values, 0.01);
         const barW = Math.min(chartW / n * 0.7, 60);
         const gap = (chartW - barW * n) / (n + 1);

        const drawFrame = (progress) => {
            ctx.clearRect(0, 0, w, h);

            if (S.showGrid) {
                ctx.strokeStyle = '#e5e7eb';
                ctx.lineWidth = 0.5;
                const gridLines = 5;
                for (let i = 0; i <= gridLines; i++) {
                    const y = pad.top + chartH - (chartH * i / gridLines);
                    ctx.beginPath();
                    ctx.moveTo(pad.left, y);
                    ctx.lineTo(w - pad.right, y);
                    ctx.stroke();
                    if (S.showLabels) {
                        ctx.fillStyle = '#9ca3af';
                        ctx.font = `${S.fontSize - 2}px sans-serif`;
                        ctx.textAlign = 'right';
                        ctx.fillText(cd.format(maxVal * i / gridLines), pad.left - 6, y + 4);
                    }
                }
            }

            for (let i = 0; i < n; i++) {
                const val = cd.values[i] * progress;
                const barH = (val / maxVal) * chartH;
                const x = pad.left + gap + i * (barW + gap);
                const y = pad.top + chartH - barH;

                const grad = ctx.createLinearGradient(x, y, x, pad.top + chartH);
                grad.addColorStop(0, colors[i % colors.length]);
                grad.addColorStop(1, hexToRGBA(colors[i % colors.length], 0.6));
                ctx.fillStyle = grad;
                addShadow(ctx);
                roundedRect(ctx, x, y, barW, barH, S.borderRadius);
                ctx.fill();
                clearShadow(ctx);

                if (S.showLabels && cd.values[i] > 0) {
                    ctx.fillStyle = '#374151';
                    ctx.font = `bold ${S.fontSize - 1}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.fillText(cd.format(cd.values[i]), x + barW / 2, y - 6);
                }

                ctx.save();
                ctx.fillStyle = '#6b7280';
                ctx.font = `${S.fontSize - 3}px sans-serif`;
                ctx.textAlign = 'center';
                const label = cd.labels[i];
                const shortLabel = label.length > 8 ? label.slice(0, 7) + '..' : label;
                ctx.fillText(shortLabel, x + barW / 2, pad.top + chartH + 16);
                ctx.restore();
            }

            ctx.fillStyle = '#374151';
            ctx.font = `bold ${S.fontSize + 2}px sans-serif`;
            ctx.textAlign = 'left';
            ctx.fillText(cd.title, pad.left, 24);
        };

        if (!animate) { drawFrame(1); return; }
        _animate(drawFrame);
    }

    // ============================================================
    // CHART DRAWING: HORIZONTAL BAR
    // ============================================================
    function drawHorizontalBar(canvas, cd, animate) {
        const ctx = getCtx(canvas);
        const w = ctx._w, h = ctx._h;
        const pad = { top: 40, right: 30, bottom: 30, left: 10 };
        const chartW = w - pad.left - pad.right;
        const chartH = h - pad.top - pad.bottom;
        const colors = PALETTES[S.palette];
        const n = cd.values.length;
        if (n === 0) return;

        const maxVal = Math.max(...cd.values, 0.01);
        const barH = Math.min(chartH / n * 0.75, 36);
        const gap = (chartH - barH * n) / (n + 1);

        const drawFrame = (progress) => {
            ctx.clearRect(0, 0, w, h);

            for (let i = 0; i < n; i++) {
                const val = cd.values[i] * progress;
                const bw = (val / maxVal) * chartW * 0.75;
                const y = pad.top + gap + i * (barH + gap);

                const grad = ctx.createLinearGradient(pad.left, y, pad.left + bw, y);
                grad.addColorStop(0, hexToRGBA(colors[i % colors.length], 0.8));
                grad.addColorStop(1, colors[i % colors.length]);
                ctx.fillStyle = grad;
                addShadow(ctx);
                roundedRect(ctx, pad.left, y, bw, barH, S.borderRadius);
                ctx.fill();
                clearShadow(ctx);

                if (S.showLabels) {
                    ctx.fillStyle = '#374151';
                    ctx.font = `${S.fontSize - 3}px sans-serif`;
                    ctx.textAlign = 'right';
                    const label = cd.labels[i];
                    const shortLabel = label.length > 16 ? label.slice(0, 15) + '..' : label;
                    ctx.fillText(shortLabel, pad.left + bw - 4, y + barH / 2 + 4);
                    ctx.textAlign = 'left';
                    ctx.font = `bold ${S.fontSize - 2}px sans-serif`;
                    ctx.fillText(cd.format(cd.values[i]), pad.left + bw + 6, y + barH / 2 + 4);
                }
            }

            ctx.fillStyle = '#374151';
            ctx.font = `bold ${S.fontSize + 2}px sans-serif`;
            ctx.textAlign = 'left';
            ctx.fillText(cd.title, pad.left, 24);
        };

        if (!animate) { drawFrame(1); return; }
        _animate(drawFrame);
    }

    // ============================================================
    // CHART DRAWING: LINE
    // ============================================================
    function drawLine(canvas, cd, animate) {
        const ctx = getCtx(canvas);
        const w = ctx._w, h = ctx._h;
        const pad = { top: 40, right: 20, bottom: 60, left: 70 };
        const chartW = w - pad.left - pad.right;
        const chartH = h - pad.top - pad.bottom;
        const colors = PALETTES[S.palette];
        const n = cd.values.length;
        if (n === 0) return;

        const maxVal = Math.max(...cd.values, 0.01);

        const getPoints = (vals) => {
            return vals.map((v, i) => ({
                x: pad.left + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW),
                y: pad.top + chartH - (v / maxVal) * chartH
            }));
        };

        const drawFrame = (progress) => {
            ctx.clearRect(0, 0, w, h);

            if (S.showGrid) {
                ctx.strokeStyle = '#e5e7eb';
                ctx.lineWidth = 0.5;
                for (let i = 0; i <= 5; i++) {
                    const y = pad.top + chartH - (chartH * i / 5);
                    ctx.beginPath();
                    ctx.moveTo(pad.left, y);
                    ctx.lineTo(w - pad.right, y);
                    ctx.stroke();
                    if (S.showLabels) {
                        ctx.fillStyle = '#9ca3af';
                        ctx.font = `${S.fontSize - 2}px sans-serif`;
                        ctx.textAlign = 'right';
                        ctx.fillText(cd.format(maxVal * i / 5), pad.left - 6, y + 4);
                    }
                }
            }

            const animatedVals = cd.values.map(v => v * progress);
            const points = getPoints(animatedVals);

            ctx.strokeStyle = colors[0];
            ctx.lineWidth = S.lineWidth;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            addShadow(ctx);
            ctx.beginPath();
            bezierCurveThrough(ctx, points);
            ctx.stroke();
            clearShadow(ctx);

            if (S.showLabels && points.length <= 40) {
                for (let i = 0; i < points.length; i++) {
                    const p = points[i];
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, S.pointRadius, 0, Math.PI * 2);
                    ctx.fillStyle = '#fff';
                    ctx.fill();
                    ctx.strokeStyle = colors[0];
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }

             if (S.showLabels) {
                 const step = Math.max(1, Math.floor(n / 10));
                 ctx.fillStyle = '#6b7280';
                 ctx.font = `${S.fontSize - 3}px sans-serif`;
                 ctx.textAlign = 'center';
                 for (let i = 0; i < n; i += step) {
                     const label = cd.labels[i];
                     const shortLabel = label.length > 8 ? label.slice(0, 7) + '..' : label;
                     ctx.fillText(shortLabel, points[i].x, pad.top + chartH + 16);
                 }
             }

             ctx.fillStyle = '#374151';
             ctx.font = `bold ${S.fontSize + 2}px sans-serif`;
             ctx.textAlign = 'left';
             ctx.fillText(cd.title, pad.left, 24);
         };

         if (!animate) { drawFrame(1); return; }
         _animate(drawFrame);
     }

     // ============================================================
     // CHART DRAWING: AREA (Filled Line)
    // ============================================================
    function drawArea(canvas, cd, animate) {
        const ctx = getCtx(canvas);
        const w = ctx._w, h = ctx._h;
        const pad = { top: 40, right: 20, bottom: 60, left: 70 };
        const chartW = w - pad.left - pad.right;
        const chartH = h - pad.top - pad.bottom;
        const colors = PALETTES[S.palette];
        const n = cd.values.length;
        if (n === 0) return;

        const maxVal = Math.max(...cd.values, 0.01);
        const getPoints = (vals) => vals.map((v, i) => ({
            x: pad.left + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW),
            y: pad.top + chartH - (v / maxVal) * chartH
        }));

        const drawFrame = (progress) => {
            ctx.clearRect(0, 0, w, h);

            if (S.showGrid) {
                ctx.strokeStyle = '#e5e7eb';
                ctx.lineWidth = 0.5;
                for (let i = 0; i <= 5; i++) {
                    const y = pad.top + chartH - (chartH * i / 5);
                    ctx.beginPath();
                    ctx.moveTo(pad.left, y);
                    ctx.lineTo(w - pad.right, y);
                    ctx.stroke();
                    if (S.showLabels) {
                        ctx.fillStyle = '#9ca3af';
                        ctx.font = `${S.fontSize - 2}px sans-serif`;
                        ctx.textAlign = 'right';
                        ctx.fillText(cd.format(maxVal * i / 5), pad.left - 6, y + 4);
                    }
                }
            }

            const animatedVals = cd.values.map(v => v * progress);
            const points = getPoints(animatedVals);

            const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH);
            grad.addColorStop(0, hexToRGBA(colors[0], S.fillOpacity / 100));
            grad.addColorStop(1, hexToRGBA(colors[0], 0.02));

            ctx.beginPath();
            ctx.moveTo(points[0].x, pad.top + chartH);
            bezierCurveThrough(ctx, points);
            ctx.lineTo(points[points.length - 1].x, pad.top + chartH);
            ctx.closePath();
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.strokeStyle = colors[0];
            ctx.lineWidth = S.lineWidth;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.beginPath();
            bezierCurveThrough(ctx, points);
            ctx.stroke();

            if (S.showLabels && points.length <= 40) {
                for (const p of points) {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, S.pointRadius, 0, Math.PI * 2);
                    ctx.fillStyle = '#fff';
                    ctx.fill();
                    ctx.strokeStyle = colors[0];
                    ctx.lineWidth = 2;
                    ctx.stroke();
                }
            }

             if (S.showLabels) {
                 const step = Math.max(1, Math.floor(n / 10));
                 ctx.fillStyle = '#6b7280';
                 ctx.font = `${S.fontSize - 3}px sans-serif`;
                 ctx.textAlign = 'center';
                 for (let i = 0; i < n; i += step) {
                     const label = cd.labels[i];
                     const shortLabel = label.length > 8 ? label.slice(0, 7) + '..' : label;
                     ctx.fillText(shortLabel, points[i].x, pad.top + chartH + 16);
                 }
             }

             ctx.fillStyle = '#374151';
             ctx.font = `bold ${S.fontSize + 2}px sans-serif`;
             ctx.textAlign = 'left';
             ctx.fillText(cd.title, pad.left, 24);
         };

         if (!animate) { drawFrame(1); return; }
         _animate(drawFrame);
     }

     // ============================================================
     // CHART DRAWING: PIE
    // ============================================================
    function drawPie(canvas, cd, animate, isDoughnut) {
        const ctx = getCtx(canvas);
        const w = ctx._w, h = ctx._h;
        const colors = cd.colors || PALETTES[S.palette];
        const total = cd.values.reduce((s, v) => s + v, 0);
        if (total === 0) return;

        const cx = w * 0.42, cy = h * 0.52;
        const radius = Math.min(w * 0.34, h * 0.38);
        const innerRadius = isDoughnut ? radius * 0.55 : 0;

        const drawFrame = (progress) => {
            ctx.clearRect(0, 0, w, h);
            let angle = -Math.PI / 2;

            for (let i = 0; i < cd.values.length; i++) {
                const sliceAngle = (cd.values[i] / total) * Math.PI * 2 * progress;
                const midAngle = angle + sliceAngle / 2;

                const grad = ctx.createRadialGradient(cx, cy, innerRadius, cx, cy, radius);
                grad.addColorStop(0, hexToRGBA(colors[i % colors.length], 0.85));
                grad.addColorStop(1, colors[i % colors.length]);

                ctx.beginPath();
                ctx.arc(cx, cy, radius, angle, angle + sliceAngle);
                if (isDoughnut) ctx.arc(cx, cy, innerRadius, angle + sliceAngle, angle, true);
                else ctx.lineTo(cx, cy);
                ctx.closePath();
                ctx.fillStyle = grad;
                addShadow(ctx);
                ctx.fill();
                clearShadow(ctx);

                if (S.showLabels && sliceAngle > 0.15) {
                    const lx = cx + Math.cos(midAngle) * (radius + 20);
                    const ly = cy + Math.sin(midAngle) * (radius + 20);
                    ctx.fillStyle = '#374151';
                    ctx.font = `bold ${S.fontSize - 1}px sans-serif`;
                    ctx.textAlign = midAngle > Math.PI / 2 && midAngle < Math.PI * 1.5 ? 'right' : 'left';
                    const pct = ((cd.values[i] / total) * 100).toFixed(1) + '%';
                    ctx.fillText(`${cd.labels[i]} ${pct}`, lx, ly);
                }

                angle += sliceAngle;
            }

            if (isDoughnut) {
                ctx.beginPath();
                ctx.arc(cx, cy, innerRadius - 2, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.fill();
                ctx.fillStyle = '#374151';
                ctx.font = `bold ${S.fontSize + 1}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.fillText(fmtNum(total), cx, cy + 4);
            }

            ctx.fillStyle = '#374151';
            ctx.font = `bold ${S.fontSize + 2}px sans-serif`;
            ctx.textAlign = 'left';
            ctx.fillText(cd.title, 10, 24);
        };

        if (!animate) { drawFrame(1); return; }
        _animate(drawFrame);
    }

    // ============================================================
    // CHART DRAWING: RADAR
    // ============================================================
    function drawRadar(canvas, cd, animate) {
        const ctx = getCtx(canvas);
        const w = ctx._w, h = ctx._h;
        const colors = PALETTES[S.palette];
        const n = cd.values.length;
        if (n === 0) return;

        const cx = w / 2, cy = h / 2 + 10;
        const radius = Math.min(w, h) * 0.36;
        const maxVal = Math.max(...cd.values, 0.01);

        const drawFrame = (progress) => {
            ctx.clearRect(0, 0, w, h);

            const rings = 5;
            for (let r = 1; r <= rings; r++) {
                const rr = (radius * r) / rings;
                ctx.beginPath();
                for (let i = 0; i <= n; i++) {
                    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
                    const px = cx + Math.cos(angle) * rr;
                    const py = cy + Math.sin(angle) * rr;
                    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
                }
                ctx.strokeStyle = '#e5e7eb';
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }

            for (let i = 0; i < n; i++) {
                const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
                ctx.strokeStyle = '#d1d5db';
                ctx.lineWidth = 0.5;
                ctx.stroke();

                if (S.showLabels) {
                    const lx = cx + Math.cos(angle) * (radius + 20);
                    const ly = cy + Math.sin(angle) * (radius + 20);
                    ctx.fillStyle = '#6b7280';
                    ctx.font = `${S.fontSize - 3}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    const label = cd.labels[i];
                    const shortLabel = label.length > 10 ? label.slice(0, 9) + '..' : label;
                    ctx.fillText(shortLabel, lx, ly);
                }
            }

            const animatedVals = cd.values.map(v => v * progress);

            ctx.beginPath();
            for (let i = 0; i <= n; i++) {
                const idx = i % n;
                const angle = (Math.PI * 2 * idx) / n - Math.PI / 2;
                const rr = (animatedVals[idx] / maxVal) * radius;
                const px = cx + Math.cos(angle) * rr;
                const py = cy + Math.sin(angle) * rr;
                i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fillStyle = hexToRGBA(colors[0], 0.2);
            ctx.fill();
            ctx.strokeStyle = colors[0];
            ctx.lineWidth = S.lineWidth;
            ctx.stroke();

            for (let i = 0; i < n; i++) {
                const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
                const rr = (animatedVals[i] / maxVal) * radius;
                const px = cx + Math.cos(angle) * rr;
                const py = cy + Math.sin(angle) * rr;
                ctx.beginPath();
                ctx.arc(px, py, S.pointRadius + 1, 0, Math.PI * 2);
                ctx.fillStyle = '#fff';
                ctx.fill();
                ctx.strokeStyle = colors[0];
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            ctx.fillStyle = '#374151';
            ctx.font = `bold ${S.fontSize + 2}px sans-serif`;
            ctx.textAlign = 'left';
            ctx.fillText(cd.title, 10, 24);
        };

        if (!animate) { drawFrame(1); return; }
        _animate(drawFrame);
    }

    // ============================================================
    // CHART DRAWING: STACKED BAR
    // ============================================================
    function drawStackedBar(canvas, cd, animate) {
        const ctx = getCtx(canvas);
        const w = ctx._w, h = ctx._h;
        const pad = { top: 40, right: 20, bottom: 60, left: 70 };
        const chartW = w - pad.left - pad.right;
        const chartH = h - pad.top - pad.bottom;
        const colors = PALETTES[S.palette];
        const n = cd.labels.length;
        if (n === 0) return;

        const maxVal = Math.max(...cd.stackedTotals, 0.01);
        const barW = Math.min(chartW / n * 0.65, 50);
        const gap = (chartW - barW * n) / (n + 1);

        const drawFrame = (progress) => {
            ctx.clearRect(0, 0, w, h);

            if (S.showGrid) {
                ctx.strokeStyle = '#e5e7eb';
                ctx.lineWidth = 0.5;
                for (let i = 0; i <= 5; i++) {
                    const y = pad.top + chartH - (chartH * i / 5);
                    ctx.beginPath();
                    ctx.moveTo(pad.left, y);
                    ctx.lineTo(w - pad.right, y);
                    ctx.stroke();
                    if (S.showLabels) {
                        ctx.fillStyle = '#9ca3af';
                        ctx.font = `${S.fontSize - 2}px sans-serif`;
                        ctx.textAlign = 'right';
                        ctx.fillText(cd.format(maxVal * i / 5), pad.left - 6, y + 4);
                    }
                }
            }

            for (let i = 0; i < n; i++) {
                let accY = 0;
                const x = pad.left + gap + i * (barW + gap);
                for (let s = 0; s < cd.series.length; s++) {
                    const val = cd.series[s].values[i] * progress;
                    const barH = (val / maxVal) * chartH;
                    const y = pad.top + chartH - accY - barH;
                    ctx.fillStyle = hexToRGBA(colors[s % colors.length], 0.85);
                    addShadow(ctx);
                    if (s === cd.series.length - 1) {
                        roundedRect(ctx, x, y, barW, barH, S.borderRadius);
                    } else {
                        ctx.fillRect(x, y, barW, barH);
                    }
                    ctx.fill();
                    clearShadow(ctx);
                    accY += barH;
                }

                ctx.save();
                ctx.fillStyle = '#6b7280';
                ctx.font = `${S.fontSize - 3}px sans-serif`;
                ctx.textAlign = 'center';
                const label = cd.labels[i];
                const shortLabel = label.length > 8 ? label.slice(0, 7) + '..' : label;
                ctx.fillText(shortLabel, x + barW / 2, pad.top + chartH + 16);
                ctx.restore();
            }

            if (S.showLegend && cd.series.length > 1) {
                let lx = pad.left;
                ctx.font = `${S.fontSize - 2}px sans-serif`;
                for (let s = 0; s < cd.series.length; s++) {
                    ctx.fillStyle = colors[s % colors.length];
                    ctx.fillRect(lx, 8, 12, 12);
                    ctx.fillStyle = '#6b7280';
                    ctx.textAlign = 'left';
                    ctx.fillText(cd.series[s].label, lx + 16, 18);
                    lx += ctx.measureText(cd.series[s].label).width + 30;
                }
            }

            ctx.fillStyle = '#374151';
            ctx.font = `bold ${S.fontSize + 2}px sans-serif`;
            ctx.textAlign = 'left';
            ctx.fillText(cd.title, pad.left, 24);
        };

        if (!animate) { drawFrame(1); return; }
        _animate(drawFrame);
    }

    // ============================================================
    // CHART DRAWING: SCATTER
    // ============================================================
    function drawScatter(canvas, cd, animate) {
        const ctx = getCtx(canvas);
        const w = ctx._w, h = ctx._h;
        const pad = { top: 40, right: 20, bottom: 60, left: 70 };
        const chartW = w - pad.left - pad.right;
        const chartH = h - pad.top - pad.bottom;
        const colors = PALETTES[S.palette];
        const points = cd.points || [];
        if (points.length === 0) return;

        const maxX = Math.max(...points.map(p => p.x), 0.01);
        const maxY = Math.max(...points.map(p => p.y), 0.01);

        const drawFrame = (progress) => {
            ctx.clearRect(0, 0, w, h);

            if (S.showGrid) {
                ctx.strokeStyle = '#e5e7eb';
                ctx.lineWidth = 0.5;
                for (let i = 0; i <= 5; i++) {
                    const y = pad.top + chartH - (chartH * i / 5);
                    ctx.beginPath();
                    ctx.moveTo(pad.left, y);
                    ctx.lineTo(w - pad.right, y);
                    ctx.stroke();
                    if (S.showLabels) {
                        ctx.fillStyle = '#9ca3af';
                        ctx.font = `${S.fontSize - 2}px sans-serif`;
                        ctx.textAlign = 'right';
                        ctx.fillText(cd.formatY(maxY * i / 5), pad.left - 6, y + 4);
                    }
                }
                for (let i = 0; i <= 5; i++) {
                    const x = pad.left + (chartW * i / 5);
                    ctx.beginPath();
                    ctx.moveTo(x, pad.top);
                    ctx.lineTo(x, pad.top + chartH);
                    ctx.stroke();
                    if (S.showLabels) {
                        ctx.fillStyle = '#9ca3af';
                        ctx.font = `${S.fontSize - 2}px sans-serif`;
                        ctx.textAlign = 'center';
                        ctx.fillText(cd.formatX(maxX * i / 5), x, pad.top + chartH + 16);
                    }
                }
            }

            for (const p of points) {
                const px = pad.left + (p.x / maxX) * chartW * progress;
                const py = pad.top + chartH - (p.y / maxY) * chartH * progress;
                addShadow(ctx);
                ctx.beginPath();
                ctx.arc(px, py, S.pointRadius + 2, 0, Math.PI * 2);
                ctx.fillStyle = hexToRGBA(colors[0], 0.7);
                ctx.fill();
                ctx.strokeStyle = colors[0];
                ctx.lineWidth = 1.5;
                ctx.stroke();
                clearShadow(ctx);
            }

            ctx.fillStyle = '#374151';
            ctx.font = `bold ${S.fontSize + 2}px sans-serif`;
            ctx.textAlign = 'left';
            ctx.fillText(cd.title, pad.left, 24);
        };

        if (!animate) { drawFrame(1); return; }
        _animate(drawFrame);
    }

    // ============================================================
    // ANIMATION HELPER
    // ============================================================
    function _animate(drawFrame) {
        const duration = 650;
        let start = null;
        function step(ts) {
            if (!start) start = ts;
            const elapsed = ts - start;
            const progress = Math.min(elapsed / duration, 1);
            drawFrame(easeOutCubic(progress));
            if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    // ============================================================
    // MAIN CHART RENDER DISPATCH
    // ============================================================
     async function _refreshMainChart() {
         const canvas = document.getElementById('ac-main-canvas');
         if (!canvas) return;

         _cachedData = await _gatherData();
         const cd = prepareChartData(_cachedData);
         const animate = S.animate;

         // Set canvas width dynamically so bars keep normal size and the
         // container scrolls horizontally when there are many data points.
         const dataPointCount = cd.labels ? cd.labels.length : 10;
         const dataWidth = dataPointCount * 70;
         const containerWidth = canvas.parentElement ? canvas.parentElement.clientWidth : 800;
         const w = Math.max(containerWidth, dataWidth);
         canvas.style.minWidth = w + 'px';
         canvas.style.width = w + 'px';

         const type = S.chartType;

         switch (type) {
            case 'bar': drawBar(canvas, cd, animate); break;
            case 'horizontalBar': drawHorizontalBar(canvas, cd, animate); break;
            case 'line': drawLine(canvas, cd, animate); break;
            case 'area': drawArea(canvas, cd, animate); break;
            case 'pie': drawPie(canvas, cd, animate, false); break;
            case 'doughnut': drawPie(canvas, cd, animate, true); break;
            case 'radar': drawRadar(canvas, cd, animate); break;
            case 'stackedBar': _drawStackedBarMetric(canvas, cd, animate); break;
            case 'scatter': drawScatter(canvas, cd, animate); break;
            default: drawBar(canvas, cd, animate);
        }

    }

    // ============================================================
    // STACKED BAR DISPATCH
    // ============================================================
    function _drawStackedBarMetric(canvas, cd, animate) {
        if (cd.type === 'dualTime') {
            drawStackedBar(canvas, {
                labels: cd.labels,
                series: [
                    { label: cd.label1, values: cd.values1 },
                    { label: cd.label2, values: cd.values2 }
                ],
                stackedTotals: cd.labels.map((_, i) => (cd.values1[i] || 0) + (cd.values2[i] || 0)),
                title: cd.title,
                format: cd.format
            }, animate);
        } else if (cd.type === 'time') {
            const data = _cachedData;
            drawStackedBar(canvas, {
                labels: cd.labels,
                series: [
                    { label: 'Revenue', values: data.daily.map(d => d.revenue) },
                    { label: 'Profit', values: data.daily.map(d => d.profit) }
                ],
                stackedTotals: data.daily.map(d => d.revenue + d.profit),
                title: cd.title,
                format: cd.format
            }, animate);
        } else if (cd.type === 'category') {
            drawStackedBar(canvas, {
                labels: cd.labels,
                series: [
                    { label: 'Revenue', values: cd.values },
                    { label: 'Profit', values: cd.values.map((v, i) => v * 0.3) }
                ],
                stackedTotals: cd.values.map(v => v * 1.3),
                title: cd.title,
                format: cd.format
            }, animate);
        } else {
            drawBar(canvas, cd, animate);
        }
    }

    // ============================================================
    // BUILD HTML
    // ============================================================
    function buildChartsSectionHTML() {
        const chartTypeOpts = CHART_TYPES.map(ct =>
            `<option value="${ct.id}" ${ct.id === S.chartType ? 'selected' : ''}>${ct.label}</option>`
        ).join('');

        const metricOpts = METRICS.map(m =>
            `<option value="${m.id}" ${m.id === S.metric ? 'selected' : ''}>${m.label}</option>`
        ).join('');

        const dateOpts = DATE_RANGES.map(dr =>
            `<option value="${dr.value}" ${dr.value === S.dateRange ? 'selected' : ''}>${dr.label}</option>`
        ).join('');

        const paletteOpts = PALETTE_KEYS.map(pk =>
            `<option value="${pk}" ${pk === S.palette ? 'selected' : ''}>${pk.charAt(0).toUpperCase() + pk.slice(1)}</option>`
        ).join('');

        return `
        <div id="ac-section" style="padding:0;">
            <!-- CONTROLS -->
            <div id="ac-controls" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:14px 18px;background:linear-gradient(135deg,#fafbff,#f0f0ff);border-radius:12px;margin-bottom:16px;border:1px solid #e0e0f0;">
                <div style="display:flex;flex-direction:column;gap:3px;">
                    <label style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Chart Type</label>
                    <select id="ac-chart-type" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;background:white;cursor:pointer;min-width:120px;">
                        ${chartTypeOpts}
                    </select>
                </div>
                <div style="display:flex;flex-direction:column;gap:3px;">
                    <label style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Metric</label>
                    <select id="ac-metric" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;background:white;cursor:pointer;min-width:140px;">
                        ${metricOpts}
                    </select>
                </div>
                <div style="display:flex;flex-direction:column;gap:3px;">
                    <label style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Date Range</label>
                    <select id="ac-date-range" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;background:white;cursor:pointer;min-width:80px;">
                        ${dateOpts}
                    </select>
                </div>
                <div style="display:flex;flex-direction:column;gap:3px;">
                    <label style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">From</label>
                    <input type="date" id="ac-date-from" value="${S.customFrom}" style="padding:5px 8px;border:1px solid #d1d5db;border-radius:8px;font-size:12px;background:white;">
                </div>
                <div style="display:flex;flex-direction:column;gap:3px;">
                    <label style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">To</label>
                    <input type="date" id="ac-date-to" value="${S.customTo}" style="padding:5px 8px;border:1px solid #d1d5db;border-radius:8px;font-size:12px;background:white;">
                </div>
                <div style="display:flex;flex-direction:column;gap:3px;">
                    <label style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">Palette</label>
                    <select id="ac-palette" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;background:white;cursor:pointer;min-width:100px;">
                        ${paletteOpts}
                    </select>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-left:auto;">
                    <label style="display:flex;align-items:center;gap:4px;font-size:12px;color:#374151;cursor:pointer;">
                        <input type="checkbox" id="ac-toggle-grid" ${S.showGrid ? 'checked' : ''} style="cursor:pointer;"> Grid
                    </label>
                    <label style="display:flex;align-items:center;gap:4px;font-size:12px;color:#374151;cursor:pointer;">
                        <input type="checkbox" id="ac-toggle-labels" ${S.showLabels ? 'checked' : ''} style="cursor:pointer;"> Labels
                    </label>
                    <label style="display:flex;align-items:center;gap:4px;font-size:12px;color:#374151;cursor:pointer;">
                        <input type="checkbox" id="ac-toggle-legend" ${S.showLegend ? 'checked' : ''} style="cursor:pointer;"> Legend
                    </label>
                    <label style="display:flex;align-items:center;gap:4px;font-size:12px;color:#374151;cursor:pointer;">
                        <input type="checkbox" id="ac-toggle-animate" ${S.animate ? 'checked' : ''} style="cursor:pointer;"> Animate
                    </label>
                </div>
            </div>

            <!-- SLIDERS -->
            <div id="ac-sliders" style="display:flex;flex-wrap:wrap;gap:16px;padding:10px 18px;background:#fafbff;border-radius:10px;margin-bottom:16px;border:1px solid #f0f0f0;">
                <div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:140px;">
                    <label style="font-size:10px;font-weight:700;color:#6b7280;">Font Size: <span id="ac-font-size-val">${S.fontSize}px</span></label>
                    <input type="range" id="ac-font-size" min="10" max="20" value="${S.fontSize}" style="cursor:pointer;">
                </div>
                <div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:140px;">
                    <label style="font-size:10px;font-weight:700;color:#6b7280;">Line Width: <span id="ac-line-width-val">${S.lineWidth}px</span></label>
                    <input type="range" id="ac-line-width" min="1" max="6" value="${S.lineWidth}" style="cursor:pointer;">
                </div>
                <div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:140px;">
                    <label style="font-size:10px;font-weight:700;color:#6b7280;">Point Radius: <span id="ac-point-radius-val">${S.pointRadius}px</span></label>
                    <input type="range" id="ac-point-radius" min="0" max="8" value="${S.pointRadius}" style="cursor:pointer;">
                </div>
                <div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:140px;">
                    <label style="font-size:10px;font-weight:700;color:#6b7280;">Fill Opacity: <span id="ac-fill-opacity-val">${S.fillOpacity}%</span></label>
                    <input type="range" id="ac-fill-opacity" min="0" max="50" value="${S.fillOpacity}" style="cursor:pointer;">
                </div>
                <div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:140px;">
                    <label style="font-size:10px;font-weight:700;color:#6b7280;">Border Radius: <span id="ac-border-radius-val">${S.borderRadius}px</span></label>
                    <input type="range" id="ac-border-radius" min="0" max="16" value="${S.borderRadius}" style="cursor:pointer;">
                </div>
            </div>

            <!-- MAIN CHART -->
            <div style="background:white;border-radius:12px;padding:8px;margin-bottom:16px;border:1px solid #e5e7eb;box-shadow:0 2px 8px rgba(0,0,0,0.04);overflow-x:auto;">
                <canvas id="ac-main-canvas" style="width:100%;height:380px;display:block;min-width:100%;"></canvas>
            </div>
        </div>`;
    }

    // ============================================================
    // WIRE CONTROLS
    // ============================================================
    function _wireControls() {
        const bind = (id, prop, transform) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', () => {
                S[prop] = transform(el);
                const valEl = document.getElementById(id + '-val');
                if (valEl) valEl.textContent = el.value + (prop === 'fillOpacity' || prop === 'fontSize' || prop === 'lineWidth' || prop === 'pointRadius' || prop === 'borderRadius' ? (prop === 'fillOpacity' ? '%' : 'px') : '');
                _refreshMainChart();
            });
        };

        const bindChange = (id, prop, transform) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('change', () => {
                S[prop] = transform(el);
                _refreshMainChart();
            });
        };

        bindChange('ac-chart-type', 'chartType', el => el.value);
        bindChange('ac-metric', 'metric', el => el.value);
        bindChange('ac-date-range', 'dateRange', el => el.value);
        bindChange('ac-palette', 'palette', el => el.value);

        const dateFromEl = document.getElementById('ac-date-from');
        const dateToEl = document.getElementById('ac-date-to');
        if (dateFromEl) dateFromEl.addEventListener('change', () => { S.customFrom = dateFromEl.value; _refreshMainChart(); });
        if (dateToEl) dateToEl.addEventListener('change', () => { S.customTo = dateToEl.value; _refreshMainChart(); });

        const toggle = (id, prop) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('change', () => { S[prop] = el.checked; _refreshMainChart(); });
        };
        toggle('ac-toggle-grid', 'showGrid');
        toggle('ac-toggle-labels', 'showLabels');
        toggle('ac-toggle-legend', 'showLegend');
        toggle('ac-toggle-animate', 'animate');

        bind('ac-font-size', 'fontSize', el => parseInt(el.value));
        bind('ac-line-width', 'lineWidth', el => parseInt(el.value));
        bind('ac-point-radius', 'pointRadius', el => parseInt(el.value));
        bind('ac-fill-opacity', 'fillOpacity', el => parseInt(el.value));
        bind('ac-border-radius', 'borderRadius', el => parseInt(el.value));
    }

    // ============================================================
    // INIT
    // ============================================================
    async function initAnalyticsCharts() {
        const container = document.querySelector('#view-analytics');
        if (!container) return;

        const existing = document.getElementById('ac-section');
        if (existing) existing.remove();

        const temp = document.createElement('div');
        temp.innerHTML = buildChartsSectionHTML();
        const section = temp.firstElementChild;

        const dashboard = document.getElementById('analytics-modern-dashboard');
        if (dashboard) {
            dashboard.insertAdjacentElement('afterend', section);
        } else {
            container.appendChild(section);
        }

        _wireControls();

        await _refreshMainChart();

        const resizeHandler = () => { _refreshMainChart(); };
        let resizeTimer = null;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(resizeHandler, 200);
        });
    }

    // ============================================================
    // EXPOSE
    // ============================================================
    window.initAnalyticsCharts = initAnalyticsCharts;
    window.refreshCharts = _refreshMainChart;

    console.log('📊 Analytics Charts module loaded (pure Canvas)');
})();
