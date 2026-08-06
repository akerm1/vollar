// ============================================================
// SCANNER.JS - Complete rewrite
// 
// Architecture:
//   #scanner-receiver  (hidden input, always focused)
//     → receives ALL physical scanner input
//     → on Enter or timeout: direct DB lookup → addToCart
//
//   #manual-barcode  (visible search box)
//     → keyboard typing only
//     → shows live search dropdown
//     → Enter / click on suggestion → addToCart
//
//   Global redirect:
//     → if a printable key fires while focus is NOT on
//       scanner-receiver or manual-barcode, redirect to
//       scanner-receiver so scans never get lost
// ============================================================

// ============================================================
// STATE
// ============================================================
let cachedProducts        = [];
let productsCacheTimestamp = 0;
const CACHE_TTL            = 30000;
let searchResultsCache     = new Map();
let selectedSuggestionIndex = -1;
let searchDebounceTimer    = null;
let barcodeInputTimer      = null;
const BARCODE_TIMEOUT      = 120;   // ms to wait after last scanner char
const SEARCH_DEBOUNCE      = 80;    // ms debounce for live search
let isTypingMode          = false; // true when user is typing letters (search mode)
let keyboardRedirectActive = true;

function getScannerTimeout() {
    if (typeof settings !== 'undefined' && settings && settings.scannerTimeout) {
        const t = parseInt(settings.scannerTimeout, 10);
        if (!isNaN(t) && t > 0) return t;
    }
    return BARCODE_TIMEOUT;
}
