// ============================================================
// STRUCTURES: visual architectures (keeps active theme intact)
// - 'default'     = current layout (top navbar + multi-column)
// - 'alternative' = vertical sidebar + centered single-column
// Switching is done via CSS scoped under body.structure-<id>,
// so theme color tokens and typography are never overridden.
// ============================================================

const STRUCTURES = {
    default: {
        name: 'Défaut',
        description: 'Navigation en haut, caisse en deux colonnes (catalogue + résumé), actions dans l’en-tête.',
        layout: 'topnav',
        icon: '🧩'
    },
    alternative: {
        name: 'Alternative',
        description: 'Barre latérale verticale repliable, caisse centrée sur une colonne, actions regroupées en bas de barre.',
        layout: 'sidebar',
        icon: '🧊'
    },
    classic: {
        name: 'Classic',
        description: 'Terminal POS rétro type Windows 2000/XP : beige, boutons en relief, pavé numérique, grille produits.',
        layout: 'classic',
        icon: '🕹️'
    }
};

let currentStructure = 'default';

// ------------------------------------------------------------
// APPLY
// ------------------------------------------------------------
function applyStructure(structureId) {
    if (!STRUCTURES[structureId]) return;
    document.body.classList.remove('structure-default', 'structure-alternative');
    document.body.classList.add('structure-' + structureId);
    // Garder l'état replié de la barre latérale (structure alternative) :
    // applySettings() rappelle cette fonction à chaque retour sur la caisse,
    // on ne doit pas forcer la barre à se rouvrir.
    if (structureId !== 'alternative') {
        document.body.classList.remove('structure-collapsed');
    }
    currentStructure = structureId;

    // Garder la valeur en mémoire synchronisée avec ce qui est réellement appliqué :
    // sinon applyStructureFromSettings() (rappelé par applySettings() à chaque retour
    // sur la caisse) réapplique l'ancienne valeur et annule le changement en cours.
    if (typeof settings !== 'undefined') {
        settings.structure = structureId;
    }

    // Hook optionnel — permet à des modules complémentaires (ex: classic-pos.js)
    // de réagir au changement de structure (afficher/rafraîchir leurs vues).
    if (typeof window.onStructureChange === 'function') {
        try {
            window.onStructureChange(structureId);
        } catch (e) {
            console.error('onStructureChange error:', e);
        }
    }
}

function applyStructureFromSettings() {
    try {
        var s = localStorage.getItem('shoppos_structure');
        if (!s) s = (typeof settings !== 'undefined' && settings.structure) ? settings.structure : null;
        applyStructure(s && STRUCTURES[s] ? s : 'default');
    } catch (e) {
        applyStructure('default');
    }
}

async function loadSavedStructure() {
    try {
        const setting = await dbGet('settings', 'structure');
        const sid = setting ? setting.value : 'default';
        if (STRUCTURES[sid]) {
            applyStructure(sid);
            localStorage.setItem('shoppos_structure', sid);
        } else {
            applyStructure('default');
        }
    } catch (e) {
        applyStructure('default');
    }
}

async function saveStructure(structureId) {
    try {
        localStorage.setItem('shoppos_structure', structureId);
        await dbPut('settings', { key: 'structure', value: structureId });
        applyStructure(structureId);
    } catch (e) {
        console.error('Save structure error:', e);
    }
}

// ------------------------------------------------------------
// SELECTOR UI
// ------------------------------------------------------------
function _structureMockup(layout) {
    if (layout === 'sidebar') {
        return '' +
            '<div class="structure-mockup is-sidebar">' +
                '<div class="sm-rail"><span class="sm-rail-dot"></span><span class="sm-rail-dot"></span><span class="sm-rail-dot"></span></div>' +
                '<div class="sm-body">' +
                    '<div class="sm-line sm-line-wide"></div>' +
                    '<div class="sm-col"><div class="sm-block"></div><div class="sm-block sm-block-short"></div></div>' +
                '</div>' +
            '</div>';
    }
    if (layout === 'classic') {
        return '' +
            '<div class="structure-mockup is-classic">' +
                '<div class="sm-classic-bar"><span class="sm-chip"></span><span class="sm-chip"></span></div>' +
                '<div class="sm-body">' +
                    '<div class="sm-classic-col sm-classic-left">' +
                        '<div class="sm-classic-row sm-block"></div>' +
                        '<div class="sm-classic-grid"><span class="sm-classic-cell"></span><span class="sm-classic-cell"></span><span class="sm-classic-cell"></span><span class="sm-classic-cell"></span></div>' +
                    '</div>' +
                    '<div class="sm-classic-col sm-classic-right">' +
                        '<div class="sm-classic-sale"></div>' +
                        '<div class="sm-classic-pad"></div>' +
                    '</div>' +
                '</div>' +
            '</div>';
    }
    return '' +
        '<div class="structure-mockup is-topnav">' +
            '<div class="sm-top"><span class="sm-chip"></span><span class="sm-chip"></span><span class="sm-chip"></span></div>' +
            '<div class="sm-body">' +
                '<div class="sm-col"><div class="sm-block"></div><div class="sm-block sm-block-short"></div></div>' +
                '<div class="sm-col sm-col-narrow"><div class="sm-block"></div><div class="sm-block sm-block-tiny"></div></div>' +
            '</div>' +
        '</div>';
}

function renderStructureSelector() {
    const container = document.getElementById('structure-selector');
    if (!container) return;

    let html = '';
    Object.entries(STRUCTURES).forEach(function(entry) {
        const id = entry[0];
        const s = entry[1];
        const isActive = currentStructure === id;

        html += '' +
            '<div class="structure-card ' + (isActive ? 'is-active' : '') + '" data-structure="' + id + '" onclick="selectStructure(\'' + id + '\')">' +
                '<div class="structure-card-mock">' + _structureMockup(s.layout) + '</div>' +
                '<div class="structure-card-info">' +
                    '<div class="structure-card-name">' + s.icon + ' ' + s.name + '</div>' +
                    '<div class="structure-card-desc">' + s.description + '</div>' +
                '</div>' +
                (isActive ? '<span class="structure-card-check">✓ Actif</span>' : '') +
            '</div>';
    });

    container.innerHTML = html;
}

function selectStructure(structureId) {
    if (!STRUCTURES[structureId]) return;
    // Le rendu dépend de classes/scopes CSS nombreux : on recharge la page
    // automatiquement pour un rendu 100% propre, en préservant la caisse.
    if (typeof window.snapshotCart === 'function') {
        window.snapshotCart();
    }
    applyStructure(structureId);
    saveStructure(structureId);
    renderStructureSelector();
    showToast('Structure « ' + STRUCTURES[structureId].name + ' » appliquée', 'success');
    setTimeout(function() {
        window.location.reload();
    }, 300);
}

// ------------------------------------------------------------
// SIDEBAR COLLAPSE (alternative structure only)
// ------------------------------------------------------------
function toggleStructureCollapse() {
    document.body.classList.toggle('structure-collapsed');
    if (typeof logAudit === 'function') {
        logAudit('STRUCTURE_COLLAPSED', 'Sidebar collapsed: ' + document.body.classList.contains('structure-collapsed'));
    }
}



// ============================================================
// EXPOSE
// ============================================================
window.STRUCTURES = STRUCTURES;
window.applyStructure = applyStructure;
window.applyStructureFromSettings = applyStructureFromSettings;
window.loadSavedStructure = loadSavedStructure;
window.saveStructure = saveStructure;
window.renderStructureSelector = renderStructureSelector;
window.selectStructure = selectStructure;
window.toggleStructureCollapse = toggleStructureCollapse;

console.log('🏗️ Structures module loaded — ' + Object.keys(STRUCTURES).length + ' layouts');
