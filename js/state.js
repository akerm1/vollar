// ============================================================
// STATE: Application State
// ============================================================
let currentView = 'checkout';
let cart = [];
let db = null;
let audioCtx = null;
let isProcessingScan = false;
let formInputActive = false;
let focusLockEnabled = true;
let editingBarcode = null;
let customers = [];
let suppliers = [];
let purchases = [];
let viewingCustomerId = null;
let isInitialized = false;
let scannerReady = true;
let paymentStatus = 'paid';
let paymentMethod = 'especes';
let currentUser = null;  // Active session: { id, name, role }
let lastActivityTime = Date.now();
let autoLockTimerId = null;
let customerAskShown = false;  // 1ère vente sans client → nudge sélection client
let askCustomerModalOpen = false;  // le modal de sélection client est ouvert

let settings = {
    vatRate: DEFAULT_VAT_RATE,
    lowStockThreshold: DEFAULT_LOW_STOCK,
    currency: DEFAULT_CURRENCY
};

// Scanner state
let scanBuffer = '';
let scanTimer = null;
let isScanning = false;
let scanStartTime = 0;
let consecutiveScans = 0;
let lastBarcode = '';
let scanLock = false;
let lastKeyTime = 0;

