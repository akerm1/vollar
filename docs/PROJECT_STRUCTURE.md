# Vollar POS — Project Structure & Documentation

This document gives a complete map of the **Vollar POS** project so an AI agent (or developer) can understand and safely modify the codebase. It reflects the current source on `master` (v2.0.23).

---

## 1. Overview

- **Product:** Vollar POS — a browser-only Point of Sale (caisse) app for a fabric/textile retail shop.
- **Tech stack:** Vanilla JavaScript (no framework, no bundler, no ES modules), Electron desktop shell, IndexedDB for persistence.
- **UI language:** French. **Currency:** DA (Algerian dinar).
- **Runs by:** opening `index.html` directly, serving statically (VS Code Live Server), or via the Electron app (`npm start`).
- **Secured desktop build:** `electron/main.js` + `electron/preload.js` load `index.html` via `loadFile()`, packaged by `electron-builder` with the JS **obfuscated** so the shipped `.exe` is very hard to read.

> ℹ️ Note: the `js/` files are kept **readable** in this repo (browser source). They are grouped into feature subfolders (`js/core/`, `js/cart/`, …) for readability. The Electron desktop build obfuscates them only at packaging time via `npm run dist` — the shipped `.exe` is hard to read, but the source here stays readable for maintenance.

---

## 2. Directory Tree

```
software pos13/
├── index.html                      # Single-page app shell (loads all scripts in order)
├── README.md                       # Quick start + structure overview
├── icon.svg                        # App icon (SVG)
│
├── style.css                       # Main stylesheet
├── modern-enhancements.css         # Modern UI enhancements
├── modern-views.css                # Modern view layouts
├── classic-pos.css                 # Retro Windows-terminal POS layout styles
│
├── js/                             # ALL application logic (83 files, loaded by index.html)
│   ├── core/         # config, state, dom, utils, i18n, audio, focus, database, backup, license, restore-safety
│   ├── auth/         # auth, users, audit, permissions
│   ├── scanner/      # scanner state/search/barcode/suggestions/setup/main + barcode-aliases
│   ├── cart/         # cart state/add/ops/render/quick/router/name-style + checkout widgets
│   ├── inventory/    # product list/categories/form/delete/edit/exports + pack-conversion
│   ├── customers/    # customer list/select/form/detail/payment/debug
│   ├── transactions/ # promotions, customer-ask, transaction, payment, variants, print, zreport
│   ├── analytics/    # analytics core/UI/charts + day-export
│   ├── settings/     # settings, scanner-settings, themes, exports, keyboard
│   ├── views/        # structures, classic-pos, button-context, qr-code
│   ├── suppliers/    # suppliers, supplier-bills-hub
│   ├── expenses/     # dépenses (CRUD + catégories + récurrentes)
│   └── bootstrap/    # app init/startup/setup/welcome/update/backup
├── electron/
│   ├── main.js                     # Electron main process (secure shell)
│   └── preload.js                  # Electron preload (context bridge)
├── tools/
│   ├── verify.js                   # Sanity checker (syntax, load order, shared-context)
│   ├── build-release.js            # Build pipeline (verify → stage → obfuscate → package)
│   └── test-*.js                   # Test harnesses (restore-safety, transaction-lock, supplier-hub)
├── build/
│   ├── icon.ico                    # Windows installer/app icon
│   └── icon.png                    # Icon (PNG)
├── docs/
│   ├── PROJECT_STRUCTURE.md        # THIS document
│   ├── LISEZ-MOI.md                # French readme
│   ├── HAR.md / TODO.md            # Historical notes / roadmap
├── release/                        # Build output (installers) — gitignored
├── node_modules/                   # dev dependencies — gitignored
├── package.json                    # npm scripts + electron-builder config
└── AGENTS.md                       # Agent guidelines (this project's rules)
```

> **js/ loading note:** the `js/` files are grouped into the feature subfolders above for
> readability, but the **only thing that matters at runtime is the order of the `<script>`
> tags in `index.html` (SECTION 13)** — all 83 files load into ONE shared global scope in
> that order. Grouping does not imply load order.

---

## 3. Script Load Order (critical)

`index.html` loads all scripts from `js/` with **classic `<script>` tags in a specific order**. There are **no ES modules and no imports** — everything lives in the global scope. **Do NOT reorder** these; the order is load-order dependent (state.js must load before anything that reads settings; app-bootstrap.js loads last). Files now live in feature subfolders (`js/core/`, `js/cart/`, …) for readability, but the tag sequence in `index.html` is the only thing that matters. `node tools/verify.js` enforces this match.

The exact load order (83 files; `folder/file.js` shown for clarity):

1. `config.js` — constants
2. `state.js` — global state
3. `auth.js` — authentication/PIN
4. `users.js` — user management
5. `audit.js` — audit log
6. `permissions.js` — role permissions
7. `language-data.js` — French translations data
8. `language.js` — `t()` i18n logic
9. `dom.js` — `DOM.*` element refs
10. `utils.js` — helpers
11. `audio.js` — sounds
12. `focus.js` — scanner focus lock
13. `scanner-state.js` — scanner cache/state
14. `barcode-aliases.js` — barcode alias normalization
15. `scanner-search.js` — product fast-search
16. `scanner-barcode.js` — barcode handling
17. `scanner-suggestions.js` — dropdown UI
18. `scanner-setup.js` — input wiring
19. `scanner-main.js` — scanner entry + exports
20. `database.js` — IndexedDB layer
21. `backup.js` — backup/restore + auto-backup
22. `checkout-persist.js` — pending checkout persist
23. `cart-state.js` — cart global state
24. `cart-add.js` — add to cart
25. `cart-meter.js` — meter-quantity prompt
26. `cart-ops.js` — qty/remove/reduced price/totals
27. `cart-render.js` — cart table render
28. `cart-quick.js` — quick-customer mode
29. `fast-clients.js` — fast client list
30. `cart-router.js` — `switchView`
31. `promotions.js` — promotions
32. `customer-ask.js` — ask-customer modal
33. `transaction.js` — `completeTransaction`
34. `payment.js` — payment methods
35. `product-grid.js` — product grid
36. `quick-boxes.js` — 12 quick products
37. `inventory-list.js` — inventory table + load
38. `inventory-categories.js` — category list
39. `inventory-form.js` — add product form
40. `inventory-delete.js` — delete product
41. `inventory-edit.js` — edit modal
42. `pack-conversion.js` — unit/format conversion
43. `inventory-exports.js` — sensitive-price toggle
44. `customers-list.js` — customer list
45. `customers-select.js` — dropdown
46. `customers-form.js` — customer form
47. `customers-detail.js` — `window._customer`
48. `customers-payment.js` — debt payments
49. `customers-debug.js` — debug helpers
50. `variants.js` — product variants
51. `analytics-core.js` — analytics data/calc
52. `analytics-ui.js` — analytics UI
53. `day-export.js` — end-of-day export panel
54. `analytics-charts.js` — Canvas charts
55. `themes-data.js` — theme data
56. `themes.js` — theme engine
57. `exports.js` — CSV/full-backup export
58. `settings.js` — settings
59. `scanner-settings.js` — scanner panel + scan test
60. `structures.js` — UI structures (layouts)
61. `classic-pos.js` — retro classic POS view
62. `keyboard.js` — keyboard shortcuts
63. `button-context.js` — right-click button menu
64. `qr-code.js` — QR code generator
65. `print.js` — printing
66. `zreport.js` — Z-report
67. `suppliers.js` — fournisseurs (suppliers) + achats (purchases)
68. `expenses.js` — dépenses (expenses)
69. `app-clock.js` — live clock
70. `app-update.js` — version update check
71. `app-setup.js` — button/nav wiring
72. `app-welcome.js` — first-use wizard
73. `app-init.js` — `initApp`
74. `license-data.js` — license constants
75. `license.js` — license/activation
76. `app-bootstrap.js` — `bootstrapApp` + auto-start
77. `app-backup.js` — auto-backup + folder-handle restore

---

## 4. Per-File Functions

### Core (`js/core/`)
- **config.js** — Global constants: `DB_NAME` (`ShopPOS_v13`, version 16), `APP_VERSION`, `DEFAULT_VAT_RATE`, `DEFAULT_LOW_STOCK`, `DEFAULT_CURRENCY`, `SCAN_TIMEOUT`, `BARCODE_CONFIG`.
- **state.js** — Shared global state: `currentView`, `db`, `audioCtx`, `formInputActive`, `focusLockEnabled`, `cart`, `customers`, `suppliers`, `currentUser`, `settings`, `quickCart`. Check here before declaring new globals.
- **dom.js** — `DOM.*` cache of frequently used element references (views, buttons, tables). Avoid repeated `getElementById`.
- **utils.js** — Helpers: `escapeHtml`, number/currency formatting, misc utilities.
- **audio.js** — Sound engine: `playScan`, `playSuccess`, `playError`, `playWarning`, `playTone`.
- **focus.js** — `lockFocus()` returns focus to the scanner receiver; manages focus lock state.

### Auth / Users (`js/auth/`)
- **auth.js** — `hashPin`, `login`, `requireAdminPin`, PIN hashing. Default admin PIN `0000` with `mustChangePin:true`. PINs stored only as hashes.
- **users.js** — `loadUsers`, `renderUserList`, `loadUsers`; user CRUD.
- **permissions.js** — `hasPermission(perm)` role-based access control.
- **audit.js** — `AUDIT_ACTIONS` map (`SALE_CREATED`, `SALE_DELETED`, `SALE_EDITED`, …) + audit log recording.

### i18n (`js/core/`)
- **language-data.js** — `translations.fr` object (data only). Keys added here before the `fr` closing brace.
- **language.js** — `t(key, params)` translation, `applyLanguage()`, `formatDate()`, `getCurrency()`, `getShopName()`, `applyBrand()`.

### Scanner (`js/scanner/`)
- **scanner-state.js** — Scanner caches: `cachedProducts`, `productsCacheTimestamp`, `CACHE_TTL`, `searchResultsCache`, selected index.
- **barcode-aliases.js** — `normalizeBarcodeAliases` — normalizes scanned barcodes against alias tables.
- **scanner-search.js** — `getCachedProducts`, `fastSearch` product lookup from cache/IndexedDB.
- **scanner-barcode.js** — `getScannerPrefixes`, barcode prefix handling, barcode → product resolution.
- **scanner-suggestions.js** — `closeSuggestions`, dropdown/menu UI for scan suggestions.
- **scanner-setup.js** — `setupScannerReceiver`, wires the scanner input field.
- **scanner-main.js** — `resetScanner`, scanner entry point, exports scanner functions.

### Data / Database (`js/core/`)
- **database.js** — IndexedDB layer: `openDB()`, `dbGet(store,key)`, `dbPut(store,obj)` (auto-assigns id), `dbDelete`, `dbClear`, `dbGetAll`. Manages DB version/schema upgrade.
- **backup.js** — `createAutoBackup`, `manualBackup`, `downloadFullBackupOnRefresh`, toggle state, auto-backup interval.

### Checkout Persist (`js/cart/`)
- **checkout-persist.js** — `window.saveCheckoutPending`, `window.clearCheckoutPending`, `window.restoreCheckoutPending`; persists pending cart + fast-clients to localStorage under `vollar_checkout_pending`.

### Cart (`js/cart/`)
- **cart-state.js** — Cart globals: `window.cart`, `window.quickCart`, `quickCustomerMode`, `quickCustomerSnapshot`, meter-prompt state.
- **cart-add.js** — `addToCart`, `updateLastScannedItem`; adds products to cart (main + quick).
- **cart-meter.js** — `showMeterQuantityPrompt` — meter/decimal quantity prompt (for metre products).
- **cart-ops.js** — `updateCartQty`, remove item, reduced price, totals calculation (`updateTotals`).
- **cart-render.js** — `renderCart` — renders cart table body; additive wrappers used by classic-pos.
- **cart-quick.js** — `updateQuickCustomerLayout` — quick-customer (fast mode) toggle/layout.
- **fast-clients.js** — `fastListTotals`, fast client pre-selected list + totals.
- **cart-router.js** — `switchView(view)` — switches between checkout/inventory/customers/analytics/settings views with permission checks.

### Transactions / Payment (`js/transactions/` + `js/cart/`)
- **promotions.js** — `loadPromotions`, `window.activePromotions`, promotion application/discount logic.
- **customer-ask.js** — `openAskCustomerModal`, ask-customer flow during checkout.
- **transaction.js** — `completeTransaction(...)` — finalizes a sale (deduct stock, save sale, audit, print, refresh caches).
- **payment.js** — `DEFAULT_PAYMENT_METHODS`, payment method handling (cash/check/card/etc.).
- **product-grid.js** — Product grid rendering (`getProductImageMarkup`, grid cells); `refreshProductsCache`.
- **quick-boxes.js** — `QUICK_BOXES_COUNT` (12), quick-product boxes in checkout, persisting via `settings.quickBoxes`.

### Inventory (`js/inventory/`)
- **inventory-list.js** — `_inventorySearchQuery`, `getFilteredInventoryProducts`, `loadInventory`, `renderInventoryTable`.
- **inventory-categories.js** — `loadCategoriesList`, category management.
- **inventory-form.js** — `setupProductForm`, add-product form logic.
- **inventory-delete.js** — `deleteProduct`, restores stock on delete.
- **inventory-edit.js** — `openEditModal`, edit-product modal.
- **pack-conversion.js** — `suggestUnitName`, unit/format (mètre, pièce, etc.) conversion logic.
- **inventory-exports.js** — exports inventory; sensitive-price toggle handling.

### Customers (`js/customers/`)
- **customers-list.js** — `loadCustomers`, customer list rendering.
- **customers-select.js** — `populateCustomerSelect`, customer dropdown.
- **customers-form.js** — `setupCustomerForm`, add/edit customer form.
- **customers-detail.js** — `window._customer` object with `view()` and detail helpers.
- **customers-payment.js** — `setupPayDebtButton`, debt payment flow.
- **customers-debug.js** — `window.testCustomerDropdown`, debug/test helpers.

### Variants (`js/transactions/`)
- **variants.js** — `loadVariants(parentBarcode)`, product variant (color/size) management.

### Analytics (`js/analytics/`)
- **analytics-core.js** — Analytics data layer: `_analyticsCache`, `processedSales`, metrics computation (revenue, profit, best sellers, etc.).
- **analytics-ui.js** — Analytics dashboard UI state/rendering (`_analyticsCollapsedCache`).
- **day-export.js** — `buildDayExportPanelHtml`, end-of-day export panel.
- **analytics-charts.js** — Pure Canvas chart module (self-contained IIFE). **Do NOT split** (cohesive shared closure state).

### Themes / Structures (`js/settings/` + `js/views/`)
- **themes-data.js** — `THEMES` object (moderna, etc.) with CSS custom property variables. Data only.
- **themes.js** — Theme engine: `currentTheme`, applies CSS variables; `applyTheme`.

### Exports / Settings / Scanner settings (`js/settings/`)
- **exports.js** — `exportCSV`, `exportJSON` (full backup), `doSafeImport`, `IMPORT_STORES` (import handles suppliers/purchases).
- **backup-restore.js** — Panneau Paramètres « ♻️ Restaurer une sauvegarde » : liste les `backup_*.json` trouvés (dossier d'export horaire + Bureau), restaure via `doSafeImport` (bridge `vollarApp.readBackupFile`, desktop uniquement).
- **settings.js** — `DEFAULT_SETTINGS` (vatRate, lowStockThreshold, currency, openingFloat, shopName, `negativeStock`, `confirmClear`, `quickBoxes`).
- **scanner-settings.js** — Scanner settings panel + `setupScannerTest` live scan test.

### Classic POS / Keyboard / Button context / QR / Print / Z-report (`js/views/` + `js/settings/` + `js/transactions/`)
- **structures.js** — `STRUCTURES` (`default`, `classic`, …), `applyStructure()`, `currentStructure`, structure selector + mockups.
- **classic-pos.js** — Retro Windows-terminal POS view (self-contained IIFE) for `structure-classic`; reuses `window.cart`/`addToCart`/`completeTransaction`/`printCart`; hooks `window.onStructureChange`.
- **keyboard.js** — `setupKeyboardShortcuts`, keyboard shortcut bindings.
- **button-context.js** — Right-click menu on buttons → hide/color/shortcut/size/reset; prefs in localStorage `vollar_button_prefs`. `initButtonContext()` after all buttons built.
- **qr-code.js** — QR code generator (self-contained IIFE).
- **print.js** — Printing module (single method, no popup); `printCart`, `testPrint`.
- **zreport.js** — Z-report generation, `isDayLocked`, day locking.

### Suppliers & Expenses (`js/suppliers/` + `js/expenses/`)
- **suppliers.js** — Supplier (fournisseur) + purchase (achat) CRUD, `loadSuppliers`, reception editing. Reads from and writes to `suppliers` and `purchases` IndexedDB stores.
- **expenses.js** — Expenses (dépenses) CRUD, custom categories, payment methods, recurring monthly expenses (`recurId`), day-by-day view, CSV export. Integrated into net profit and Z-report.

### Bootstrap / App lifecycle (`js/bootstrap/`)
- **app-clock.js** — `updateClock`, live clock display.
- **app-update.js** — `getStoredAppVersion`, `LAST_VERSION_KEY`, version/update check.
- **app-setup.js** — `setupMainButtons`, button/nav wiring (clones + wires DOM buttons).
- **app-welcome.js** — `maybeShowWelcome`, first-use shop-name wizard.
- **app-init.js** — `initApp`, initializes app state, settings, cache.
- **license-data.js** — `LICENSE_CONFIG` (appName, secret, support info).
- **license.js** — License activation: `_normalizeLicense`, `requireActivation`.
- **app-bootstrap.js** — `bootstrapApp` + auto-start; opens DB, creates default admin, loads data, wires everything.
- **app-backup.js** — `buildBackupPayload`, `AUTO_BACKUP_FS_KEY`, auto-backup interval, `restoreAutoBackup` (folder-handle restore).

### Electron (`electron/`)
- **electron/main.js** — Electron main process: single-instance lock, `BrowserWindow` (1440×900, `contextIsolation`, dev-tools blocked, no menu, navigate lockdown), `loadFile('index.html')`, icon `build/icon.ico`, backup folder permissions.
- **electron/preload.js** — Context bridge exposing minimal safe APIs to the renderer.

### Tools (`tools/`)
- **tools/verify.js** — Sanity checker: (1) syntax-compiles each `js/*.js`, (2) checks `index.html` `<script>` tags match `js/` (missing/orphan files), (3) loads all scripts in-order in a shared sandbox — the real load-order test. Run via `node tools/verify.js`.
- **tools/build-release.js** — Full build pipeline: verify source → stage copy (index.html, css, js/, electron/, icons, package.json) into `_build_staging_<ts>/` → obfuscate every `js/*.js` with `javascript-obfuscator` → minify css → run `electron-builder` (junction to root `node_modules`) → output installers to `release/` (or `SAMTEX_OUTPUT`).

---

## 5. IndexedDB Data Stores

Managed by `database.js` (`dbGetAll`, `dbGet`, `dbPut`, `dbDelete`, `dbClear`). DB name `ShopPOS_v13`, version **16**.

| Store | keyPath | Purpose |
|---|---|---|
| `products` | `barcode` | Products (indexes: name, category) |
| `sales` | `id` (auto) | Completed sales (indexes: timestamp, customerId) |
| `customers` | `id` (auto) | Customers |
| `settings` | `key` | App settings (incl. backup folder handle) |
| `categories` | `name` | Product categories |
| `zreports` | `id` (auto) | Z-reports (index: date) |
| `suppliers` | `id` (auto) | Fournisseurs (suppliers) (index: name) |
| `purchases` | `id` (auto) | Achats (purchases) (index: supplierId, date) |
| `users` | `id` (auto) | Users (index: name) |
| `auditlog` | `id` (auto) | Audit log (indexes: timestamp, userId, actionType) |
| `promotions` | `id` (auto) | Promotions |
| `product_variants` | `id` (auto) | Variants (indexes: parentBarcode, barcode) |

---

## 6. Key Globals & Entry Points

- `window.cart`, `window.quickCart`, `window.quickCustomerMode` — cart state
- `settings`, `currentView`, `currentUser`, `db` — app state (from `state.js`)
- `window._productsCache` / `productsCache` — product cache (refresh via `refreshProductsCache()`) used by cart/promotions
- `window._customer`, `window.quickCart`, `window.fastClients` — customer/quick widgets
- `window.addToCart`, `window.setCartQty`, `window.completeTransaction`, `window.printCart`, `window.renderCart`, `window.switchView` — cross-file entry points (exposed at bottom of each file)

## 7. Commands

```bash
npm start            # Run the app source in Electron (loads index.html via main.js)
npm run dist         # Full secured build: verify + stage + obfuscate + electron-builder -> release/
npm run dist:source  # electron-builder on readable (non-obfuscated) source
node tools/verify.js # Sanity check: syntax, script-tag<->js/ match, load-order shared-context
npm install          # Install electron, electron-builder, javascript-obfuscator
```

---

## 8. Conventions & Rules

- **No ES modules / no imports**: use classic `<script>` tags, define top-level (or `window.`) functions; cross-file access via global scope. `window.x = fn;` at the bottom of a file to export.
- **DOM refs**: use `DOM.*` (from `dom.js`); avoid repeated `document.getElementById`.
- **i18n**: never hardcode French user-facing text — use `t('key')`; add key to `translations.fr` in `language-data.js`.
- **State globals**: before declaring a new global, check `state.js`.
- **Data layer**: async IndexedDB via `dbGetAll/dbGet/dbPut/dbDelete/dbClear`.
- **User feedback**: `showToast(message, type)` with type in `info|success|warning|error`; sounds via `playScan/playSuccess/playError/playWarning`.
- **Scanner focus**: keep `#scanner-receiver` focused; set `formInputActive = true` when a form input is active (and false on blur) so the scanner doesn't steal typing; `lockFocus()` returns focus.
- **Error handling**: wrap async in `try/catch`, `console.error`, `showToast`; keep `typeof fn === 'function'` guards where present.
- **Stock/quantity**: quantities may be decimals (unit `mètre`). Preserve decimal handling (`step="0.1"`, `parseFloat`).
- **Stock settings**: respect `settings.negativeStock` (`allow`/`prevent`/`warn`) and `settings.confirmClear`.
- **Script load order**: critical — never reorder `index.html` script tags; run `node tools/verify.js` after adding/removing a js file.
- **Do NOT modify / split**: `js/analytics/analytics-charts.js` (cohesive canvas chart module wrapped in one IIFE — shared closure state).

---

## 9. Security (Electron shell)

- DevTools shortcuts blocked (F12 / Ctrl+Shift+I/J/C / Ctrl+U), no menu, single-instance lock, `contextIsolation:true`, `sandbox:true`, `devTools:false`.
- JS obfuscated on `npm run dist`; `asar` packaging; disabled DevTools.
- User PINs stored ONLY as hashes (`pinHash`); never persist `pinPlain`. Default admin `0000` + `mustChangePin:true`.
- Honest limitation: client-side/offline code can't be literally unreadable (it must execute locally). Obfuscation + asar + disabled DevTools is the practical ceiling.