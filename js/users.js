// ============================================================
// USERS: User Management (CRUD)
// ============================================================

// ── Load & Render User List ──────────────────────────────────
async function loadUsers() {
    try {
        const users = await dbGetAll('users');
        renderUserList(users);
    } catch (error) {
        console.error('Load users error:', error);
    }
}

function renderUserList(users) {
    const container = document.getElementById('users-list');
    if (!container) return;

    if (users.length === 0) {
        container.innerHTML = '<p class="empty-small">' + t('noUsers') + '</p>';
        return;
    }

    const roleLabels = { admin: t('adminRole'), caissier: t('caissierRole'), gerant: t('gerantRole') };
    const roleColors = { admin: '#e74c3c', caissier: '#27ae60', gerant: '#3498db' };

    container.innerHTML = users.map(user => {
        const isCurrentUser = currentUser && user.id === currentUser.id;
        const roleColor = roleColors[user.role] || '#999';
        disabledBadge = user.active === false ? `<span class="badge-sm muted">${t('userDeactivated')}</span>` : '';
        selfBadge = isCurrentUser ? `<span class="badge-sm primary">${t('userSelf')}</span>` : '';
        mustChangeBadge = user.mustChangePin ? `<span class="badge-sm warning">${t('userDefaultPin')}</span>` : '';
        adminBadge = user.role === 'admin' ? ' 🔑' : '';

        return `
            <div class="user-item${user.active === false ? ' disabled' : ''}">
                <div class="left">
                    <div class="user-avatar" style="background:${roleColor};">${user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}</div>
                    <div class="user-info">
                        <div class="user-name">${user.name}${selfBadge}${disabledBadge}${mustChangeBadge}</div>
                        <div class="user-role" style="color:${roleColor};">${roleLabels[user.role] || user.role}${adminBadge}</div>
                    </div>
                </div>
                <div class="actions">
                    <button class="btn btn-sm btn-info" onclick="showUserAuditLog(${user.id})" title="${t('userHistory')}">📋</button>
                    <button class="btn btn-sm btn-secondary" onclick="openEditUserModal(${user.id})" title="${t('userEdit')}">✏️</button>
                    <button class="btn btn-sm btn-accent" onclick="openChangePinModalForUser(${user.id})" title="${t('userChangePin')}">🔑</button>
                    ${user.active !== false ?
                        `<button class="btn btn-sm btn-warning" onclick="toggleUserActive(${user.id})" title="${t('userDeactivate')}">⏸️</button>` :
                        `<button class="btn btn-sm btn-success" onclick="toggleUserActive(${user.id})" title="${t('userActivate')}">▶️</button>`
                    }
                    ${!isCurrentUser ?
                        `<button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})" title="${t('userDelete')}">🗑️</button>` : ''
                    }
                </div>
            </div>
        `;
    }).join('');
}

// ── Create User ──────────────────────────────────────────────
function openCreateUserModal() {
    const modal = document.getElementById('user-modal');
    const title = document.getElementById('user-modal-title');
    const form = document.getElementById('user-form');
    const pinGroup = document.getElementById('user-pin-group');

    title.textContent = t('createUser');
    form.reset();
    form.dataset.mode = 'create';
    form.dataset.userId = '';
    pinGroup.style.display = '';
    const permGroup = document.getElementById('user-permissions-group');
    if (permGroup) permGroup.style.display = 'none';
    document.getElementById('user-name').value = '';
    document.getElementById('user-pin').value = '';
    document.getElementById('user-role').value = 'caissier';

    if (modal) modal.classList.add('active');
}

async function saveUser(e) {
    e.preventDefault();
    const form = document.getElementById('user-form');
    const name = document.getElementById('user-name').value.trim();
    const pin = document.getElementById('user-pin').value;
    const role = document.getElementById('user-role').value;
    const errorEl = document.getElementById('user-modal-error');

    if (!name) {
        errorEl.textContent = t('nameRequired');
        return;
    }

    if (form.dataset.mode === 'create') {
        if (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
            errorEl.textContent = t('pinMinMax');
            return;
        }

        const pinHash = await hashPin(pin);
        await dbPut('users', {
            name: name,
            pinHash: pinHash,
            role: role,
            active: true,
            mustChangePin: false,
            customPermissions: {},
            createdAt: new Date().toISOString()
        });

        if (typeof logAudit === 'function') {
            await logAudit('USER_CREATED', `Utilisateur: ${name} (${role})`);
        }

        showToast(t('userCreated'), 'success');
    } else {
        const userId = parseInt(form.dataset.userId);
        const user = await dbGet('users', userId);
        if (user) {
            user.name = name;
            user.role = role;
            const forcePinCheck = document.getElementById('user-force-pin-change');
            if (forcePinCheck) {
                user.mustChangePin = forcePinCheck.checked ? true : false;
            }
            if (user.role !== 'admin') {
                user.customPermissions = getCustomPermissionsFromForm();
                console.log('🔑 Saved custom permissions for', user.name, ':', JSON.stringify(user.customPermissions));
            } else {
                user.customPermissions = {};
            }
            await dbPut('users', user);
            console.log('✅ User saved to DB:', user.id, user.name, 'permissions:', JSON.stringify(user.customPermissions));

            if (currentUser && userId === currentUser.id) {
                currentUser.name = user.name;
                currentUser.role = user.role;
                currentUser.mustChangePin = user.mustChangePin;
                currentUser.customPermissions = user.customPermissions;
            }

            if (typeof logAudit === 'function') {
                await logAudit('USER_EDITED', `Utilisateur: ${name} (${role})`);
            }

            showToast(t('userEdited'), 'success');
        }
    }

    document.getElementById('user-modal').classList.remove('active');
    errorEl.textContent = '';
    await loadUsers();
}

// ── Edit User ────────────────────────────────────────────────
async function openEditUserModal(userId) {
    const user = await dbGet('users', userId);
    if (!user) return;

    const modal = document.getElementById('user-modal');
    const title = document.getElementById('user-modal-title');
    const form = document.getElementById('user-form');
    const pinGroup = document.getElementById('user-pin-group');
    const forcePinGroup = document.getElementById('user-force-pin-group');
    const forcePinCheck = document.getElementById('user-force-pin-change');

    title.textContent = t('editUser');
    form.dataset.mode = 'edit';
    form.dataset.userId = userId;
    document.getElementById('user-name').value = user.name;
    document.getElementById('user-role').value = user.role;
    pinGroup.style.display = 'none';
    if (forcePinGroup) forcePinGroup.style.display = '';
    if (forcePinCheck) forcePinCheck.checked = user.mustChangePin === true;

    const permGroup = document.getElementById('user-permissions-group');
    const permList = document.getElementById('user-permissions-list');
    if (permGroup && permList) {
        if (currentUser && currentUser.role === 'admin' && user.role !== 'admin') {
            permGroup.style.display = '';
            renderPermissionCheckboxes(user, permList);
        } else {
            permGroup.style.display = 'none';
        }
    }

    if (modal) modal.classList.add('active');
}

// ── Change PIN for Specific User (Admin operation) ───────────
let _changePinUserId = null;
let _adminChangePinNewBuffer = '';
let _adminChangePinConfirmBuffer = '';

async function openChangePinModalForUser(userId) {
    _changePinUserId = userId;
    const user = await dbGet('users', userId);
    if (!user) return;

    const modal = document.getElementById('user-pin-change-modal');
    const title = document.getElementById('pin-change-user-name');
    if (title) title.textContent = user.name;

    _adminChangePinNewBuffer = '';
    _adminChangePinConfirmBuffer = '';
    updateAdminChangePinDisplay();
    updateAdminChangeConfirmDisplay();
    generatePinPad('admin-change-pin-pad', handleAdminChangePinKey);
    generatePinPad('admin-change-confirm-pad', handleAdminChangeConfirmKey);
    document.getElementById('user-pin-change-error').textContent = '';

    if (modal) modal.classList.add('active');
}

function updateAdminChangePinDisplay() {
    const display = document.getElementById('admin-change-pin-display');
    if (!display) return;
    let dots = '';
    for (let i = 0; i < 6; i++) {
        dots += i < _adminChangePinNewBuffer.length ? '● ' : '○ ';
    }
    display.textContent = dots.trim();
}

function updateAdminChangeConfirmDisplay() {
    const display = document.getElementById('admin-change-confirm-display');
    if (!display) return;
    let dots = '';
    for (let i = 0; i < 6; i++) {
        dots += i < _adminChangePinConfirmBuffer.length ? '● ' : '○ ';
    }
    display.textContent = dots.trim();
}

async function handleAdminChangePinKey(key) {
    if (key === '⌫') {
        _adminChangePinNewBuffer = _adminChangePinNewBuffer.slice(0, -1);
        updateAdminChangePinDisplay();
        return;
    }
    if (key === '✓') {
        if (_adminChangePinNewBuffer.length < 4) {
            document.getElementById('user-pin-change-error').textContent = t('pinTooShort');
            return;
        }
        document.getElementById('user-pin-change-error').textContent = '';
        return;
    }
    if (_adminChangePinNewBuffer.length >= 6) return;
    _adminChangePinNewBuffer += key;
    updateAdminChangePinDisplay();
}

async function handleAdminChangeConfirmKey(key) {
    if (key === '⌫') {
        _adminChangePinConfirmBuffer = _adminChangePinConfirmBuffer.slice(0, -1);
        updateAdminChangeConfirmDisplay();
        return;
    }
    if (key === '✓') {
        document.getElementById('user-pin-change-form').dispatchEvent(new Event('submit'));
        return;
    }
    if (_adminChangePinConfirmBuffer.length >= 6) return;
    _adminChangePinConfirmBuffer += key;
    updateAdminChangeConfirmDisplay();
}

async function saveUserPinChange(e) {
    e.preventDefault();
    const newPin = _adminChangePinNewBuffer;
    const confirmPin = _adminChangePinConfirmBuffer;
    const errorEl = document.getElementById('user-pin-change-error');

    if (newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
        errorEl.textContent = t('pinLengthError');
        return;
    }

    if (newPin !== confirmPin) {
        errorEl.textContent = t('pinMismatch');
        return;
    }

    try {
        const user = await dbGet('users', _changePinUserId);
        if (user) {
            user.pinHash = await hashPin(newPin);
            user.mustChangePin = false;
            await dbPut('users', user);

            if (typeof logAudit === 'function') {
                await logAudit('USER_PIN_CHANGED', `PIN changé pour: ${user.name}`);
            }

            document.getElementById('user-pin-change-modal').classList.remove('active');
            showToast(t('pinChanged'), 'success');
            await loadUsers();
        }
    } catch (error) {
        errorEl.textContent = t('pinChangeError');
    }
}

// ── Toggle User Active ───────────────────────────────────────
async function toggleUserActive(userId) {
    const user = await dbGet('users', userId);
    if (!user) return;

    if (user.id === currentUser.id) {
        showToast(t('cannotDeactivateSelf'), 'error');
        return;
    }

    user.active = user.active === false ? true : false;
    await dbPut('users', user);

    if (typeof logAudit === 'function') {
        await logAudit('USER_EDITED', `Utilisateur ${user.name}: ${user.active ? 'activé' : 'désactivé'}`);
    }

    showToast(user.active ? t('userActivated') : t('userDeactivated'), 'success');
    await loadUsers();
}

// ── Delete User ──────────────────────────────────────────────
async function deleteUser(userId) {
    if (typeof requireAdminPin !== 'function' || await requireAdminPin()) {
        if (confirm(t('confirmDeleteUser'))) {
            try {
                const user = await dbGet('users', userId);
                await dbDelete('users', userId);

                if (typeof logAudit === 'function') {
                    await logAudit('USER_DELETED', `Utilisateur: ${user ? user.name : 'ID ' + userId}`);
                }

                showToast(t('userDeleted'), 'success');
                await loadUsers();
            } catch (error) {
                console.error('Delete user error:', error);
                showToast(t('deleteFailed'), 'error');
            }
        }
    }
}

// ── User Modal Close ─────────────────────────────────────────
function closeUserModal() {
    document.getElementById('user-modal').classList.remove('active');
    document.getElementById('user-modal-error').textContent = '';
}

function closePinChangeModal() {
    document.getElementById('user-pin-change-modal').classList.remove('active');
}

// ── All Available Permissions ────────────────────────────────
function getAllPermissions() {
    return {
        'sale.create': t('permSaleCreate'),
        'sale.view': t('permSaleView'),
        'sale.edit': t('permSaleEdit'),
        'sale.delete': t('permSaleDelete'),
        'inventory.view': t('permInventoryView'),
        'inventory.create': t('permInventoryCreate'),
        'inventory.edit': t('permInventoryEdit'),
        'inventory.delete': t('permInventoryDelete'),
        'customers.view': t('permCustomersView'),
        'customers.create': t('permCustomersCreate'),
        'customers.delete': t('permCustomersDelete'),
        'analytics.view': t('permAnalyticsView'),
        'suppliers.view': t('permSuppliersView'),
        'suppliers.create': t('permSuppliersCreate'),
        'settings.view': t('permSettingsView'),
        'settings.edit': t('permSettingsEdit'),
        'users.view': t('permUsersView'),
        'users.manage': t('permUsersManage'),
        'zreport.generate': t('permZReport'),
        'data.clear': t('permDataClear')
    };
}

// ── Self Profile (for non-admin users) ───────────────────────
async function loadSelfProfile() {
    if (!currentUser) return;
    const nameInput = document.getElementById('self-profile-name');
    const roleInput = document.getElementById('self-profile-role');
    const errorEl = document.getElementById('self-profile-error');
    if (nameInput) nameInput.value = currentUser.name || '';
    if (roleInput) {
        const labels = { admin: t('adminRole'), caissier: t('caissierRole'), gerant: t('gerantRole') };
        roleInput.value = labels[currentUser.role] || currentUser.role;
    }
    if (errorEl) errorEl.textContent = '';
}

async function handleSelfProfileSubmit(e) {
    e.preventDefault();
    const nameInput = document.getElementById('self-profile-name');
    const errorEl = document.getElementById('self-profile-error');
    const newName = nameInput ? nameInput.value.trim() : '';
    if (!newName) {
        if (errorEl) errorEl.textContent = t('nameRequired');
        return;
    }
    try {
        const user = await dbGet('users', currentUser.id);
        if (user) {
            user.name = newName;
            await dbPut('users', user);
            currentUser.name = newName;
            const userNameSpan = document.getElementById('current-user-name');
            if (userNameSpan) userNameSpan.textContent = newName;
            if (errorEl) errorEl.textContent = '';
            showToast(t('nameUpdated'), 'success');
        }
    } catch (err) {
        console.error('Self profile save error:', err);
        if (errorEl) errorEl.textContent = t('saveFailed');
    }
}

// ── Render Permission Checkboxes ─────────────────────────────
function renderPermissionCheckboxes(user, container) {
    const customPerms = user.customPermissions || {};
    console.log('🔍 Rendering permissions for', user.name, ':', JSON.stringify(customPerms));
    const roleDefaults = {
        caissier: {
            'sale.create': true, 'sale.view': true, 'sale.edit': true, 'sale.delete': true
        },
        gerant: {
            'sale.create': true, 'sale.view': true, 'sale.edit': true, 'sale.delete': true,
            'inventory.view': true, 'inventory.create': true, 'inventory.edit': true,
            'customers.view': true, 'customers.create': true,
            'analytics.view': true,
            'suppliers.view': true, 'suppliers.create': true,
            'zreport.generate': true
        },
        admin: {}
    };
    const defaults = roleDefaults[user.role] || {};

    container.innerHTML = Object.entries(getAllPermissions()).map(([key, label]) => {
        const checked = customPerms[key] !== undefined ? customPerms[key] : (defaults[key] || false);
        return `
            <label style="display:flex;align-items:center;gap:4px;cursor:pointer;padding:2px 4px;border-radius:4px;${checked ? '' : 'opacity:0.5;'}" data-perm="${key}">
                <input type="checkbox" data-perm-key="${key}" ${checked ? 'checked' : ''}>
                ${label}
            </label>
        `;
    }).join('');

    container.querySelectorAll('input[data-perm-key]').forEach(cb => {
        cb.addEventListener('change', function() {
            const label = this.closest('label');
            if (label) label.style.opacity = this.checked ? '1' : '0.5';
        });
    });
}

function getCustomPermissionsFromForm() {
    const perms = {};
    const checkboxes = document.querySelectorAll('#user-permissions-list input[data-perm-key]');
    console.log('📋 Found', checkboxes.length, 'permission checkboxes');
    checkboxes.forEach(cb => {
        perms[cb.dataset.permKey] = cb.checked;
    });
    console.log('📋 Read permissions:', JSON.stringify(perms));
    return perms;
}

// ── Setup User Management ────────────────────────────────────
function setupUserManagement() {
    const btnCreate = document.getElementById('btn-create-user');
    if (btnCreate) btnCreate.addEventListener('click', openCreateUserModal);

    const userForm = document.getElementById('user-form');
    if (userForm) userForm.addEventListener('submit', saveUser);

    const btnCloseUser = document.getElementById('btn-close-user-modal');
    if (btnCloseUser) btnCloseUser.addEventListener('click', closeUserModal);

    const pinChangeForm = document.getElementById('user-pin-change-form');
    if (pinChangeForm) pinChangeForm.addEventListener('submit', saveUserPinChange);

    const btnClosePinChange = document.getElementById('btn-close-pin-change-modal');
    if (btnClosePinChange) btnClosePinChange.addEventListener('click', closePinChangeModal);

    const btnAdminPinCancel = document.getElementById('admin-pin-cancel');
    if (btnAdminPinCancel) btnAdminPinCancel.addEventListener('click', cancelAdminPin);

    const btnUserSwitch = document.getElementById('btn-user-switch');
    if (btnUserSwitch) btnUserSwitch.addEventListener('click', switchUser);

    const selfProfileForm = document.getElementById('self-profile-form');
    if (selfProfileForm) selfProfileForm.addEventListener('submit', handleSelfProfileSubmit);

    const selfChangePinBtn = document.getElementById('btn-self-change-pin');
    if (selfChangePinBtn) {
        selfChangePinBtn.addEventListener('click', function() {
            const modal = document.getElementById('change-pin-modal');
            if (modal) modal.classList.add('active');
        });
    }
}

// ── Window Exports ───────────────────────────────────────────
window.loadUsers = loadUsers;
window.renderUserList = renderUserList;
window.openCreateUserModal = openCreateUserModal;
window.openEditUserModal = openEditUserModal;
window.openChangePinModalForUser = openChangePinModalForUser;
window.toggleUserActive = toggleUserActive;
window.deleteUser = deleteUser;
window.setupUserManagement = setupUserManagement;
window.loadSelfProfile = loadSelfProfile;
window.handleSelfProfileSubmit = handleSelfProfileSubmit;
