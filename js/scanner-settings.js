// ============================================================
// SCANNER SETTINGS — Paramètres & test de scan
// Configure les préfixes / suffixe / délai pour que tout lecteur
// USB ou Bluetooth (clavier HID) fonctionne.
// ============================================================

// ============================================================
// TEST DE SCAN (aperçu temps réel du code nettoyé)
// ============================================================
let scannerTestTimer = null;

function setupScannerTest() {
    const input = document.getElementById('scanner-test-input');
    const clean = document.getElementById('scanner-test-clean');
    if (!input || !clean) return;

    function refresh() {
        const raw = input.value;
        const cleaned = typeof cleanBarcode === 'function' ? cleanBarcode(raw) : raw.trim();
        clean.textContent = (cleaned && cleaned.length > 0) ? cleaned : '—';
    }

    // Live preview + attendre la fin d'un scan (calme de 250 ms)
    input.addEventListener('input', function () {
        refresh();
        if (scannerTestTimer) clearTimeout(scannerTestTimer);
        scannerTestTimer = setTimeout(refresh, 250);
    });

    input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (scannerTestTimer) { clearTimeout(scannerTestTimer); scannerTestTimer = null; }
            refresh();
        }
    });

    input.addEventListener('blur', refresh);
}

// ============================================================
// CODE-BARRES ÉCHANTILLON — exemple pour tester sans scanner
// ============================================================
function insertSampleScan() {
    const input = document.getElementById('scanner-test-input');
    if (!input) return;
    input.focus();
    input.value = '1234567890123';
    input.dispatchEvent(new Event('input', { bubbles: true }));
}

// ============================================================
// ENTRY POINT
// ============================================================
function initScannerSettings() {
    setupScannerTest();
    console.log('✅ Scanner settings ready');
}

// Boot (DOM static : le panneau existe déjà dans index.html)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScannerSettings);
} else {
    initScannerSettings();
}

// ============================================================
// EXPOSE GLOBALEMENT
// ============================================================
window.initScannerSettings = initScannerSettings;
window.insertSampleScan    = insertSampleScan;