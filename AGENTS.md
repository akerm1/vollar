# AGENTS.md — SamtexChabet POS

Guidelines for AI agents (and humans) working in this repository.

## Project overview

- Browser-only Point of Sale app for a fabric/textile retail shop ("SamtexChabet").
- **Vanilla JavaScript** — no framework, no bundler, no build step, no `package.json`, no npm scripts.
- Runs by opening `index.html` directly, or served statically (e.g. VS Code Live Server).
- UI language is **French**; currency is **DA** (Algerian dinar).
- Data persists in the browser via IndexedDB (optionally SQLite in an Electron shell).

## CRITICAL: script load order

The whole app is loaded with classic `<script>` tags in `index.html` (section "SECTION 13: JAVASCRIPT - LOAD IN CORRECT ORDER"). There are **no ES modules and no imports** — everything lives in the global scope.

Rules you MUST follow:

1. Functions defined in one file are called from other files via the global scope.
2. When adding a new JS file, add its `<script>` tag to `index.html` **in the correct position** — data files before the logic that uses them, and `app-*.js` files last.
3. Do NOT reorder existing script tags; the sequence is load-order dependent (e.g. `state.js` must load before everything that reads `settings`, `app-bootstrap.js` must load last).
4. Function hoisting only applies **within a single script** — do not rely on calling a function from a file that loads later.

The load order (abridged, grouped) is:

```
config, state, auth, users, audit, permissions,
language-data, language,          // translations data THEN t() logic
dom, utils, audio, focus,
scanner-state, scanner-search, scanner-barcode, scanner-suggestions, scanner-setup, scanner-main,
database, backup,
cart-state, cart-add, cart-meter, cart-ops, cart-render, cart-quick, cart-router,
promotions, transaction, payment, product-grid,
inventory-list, inventory-categories, inventory-form, inventory-delete, inventory-edit, inventory-exports,
customers-list, customers-select, customers-form, customers-detail, customers-payment, customers-debug,
history, variants,
analytics-core, analytics-dashboard, analytics-history, analytics-delete, analytics-restore,
analytics-edit-search, analytics-edit-modal, analytics-edit-save, analytics-move, analytics-view,
analytics-charts, themes-data, themes, exports, settings, scanner-settings, structures, classic-pos, keyboard, button-context, print, zreport, suppliers,
app-clock, app-setup, app-welcome, app-init, app-bootstrap, app-backup
```

## File map

Split by feature (each file < ~400 lines except pure data files):

- **Core**: `config.js` (constants), `state.js` (global state), `dom.js` (element refs in `DOM`), `utils.js` (helpers), `audio.js` (sounds), `focus.js` (scanner focus lock).
- **Auth/Users**: `auth.js`, `users.js`, `permissions.js`, `audit.js`.
- **i18n**: `language-data.js` = the `translations.fr` object (data only); `language.js` = `t()`, `applyLanguage()`, `formatDate()`, `getCurrency()`.
- **Scanner**: `scanner-state.js` (state), `scanner-search.js` (cache + `fastSearch`), `scanner-barcode.js` (barcode handling), `scanner-suggestions.js` (dropdown UI), `scanner-setup.js` (input wiring), `scanner-main.js` (entry point + exports).
- **Cart**: `cart-state.js`, `cart-add.js` (add to cart), `cart-meter.js` (meter-quantity prompt), `cart-ops.js` (qty/remove/reduced price/totals), `cart-render.js` (table render), `cart-quick.js` (quick-customer mode), `cart-router.js` (`switchView`).
- **Inventory**: `inventory-list.js` (table + load), `inventory-categories.js`, `inventory-form.js` (add product), `inventory-delete.js`, `inventory-edit.js` (edit modal), `inventory-exports.js` (sensitive-price toggle).
- **Customers**: `customers-list.js`, `customers-select.js`, `customers-form.js`, `customers-detail.js` (`window._customer` object), `customers-payment.js` (debt payments), `customers-debug.js`.
- **Analytics**: `analytics-core.js` (data/calculations), `analytics-dashboard.js`, `analytics-history.js` (sales history), `analytics-delete.js`, `analytics-restore.js`, `analytics-edit-search.js` / `analytics-edit-modal.js` / `analytics-edit-save.js` (edit-sale modal), `analytics-move.js`, `analytics-view.js` (setup + Z-report list).
- **Transactions**: `transaction.js` (`completeTransaction`), `customer-ask.js` (ask-customer modal), `payment.js`, `history.js`, `zreport.js`, `print.js`, `promotions.js`, `variants.js`.
- **Button context menu**: `button-context.js` (right-click on any button → hide / color / keyboard shortcut / size / reset; prefs stored in `localStorage` under `samtex_button_prefs`; `initButtonContext()` must run after all buttons are built).
- **Structures**: `structures.js` (`STRUCTURES`, `applyStructure()`, `currentStructure`, structure selector + mockups).
- **Classic POS**: `classic-pos.js` (retro Windows-terminal POS view for `structure-classic`; self-contained, reuses `window.cart`/`addToCart`/`setCartQty`/`completeTransaction`/`printCart` via additive wrappers on `window.renderCart` + `window.refreshProductsCache`, and hooks `window.onStructureChange`). Its styling lives in `classic-pos.css`; the shell markup sits in `index.html` `#view-checkout` (section 5.0).
- **Suppliers**: `suppliers.js`.
- **Settings/Backup**: `settings.js`, `scanner-settings.js` (panel Scanner + test de scan), `backup.js`, `exports.js`, `keyboard.js`, `product-grid.js`.
- **Bootstrap**: `app-clock.js`, `app-setup.js` (button/nav wiring), `app-welcome.js` (assistant de première utilisation / nom du magasin), `app-init.js` (`initApp`), `app-bootstrap.js` (`bootstrapApp` + auto-start), `app-backup.js` (auto-backup + `restoreAutoBackup` réel).

## Conventions

- **No modules**: define top-level functions; expose anything cross-file/cross-HTML with `window.x = fn;` at the bottom of the file.
- **DOM refs**: use the `DOM.*` cache in `js/dom.js`; avoid repeated `document.getElementById` (except for elements created dynamically).
- **i18n**: use `t('key')`. To add a string, add it to `translations.fr` in `js/language-data.js`, then `t()` resolves it. Never hardcode French user-facing text.
- **State**: shared globals live in `js/state.js` (e.g. `settings`, `currentView`, `cart`, `window.quickCart`, `customers`, `suppliers`, `currentUser`). Check `state.js` before declaring a new global.
- **Data layer** (async, IndexedDB-backed): `dbGetAll(store)`, `dbGet(store, key)`, `dbPut(store, obj)` (auto-assigns `id`), `dbDelete(store, key)`, `dbClear(store)`. Stores: `products`, `sales`, `customers`, `settings`, `categories`, `zreports`, `suppliers`, `purchases`, `users`, `auditlog`, `promotions`, `product_variants`.
- **User feedback**: `showToast(message, type)` with `type` in `info|success|warning|error`; sounds via `playScan/playSuccess/playError/playWarning`.
- **Scanner focus**: keep `#scanner-receiver` focused. When a form input is active, set `formInputActive = true` (and `false` on blur) so the scanner does not steal typing; `lockFocus()` returns focus to the scanner.
- **Error handling**: wrap async operations in `try/catch`, log with `console.error`, and surface with `showToast`. Many call sites use `typeof fn === 'function'` guards for optional/legacy functions — keep those guards when present.
- **Stock/quantity**: quantities may be decimals (products with `unit === 'mètre'`). Preserve decimal handling (`step="0.1"`, `parseFloat`).
- **Comments**: code uses `// ===...===` section banners and French inline notes. Follow the existing style; do not add gratuitous comments.
- **Editing CSS**: styles are in `style.css`, `modern-enhancements.css`, `modern-views.css`. Element-specific styles are often inline in JS template strings.

## Do NOT modify or split

- `js/qz-tray.js` — vendored third-party QZ Tray library (LGPL). Single IIFE, ~3000 lines.
- `js/analytics-charts.js` — cohesive canvas chart module wrapped in one IIFE (shared closure state).
- `js/sqlite-main.js` — Electron/Node module (CommonJS, `require('electron')`), NOT loaded by the browser.
- Root `themes.js` — orphaned/unused copy. The active theme system is `js/themes-data.js` + `js/themes.js`.

## Verification

There is no lint/test/typecheck tooling. Use the repo's sanity checker:

1. Run `node tools/verify.js` — it checks:
   - Syntax of every `js/*.js` file (compile-only).
   - That `index.html` `<script>` tags match the `js/` folder (missing files, orphan files). `sqlite-main.js` and `qz-tray.js` are whitelisted as intentionally not loaded.
   - That all scripts load together in a shared sandbox **in index.html order** — the real load-order test.
2. Load `index.html` (Live Server or direct) and exercise the affected feature.
3. After adding a new JS file: add its `<script>` tag to `index.html` first, then run `node tools/verify.js` to confirm the order is valid.

## Gotchas

- `index.html` is large (~1900 lines); sections are delimited by `==== ... ====` banner comments. Keep the big `SECTION 13` script block ordered.
- `window._productsCache` and `window.productsCache` are used by promotions/cart — refresh via `refreshProductsCache()`.
- **Branding**: the shop name shown in the header/title/receipt/Z-report comes from `getShopName()` (js/language.js), which returns `settings.shopName` or falls back to `t('appName')`. `applyBrand()` refreshes it; call `applyBrand()` after changing `settings.shopName`.
- **Security**: user PINs are stored ONLY as hashes (`pinHash`); never persist a `pinPlain` field. The default admin is created with `0000` and `mustChangePin:true` (js/auth.js) — keep it that way.
- Auto-backup is triggered by `createAutoBackup()` (defined in `backup.js`) after destructive writes; call it after adding/editing/deleting data. `restoreAutoBackup` has a real implementation in `app-backup.js` (restores newest `backup_*.json` from the saved folder handle).
- `settings.negativeStock` (`allow`/`prevent`/`warn`) and `settings.confirmClear` control cart/stock behavior — respect them when changing cart logic.
- **i18n gotcha:** in `js/language-data.js`, `translations.fr` closes around line ~1147; keys added after that line land at the top level of `translations` (NOT inside `fr`). `t()` in `language.js` falls back to top-level `translations[key]`, so such keys still work — but new user-facing strings should be inserted **before** the `fr` closing brace. There is also an AGENTS-free helper: run `node tools/verify.js` after any language-data edit.
