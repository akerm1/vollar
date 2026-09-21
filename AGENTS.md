# AGENTS.md — SamtexChabet POS

Vanilla-JS browser/Electron POS app for a fabric shop. No modules, no imports, no build step for the browser version; UI in French, currency **DA**, data in IndexedDB. Run `index.html` directly or via static server.

## Secured desktop build

`npm run dist` = `tools/build-release.js`: verify → stage `index.html`+css+`js/`+`electron/` → obfuscate JS (& electron shell) → minify css → `electron-builder` → installers in `release/` (`SAMTEX_OUTPUT` overrides dir). Obfuscated output must still load **and run** (`applyStructure()`, `switchView('checkout')`) — verify.js covers source load only.

Obfuscator rules (critical):
- `renameGlobals:false`, `renameProperties:false` — app uses cross-file globals + dynamic props (`DOM.*`, inline `onclick="routeBarcode(...)"`).
- **`stringArray` MUST stay `false`**: all scripts share one global scope and each obfuscated file declares a same-named decoder; collisions cause runtime `TypeError (reading 'charAt')`, not caught by verify.js.
- `main.js`/`preload.js`: identifier renaming only — keep `vollarApp.*` names and `update-*` IPC channel names.

Build/update notes:
- Bump only `package.json` `version`; `APP_VERSION` in `js/core/config.js` auto-syncs at build.
- `build.publish` github provider has placeholder owner/repo (fill before first update release).
- Updater runs only in installed NSIS app (skipped when `PORTABLE_EXECUTABLE_DIR` set). `settings.autoUpdateEnabled` controls auto-download.
- Per-client: `settings.updateCheckEnabled` (default true) gates all checks; owner/repo editable in-app via `update-source` IPC → `autoUpdater.setFeedURL`; bake defaults with `SAMTEX_UPDATES_DISABLED=1`/`SAMTEX_GITHUB_OWNER`/`SAMTEX_GITHUB_REPO` → `window.__updateDefaults`.
- Electron shell: `devTools:false`, no menu, single-instance, `contextIsolation:true`, `sandbox:true`. Only F11 handled; do NOT re-add F12/Ctrl+Shift+I/J/C shortcuts.

## Script load order (CRITICAL)

Classic `<script>` tags only in index.html "SECTION 13", one shared global scope. Rules:
1. Cross-file functions go through the global scope (`window.x = fn`).
2. New JS file → add `<script>` tag in correct position (data before logic, `app-*.js` last), then run `node tools/verify.js`.
3. Never reorder existing tags (`state.js` first-ish, `app-bootstrap.js` last).
4. No cross-file function hoisting (file that loads later can't call earlier ones' funcs at load time).

`js/` uses feature subfolders (`core/`, `auth/`, `scanner/`, `cart/`, `inventory/`, `customers/`, `transactions/`, `analytics/`, `settings/`, `views/`, `suppliers/`, `expenses/`, `bootstrap/`); only index.html order controls loading. Trust js/ + index.html + README.md, not this doc, as source of truth for actual filenames.

## Conventions

- **DOM refs**: use `DOM.*` cache (`js/core/dom.js`).
- **i18n**: `t('key')`; add strings to `translations.fr` in `js/core/language-data.js`; never hardcode French UI text.
- **State**: shared globals in `js/core/state.js` (`settings`, `cart`, `customers`, `suppliers`, `currentUser`, etc.).
- **Data layer**: `dbGetAll/dbGet/dbPut/dbDelete/dbClear` + atomic `dbMultiOp(ops)` (one readwrite tx; op = `{store, op: get|put|delete|getAll, key?, value?, valueBuilder?}`). Stores: products, sales, customers, settings, categories, zreports, suppliers, purchases, users, auditlog, promotions, product_variants.
- **Feedback**: `showToast(msg, type)` (info/success/warning/error); `playScan/playSuccess/playError/playWarning`.
- **Scanner focus**: keep `#scanner-receiver` focused; set `formInputActive` true/false around form inputs; `lockFocus()` returns focus.
- **Errors**: try/catch + `console.error` + toast; keep `typeof fn === 'function'` guards.
- **Decimals**: quantities may be decimal (`unit === 'mètre'`; use `step="0.1"`, `parseFloat`).
- **CSS**: `style.css`, `modern-enhancements.css`, `modern-views.css`; element styles often inline in JS templates.

## Gotchas

- `index.html` large (~1900 lines), `==== ... ====` section banners.
- Refresh promotion/cart cache via `refreshProductsCache()`.
- Branding from `getShopName()` (settings.shopName or `t('appName')`); call `applyBrand()` after changing it.
- **Security**: PINs stored only as hashes (`pinHash`); default admin `0000` + `mustChangePin:true`; never add `pinPlain`.
- Call `createAutoBackup()` after destructive writes.
- **`completeTransaction`** (js/transactions/transaction.js): atomic via dbMultiOp (stock incl. `product_variants` + sale + customer debt). Keep atomic; preserve `originalPrice/soldPrice/purchasePrice/profit/discountAmount`.
- **Hourly auto-export** (js/bootstrap/app-backup.js): `hourlyExportEnabled/Path/minutes(default 60)/Retention(default 30)`; shutdown backup via `will-quit → app-quit → renderer-quit-ready` (2500ms fallback); self-inits at end of app-backup.js; use `_vapp()` guard so browser/verify sandbox works.
- `settings.negativeStock` (`allow`/`prevent`/`warn`), `settings.confirmClear` — respect in cart logic.
- **i18n gotcha**: `translations.fr` closes ~line 1147 in language-data.js; keys added after land at top level (still resolve via fallback) — insert new strings before the `fr` closing brace; run `node tools/verify.js` after edits.

## Verify

No lint/test tooling. Run `node tools/verify.js` (JS syntax, index.html↔js/ tag match, shared-sandbox load order), then load index.html and exercise the feature. After adding a file: add its `<script>` tag first, then verify.

Do NOT modify/split: `js/analytics/analytics-charts.js` (one IIFE).