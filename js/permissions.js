// ============================================================
// PERMISSIONS: Role-Based UI Enforcement
// ============================================================

// ── Permission Check ─────────────────────────────────────────
function hasPermission(action) {
    if (!currentUser) return false;
    const role = currentUser.role;

    if (role === ROLES.admin) return true;

    if (currentUser.customPermissions && currentUser.customPermissions[action] !== undefined) {
        return currentUser.customPermissions[action];
    }

    const permissions = {
        caissier: {
            'sale.create': true,
            'sale.view': true,
            'sale.edit': true,
            'sale.delete': true,
            'inventory.view': false,
            'inventory.create': false,
            'inventory.edit': false,
            'inventory.delete': false,
            'customers.view': false,
            'customers.create': false,
            'customers.delete': false,
            'analytics.view': false,
            'suppliers.view': false,
            'suppliers.create': false,
            'settings.view': false,
            'settings.edit': false,
            'users.view': false,
            'users.manage': false,
            'zreport.generate': false,
            'data.clear': false
        },
        gerant: {
            'sale.create': true,
            'sale.view': true,
            'sale.edit': true,
            'sale.delete': true,
            'inventory.view': true,
            'inventory.create': true,
            'inventory.edit': true,
            'inventory.delete': false,
            'customers.view': true,
            'customers.create': true,
            'customers.delete': false,
            'analytics.view': true,
            'suppliers.view': true,
            'suppliers.create': true,
            'settings.view': false,
            'settings.edit': false,
            'users.view': false,
            'users.manage': false,
            'zreport.generate': true,
            'data.clear': false
        }
    };

    return permissions[role] ? (permissions[role][action] || false) : false;
}

// ── Require Admin PIN (for dangerous operations) ─────────────
async function requireAdminPin() {
    if (typeof showAdminPinModal === 'function') {
        return await showAdminPinModal();
    }
    return true;
}

// ── Apply Role Permissions to UI ─────────────────────────────
function applyRolePermissions() {
    if (!currentUser) return;

    const role = currentUser.role;
    const isAdmin = role === ROLES.admin;

    // ── Tab Visibility (uses hasPermission for custom per-user overrides) ──
    const tabPermMap = {
        'analytics': 'analytics.view',
        'settings': 'settings.view',
        'suppliers': 'suppliers.view',
        'inventory': 'inventory.view',
        'customers': 'customers.view',
        'users': 'users.view'
    };

    document.querySelectorAll('.nav-tab').forEach(tab => {
        const view = tab.dataset.view;
        const requiredPerm = tabPermMap[view];

        if (requiredPerm) {
            tab.style.display = hasPermission(requiredPerm) ? '' : 'none';
        } else if (view === 'checkout') {
            tab.style.display = '';
        } else {
            tab.style.display = '';
        }
    });

    // ── Users View Sections ──
    const usersAdminSection = document.getElementById('users-admin-section');
    const usersSelfSection = document.getElementById('users-self-section');
    if (usersAdminSection) usersAdminSection.style.display = isAdmin ? '' : 'none';
    if (usersSelfSection) usersSelfSection.style.display = isAdmin ? 'none' : '';

    // ── Delete Buttons (Admin PIN required + permission check) ──
    const bulkDeleteBtn = document.getElementById('btn-bulk-delete');
    const bulkDeleteCustomersBtn = document.getElementById('btn-bulk-delete-customers');
    const clearSalesBtn = document.getElementById('btn-clear-sales');
    const resetAllBtn = document.getElementById('btn-reset-all');

    if (bulkDeleteBtn) bulkDeleteBtn.style.display = hasPermission('inventory.delete') ? '' : 'none';
    if (bulkDeleteCustomersBtn) bulkDeleteCustomersBtn.style.display = hasPermission('customers.delete') ? '' : 'none';
    if (clearSalesBtn) clearSalesBtn.style.display = hasPermission('sale.delete') ? '' : 'none';
    if (resetAllBtn) resetAllBtn.style.display = isAdmin ? '' : 'none';

    // ── Product form (add/edit) ──
    const productForm = document.getElementById('product-form');
    if (productForm) {
        productForm.style.display = hasPermission('inventory.create') ? '' : 'none';
    }

    // ── User Switch Button ──
    const userSwitchBtn = document.getElementById('btn-user-switch');
    if (userSwitchBtn) {
        userSwitchBtn.style.display = '';
        const userNameSpan = document.getElementById('current-user-name');
        if (userNameSpan) userNameSpan.textContent = currentUser.name;
    }

    // ── Intercept delete buttons with Admin PIN guard ──
    setupDeleteGuards();
}

// ── Delete Guard: wrap dangerous buttons with Admin PIN ───────
function setupDeleteGuards() {
    if (!currentUser || currentUser.role !== ROLES.admin) return;

    document.querySelectorAll('[data-guard="admin-delete"]').forEach(btn => {
        if (btn.dataset.guarded) return;
        btn.dataset.guarded = 'true';

        const originalHandler = btn.onclick;
        btn.onclick = null;

        btn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (await requireAdminPin()) {
                if (originalHandler) {
                    originalHandler.call(btn, e);
                } else {
                    btn.click();
                }
            }
        }, true);
    });
}

// ── Guard Action Helper ──────────────────────────────────────
async function guardAction(actionName, callback) {
    if (hasPermission(actionName)) {
        return await callback();
    }
    showToast(t('accessDeniedRole'), 'error');
    return null;
}

// ── Window Exports ───────────────────────────────────────────
window.hasPermission = hasPermission;
window.requireAdminPin = requireAdminPin;
window.applyRolePermissions = applyRolePermissions;
window.guardAction = guardAction;
