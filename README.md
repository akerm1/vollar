# Vollar POS — Caisse pour magasin (SamtexChabet)

A browser-only Point of Sale (caisse) app for a fabric/textile retail shop, with a
**secured Electron desktop build** on top. Vanilla JavaScript — no framework, no
bundler, no ES modules. UI in **French**, currency **DA** (dinar). Data persists in
IndexedDB.

## Run

| Command | What it does |
|---|---|
| `node tools/verify.js` | Sanity check: JS syntax, `index.html` ↔ `js/` match, shared-context load order |
| `npm start` | Run the source in Electron (`electron/main.js` loads `index.html`) |
| `npm run dist` | Full secured build: verify → stage → **obfuscate** JS → `electron-builder` → `release/` |
| `npm run dist:source` | electron-builder on readable (non-obfuscated) source |

You can also just open `index.html` directly, or serve it statically (VS Code Live Server).

## Structure

```
index.html            App shell — loads every script in a strict order (SECTION 13)
style.css / *.css     Styling (style.css, modern-enhancements.css, modern-views.css, classic-pos.css)
js/                   ALL application logic, grouped by feature into subfolders:
  core/         config, state, dom, utils, i18n, audio, focus, database, backup, license, restore-safety
  auth/         auth, users, audit, permissions
  scanner/      scanner state/search/barcode/suggestions/setup/main + barcode-aliases
  cart/         cart state/add/ops/render/quick/router + checkout widgets
  inventory/    product list/categories/form/delete/edit/exports + pack conversion
  customers/    customer list/select/form/detail/payment/debug
  transactions/ promotions, customer-ask, transaction, payment, variants, print, zreport
  analytics/    analytics core/UI/charts + day-export
  settings/     settings, scanner-settings, themes, exports, keyboard
  views/        structures, classic-pos, button-context, qr-code
  suppliers/    suppliers, supplier-bills-hub
  expenses/     dépenses (CRUD + catégories + récurrentes)
  bootstrap/    app init/startup/setup/welcome/update/backup
electron/         main.js + preload.js (secured desktop shell)
tools/            build-release.js (build pipeline), verify.js (sanity checker), test-*.js (harnesses)
build/            Windows installer/app icons (icon.ico, icon.png)
docs/             PROJECT_STRUCTURE.md, LISEZ-MOI.md, HAR.md, TODO.md
release/          Build output (installers) — generated, gitignored
```

## Critical: script load order

There are **no modules and no imports** — every `js/*.js` file declares top-level
functions in one shared global scope, and one file calls another's functions by name.
The load order is defined by the `<script>` tags in `index.html` (SECTION 13) and is
**order-dependent**: e.g. `state.js` must load before anything that reads `settings`,
`app-bootstrap.js` must load last. **Never reorder those tags.** Files are grouped into
`js/` subfolders for readability, but the tag sequence is the authority.

After adding/removing/renaming a js file, update `index.html` and run
`node tools/verify.js`.

See `docs/PROJECT_STRUCTURE.md` for the full module map, data layer, and conventions.