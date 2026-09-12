# Vollar POS â€” Project Structure & Documentation

This document gives a complete map of the **Vollar POS** project so an AI agent (or developer) can understand and safely modify the codebase. It reflects the current source on `master` (v2.0.24).

---

## 1. Overview

- **Product:** Vollar POS â€” a browser-only Point of Sale (caisse) app for a fabric/textile retail shop.
- **Tech stack:** Vanilla JavaScript (no framework, no bundler, no ES modules), Electron desktop shell, IndexedDB for persistence.
- **UI language:** French. **Currency:** DA (Algerian dinar).
- **Runs by:** opening `index.html` directly, serving statically (VS Code Live Server), or via the Electron app (`npm start`).
- **Secured desktop build:** `electron/main.js` + `electron/preload.js` load `index.html` via `loadFile()`, packaged by `electron-builder` with the JS **obfuscated** so the shipped `.exe` is very hard to read.

> â„¹ï¸ Note: the `js/` files are kept **readable** in this repo (browser source). They are grouped into feature subfolders (`js/core/`, `js/cart/`, â€¦) for readability. The Electron desktop build obfuscates them only at packaging time via `npm run dist` â€” the shipped `.exe` is hard to read, but the source here stays readable for maintenance.

---

## 2. Directory Tree

```
software pos13/
â”œâ”€â”€ index.html                      # Single-page app shell (loads all scripts in order)
â”œâ”€â”€ README.md                       # Quick start + structure overview
â”œâ”€â”€ icon.svg                        # App icon (SVG)
â”‚
â”œâ”€â”€ style.css                       # Main stylesheet
â”œâ”€â”€ modern-enhancements.css         # Modern UI enhancements
â”œâ”€â”€ modern-views.css                # Modern view layouts
â”œâ”€â”€ classic-pos.css                 # Retro Windows-terminal POS layout styles
â”‚
â”œâ”€â”€ js/                             # ALL application logic (83 files, loaded by index.html)
â”‚   â”œâ”€â”€ core/         # config, state, dom, utils, i18n, audio, focus, database, backup, license, restore-safety
â”‚   â”œâ”€â”€ auth/         # auth, users, audit, permissions
â”‚   â”œâ”€â”€ scanner/      # scanner state/search/barcode/suggestions/setup/main + barcode-aliases
â”‚   â”œâ”€â”€ cart/         # cart state/add/ops/render/quick/router/name-style + checkout widgets
â”‚   â”œâ”€â”€ inventory/    # product list/categories/form/delete/edit/exports + pack-conversion
â”‚   â”œâ”€â”€ customers/    # customer list/select/form/detail/payment/debug
â”‚   â”œâ”€â”€ transactions/ # promotions, customer-ask, transaction, payment, variants, print, zreport
â”‚   â”œâ”€â”€ analytics/    # analytics core/UI/charts + day-export
â”‚   â”œâ”€â”€ settings/     # settings, scanner-settings, themes, exports, keyboard
â”‚   â”œâ”€â”€ views/        # structures, classic-pos, button-context, qr-code
â”‚   â”œâ”€â”€ suppliers/    # suppliers, supplier-bills-hub
â”‚   â”œâ”€â”€ expenses/     # dÃ©penses (CRUD + catÃ©gories + rÃ©currentes)
â”‚   â””â”€â”€ bootstrap/    # app init/startup/setup/welcome/update/backup
â”œâ”€â”€ electron/
â”‚   â”œâ”€â”€ main.js                     # Electron main process (secure shell)
â”‚   â””â”€â”€ preload.js                  # Electron preload (context bridge)
â”œâ”€â”€ tools/
â”‚   â”œâ”€â”€ verify.js                   # Sanity checker (syntax, load order, shared-context)
â”‚   â”œâ”€â”€ build-release.js            # Build pipeline (verify â†’ stage â†’ obfuscate â†’ package)
â”‚   â””â”€â”€ test-*.js                   # Test harnesses (restore-safety, transaction-lock, supplier-hub)
â”œâ”€â”€ build/
â”‚   â”œâ”€â”€ icon.ico                    # Windows installer/app icon
â”‚   â””â”€â”€ icon.png                    # Icon (PNG)
â”œâ”€â”€ docs/
â”‚   â”œâ”€â”€ PROJECT_STRUCTURE.md        # THIS document
â”‚   â”œâ”€â”€ LISEZ-MOI.md                # French readme
â”‚   â”œâ”€â”€ HAR.md / TODO.md            # Historical notes / roadmap
â”œâ”€â”€ release/                        # Build output (installers) â€” gitignored
â”œâ”€â”€ node_modules/                   # dev dependencies â€” gitignored
â”œâ”€â”€ package.json                    # npm scripts + electron-builder config
â””â”€â”€ AGENTS.md                       # Agent guidelines (this project's rules)
```

> **js/ loading note:** the `js/` files are grouped into the feature subfolders above for
> readability, but the **only thing that matters at runtime is the order of the `<script>`
> tags in `index.html` (SECTION 13)** â€” all 83 files load into ONE shared global scope in
> that order. Grouping does not imply load order.

---

## 3. Script Load Order (critical)

`index.html` loads all scripts from `js/` with **classic `<script>` tags in a specific order**. There are **no ES modules and no imports** â€” everything lives in the global scope. **Do NOT reorder** these; the order is load-order dependent (state.js must load before anything that reads settings; app-bootstrap.js loads last). Files now live in feature subfolders (`js/core/`, `js/cart/`, â€¦) for readability, but the tag sequence in `index.html` is the only thing that matters. `node tools/verify.js` enforces this match.

The exact load order (83 files; `folder/file.js` shown for clarity):

1. `config.js` â€” constants
2. `state.js` â€” global state
3. `auth.js` â€” authentication/PIN
4. `users.js` â€” user management
5. `audit.js` â€” audit log
6. `permissions.js` â€” role permissions
7. `language-data.js` â€” French translations data
8. `language.js` â€” `t()` i18n logic
9. `dom.js` â€” `DOM.*` element refs
10. `utils.js` â€” helpers
11. `audio.js` â€” sounds
12. `focus.js` â€” scanner focus lock
13. `scanner-state.js` â€” scanner cache/state
14. `barcode-aliases.js` â€” barcode alias normalization
15. `scanner-search.js` â€” product fast-search
16. `scanner-barcode.js` â€” barcode handling
17. `scanner-suggestions.js` â€” dropdown UI
18. `scanner-setup.js` â€” input wiring
19. `scanner-main.js` â€” scanner entry + exports
20. `database.js` â€” IndexedDB layer
21. `backup.js` â€” backup/restore + auto-backup
22. `checkout-persist.js` â€” pending checkout persist
23. `cart-state.js` â€” cart global state
24. `cart-add.js` â€” add to cart
25. `cart-meter.js` â€” meter-quantity prompt
26. `cart-ops.js` â€” qty/remove/reduced price/totals
27. `cart-render.js` â€” cart table render
28. `cart-quick.js` â€” quick-customer mode
29. `fast-clients.js` â€” fast client list
30. `cart-router.js` â€” `switchView`
31. `promotions.js` â€” promotions
32. `customer-ask.js` â€” ask-customer modal
33. `transaction.js` â€” `completeTransaction`
34. `payment.js` â€” payment methods
35. `product-grid.js` â€” product grid
36. `quick-boxes.js` â€” 12 quick products
37. `inventory-list.js` â€” inventory table + load
38. `inventory-categories.js` â€” category list
39. `inventory-form.js` â€” add product form
40. `inventory-delete.js` â€” delete product
41. `inventory-edit.js` â€” edit modal
42. `pack-conversion.js` â€” unit/format conversion
43. `inventory-exports.js` â€” sensitive-price toggle
44. `customers-list.js` â€” customer list
45. `customers-select.js` â€” dropdown
46. `customers-form.js` â€” customer form
47. `customers-detail.js` â€” `window._customer`
48. `customers-payment.js` â€” debt payments
49. `customers-debug.js` â€” debug helpers
50. `variants.js` â€” product variants
51. `analytics-core.js` â€” analytics data/calc
52. `analytics-ui.js` â€” analytics UI
53. `day-export.js` â€” end-of-day export panel
54. `analytics-charts.js` â€” Canvas charts
55. `themes-data.js` â€” theme data
56. `themes.js` â€” theme engine
57. `exports.js` â€” CSV/full-backup export
58. `settings.js` â€” settings
59. `scanner-settings.js` â€” scanner panel + scan test
60. `structures.js` â€” UI structures (layouts)
61. `classic-pos.js` â€” retro classic POS view
62. `keyboard.js` â€” keyboard shortcuts
63. `button-context.js` â€” right-click button menu
64. `qr-code.js` â€” QR code generator
65. `print.js` â€” printing
66. `zreport.js` â€” Z-report
67. `suppliers.js` â€” fournisseurs (suppliers) + achats (purchases)
68. `expenses.js` â€” dÃ©penses (expenses)
69. `app-clock.js` â€” live clock
70. `app-update.js` â€” version update check
71. `app-setup.js` â€” button/nav wiring
72. `app-welcome.js` â€” first-use wizard
73. `app-init.js` â€” `initApp`
74. `license-data.js` â€” license constants
75. `license.js` â€” license/activation
76. `app-bootstrap.js` â€” `bootstrapApp` + auto-start
77. `app-backup.js` â€” auto-backup + folder-handle restore

---

## 4. Per-File Functions

### Core (`js/core/`)
- **config.js** â€” Global constants: `DB_NAME` (`ShopPOS_v13`, version 16), `APP_VERSION`, `DEFAULT_VAT_RATE`, `DEFAULT_LOW_STOCK`, `DEFAULT_CURRENCY`, `SCAN_TIMEOUT`, `BARCODE_CONFIG`.
- **state.js** â€” Shared global state: `currentView`, `db`, `audioCtx`, `formInputActive`, `focusLockEnabled`, `cart`, `customers`, `suppliers`, `currentUser`, `settings`, `quickCart`. Check here before declaring new globals.
- **dom.js** â€” `DOM.*` cache of frequently used element references (views, buttons, tables). Avoid repeated `getElementById`.
- **utils.js** â€” Helpers: `escapeHtml`, number/currency formatting, misc utilities.
- **audio.js** â€” Sound engine: `playScan`, `playSuccess`, `playError`, `playWarning`, `playTone`.
- **focus.js** â€” `lockFocus()` returns focus to the scanner receiver; manages focus lock state.

### Auth / Users (`js/auth/`)
- **auth.js** â€” `hashPin`, `login`, `requireAdminPin`, PIN hashing. Default admin PIN `0000` with `mustChangePin:true`. PINs stored only as hashes.
- **users.js** â€” `loadUsers`, `renderUserList`, `loadUsers`; user CRUD.
- **permissions.js** â€” `hasPermission(perm)` role-based access control.
- **audit.js** â€” `AUDIT_ACTIONS` map (`SALE_CREATED`, `SALE_DELETED`, `SALE_EDITED`, â€¦) + audit log recording.

### i18n (`js/core/`)
- **language-data.js** â€” `translations.fr` object (data only). Keys added here before the `fr` closing brace.
- **language.js** â€” `t(key, params)` translation, `applyLanguage()`, `formatDate()`, `getCurrency()`, `getShopName()`, `applyBrand()`.

### Scanner (`js/scanner/`)
- **scanner-state.js** â€” Scanner caches: `cachedProducts`, `productsCacheTimestamp`, `CACHE_TTL`, `searchResultsCache`, selected index.
- **barcode-aliases.js** â€” `normalizeBarcodeAliases` â€” normalizes scanned barcodes against alias tables.
- **scanner-search.js** â€” `getCachedProducts`, `fastSearch` product lookup from cache/IndexedDB.
- **scanner-barcode.js** â€” `getScannerPrefixes`, barcode prefix handling, barcode â†’ product resolution.
- **scanner-suggestions.js** â€” `closeSuggestions`, dropdown/menu UI for scan suggestions.
- **scanner-setup.js** â€” `setupScannerReceiver`, wires the scanner input field.
- **scanner-main.js** â€” `resetScanner`, scanner entry point, exports scanner functions.

### Data / Database (`js/core/`)
- **database.js** â€” IndexedDB layer: `openDB()`, `dbGet(store,key)`, `dbPut(store,obj)` (auto-assigns id), `dbDelete`, `dbClear`, `dbGetAll`. Manages DB version/schema upgrade.
- **backup.js** â€” `createAutoBackup`, `manualBackup`, `downloadFullBackupOnRefresh`, toggle state, auto-backup interval.

### Checkout Persist (`js/cart/`)
- **checkout-persist.js** â€” `window.saveCheckoutPending`, `window.clearCheckoutPending`, `window.restoreCheckoutPending`; persists pending cart + fast-clients to localStorage under `vollar_checkout_pending`.

### Cart (`js/cart/`)
- **cart-state.js** â€” Cart globals: `window.cart`, `window.quickCart`, `quickCustomerMode`, `quickCustomerSnapshot`, meter-prompt state.
- **cart-add.js** â€” `addToCart`, `updateLastScannedItem`; adds products to cart (main + quick).
- **cart-meter.js** â€” `showMeterQuantityPrompt` â€” meter/decimal quantity prompt (for metre products).
- **cart-ops.js** â€” `updateCartQty`, remove item, reduced price, totals calculation (`updateTotals`).
- **cart-render.js** â€” `renderCart` â€” renders cart table body; additive wrappers used by classic-pos.
- **cart-quick.js** â€” `updateQuickCustomerLayout` â€” quick-customer (fast mode) toggle/layout.
- **fast-clients.js** â€” `fastListTotals`, fast client pre-selected list + totals.
- **cart-router.js** â€” `switchView(view)` â€” switches between checkout/inventory/customers/analytics/settings views with permission checks.

### Transactions / Payment (`js/transactions/` + `js/cart/`)
- **promotions.js** â€” `loadPromotions`, `window.activePromotions`, promotion application/discount logic.
- **customer-ask.js** â€” `openAskCustomerModal`, ask-customer flow during checkout.
- **transaction.js** â€” `completeTransaction(...)` â€” finalizes a sale (deduct stock, save sale, audit, print, refresh caches).
- **payment.js** â€” `DEFAULT_PAYMENT_METHODS`, payment method handling (cash/check/card/etc.).
- **product-grid.js** â€” Product grid rendering (`getProductImageMarkup`, grid cells); `refreshProductsCache`.
- **quick-boxes.js** â€” `QUICK_BOXES_COUNT` (12), quick-product boxes in checkout, persisting via `settings.quickBoxes`.

### Inventory (`js/inventory/`)
- **inventory-list.js** â€” `_inventorySearchQuery`, `getFilteredInventoryProducts`, `loadInventory`, `renderInventoryTable`.
- **inventory-categories.js** â€” `loadCategoriesList`, category management.
- **inventory-form.js** â€” `setupProductForm`, add-product form logic.
- **inventory-delete.js** â€” `deleteProduct`, restores stock on delete.
- **inventory-edit.js** â€” `openEditModal`, edit-product modal.
- **pack-conversion.js** â€” `suggestUnitName`, unit/format (mÃ¨tre, piÃ¨ce, etc.) conversion logic.
- **inventory-exports.js** â€” exports inventory; sensitive-price toggle handling.

### Customers (`js/customers/`)
- **customers-list.js** â€” `loadCustomers`, customer list rendering.
- **customers-select.js** â€” `populateCustomerSelect`, customer dropdown.
- **customers-form.js** â€” `setupCustomerForm`, add/edit customer form.
- **customers-detail.js** â€” `window._customer` object with `view()` and detail helpers.
- **customers-payment.js** â€” `setupPayDebtButton`, debt payment flow.
- **customers-debug.js** â€” `window.testCustomerDropdown`, debug/test helpers.

### Variants (`js/transactions/`)
- **variants.js** â€” `loadVariants(parentBarcode)`, product variant (color/size) management.

### Analytics (`js/analytics/`)
- **analytics-core.js** â€” Analytics data layer: `_analyticsCache`, `processedSales`, metrics computation (revenue, profit, best sellers, etc.).
- **analytics-ui.js** â€” Analytics dashboard UI state/rendering (`_analyticsCollapsedCache`).
- **day-export.js** â€” `buildDayExportPanelHtml`, end-of-day export panel.
- **analytics-charts.js** â€” Pure Canvas chart module (self-contained IIFE). **Do NOT split** (cohesive shared closure state).

### Themes / Structures (`js/settings/` + `js/views/`)
- **themes-data.js** â€” `THEMES` object (moderna, etc.) with CSS custom property variables. Data only.
- **themes.js** â€” Theme engine: `currentTheme`, applies CSS variables; `applyTheme`.

### Exports / Settings / Scanner settings (`js/settings/`)
- **exports.js** â€” `exportCSV`, `exportJSON` (full backup), `doSafeImport`, `IMPORT_STORES` (import handles suppliers/purchases).
- **backup-restore.js** â€” Panneau ParamÃ¨tres Â« â™»ï¸ Restaurer une sauvegarde Â» : liste les `backup_*.json` trouvÃ©s (dossier d'export horaire + Bureau), restaure via `doSafeImport` (bridge `vollarApp.readBackupFile`, desktop uniquement).
- **settings.js** â€” `DEFAULT_SETTINGS` (vatRate, lowStockThreshold, currency, openingFloat, shopName, `negativeStock`, `confirmClear`, `quickBoxes`).
- **scanner-settings.js** â€” Scanner settings panel + `setupScannerTest` live scan test.

### Classic POS / Keyboard / Button context / QR / Print / Z-report (`js/views/` + `js/settings/` + `js/transactions/`)
- **structures.js** â€” `STRUCTURES` (`default`, `classic`, â€¦), `applyStructure()`, `currentStructure`, structure selector + mockups.
- **classic-pos.js** â€” Retro Windows-terminal POS view (self-contained IIFE) for `structure-classic`; reuses `window.cart`/`addToCart`/`completeTransaction`/`printCart`; hooks `window.onStructureChange`.
- **keyboard.js** â€” `setupKeyboardShortcuts`, keyboard shortcut bindings.
- **button-context.js** â€” Right-click menu on buttons â†’ hide/color/shortcut/size/reset; prefs in localStorage `vollar_button_prefs`. `initButtonContext()` after all buttons built.
- **qr-code.js** â€” QR code generator (self-contained IIFE).
- **print.js** â€” Printing module (single method, no popup); `printCart`, `testPrint`.
- **zreport.js** â€” Z-report generation, `isDayLocked`, day locking.

### Suppliers & Expenses (`js/suppliers/` + `js/expenses/`)
- **suppliers.js** â€” Supplier (fournisseur) + purchase (achat) CRUD, `loadSuppliers`, reception editing. Reads from and writes to `suppliers` and `purchases` IndexedDB stores.
- **expenses.js** â€” Expenses (dÃ©penses) CRUD, custom categories, payment methods, recurring monthly expenses (`recurId`), day-by-day view, CSV export. Integrated into net profit and Z-report.

### Bootstrap / App lifecycle (`js/bootstrap/`)
- **app-clock.js** â€” `updateClock`, live clock display.
- **app-update.js** â€” `getStoredAppVersion`, `LAST_VERSION_KEY`, version/update check.
- **app-setup.js** â€” `setupMainButtons`, button/nav wiring (clones + wires DOM buttons).
- **app-welcome.js** â€” `maybeShowWelcome`, first-use shop-name wizard.
- **app-init.js** â€” `initApp`, initializes app state, settings, cache.
- **license-data.js** â€” `LICENSE_CONFIG` (appName, secret, support info).
- **license.js** â€” License activation: `_normalizeLicense`, `requireActivation`.
- **app-bootstrap.js** â€” `bootstrapApp` + auto-start; opens DB, creates default admin, loads data, wires everything.
- **app-backup.js** â€” `buildBackupPayload`, `AUTO_BACKUP_FS_KEY`, auto-backup interval, `restoreAutoBackup` (folder-handle restore).

### Electron (`electron/`)
- **electron/main.js** â€” Electron main process: single-instance lock, `BrowserWindow` (1440Ã—900, `contextIsolation`, dev-tools blocked, no menu, navigate lockdown), `loadFile('index.html')`, icon `build/icon.ico`, backup folder permissions.
- **electron/preload.js** â€” Context bridge exposing minimal safe APIs to the renderer.

### Tools (`tools/`)
- **tools/verify.js** â€” Sanity checker: (1) syntax-compiles each `js/*.js`, (2) checks `index.html` `<script>` tags match `js/` (missing/orphan files), (3) loads all scripts in-order in a shared sandbox â€” the real load-order test. Run via `node tools/verify.js`.
- **tools/build-release.js** â€” Full build pipeline: verify source â†’ stage copy (index.html, css, js/, electron/, icons, package.json) into `_build_staging_<ts>/` â†’ obfuscate every `js/*.js` with `javascript-obfuscator` â†’ minify css â†’ run `electron-builder` (junction to root `node_modules`) â†’ output installers to `release/` (or `SAMTEX_OUTPUT`).

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

- `window.cart`, `window.quickCart`, `window.quickCustomerMode` â€” cart state
- `settings`, `currentView`, `currentUser`, `db` â€” app state (from `state.js`)
- `window._productsCache` / `productsCache` â€” product cache (refresh via `refreshProductsCache()`) used by cart/promotions
- `window._customer`, `window.quickCart`, `window.fastClients` â€” customer/quick widgets
- `window.addToCart`, `window.setCartQty`, `window.completeTransaction`, `window.printCart`, `window.renderCart`, `window.switchView` â€” cross-file entry points (exposed at bottom of each file)

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
- **i18n**: never hardcode French user-facing text â€” use `t('key')`; add key to `translations.fr` in `language-data.js`.
- **State globals**: before declaring a new global, check `state.js`.
- **Data layer**: async IndexedDB via `dbGetAll/dbGet/dbPut/dbDelete/dbClear`.
- **User feedback**: `showToast(message, type)` with type in `info|success|warning|error`; sounds via `playScan/playSuccess/playError/playWarning`.
- **Scanner focus**: keep `#scanner-receiver` focused; set `formInputActive = true` when a form input is active (and false on blur) so the scanner doesn't steal typing; `lockFocus()` returns focus.
- **Error handling**: wrap async in `try/catch`, `console.error`, `showToast`; keep `typeof fn === 'function'` guards where present.
- **Stock/quantity**: quantities may be decimals (unit `mÃ¨tre`). Preserve decimal handling (`step="0.1"`, `parseFloat`).
- **Stock settings**: respect `settings.negativeStock` (`allow`/`prevent`/`warn`) and `settings.confirmClear`.
- **Script load order**: critical â€” never reorder `index.html` script tags; run `node tools/verify.js` after adding/removing a js file.
- **Do NOT modify / split**: `js/analytics/analytics-charts.js` (cohesive canvas chart module wrapped in one IIFE â€” shared closure state).

---

## 9. Security (Electron shell)

- DevTools shortcuts blocked (F12 / Ctrl+Shift+I/J/C / Ctrl+U), no menu, single-instance lock, `contextIsolation:true`, `sandbox:true`, `devTools:false`.
- JS obfuscated on `npm run dist`; `asar` packaging; disabled DevTools.
- User PINs stored ONLY as hashes (`pinHash`); never persist `pinPlain`. Default admin `0000` + `mustChangePin:true`.
- Honest limitation: client-side/offline code can't be literally unreadable (it must execute locally). Obfuscation + asar + disabled DevTools is the practical ceiling.