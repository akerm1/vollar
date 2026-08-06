// ============================================================
// PAYMENT: Multi-Payment Method Selector
// ============================================================

// ============================================================
// DEFAULT PAYMENT METHODS
// `kind`:
//   - 'cash'   → montant reçu + monnaie (comportement espèces)
//   - 'credit' → dette client (non payé, client obligatoire)
//   - 'fields' → inputs libres définis par `fields` (baridimob, chèque, CCP…)
// ============================================================
const DEFAULT_PAYMENT_METHODS = [
    { id: 'especes', label: t('payCash'), icon: '💵', kind: 'cash' },
    { id: 'cheque', label: t('payCheck'), icon: '📝', kind: 'fields', fields: [
        { key: 'chequeNumber', label: t('checkNumber') },
        { key: 'bankName', label: t('bankName') }
    ]},
    { id: 'ccp', label: '🏦 CCP', icon: '🏦', kind: 'fields', fields: [
        { key: 'ccpNumber', label: t('ccpNumber') },
        { key: 'transactionRef', label: t('referenceLabel') }
    ]},
    { id: 'baridimob', label: '📱 BaridiMob', icon: '📱', kind: 'fields', fields: [
        { key: 'baridiMobNumber', label: t('baridiMobNumber'), placeholder: 'Ex: 0770123456' },
        { key: 'transactionRef', label: t('referenceLabel') }
    ]},
    { id: 'credit', label: t('payCredit'), icon: '🔴', kind: 'credit' }
];

let PAYMENT_METHODS = DEFAULT_PAYMENT_METHODS.slice();
window.PAYMENT_METHODS = PAYMENT_METHODS;

// Liste active : soit la configuration stockée dans les réglages (settings.paymentMethods),
// soit les valeurs par défaut si rien n'a été sauvegardé.
function getConfiguredPaymentMethods() {
    if (typeof settings !== 'undefined' && settings && Array.isArray(settings.paymentMethods)) {
        return settings.paymentMethods.slice();
    }
    return DEFAULT_PAYMENT_METHODS.slice();
}

// Recharge PAYMENT_METHODS depuis les réglages (appelé au boot + après sauvegarde)
function applyPaymentMethodConfig() {
    PAYMENT_METHODS = getConfiguredPaymentMethods();
    window.PAYMENT_METHODS = PAYMENT_METHODS;
}

function getPaymentMethodById(methodId) {
    return PAYMENT_METHODS.find(function(m) { return m.id === methodId; }) || null;
}

// ============================================================
// REBUILD SELECTOR (after settings change) — no-op if unchanged
// ============================================================
function refreshPaymentMethodSelector() {
    const previous = PAYMENT_METHODS;
    applyPaymentMethodConfig();
    const changed = previous.length !== PAYMENT_METHODS.length ||
        PAYMENT_METHODS.some(function(m, i) { return !previous[i] || m.id !== previous[i].id; });
    if (changed && typeof setupPaymentMethodSelector === 'function') {
        setupPaymentMethodSelector();
    }
}

// ============================================================
// SETUP PAYMENT METHOD SELECTOR
// ============================================================
function setupPaymentMethodSelector() {
    applyPaymentMethodConfig();
    const paymentSection = document.querySelector('.payment-section');
    if (!paymentSection) return;

    const existing = document.getElementById('payment-method-container');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.id = 'payment-method-container';
    container.style.cssText = 'padding:8px 0;border-top:1px solid #f0f0f0;margin-top:6px;';

    container.innerHTML = `
        <div style="font-size:12px;color:#666;font-weight:600;margin-bottom:6px;">Moyen de paiement :</div>
        <div id="payment-method-pills" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px;">
            ${PAYMENT_METHODS.map(m => `
                <button class="pm-pill" data-method="${m.id}" style="
                    padding:5px 10px;border:2px solid #e0e0e0;border-radius:16px;
                    font-size:12px;font-weight:600;cursor:pointer;background:white;
                    color:#555;transition:all 0.2s;font-family:var(--font-family);
                ">${m.label}</button>
            `).join('')}
        </div>
        <div id="payment-method-details"></div>
        <div class="payment-status-display" style="display:flex;align-items:center;gap:8px;margin-top:4px;">
            <span style="font-size:13px;color:#666;">Statut :</span>
            <span class="status" id="payment-status-display" style="font-weight:700;">${t('paid')}</span>
        </div>
    `;

    paymentSection.parentNode.insertBefore(container, paymentSection.nextSibling);

    container.querySelectorAll('.pm-pill').forEach(pill => {
        pill.addEventListener('click', function() {
            selectPaymentMethod(this.dataset.method);
        });
    });

    selectPaymentMethod('especes');
}

// ============================================================
// SELECT PAYMENT METHOD
// ============================================================
function selectPaymentMethod(methodId) {
    paymentMethod = methodId;
    const detailsDiv = document.getElementById('payment-method-details');
    if (!detailsDiv) return;

    document.querySelectorAll('.pm-pill').forEach(pill => {
        const isActive = pill.dataset.method === methodId;
        pill.style.background = isActive ? 'var(--primary)' : 'white';
        pill.style.color = isActive ? 'white' : '#555';
        pill.style.borderColor = isActive ? 'var(--primary)' : '#e0e0e0';
    });

    const totals = calculateTotals('main');
    const grandTotal = totals.grandTotal;
    const method = getPaymentMethodById(methodId);
    const kind = method ? method.kind : 'fields';
    const fields = (method && method.fields) ? method.fields : [];

    if (kind === 'cash') {
        paymentStatus = 'paid';
        detailsDiv.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:6px;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <label style="font-size:12px;color:#666;min-width:90px;font-weight:600;">${t('amountReceived')}</label>
                    <input type="number" id="pm-cash-received" value="${grandTotal.toFixed(2)}" step="0.01" min="0" style="
                        flex:1;padding:6px 10px;border:2px solid #e0e0e0;border-radius:6px;font-size:13px;
                        font-family:var(--font-family);font-weight:600;
                    ">
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-size:12px;color:#666;min-width:90px;font-weight:600;">Monnaie :</span>
                    <span id="pm-change" style="font-size:14px;font-weight:700;color:var(--success);">0.00 DA</span>
                </div>
            </div>
        `;
        const cashInput = document.getElementById('pm-cash-received');
        if (cashInput) {
            cashInput.addEventListener('input', updateCashChange);
            cashInput.addEventListener('change', updateCashChange);
        }
        updateCashChange();
        if (DOM.amountPaidInput) {
            DOM.amountPaidInput.value = grandTotal.toFixed(2);
        }
        updateRemainingAmount();
        updatePaymentStatusDisplay();
    } else if (kind === 'credit') {
        paymentStatus = 'unpaid';
        detailsDiv.innerHTML = `
            <div style="padding:8px 12px;background:#fff5f5;border:1px solid #fecaca;border-radius:8px;font-size:12px;color:#991b1b;">
                <strong>${t('creditSaleLabel')}</strong><br>
                ${t('creditSaleDesc')}<br>
                <span style="color:#666;font-size:11px;">${t('creditSaleNeedsClient')}</span>
            </div>
        `;
        if (DOM.amountPaidInput) DOM.amountPaidInput.value = '0';
        updateRemainingAmount();
        updatePaymentStatusDisplay();
    } else {
        // Generic method ('fields') : une ligne d'input par champ configuré
        paymentStatus = 'paid';
        detailsDiv.innerHTML = fields.length
            ? fields.map(f => `
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                    <label style="font-size:12px;color:#666;min-width:90px;font-weight:600;">${f.label}</label>
                    <input type="text" id="pm-${f.key}" placeholder="${f.placeholder || ''}" style="
                        flex:1;padding:6px 10px;border:2px solid #e0e0e0;border-radius:6px;font-size:13px;font-family:var(--font-family);
                    ">
                </div>
            `).join('')
            : '';
        if (DOM.amountPaidInput) DOM.amountPaidInput.value = grandTotal.toFixed(2);
        updateRemainingAmount();
        updatePaymentStatusDisplay();
    }
}

// ============================================================
// UPDATE CASH CHANGE
// ============================================================
function updateCashChange() {
    const cashInput = document.getElementById('pm-cash-received');
    const changeDisplay = document.getElementById('pm-change');
    if (!cashInput || !changeDisplay) return;

    const totals = calculateTotals('main');
    const grandTotal = totals.grandTotal;
    const received = parseFloat(cashInput.value) || 0;
    const change = Math.max(0, received - grandTotal);

    changeDisplay.textContent = `${change.toFixed(2)} ${settings.currency}`;
    if (received >= grandTotal) {
        changeDisplay.style.color = 'var(--success)';
    } else {
        changeDisplay.style.color = 'var(--danger)';
    }

    if (DOM.amountPaidInput) {
        DOM.amountPaidInput.value = received.toFixed(2);
    }
    updateRemainingAmount();
}

// ============================================================
// GET PAYMENT DETAILS DATA
// ============================================================
function getPaymentMethodData() {
    const data = { method: paymentMethod, details: {} };
    const method = getPaymentMethodById(paymentMethod);
    const kind = method ? method.kind : 'fields';
    const fields = (method && method.fields) ? method.fields : [];

    if (kind === 'cash') {
        const cashInput = document.getElementById('pm-cash-received');
        const received = parseFloat(cashInput?.value) || 0;
        const totals = calculateTotals('main');
        data.details.cashReceived = received;
        data.details.changeDue = Math.max(0, received - totals.grandTotal);
    } else if (kind === 'credit') {
        data.details.linkedToCustomer = true;
    } else {
        fields.forEach(f => {
            const el = document.getElementById('pm-' + f.key);
            data.details[f.key] = el ? el.value.trim() : '';
        });
    }

    return data;
}

// ============================================================
// UPDATE PAYMENT STATUS DISPLAY
// ============================================================
function updatePaymentStatusDisplay() {
    const display = DOM.paymentStatusDisplay;
    if (!display) return;

    const method = getPaymentMethodById(paymentMethod);
    const methodLabel = method ? method.label : t('payCashShort');

    if (paymentStatus === 'paid') {
        display.textContent = t('paymentPaidLabel', { method: methodLabel });
        display.style.color = 'var(--success)';
    } else if (paymentStatus === 'unpaid') {
        display.textContent = t('paymentCreditLabel');
        display.style.color = 'var(--danger)';
    } else {
        display.textContent = t('paymentPartialLabel', { method: methodLabel });
        display.style.color = 'var(--warning)';
    }
}

// ============================================================
// RESET PAYMENT BUTTONS
// ============================================================
function resetPaymentButtons() {
    paymentStatus = 'paid';
    paymentMethod = PAYMENT_METHODS.some(m => m.id === 'especes') ? 'especes' : (PAYMENT_METHODS[0]?.id || 'especes');
    selectPaymentMethod(paymentMethod);
}

// ============================================================
// RESET PAYMENT METHOD (called after transaction completes)
// ============================================================
function resetPaymentMethod() {
    paymentStatus = 'paid';
    paymentMethod = PAYMENT_METHODS.some(m => m.id === 'especes') ? 'especes' : (PAYMENT_METHODS[0]?.id || 'especes');
    selectPaymentMethod(paymentMethod);
}

// ============================================================
// UPDATE PAYMENT METHOD ON CART TOTAL CHANGE
// ============================================================
function updatePaymentMethodTotals() {
    const method = getPaymentMethodById(paymentMethod);
    if (method && method.kind === 'cash') {
        updateCashChange();
    } else {
        const totals = calculateTotals('main');
        if (DOM.amountPaidInput) {
            DOM.amountPaidInput.value = paymentStatus === 'paid' ? totals.grandTotal.toFixed(2) : '0';
        }
        updateRemainingAmount();
    }
}

// ============================================================
// EXPOSE FUNCTIONS
// ============================================================
window.setupPaymentMethodSelector = setupPaymentMethodSelector;
window.selectPaymentMethod = selectPaymentMethod;
window.getPaymentMethodData = getPaymentMethodData;
window.resetPaymentMethod = resetPaymentMethod;
window.updatePaymentMethodTotals = updatePaymentMethodTotals;
window.updatePaymentStatusDisplay = updatePaymentStatusDisplay;
window.applyPaymentMethodConfig = applyPaymentMethodConfig;
window.getPaymentMethodById = getPaymentMethodById;
window.getConfiguredPaymentMethods = getConfiguredPaymentMethods;
window.refreshPaymentMethodSelector = refreshPaymentMethodSelector;
window.resetPaymentButtons = resetPaymentButtons;

console.log('💳 Payment module loaded with multi-method selector');
