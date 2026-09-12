# AGENTS.md — SamtexChabet POS

Guidelines for AI agents (and humans) working in this repository.

## Project overview

- Browser-only Point of Sale app for a fabric/textile retail shop ("SamtexChabet").
- **Vanilla JavaScript** — no framework, no bundler, no build step for the *browser* version (no ES modules, no imports).
- Runs by opening `index.html` directly, or served statically (e.g. VS Code Live Server).
- A **secured desktop build** exists on top: `electron/main.js` + `electron/preload.js` (vanilla shell, `loadFile()` on the same `index.html`), packaged by `electron-builder` with the JS **obfuscated** so the shipped exe is very hard to read. See "Secured desktop build" below.
- UI language is **French**; currency is **DA** (Algerian dinar).
- Data persists in the browser / Electron via IndexedDB.

## Secured desktop build

The shipped product is the Electron desktop app with obfuscated JS (the browser source stays readable). Build with:

```
npm install          # installs electron, electron-builder, javascript-obfuscator
npm run dist         # verify.js + stage + obfuscate + electron-builder -> release/
```

Key facts for agents working on the build:

- `tools/build-release.js` is the whole pipeline. It (1) runs `node tools/verify.js` on source, (2) stages a copy of `index.html` + css + `js/` (all `js/**/*.js`) + `electron/` + icons into a timestamped `_build_staging_<ts>` dir (skipping `node_modules` and stale `dist`/`dist-build` subfolders), (3) obfuscates every `js/**/*.js` AND the Electron shell (`electron/main.js`, `electron/preload.js`) with `javascript-obfuscator`, (4) minifies css, (5) runs `electron-builder` with a junction from the staging `node_modules` back to the ROOT `node_modules` (so it resolves the installed electron offline), (6) outputs installers to ROOT `release/`.
- Output dir can be overridden with the `SAMTEX_OUTPUT` env var (absolute path).
- **Obfuscator settings are load-order safe**: `renameGlobals:false` and `renameProperties:false` are CRITICAL — the app calls cross-file globals by name and uses dynamic property access (`DOM.*`, `p.barcode`, inline template `onclick="routeBarcode(...)"`). Do not enable global/property renaming — it breaks the app. `deadCodeInjection` and `controlFlowFlattening` are kept off to preserve scan/search speed.
- **`stringArray` MUST stay `false`.** Every obfuscated file declares a top-level decoder function with the SAME generated name (e.g. `function _0x412b`) and all scripts load into ONE shared global scope (no modules). These decoders collide on the global name, so a function calls the decoder from whichever file defined it last, which decodes against a different string array → out-of-range → `undefined` → runtime `TypeError: Cannot read properties of undefined (reading 'charAt')` during `applyStructure`/`switchView`. A load-only check (verify.js) does NOT catch this — it only fails at runtime. Disabling `stringArray` (strings stay inline in the obfuscated file) is the correct, stable tradeoff; obfuscation of identifiers + control flow + electron DevTools-disable still apply.
- After changing build settings, verify the **obfuscated** output still loads AND runs: re-run the build, then run all scripts from the staged/asar dir in `index.html` order AND drive the runtime paths that failed before (e.g. `applyStructure()`, `switchView('checkout')`) — the `tools/verify.js` check covers source load only, not obfuscated runtime.
- **Auto-update build**: `build-release.js` runs electron-builder with `--publish never` (update metadata `latest.yml` + `.blockmap` are generated but **never uploaded** — uploading is a manual `gh release` step). `package.json` `build.publish` (github provider) has placeholder `owner`/`repo` values to fill in before the first update release. `APP_VERSION` in `js/core/config.js` is auto-synced from `package.json` `version` at build time (single source of truth — bump only `version`). The updater only runs in the **installed NSIS** app (`electron/main.js` skips it when `PORTABLE_EXECUTABLE_DIR` is set); the portable build never self-updates. The renderer pref `settings.autoUpdateEnabled` controls auto-download; `autoUpdater.autoDownload` is set right before each check so "Vérifier maintenant" still detects updates while off (download hints the user to enable it). Test the update loop with a **generic** publish URL on localhost before going live (see plan in this repo's history), and never delete a release after publishing — offline machines would miss the update window.
- `package.json` scripts: `start` (run source in electron), `dist` (`node tools/build-release.js`), `dist:source` (`electron-builder` on readable source). `version` is the release version — bump it for a new installer.
- Electron shell already: `devTools:false` in webPreferences, no menu, single-instance, `contextIsolation:true`, `sandbox:true`. The only handled shortcut is F11 (fullscreen) — the F12 / Ctrl+Shift+I/J/C DevTools shortcut seen in some commits is REMOVED (do not re-add; it reopened DevTools even with the menu null). `main.js` and `preload.js` are obfuscated at build time like `js/*` (identifier renaming only — the `vollarApp.*` API property names and the IPC channel strings must keep their names or the renderer breaks).
- **Honest limitation**: client-side/offline code can't be made literally unreadable — it must execute locally. Obfuscation + asar + disabled DevTools is the practical ceiling; absolute secrecy needs a server backend (breaks the offline design).

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
cart-state, cart-add, cart-meter, cart-ops, cart-render, cart-quick, fast-clients, cart-router, cart-name-style,
promotions, transaction, payment, product-grid, quick-boxes,
inventory-list, inventory-categories, inventory-form, inventory-delete, inventory-edit, inventory-exports,
customers-list, customers-select, customers-form, customers-detail, customers-payment, customers-debug,
history, variants,
analytics-core, analytics-dashboard, analytics-history, analytics-delete, analytics-restore,
analytics-edit-search, analytics-edit-modal, analytics-edit-save, analytics-move, analytics-view,
analytics-charts, themes-data, themes, exports, settings, scanner-settings, structures, classic-pos, keyboard, button-context, print, zreport, suppliers, expenses,
app-clock, app-update, app-update-boot, app-setup, app-welcome, app-init, app-bootstrap, app-backup
```

> **js/ layout (2026):** the actual `js/` files are now grouped into **feature subfolders**
> for readability — `core/`, `auth/`, `scanner/`, `cart/`, `inventory/`, `customers/`,
> `transactions/`, `analytics/`, `settings/`, `views/`, `suppliers/`, `expenses/`,
> `bootstrap/` — but the tag sequence above (in `index.html`) is the only thing that
> controls load order. `node tools/verify.js` recurses the tree and checks the match.
> Some older file names in the abridged list/docs are historical and may not exist
> today; trust the actual `js/` folder + `index.html` + `README.md` as the source of truth.

## File map

Split by feature (each file < ~400 lines except pure data files):

- **Core** (`js/core/`): `config.js` (constants), `state.js` (global state), `dom.js` (element refs in `DOM`), `utils.js` (helpers), `audio.js` (sounds), `focus.js` (scanner focus lock), `confirm-modal.js`, `focus-recovery.js`, `database.js` (IndexedDB + `dbMultiOp`), `backup.js` (auto-backup), `restore-safety.js`, `license.js`/`license-data.js`.
- **Auth/Users** (`js/auth/`): `auth.js`, `users.js`, `permissions.js`, `audit.js`.
- **i18n** (`js/core/`): `language-data.js` = the `translations.fr` object (data only); `language.js` = `t()`, `applyLanguage()`, `formatDate()`, `getCurrency()`.
- **Scanner** (`js/scanner/`): `scanner-state.js` (state), `scanner-search.js` (cache + `fastSearch`), `scanner-barcode.js` (barcode handling), `scanner-suggestions.js` (dropdown UI), `scanner-setup.js` (input wiring), `scanner-main.js` (entry point + exports), `barcode-aliases.js`.
- **Cart** (`js/cart/`): `cart-state.js`, `cart-add.js` (add to cart), `cart-meter.js` (meter-quantity prompt), `cart-ops.js` (qty/remove/reduced price/totals), `cart-render.js` (table render), `cart-quick.js` (quick-customer mode), `cart-router.js` (`switchView`), `cart-name-style.js`, `checkout-persist.js`, `fast-clients.js`, `product-grid.js`, `quick-boxes.js`.
- **Inventory** (`js/inventory/`): `inventory-list.js` (table + load), `inventory-categories.js`, `inventory-form.js` (add product), `inventory-delete.js`, `inventory-edit.js` (edit modal), `inventory-exports.js` (sensitive-price toggle), `pack-conversion.js`.
- **Customers** (`js/customers/`): `customers-list.js`, `customers-select.js`, `customers-form.js`, `customers-detail.js` (`window._customer` object), `customers-payment.js` (debt payments), `customers-debug.js`.
- **Analytics** (`js/analytics/`): `analytics-core.js` (data/calculations), `analytics-ui.js` (dashboard / history / edit-sale / delete / restore UI), `analytics-charts.js` (canvas charts), `day-export.js`.
- **Transactions** (`js/transactions/`): `transaction.js` (`completeTransaction`), `customer-ask.js` (ask-customer modal), `payment.js`, `zreport.js`, `print.js`, `promotions.js`, `variants.js`.
- **Button context menu** (`js/views/`): `button-context.js` (right-click on any button → hide / color / keyboard shortcut / size / reset; prefs stored in `localStorage` under `samtex_button_prefs`; `initButtonContext()` must run after all buttons are built).
- **Structures** (`js/views/`): `structures.js` (`STRUCTURES`, `applyStructure()`, `currentStructure`, structure selector + mockups).
- **Classic POS** (`js/views/`): `classic-pos.js` (retro Windows-terminal POS view for `structure-classic`; self-contained, reuses `window.cart`/`addToCart`/`setCartQty`/`completeTransaction`/`printCart` via additive wrappers on `window.renderCart` + `window.refreshProductsCache`, and hooks `window.onStructureChange`). Its styling lives in `classic-pos.css`; the shell markup sits in `index.html` `#view-checkout` (section 5.0).
- **Suppliers** (`js/suppliers/`): `suppliers.js`, `supplier-bills-hub.js`.
- **Expenses** (`js/expenses/`): `expenses.js` (CRUD dépenses, catégories personnalisées, moyens de paiement, dépenses récurrentes mensuelles auto-générées via `recurId`, vue par jour, export CSV; intégré au profit net des analytics et au rapport Z).
- **Settings** (`js/settings/`): `settings.js`, `scanner-settings.js` (panel Scanner + test de scan), `exports.js`, `keyboard.js`, `themes-data.js`/`themes.js`. (Auto-backup lives in `js/core/backup.js` + `js/bootstrap/app-backup.js`.)
- **Quick boxes** (`js/cart/`): `quick-boxes.js` (12 produits rapides dans la caisse — cases assignables, persistance via `settings.quickBoxes`, picker via `fastSearch`; rendu dans `.checkout-action-bar` en bas de la caisse, sous le panier principal; s'exécute uniquement dans `#view-checkout`, masqué sous `structure-classic`).
- **Checkout right-click style menus** (`js/cart/`): `cart-name-style.js` (clic droit en caisse → police/taille du nom de produit dans les paniers, police/taille du prix des cartes `.fast-card-total`, boutons pleine largeur `.action-buttons`, couleur de fond des cases `.quick-box` avec texte toujours lisible; préférences en `localStorage`: `samtex_cart_name_prefs`, `samtex_fast_total_prefs`, `samtex_action_buttons_fill`, `samtex_quickbox_colors`). Il interrompt (capture) les menus clic-droit existants pour `.action-buttons`/`.quick-box` — son écouteur `contextmenu` en capture doit rester enregistré avant ceux de `button-context.js`/`quick-boxes.js` (tout s'attache à l'exécution du script, en fin de body).
- **Bootstrap** (`js/bootstrap/`): `app-clock.js`, `app-setup.js` (button/nav wiring), `app-welcome.js` (assistant de première utilisation / nom du magasin), `app-init.js` (`initApp`), `app-bootstrap.js` (`bootstrapApp` + auto-start), `app-backup.js` (auto-backup + `restoreAutoBackup` réel), `app-update.js`/`app-update-boot.js`.
- **Auto-update (desktop)**: `js/bootstrap/app-update.js` = the Settings UI wiring for electron-updater (`initAppUpdate`, exported as `window.initAppUpdate`) + the legacy browser-only reload logic (`initAutoUpdateCheck`, dormant). `app-update-boot.js` (loaded LAST, right after `app-update.js`) just invokes `initAppUpdate()` at eval time. The Electron side lives in `electron/main.js` (autoUpdater, IPC `update-*` channels) and `electron/preload.js` (`vollarApp.setUpdateEnabled/checkForUpdates/installUpdate/getUpdateState/onUpdateStatus`). The on/off switch is the existing `settings.autoUpdateEnabled` toggle (Sauvegarde panel). Update status UI sits in Settings > Système (`#update-status-text`, `#btn-check-updates`, `#btn-install-update`).

## Conventions

- **No modules**: define top-level functions; expose anything cross-file/cross-HTML with `window.x = fn;` at the bottom of the file.
- **DOM refs**: use the `DOM.*` cache in `js/core/dom.js`; avoid repeated `document.getElementById` (except for elements created dynamically).
- **i18n**: use `t('key')`. To add a string, add it to `translations.fr` in `js/core/language-data.js`, then `t()` resolves it. Never hardcode French user-facing text.
- **State**: shared globals live in `js/core/state.js` (e.g. `settings`, `currentView`, `cart`, `window.quickCart`, `customers`, `suppliers`, `currentUser`). Check `state.js` before declaring a new global.
- **Data layer** (async, IndexedDB-backed): `dbGetAll(store)`, `dbGet(store, key)`, `dbPut(store, obj)` (auto-assigns `id`), `dbDelete(store, key)`, `dbClear(store)`. Stores: `products`, `sales`, `customers`, `settings`, `categories`, `zreports`, `suppliers`, `purchases`, `users`, `auditlog`, `promotions`, `product_variants`.
- **Atomic multi-op**: `dbMultiOp(ops)` (js/core/database.js, exposed as `window['dbMultiOp']`) runs a list of ops in a single IndexedDB `readwrite` transaction — all succeed or none commit. Op shape: `{store, op, key?, value?, valueBuilder?}` where `op` is `get|put|delete|getAll`. `valueBuilder(results)` receives the array of prior op results to compute a `put` value (indexes align with op positions). `dbGet/dbPut/...` remain per-op non-atomic.
- **User feedback**: `showToast(message, type)` with `type` in `info|success|warning|error`; sounds via `playScan/playSuccess/playError/playWarning`.
- **Scanner focus**: keep `#scanner-receiver` focused. When a form input is active, set `formInputActive = true` (and `false` on blur) so the scanner does not steal typing; `lockFocus()` returns focus to the scanner.
- **Error handling**: wrap async operations in `try/catch`, log with `console.error`, and surface with `showToast`. Many call sites use `typeof fn === 'function'` guards for optional/legacy functions — keep those guards when present.
- **Stock/quantity**: quantities may be decimals (products with `unit === 'mètre'`). Preserve decimal handling (`step="0.1"`, `parseFloat`).
- **Comments**: code uses `// ===...===` section banners and French inline notes. Follow the existing style; do not add gratuitous comments.
- **Editing CSS**: styles are in `style.css`, `modern-enhancements.css`, `modern-views.css`. Element-specific styles are often inline in JS template strings.

## Do NOT modify or split

- `js/analytics/analytics-charts.js` — cohesive canvas chart module wrapped in one IIFE (shared closure state).

## Verification

There is no lint/test/typecheck tooling. Use the repo's sanity checker:

1. Run `node tools/verify.js` — it checks:
   - Syntax of every `js/*.js` file (compile-only).
   - That `index.html` `<script>` tags match the `js/` folder (missing files, orphan files).
   - That all scripts load together in a shared sandbox **in index.html order** — the real load-order test.
2. Load `index.html` (Live Server or direct) and exercise the affected feature.
3. After adding a new JS file: add its `<script>` tag to `index.html` first, then run `node tools/verify.js` to confirm the order is valid.

## Gotchas

- `index.html` is large (~1900 lines); sections are delimited by `==== ... ====` banner comments. Keep the big `SECTION 13` script block ordered.
- `window._productsCache` and `window.productsCache` are used by promotions/cart — refresh via `refreshProductsCache()`.
- **Branding**: the shop name shown in the header/title/receipt/Z-report comes from `getShopName()` (js/core/language.js), which returns `settings.shopName` or falls back to `t('appName')`. `applyBrand()` refreshes it; call `applyBrand()` after changing `settings.shopName`.
- **Security**: user PINs are stored ONLY as hashes (`pinHash`); never persist a `pinPlain` field. The default admin is created with `0000` and `mustChangePin:true` (js/auth/auth.js) — keep it that way.
- Auto-backup is triggered by `createAutoBackup()` (defined in `js/core/backup.js`) after destructive writes; call it after adding/editing/deleting data. `restoreAutoBackup` has a real implementation in `js/bootstrap/app-backup.js` (restores newest `backup_*.json` from the saved folder handle).
- **`completeTransaction`** (js/transactions/transaction.js) is atomic: it wraps stock decrement (incl. variants via `product_variants`), the sale record, and customer-debt update into a single `dbMultiOp`. The legacy per-op version survives as `_completeTransactionOriginal` (unused). When editing, keep it atomic and preserve the legacy sale-item financial fields (`originalPrice`, `soldPrice`, `purchasePrice`, `profit`, `discountAmount`).
- **Hourly auto-export** (js/bootstrap/app-backup.js): settings `hourlyExportEnabled`, `hourlyExportPath`, `hourlyExportMinutes` (default 60), `hourlyExportRetention` (default 30). Writes `export_YYYY-MM-DD_HH-MM.json` files (via Electron `vollarApp.saveFile`) into the user-chosen folder; old files past retention are deleted. A **shutdown backup** is saved on app close via the Electron `will-quit` → `app-quit` → `renderer-quit-ready` handshake (with a 2500ms force-quit fallback). Since `js/settings/settings.js` loads before `js/bootstrap/app-backup.js`, the hourly export self-initialises at the end of `app-backup.js`. Use the `_vapp()` helper for `vollarApp` (guard `typeof vollarApp !== 'undefined'`) so the browser/verify sandbox still runs.
- `settings.negativeStock` (`allow`/`prevent`/`warn`) and `settings.confirmClear` control cart/stock behavior — respect them when changing cart logic.
- **i18n gotcha:** in `js/core/language-data.js`, `translations.fr` closes around line ~1147; keys added after that line land at the top level of `translations` (NOT inside `fr`). `t()` in `js/core/language.js` falls back to top-level `translations[key]`, so such keys still work — but new user-facing strings should be inserted **before** the `fr` closing brace. There is also an AGENTS-free helper: run `node tools/verify.js` after any language-data edit.
