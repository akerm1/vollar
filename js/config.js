// ============================================================
// CONFIG: Configuration & Constants
// ============================================================
const DB_NAME = 'ShopPOS_v13';
const DB_VERSION = 15;
const APP_VERSION = '1.0.0';
const DEFAULT_VAT_RATE = 19;
const DEFAULT_LOW_STOCK = 5;
const DEFAULT_CURRENCY = 'DA';
const SCAN_TIMEOUT = 250;
const MAX_SCAN_LENGTH = 50;
const MIN_SCAN_LENGTH = 2;
const BACKUP_KEY = 'shoppos_autobackup';

// Auth constants
const AUTO_LOCK_MS = 300000;        // 5 minutes inactivity auto-lock
const LOCKOUT_ATTEMPTS = 3;         // Wrong PIN attempts before lockout
const LOCKOUT_MS = 30000;           // 30 seconds lockout duration
const ROLES = { admin: 'admin', caissier: 'caissier', gerant: 'gerant' };

// Barcode configuration
const BARCODE_CONFIG = {
    prefixes: ['\u001d', '\u001e', '\u001f', ']C1', ']C0', ']E0', 'P'],
    suffixes: ['\r', '\n', '\t'],
    allowedChars: /[A-Za-z0-9\-_\.]/g,
    minLength: 2,
    maxLength: 50
};