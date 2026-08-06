// ============================================================
// THEME ENGINE
// ============================================================

let currentTheme = 'moderna';
let _themeStyleEl = null;
let _themeDecorEl = null;

function _getThemeStyleEl() {
    if (!_themeStyleEl) {
        _themeStyleEl = document.createElement('style');
        _themeStyleEl.id = 'theme-overrides';
        document.head.appendChild(_themeStyleEl);
    }
    return _themeStyleEl;
}

function _getThemeDecorEl() {
    if (!_themeDecorEl) {
        _themeDecorEl = document.getElementById('theme-decor');
        if (!_themeDecorEl) {
            _themeDecorEl = document.createElement('div');
            _themeDecorEl.id = 'theme-decor';
            _themeDecorEl.setAttribute('aria-hidden', 'true');
            document.body.appendChild(_themeDecorEl);
        }
    }
    return _themeDecorEl;
}

function applyTheme(themeId) {
    const theme = THEMES[themeId];
    if (!theme) return;

    const root = document.documentElement;
    Object.entries(theme.vars).forEach(function([prop, val]) {
        root.style.setProperty(prop, val);
    });

    // style.css utilise en parallèle des variables CSS "legacy" ("--theme-*").
    // Les thèmes POS les définissent, mais les thèmes classiques (moderna,
    // forest, minimal) non : si on ne les réécrit pas ici, les valeurs
    // laissées par le thème précédent continuent de s'appliquer (ex. passer de
    // "square" à "moderna" gardait --theme-secondary/#E7E7E7 etc. de square),
    // et le rendu restait incohérent tant qu'on ne rechargait pas la page.
    // On les dérive donc toujours depuis les couleurs du thème actif.
    var primary = theme.vars['--primary'] || '#6C63FF';
    var primaryDark = theme.vars['--primary-dark'] || primary;
    var legacyVars = {
        '--theme-primary': theme.vars['--theme-primary'] || primary,
        '--theme-secondary': theme.vars['--theme-secondary'] || primaryDark,
        '--theme-text': theme.vars['--theme-text'] || '#1A1A2E',
        '--theme-border': theme.vars['--theme-border'] || '#DDE1E6',
        '--theme-card': theme.vars['--theme-card'] || theme.vars['--card-bg'] || '#FFFFFF',
        '--theme-bg': theme.vars['--theme-bg'] || theme.vars['--bg'] || '#F0F2F5',
        '--theme-gradient': theme.vars['--theme-gradient'] || theme.vars['--primary-gradient'] || primary
    };
    Object.keys(legacyVars).forEach(function(prop) {
        root.style.setProperty(prop, legacyVars[prop]);
    });

    document.body.className = document.body.className.replace(/theme-\w+/g, '').trim();
    document.body.classList.add('theme-' + themeId);

    const styleEl = _getThemeStyleEl();
    styleEl.textContent = theme.css || '';

    _getThemeDecorEl().innerHTML = theme.decor || '';

    document.body.style.background = theme.vars['--body-bg'] || '';

    currentTheme = themeId;
    if (typeof settings !== 'undefined') {
        settings.theme = themeId;
    }
}

function applyThemeFromSettings() {
    try {
        // Au premier lancement (aucun thème sauvegardé en localStorage, ni en base),
        // on applique quand même le thème par défaut pour éviter un rendu "brut"
        // (fond blanc) tant que l'utilisateur n'a pas cliqué sur un thème.
        const saved = localStorage.getItem('shoppos_theme');
        let id = (saved && THEMES[saved]) ? saved
               : (typeof settings !== 'undefined' && settings && THEMES[settings.theme]) ? settings.theme
               : 'moderna';
        if (THEMES[id]) {
            applyTheme(id);
            if (id !== saved) {
                try { localStorage.setItem('shoppos_theme', id); } catch (e) {}
            }
        }
    } catch (e) {}
}

async function saveTheme(themeId) {
    try {
        localStorage.setItem('shoppos_theme', themeId);
        await dbPut('settings', { key: 'theme', value: themeId });
        applyTheme(themeId);
    } catch (e) {
        console.error('Save theme error:', e);
    }
}

async function loadSavedTheme() {
    try {
        const setting = await dbGet('settings', 'theme');
        const themeId = setting ? setting.value : 'moderna';
        if (THEMES[themeId]) {
            applyTheme(themeId);
            localStorage.setItem('shoppos_theme', themeId);
        }
    } catch (e) {
        applyTheme('moderna');
    }
}

const themePreviews = {
    moderna:    { icon: '✨', gradient: 'linear-gradient(135deg, #667eea, #764ba2)' },
    forest:     { icon: '🌿', gradient: 'linear-gradient(135deg, #059669, #047857)' },
    minimal:    { icon: '◼',  gradient: 'linear-gradient(135deg, #171717, #404040)' },
    shopify:    { icon: '🛍', gradient: 'linear-gradient(135deg, #008060, #005A40)' },
    toast:      { icon: '🍞', gradient: 'linear-gradient(135deg, #FF6F20, #D94B0A)' },
    lightspeed: { icon: '⚡', gradient: 'linear-gradient(135deg, #2F5BEA, #1E2E7A)' },
    ruby:       { icon: '💎', gradient: 'linear-gradient(135deg, #C0392B, #8E2C21)' },
    azur:       { icon: '🌊', gradient: 'linear-gradient(135deg, #1D7FD6, #0F5AA8)' },
    nuit:       { icon: '🌙', gradient: 'linear-gradient(135deg, #7C8CF8, #5A68D6)' },
    terre:      { icon: '🏺', gradient: 'linear-gradient(135deg, #C86A2B, #9C4F1D)' }
};

const themeGroups = {
    classic: ['moderna', 'forest', 'minimal', 'ruby', 'azur', 'nuit', 'terre'],
    pos: ['shopify', 'toast', 'lightspeed']
};

const themeGroupLabels = {
    classic: '🎨 Classiques',
    pos: '💳 POS modernes'
};

function _themeGroupOf(themeId) {
    for (var g in themeGroups) {
        if (themeGroups[g].indexOf(themeId) !== -1) return g;
    }
    return null;
}

function _updateAppearanceHero(themeId) {
    const theme = THEMES[themeId];
    const hero = document.getElementById('appearance-hero');
    if (!hero || !theme) return;

    const nameEl = document.getElementById('appearance-theme-name');
    const descEl = document.getElementById('appearance-theme-desc');
    if (nameEl) nameEl.textContent = theme.name;
    if (descEl) descEl.textContent = theme.description;

    hero.style.setProperty('--appearance-hero-grad', theme.vars['--header-bg'] || theme.vars['--primary-gradient'] || '#666666');

    const swatches = {
        'appearance-swatch-primary': theme.vars['--primary'],
        'appearance-swatch-accent': theme.vars['--accent'],
        'appearance-swatch-success': theme.vars['--success'],
        'appearance-swatch-bg': theme.vars['--bg']
    };
    Object.keys(swatches).forEach(function(sid) {
        const el = document.getElementById(sid);
        if (el) el.style.background = swatches[sid];
    });

    const badges = document.getElementById('appearance-hero-badges');
    if (badges) {
        const group = _themeGroupOf(themeId);
        const label = group === 'classic' ? 'Thème classique' : group === 'pos' ? 'Thème POS' : 'Thème';
        badges.innerHTML = '<span class="appearance-hero-badge">' + label + '</span>';
    }
}

function _previewRadius(theme) {
    var r = parseInt(theme.vars['--radius'], 10);
    if (isNaN(r)) return 14;
    return Math.min(Math.max(r, 0), 24);
}

function renderThemeSelector() {
    const container = document.getElementById('theme-selector');
    if (!container) return;

    let html = '';

    Object.entries(THEMES).forEach(function(entry) {
        var id = entry[0];
        var theme = entry[1];
        var isActive = currentTheme === id;
        var group = _themeGroupOf(id);
        var p = themePreviews[id] || { icon: '🎨', gradient: theme.vars['--primary-gradient'] || '#666666' };
        var radius = _previewRadius(theme);
        var borderColor = isActive ? theme.vars['--primary'] : '#e2e2e2';

        html += `
        <div class="theme-card theme-card-${id}" data-theme="${id}" onclick="selectTheme('${id}')" title="${theme.name} — ${theme.description}" style="
            border:2px solid ${borderColor};
            border-radius:${radius}px;overflow:hidden;cursor:pointer;
            transition:all 0.25s ease;position:relative;background:#ffffff;
            ${isActive ? 'box-shadow:0 0 0 3px ' + theme.vars['--primary'] + '22;' : ''}
        " onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='${isActive ? '0 0 0 3px ' + theme.vars['--primary'] + '22' : ''}, 0 12px 32px rgba(0,0,0,0.12)'" onmouseout="this.style.transform='';this.style.boxShadow='${isActive ? '0 0 0 3px ' + theme.vars['--primary'] + '22' : ''}'">
            <div style="height:64px;background:${p.gradient};display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;flex-shrink:0;">
                <span style="position:relative;z-index:1;font-size:26px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.25));">${p.icon}</span>
            </div>
            <div style="padding:12px 14px 14px;background:#ffffff;display:flex;flex-direction:column;flex:1;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <span style="font-weight:800;font-size:13.5px;color:${theme.vars['--primary']};letter-spacing:-0.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${theme.name}</span>
                    <span class="theme-card-badge ${group === 'pos' ? 'is-pos' : 'is-classic'}">${group === 'pos' ? 'POS' : 'Classique'}</span>
                </div>
                <div style="font-size:11px;color:#8a8f9c;margin-top:4px;line-height:1.35;">${theme.description}</div>
                <div style="display:flex;gap:6px;margin-top:auto;padding-top:12px;">
                    ${[theme.vars['--primary'], theme.vars['--accent'], theme.vars['--success'], theme.vars['--danger']].map(function(c) {
                        return '<span style="flex:1;height:8px;border-radius:4px;background:' + c + ';border:1px solid rgba(0,0,0,0.06);"></span>';
                    }).join('')}
                </div>
            </div>
            ${isActive ? '<div style="position:absolute;top:10px;right:10px;background:' + theme.vars['--primary'] + ';color:white;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:11px;box-shadow:0 2px 8px rgba(0,0,0,0.2);font-weight:700;">✓</div>' : ''}
        </div>`;
    });

    container.innerHTML = html;

    _updateAppearanceHero(currentTheme);
}

function selectTheme(themeId) {
    if (!THEMES[themeId]) return;
    // Recharge la page automatiquement pour un rendu propre, caisse préservée.
    if (typeof window.snapshotCart === 'function') {
        window.snapshotCart();
    }
    applyTheme(themeId);
    saveTheme(themeId);
    renderThemeSelector();
    showToast('Thème « ' + THEMES[themeId].name + ' » appliqué', 'success');
    setTimeout(function() {
        window.location.reload();
    }, 300);
}

// ============================================================
// EXPOSE
// ============================================================
window.THEMES = THEMES;
window.applyTheme = applyTheme;
window.applyThemeFromSettings = applyThemeFromSettings;
window.loadSavedTheme = loadSavedTheme;
window.saveTheme = saveTheme;
window.renderThemeSelector = renderThemeSelector;
window.selectTheme = selectTheme;

console.log('🎨 Themes module loaded with ' + Object.keys(THEMES).length + ' themes');
