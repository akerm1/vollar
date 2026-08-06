// ============================================================
// AUDIT: Audit Trail Logging & Viewer
// ============================================================

const AUDIT_ACTIONS = {
    SALE_CREATED: 'auditSaleCreated',
    SALE_DELETED: 'auditSaleDeleted',
    SALE_EDITED: 'auditSaleEdited',
    SALE_MOVED: 'auditSaleMoved',
    SALE_BULK_DELETED: 'auditAllSalesDeleted',
    PAYMENT_RECEIVED: 'auditPaymentReceived',
    PRODUCT_CREATED: 'auditProductCreated',
    PRODUCT_EDITED: 'auditProductEdited',
    PRODUCT_DELETED: 'auditProductDeleted',
    PRODUCT_BULK_DELETED: 'auditAllProductsDeleted',
    CUSTOMER_CREATED: 'auditCustomerCreated',
    CUSTOMER_DELETED: 'auditCustomerDeleted',
    CUSTOMER_BULK_DELETED: 'auditAllCustomersDeleted',
    Z_REPORT_GENERATED: 'auditZReport',
    USER_CREATED: 'auditUserCreated',
    USER_EDITED: 'auditUserEdited',
    USER_DELETED: 'auditUserDeleted',
    USER_PIN_CHANGED: 'auditPinChanged',
    LOGIN_SUCCESS: 'auditLoginSuccess',
    LOGIN_FAILED: 'auditLoginFailed',
    DATA_CLEARED: 'auditDataCleared'
};

const AUDIT_ACTION_COLORS = {
    SALE_CREATED: '#27ae60',
    SALE_DELETED: '#e74c3c',
    SALE_EDITED: '#f39c12',
    SALE_MOVED: '#9b59b6',
    SALE_BULK_DELETED: '#c0392b',
    PAYMENT_RECEIVED: '#2980b9',
    PRODUCT_CREATED: '#27ae60',
    PRODUCT_EDITED: '#f39c12',
    PRODUCT_DELETED: '#e74c3c',
    PRODUCT_BULK_DELETED: '#c0392b',
    CUSTOMER_CREATED: '#27ae60',
    CUSTOMER_DELETED: '#e74c3c',
    CUSTOMER_BULK_DELETED: '#c0392b',
    Z_REPORT_GENERATED: '#8e44ad',
    USER_CREATED: '#27ae60',
    USER_EDITED: '#f39c12',
    USER_DELETED: '#e74c3c',
    USER_PIN_CHANGED: '#f39c12',
    LOGIN_SUCCESS: '#27ae60',
    LOGIN_FAILED: '#e74c3c',
    DATA_CLEARED: '#c0392b'
};

// ── Log Audit Entry ──────────────────────────────────────────
async function logAudit(actionType, actionDetails) {
    try {
        const entry = {
            timestamp: new Date().toISOString(),
            userId: currentUser ? currentUser.id : null,
            userName: currentUser ? currentUser.name : 'Système',
            actionType: actionType,
            actionDetails: actionDetails || ''
        };
        await dbPut('auditlog', entry);
    } catch (error) {
        console.error('Audit log error:', error);
    }
}

// ── Load Audit Log ───────────────────────────────────────────
async function loadAuditLog(filters = {}) {
    try {
        let entries = await dbGetAll('auditlog');

        if (filters.dateFrom) {
            const from = new Date(filters.dateFrom);
            entries = entries.filter(e => new Date(e.timestamp) >= from);
        }
        if (filters.dateTo) {
            const to = new Date(filters.dateTo);
            to.setHours(23, 59, 59, 999);
            entries = entries.filter(e => new Date(e.timestamp) <= to);
        }
        if (filters.userId) {
            entries = entries.filter(e => e.userId === parseInt(filters.userId));
        }
        if (filters.actionType) {
            entries = entries.filter(e => e.actionType === filters.actionType);
        }

        entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return entries;
    } catch (error) {
        console.error('Load audit log error:', error);
        return [];
    }
}

// ── Render Audit Log ─────────────────────────────────────────
function renderAuditLogTable(entries) {
    const container = document.getElementById('audit-log-body');
    if (!container) return;

    if (entries.length === 0) {
        container.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#999;padding:30px;">' + t('noEntries') + '</td></tr>';
        return;
    }

    container.innerHTML = entries.slice(0, 200).map(entry => {
        const date = new Date(entry.timestamp);
        const dateStr = date.toLocaleDateString('fr-FR') + ' ' + date.toLocaleTimeString('fr-FR');
        const color = AUDIT_ACTION_COLORS[entry.actionType] || '#666';
        const label = t(AUDIT_ACTIONS[entry.actionType]) || entry.actionType;

        return `
            <tr>
                <td style="white-space:nowrap;font-size:12px;">${dateStr}</td>
                <td>${entry.userName || '—'}</td>
                <td><span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:12px;background:${color}22;color:${color};font-weight:600;">${label}</span></td>
                <td style="font-size:12px;color:#666;">${entry.actionDetails || '—'}</td>
            </tr>
        `;
    }).join('');
}

// ── Show Audit Log Modal ─────────────────────────────────────
async function showAuditLogModal() {
    const modal = document.getElementById('audit-log-modal');
    if (!modal) return;

    const users = await dbGetAll('users');
    const userSelect = document.getElementById('audit-filter-user');
    if (userSelect) {
        userSelect.innerHTML = '<option value="">Tous les utilisateurs</option>' +
            users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
    }

    const typeSelect = document.getElementById('audit-filter-type');
    if (typeSelect) {
        typeSelect.innerHTML = '<option value="">' + t('allActionsFilter') + '</option>' +
            Object.entries(AUDIT_ACTIONS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
    }

    const entries = await loadAuditLog();
    renderAuditLogTable(entries);

    const countEl = document.getElementById('audit-count');
    if (countEl) countEl.textContent = t('entriesCount', { count: entries.length });

    modal.classList.add('active');
}

async function applyAuditFilters() {
    const filters = {
        dateFrom: document.getElementById('audit-filter-from')?.value || '',
        dateTo: document.getElementById('audit-filter-to')?.value || '',
        userId: document.getElementById('audit-filter-user')?.value || '',
        actionType: document.getElementById('audit-filter-type')?.value || ''
    };
    const entries = await loadAuditLog(filters);
    renderAuditLogTable(entries);
    const countEl = document.getElementById('audit-count');
    if (countEl) countEl.textContent = t('entriesCount', { count: entries.length });
}

function closeAuditLogModal() {
    document.getElementById('audit-log-modal').classList.remove('active');
}

// ── Show Audit Log for a Specific User ──────────────────────
async function showUserAuditLog(userId) {
    const modal = document.getElementById('audit-log-modal');
    if (!modal) return;

    const users = await dbGetAll('users');
    const userSelect = document.getElementById('audit-filter-user');
    if (userSelect) {
        userSelect.innerHTML = '<option value="">' + t('selectUserFilter') + '</option>' +
            users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
        userSelect.value = String(userId);
    }

    const typeSelect = document.getElementById('audit-filter-type');
    if (typeSelect) {
        typeSelect.innerHTML = '<option value="">' + t('allActionsFilter') + '</option>' +
            Object.entries(AUDIT_ACTIONS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
    }

    const entries = await loadAuditLog({ userId: String(userId) });
    renderAuditLogTable(entries);

    const countEl = document.getElementById('audit-count');
    if (countEl) countEl.textContent = t('entriesForUser', { count: entries.length });

    modal.classList.add('active');
}

// ── Setup Audit UI ───────────────────────────────────────────
function setupAuditUI() {
    const btnViewAudit = document.getElementById('btn-view-audit');
    if (btnViewAudit) btnViewAudit.addEventListener('click', showAuditLogModal);

    const btnCloseAudit = document.getElementById('btn-close-audit');
    if (btnCloseAudit) btnCloseAudit.addEventListener('click', closeAuditLogModal);

    const btnApplyFilters = document.getElementById('btn-apply-audit-filters');
    if (btnApplyFilters) btnApplyFilters.addEventListener('click', applyAuditFilters);
}

// ── Window Exports ───────────────────────────────────────────
window.logAudit = logAudit;
window.loadAuditLog = loadAuditLog;
window.showAuditLogModal = showAuditLogModal;
window.showUserAuditLog = showUserAuditLog;
window.applyAuditFilters = applyAuditFilters;
window.closeAuditLogModal = closeAuditLogModal;
window.setupAuditUI = setupAuditUI;
window.AUDIT_ACTIONS = AUDIT_ACTIONS;
