// ============================================================
// AUTH: Authentication, PIN Login, Lock Screen, Session, Auto-Lock
// ============================================================

// ── PIN Hashing ──────────────────────────────────────────────
async function hashPin(pin) {
    const str = String(pin);
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(str);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            console.warn('crypto.subtle digest failed, using fallback:', e);
        }
    }
    return _fallbackHash(str);
}

function _fallbackHash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    let h2 = 0x811c9dc5;
    for (let i = str.length - 1; i >= 0; i--) {
        h2 ^= str.charCodeAt(i);
        h2 = Math.imul(h2, 0x01000193);
    }
    const parts = [];
    for (let i = 0; i < 4; i++) {
        const v = (h >>> (i * 8)) & 0xff;
        const v2 = (h2 >>> (i * 8)) & 0xff;
        parts.push((v ^ v2).toString(16).padStart(2, '0'));
    }
    const fwd = parts.join('');
    const rev = parts.slice().reverse().join('');
    return fwd + rev;
}

// ── Create Default Admin ─────────────────────────────────────
async function createDefaultAdmin() {
    try {
        const users = await dbGetAll('users');
        if (users.length === 0) {
            const pinHash = await hashPin('0000');
            await dbPut('users', {
                name: 'Administrateur',
                pinHash: pinHash,
                role: ROLES.admin,
                active: true,
                mustChangePin: true,
                customPermissions: {},
                createdAt: new Date().toISOString()
            });
            console.log('✅ Default admin created — modification du PIN obligatoire à la première connexion');
        } else {
            console.log('✅ Users already exist, skipping default admin creation');
        }
    } catch (error) {
        console.error('Error creating default admin:', error);
    }
}

// ── Lock Screen Rendering ────────────────────────────────────
async function showLockScreen() {
    const lockScreen = document.getElementById('lock-screen');
    if (!lockScreen) return;

    const users = await dbGetAll('users');
    const activeUsers = users.filter(u => u.active !== false);

    const userGrid = document.getElementById('user-grid');
    userGrid.innerHTML = '';

    if (activeUsers.length === 0) {
        userGrid.innerHTML = '<p style="color:#999;text-align:center;">' + t('userNotConfigured') + '</p>';
        lockScreen.classList.add('active');
        return;
    }

    activeUsers.forEach(user => {
        const card = document.createElement('div');
        card.className = 'lock-user-card';
        card.dataset.userId = user.id;

        const initials = user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
        const roleColors = { admin: '#e74c3c', caissier: '#27ae60', gerant: '#3498db' };
        const roleLabels = { admin: t('adminRole'), caissier: t('caissierRole'), gerant: t('gerantRole') };
        const color = roleColors[user.role] || '#999';

        card.innerHTML = `
            <div class="lock-user-avatar" style="background:${color};">${initials}</div>
            <div class="lock-user-name">${user.name}</div>
            <div class="lock-user-role" style="color:${color};">${roleLabels[user.role] || user.role}${user.role === 'admin' ? ' 🔑' : ''}</div>
        `;

        card.addEventListener('click', () => selectUserForLogin(user.id, user.name));
        userGrid.appendChild(card);
    });

    document.getElementById('pin-input-section').style.display = 'none';
    document.getElementById('user-grid').style.display = '';
    lockScreen.classList.add('active');
}

function hideLockScreen() {
    const lockScreen = document.getElementById('lock-screen');
    if (lockScreen) lockScreen.classList.remove('active');
}

// ── User Selection ───────────────────────────────────────────
let _selectedLoginUserId = null;
let _pinBuffer = '';
let _loginAttempts = 0;
let _lockoutTimeout = null;

function selectUserForLogin(userId, userName) {
    _selectedLoginUserId = userId;
    _pinBuffer = '';
    _loginAttempts = 0;

    document.getElementById('user-grid').style.display = 'none';
    document.getElementById('pin-input-section').style.display = '';
    document.getElementById('selected-user-name').textContent = userName;
    document.getElementById('pin-error').textContent = '';
    updatePinDisplay('');
    generatePinPad('lock-pin-pad', handleLockScreenPinKey);
    setupLockScreenKeyboard();
}

function updatePinDisplay(buffer) {
    const display = document.getElementById('pin-display');
    if (!display) return;
    let dots = '';
    for (let i = 0; i < 6; i++) {
        dots += i < buffer.length ? '● ' : '○ ';
    }
    display.textContent = dots.trim();
}

function generatePinPad(containerId, keyHandler) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    const keys = ['1','2','3','4','5','6','7','8','9','⌫','0','✓'];
    keys.forEach(key => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'pin-pad-btn';
        if (key === '⌫') btn.classList.add('pin-backspace');
        if (key === '✓') btn.classList.add('pin-enter');
        btn.textContent = key;
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            keyHandler(key);
        });
        container.appendChild(btn);
    });
}

async function handleLockScreenPinKey(key) {
    const errorEl = document.getElementById('pin-error');

    if (key === '⌫') {
        _pinBuffer = _pinBuffer.slice(0, -1);
        updatePinDisplay(_pinBuffer);
        return;
    }

    if (key === '✓') {
        if (_pinBuffer.length < 4) {
            errorEl.textContent = t('pinTooShort');
            return;
        }
        await attemptLogin();
        return;
    }

    if (_pinBuffer.length >= 6) return;
    _pinBuffer += key;
    updatePinDisplay(_pinBuffer);
}

// ── Login Attempt ────────────────────────────────────────────
async function attemptLogin() {
    const errorEl = document.getElementById('pin-error');
    const user = await dbGet('users', _selectedLoginUserId);

    if (!user || user.active === false) {
        errorEl.textContent = t('userNotFoundDisabled');
        _pinBuffer = '';
        updatePinDisplay('');
        return;
    }

    const inputHash = await hashPin(_pinBuffer);
    console.log('🔐 Login attempt - PIN length:', _pinBuffer.length, 'hash:', inputHash, 'stored:', user.pinHash);

    if (inputHash === user.pinHash) {
        _loginAttempts = 0;
        currentUser = { id: user.id, name: user.name, role: user.role, mustChangePin: user.mustChangePin, customPermissions: user.customPermissions };
        sessionStorage.setItem('userId', user.id);
        lastActivityTime = Date.now();

        hideLockScreen();

        if (typeof logAudit === 'function') {
            await logAudit('LOGIN_SUCCESS', `${user.name} (${user.role})`);
        }

        if (user.mustChangePin) {
            showChangePinModal();
            return;
        }

        initApp();
    } else {
        _loginAttempts++;
        if (typeof logAudit === 'function') {
            const u = await dbGet('users', _selectedLoginUserId);
            await logAudit('LOGIN_FAILED', `Tentative pour: ${u ? u.name : 'ID ' + _selectedLoginUserId}`);
        }

        if (_loginAttempts >= LOCKOUT_ATTEMPTS) {
            errorEl.textContent = t('pinLockout', {seconds: LOCKOUT_MS / 1000});
            _pinBuffer = '';
            updatePinDisplay('');
            disablePinInput(true);

            _lockoutTimeout = setTimeout(() => {
                _loginAttempts = 0;
                disablePinInput(false);
                errorEl.textContent = t('pinTryAgain');
            }, LOCKOUT_MS);
        } else {
            errorEl.textContent = t('pinIncorrect', {attempt: _loginAttempts, max: LOCKOUT_ATTEMPTS});
            _pinBuffer = '';
            updatePinDisplay('');
        }
    }
}

function disablePinInput(disabled) {
    const pad = document.getElementById('lock-pin-pad');
    if (pad) {
        pad.querySelectorAll('.pin-pad-btn').forEach(btn => {
            btn.disabled = disabled;
            btn.style.opacity = disabled ? '0.4' : '1';
        });
    }
}

// ── Change PIN Modal (Self) ──────────────────────────────────
let _changePinNewBuffer = '';
let _changePinConfirmBuffer = '';
let _changePinPhase = 'new';

function showChangePinModal(message) {
    const modal = document.getElementById('change-pin-modal');
    const title = document.getElementById('change-pin-title');
    const desc = document.getElementById('change-pin-desc');
    if (title) title.textContent = message && message.title ? message.title : t('changePinTitle');
    if (desc) desc.textContent = message && message.desc ? message.desc : t('changePinDesc');
    _changePinNewBuffer = '';
    _changePinConfirmBuffer = '';
    _changePinPhase = 'new';
    updateChangePinDisplay();
    updateChangeConfirmDisplay();
    generatePinPad('change-pin-pad', handleChangePinKey);
    generatePinPad('change-confirm-pad', handleChangeConfirmKey);
    if (modal) modal.classList.add('active');
}

function updateChangePinDisplay() {
    const display = document.getElementById('change-pin-display');
    if (!display) return;
    let dots = '';
    for (let i = 0; i < 6; i++) {
        dots += i < _changePinNewBuffer.length ? '● ' : '○ ';
    }
    display.textContent = dots.trim();
}

function updateChangeConfirmDisplay() {
    const display = document.getElementById('change-confirm-display');
    if (!display) return;
    let dots = '';
    for (let i = 0; i < 6; i++) {
        dots += i < _changePinConfirmBuffer.length ? '● ' : '○ ';
    }
    display.textContent = dots.trim();
}

async function handleChangePinKey(key) {
    if (key === '⌫') {
        _changePinNewBuffer = _changePinNewBuffer.slice(0, -1);
        updateChangePinDisplay();
        return;
    }
    if (key === '✓') {
        if (_changePinNewBuffer.length < 4) {
            document.getElementById('change-pin-error').textContent = t('pinTooShort');
            return;
        }
        document.getElementById('change-pin-error').textContent = '';
        document.querySelector('#change-pin-form .form-group:first-child label').textContent = t('pinSaved');
        return;
    }
    if (_changePinNewBuffer.length >= 6) return;
    _changePinNewBuffer += key;
    updateChangePinDisplay();
}

async function handleChangeConfirmKey(key) {
    if (key === '⌫') {
        _changePinConfirmBuffer = _changePinConfirmBuffer.slice(0, -1);
        updateChangeConfirmDisplay();
        return;
    }
    if (key === '✓') {
        document.getElementById('change-pin-form').dispatchEvent(new Event('submit'));
        return;
    }
    if (_changePinConfirmBuffer.length >= 6) return;
    _changePinConfirmBuffer += key;
    updateChangeConfirmDisplay();
}

async function handleChangePinSubmit(e) {
    e.preventDefault();
    const newPin = _changePinNewBuffer;
    const confirmPin = _changePinConfirmBuffer;
    const errorEl = document.getElementById('change-pin-error');

    if (newPin.length < 4 || newPin.length > 6 || !/^\d+$/.test(newPin)) {
        errorEl.textContent = t('pinMinError');
        return;
    }

    if (newPin === '0000') {
        errorEl.textContent = t('pinNoZero');
        return;
    }

    if (newPin !== confirmPin) {
        errorEl.textContent = t('pinMismatch');
        return;
    }

    try {
        const user = await dbGet('users', currentUser.id);
        if (user) {
            user.pinHash = await hashPin(newPin);
            user.mustChangePin = false;
            await dbPut('users', user);
            currentUser.mustChangePin = false;
        }

        document.getElementById('change-pin-modal').classList.remove('active');
        if (errorEl) errorEl.textContent = '';

        if (typeof logAudit === 'function') {
            await logAudit('USER_PIN_CHANGED', `PIN changé pour: ${currentUser.name}`);
        }

        showToast(t('pinChangedSuccess'), 'success');
        initApp();
    } catch (error) {
        console.error('Change PIN error:', error);
        errorEl.textContent = t('pinChangeError');
    }
}

// ── Admin PIN Confirmation Modal ─────────────────────────────
let _adminPinResolve = null;
let _adminPinBuffer = '';

function showAdminPinModal() {
    return new Promise((resolve) => {
        _adminPinResolve = resolve;
        _adminPinBuffer = '';
        const modal = document.getElementById('admin-pin-modal');
        if (modal) modal.classList.add('active');
        updateAdminPinDisplay('');
        generatePinPad('admin-pin-pad', handleAdminPinKey);
        const errorEl = document.getElementById('admin-pin-error');
        if (errorEl) errorEl.textContent = '';
    });
}

function updateAdminPinDisplay(buffer) {
    const display = document.getElementById('admin-pin-display');
    if (!display) return;
    let dots = '';
    for (let i = 0; i < 6; i++) {
        dots += i < buffer.length ? '● ' : '○ ';
    }
    display.textContent = dots.trim();
}

async function handleAdminPinKey(key) {
    const errorEl = document.getElementById('admin-pin-error');

    if (key === '⌫') {
        _adminPinBuffer = _adminPinBuffer.slice(0, -1);
        updateAdminPinDisplay(_adminPinBuffer);
        return;
    }

    if (key === '✓') {
        if (_adminPinBuffer.length < 4) {
            errorEl.textContent = t('pinTooShort');
            return;
        }
        const hash = await hashPin(_adminPinBuffer);
        const users = await dbGetAll('users');
        const admin = users.find(u => u.role === ROLES.admin && u.active !== false && u.pinHash === hash);

        if (admin) {
            document.getElementById('admin-pin-modal').classList.remove('active');
            if (_adminPinResolve) _adminPinResolve(true);
            _adminPinResolve = null;
        } else {
            errorEl.textContent = t('adminPinIncorrect');
            _adminPinBuffer = '';
            updateAdminPinDisplay('');
        }
        return;
    }

    if (_adminPinBuffer.length >= 6) return;
    _adminPinBuffer += key;
    updateAdminPinDisplay(_adminPinBuffer);
}

function cancelAdminPin() {
    document.getElementById('admin-pin-modal').classList.remove('active');
    if (_adminPinResolve) _adminPinResolve(false);
    _adminPinResolve = null;
}

// ── Forgot PIN ────────────────────────────────────────────────
async function handleForgotPin() {
    if (!_selectedLoginUserId) {
        showToast(t('pleaseSelectProfile'), 'warning');
        return;
    }
    const adminResult = await showAdminPinModal();
    if (!adminResult) return;

    const user = await dbGet('users', _selectedLoginUserId);
    if (!user) {
        showToast(t('userNotFound'), 'error');
        return;
    }
    currentUser = { id: user.id, name: user.name, role: user.role, mustChangePin: user.mustChangePin, customPermissions: user.customPermissions };
    hideLockScreen();
    showChangePinModal({ title: t('forgotPinTitle'), desc: t('forgotPinDesc') });
}

// ── Quick User Switch ────────────────────────────────────────
function switchUser() {
    currentUser = null;
    sessionStorage.removeItem('userId');
    if (autoLockTimerId) {
        clearTimeout(autoLockTimerId);
        autoLockTimerId = null;
    }
    showLockScreen();
}

// ── Session Management ───────────────────────────────────────
async function refreshSession() {
    const storedUserId = sessionStorage.getItem('userId');
    if (!storedUserId) return false;

    try {
        const user = await dbGet('users', parseInt(storedUserId));
        if (user && user.active !== false) {
            currentUser = { id: user.id, name: user.name, role: user.role, mustChangePin: user.mustChangePin, customPermissions: user.customPermissions };
            lastActivityTime = Date.now();
            return true;
        }
    } catch (e) {
        console.error('Session refresh error:', e);
    }

    sessionStorage.removeItem('userId');
    return false;
}

function logout() {
    currentUser = null;
    sessionStorage.removeItem('userId');
    if (autoLockTimerId) {
        clearTimeout(autoLockTimerId);
        autoLockTimerId = null;
    }
    showLockScreen();
}

// ── Lock Screen Keyboard Support ─────────────────────────────
let _lockScreenKeyboardRegistered = false;

function setupLockScreenKeyboard() {
    if (_lockScreenKeyboardRegistered) return;
    _lockScreenKeyboardRegistered = true;

    document.addEventListener('keydown', function(e) {
        const lockScreen = document.getElementById('lock-screen');
        if (!lockScreen || !lockScreen.classList.contains('active')) return;
        const pinSection = document.getElementById('pin-input-section');
        if (!pinSection || pinSection.style.display === 'none') return;
        if (e.key >= '0' && e.key <= '9') {
            e.preventDefault();
            handleLockScreenPinKey(e.key);
        } else if (e.key === 'Backspace') {
            e.preventDefault();
            handleLockScreenPinKey('⌫');
        } else if (e.key === 'Enter') {
            e.preventDefault();
            handleLockScreenPinKey('✓');
        }
    });
}

// ── Auto-Lock Timer ──────────────────────────────────────────
function resetIdleTimer() {
    lastActivityTime = Date.now();
}

function startAutoLockTimer() {
    if (autoLockTimerId) clearTimeout(autoLockTimerId);

    autoLockTimerId = setInterval(() => {
        if (!currentUser) return;
        if (Date.now() - lastActivityTime > AUTO_LOCK_MS) {
            logout();
            showToast(t('sessionLocked'), 'info');
        }
    }, 10000);

    document.addEventListener('click', resetIdleTimer, { passive: true });
    document.addEventListener('keydown', resetIdleTimer, { passive: true });
    document.addEventListener('touchstart', resetIdleTimer, { passive: true });
    document.addEventListener('mousemove', resetIdleTimer, { passive: true });
}

// ── PIN Visibility Toggle ────────────────────────────────────
function togglePinVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.type === 'password') {
        input.type = 'text';
        if (btn) btn.textContent = '🙈';
    } else {
        input.type = 'password';
        if (btn) btn.textContent = '👁️';
    }
}

// ── Window Exports ───────────────────────────────────────────
window.hashPin = hashPin;
window.createDefaultAdmin = createDefaultAdmin;
window.showLockScreen = showLockScreen;
window.hideLockScreen = hideLockScreen;
window.selectUserForLogin = selectUserForLogin;
window.switchUser = switchUser;
window.refreshSession = refreshSession;
window.logout = logout;
window.startAutoLockTimer = startAutoLockTimer;
window.resetIdleTimer = resetIdleTimer;
window.showAdminPinModal = showAdminPinModal;
window.cancelAdminPin = cancelAdminPin;
window.showChangePinModal = showChangePinModal;
window.handleChangePinSubmit = handleChangePinSubmit;
window.handleForgotPin = handleForgotPin;
window.togglePinVisibility = togglePinVisibility;
