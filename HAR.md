# HAR.md — Handoff / Analysis Record (Vollar POS 2.0.1)

Status doc for the next AI (or human) continuing work on this repo. **This file replaces `TODO.md` as the work log** — `TODO.md` is stale (an outdated "Analytics Modernization Plan" unrelated to the scanner/focus/writing bugs). Read `AGENTS.md` first; it is authoritative for architecture, load order, build pipeline, and "do not modify" rules.

Last build: **2.0.1**. Installers are intentionally **kept** (per user request) in `release/`.

---

## 1. Root-cause history of the writing/scanning bugs (fixed)

There were TWO distinct bugs. Both produced "can't type / can't scan" symptoms.

### Bug A — focus-lock + keyboard redirect applied GLOBALLY (persistent)
The scanner focus-lock (`focus.js` `lockFocus`) and the keyboard redirect (`scanner-setup.js`) ran in **every view**, stealing typing and redirecting letters/digits in stock, customers, settings, etc. Actually broke stock work.

**Fix:** checkout-scoped:
- `js/focus.js`: `lockFocus()` early-returns unless `currentView === 'checkout'`; `setupFocusManagement()` gated by an `isCheckout()` helper; `visibilitychange` handler gated.
- `js/scanner-setup.js`: in `setupKeyboardRedirect()` (lines ~234-332), only redirect letters/numbers to search when `currentView === 'checkout'` (`isCheckout` guard ~301-302). The inventory digit-redirect (lines ~245-267) is intentionally independent.

### Bug B — stuck-state global keyboard freeze (intermittent, restart fixes)
"All writing capability fails everywhere, sometimes, unpredictable" — all input fields, all views, random timing. This is a **stuck state machine** that leaves a **capture-phase** `keydown` handler attached that calls `preventDefault()` on every printable key, so typing is dead everywhere until restart.

The culprit mechanism is `js/cart-meter.js`'s `globalKeyHandler` — a **capture-phase** `document` listener (`addEventListener('keydown', handler, true)`) that, while `window.meterPromptActive === true`, calls `preventDefault/stopPropagation/stopImmediatePropagation` on **every printable key** to type into the quantity prompt and to buffer fast-typed barcode scans. If that state gets stuck `true`, the next keystroke anywhere is swallowed. That exactly matches "intermittent, everywhere, restart fixes."

**How it could get stuck:** an exception thrown inside `confirmMeterQuantity()` / `saveMeterItemAndProcessScan()` **before** `closeMeterPrompt()` ran would leave `meterPromptActive === true` with the capture handler still attached. (The obfuscated build made exceptions more likely; see §2.)

**Fixes applied this session (`js/cart-meter.js`):**
1. **try/finally** in `confirmMeterQuantity()` and `saveMeterItemAndProcessScan()` so `closeMeterPrompt()` **always** runs even when `addToCartWithQuantity` throws — `meterPromptActive` can no longer stay `true` on an exception.
2. **Self-protecting `globalKeyHandler`**: (a) existing guard that self-removes + resets state if the prompt element is gone/unconnected; (b) a new `try/catch` around the whole handler body so if anything inside throws, the handler force-cleans itself (removes the listener, resets `meterPromptActive`, `meterPendingProduct`, `_meterKeyHandler`, removes any stale prompt) instead of staying stuck.
3. **Global keyboard watchdog** (IIFE at bottom of `cart-meter.js`): a `setInterval` (800 ms) that detects `meterPromptActive === true` while the `#meter-quantity-prompt` element is missing/unconnected and force-recovers (removes listener, resets state). This is the bulletproof backstop guaranteeing the freeze can never survive to require a restart.

---

## 2. Obfuscation runtime bug (fixed) — cross-file string-array collision

**Symptom (obfuscated build only):** uncaught runtime errors `Cannot read properties of undefined (reading 'charAt')` / `Cannot set properties of undefined (setting 'mètre')` inside `showSearchSuggestions` / `closeSuggestions` in `js/scanner-suggestions.js`. Source worked; single-file obfuscation passed; **full-build obfuscation failed** → a cross-file decoder collision.

**Root cause:** `javascript-obfuscator` with `stringArray: true` + `identifierNamesGenerator: 'hexadecimal'` creates a per-file string-array + shared decoder function (`_0x<hex>`). Because the app loads **77 classic scripts into one shared global scope with no module isolation**, later files' `_0x...` decoder definitions clobber earlier ones, so an earlier file calls the wrong decoder index → `undefined.charAt`. Consistent with AGENTS.md's warning: the app relies on a shared global scope.

**Fix (`tools/build-release.js`):** set `stringArray: false`. All `stringArray*` options are now inert. `renameGlobals:false` and `renameProperties:false` remain CRITICAL (cross-file globals + dynamic `DOM.*`/`p.barcode`/inline `onclick="routeBarcode(...)"`). `deadCodeInjection` and `controlFlowFlattening` stay off to preserve scan/search speed.

**Tradeoff (accepted):** losing `stringArray` removes string hiding — the obfuscated bundle no longer hides string literals in the shared decoder. Structural obfuscation (identifier renaming, compaction) remains. If future hardware users want string hiding back, the only clean fix is to **concatenate all files into ONE script** before obfuscation (removing the cross-file collision), then obfuscate that single bundle — a larger refactor (see AGENTS.md "Secured desktop build" limitation).

Also hardened `js/scanner-suggestions.js` itself: defensive rendering that guards `name`, `reference`, `barcode`, `stock`, `price` (via `isFinite`), and a defensive click handler (`this.dataset.barcode` guarded), so partial/undefined product data can't crash regardless of build.

### `round2` undefined (fixed)
During a live sale, the (obfuscated) build threw `Uncaught (in promise) ReferenceError: round2 is not defined at completeTransaction`. Root cause: `js/transaction.js:117` calls `round2(salePrice)` but that helper **never existed in source** (only `round6` in `cart-ops.js` and no `round2` anywhere) — a genuine latent bug that only surfaced at runtime. **Fix:** added a global `round2(value)` (round to 2 decimals, `Math.round((v + Number.EPSILON)*100)/100`, null/NaN→0) in `js/utils.js`. Because `renameGlobals:false`, `round2` keeps its name across files so the cross-file call works in the obfuscated build too. Other helpers used in `completeTransaction` (`dbGet/dbPut/dbGetAll/dbDelete/formatPrice/loadCustomers/showToast/playSuccess`) were verified defined; `round2` was the only real gap.

---

## 3. DevTools console + F11 fullscreen (re-enabled, per user decision)

`electron/main.js`:
- `devTools: true` (console available in packaged app).
- Removed `blockDevToolsShortcuts` and the old `devtools-opened` → `closeDevTools` slam.
- `before-input-event` handler: F12 / Ctrl+Shift+I / Ctrl+Shift+C / Ctrl+Shift+J open/close DevTools; opened **docked right** (`openDevTools()` without `detach`) — the user chose docked, not detached.
- F11 toggles `mainWindow.setFullScreen(!mainWindow.isFullScreen())`.
- No menu; single-instance; `contextIsolation:true`, `sandbox:true`.
- Verified in the packaged asar.

---

## 4. How to reproduce the Bug B class / verify a fix

1. Run source: `node tools/verify.js` (full load-order sandbox check — must pass).
2. Functional manual test in the running app:
   - Add a product whose unit is `mètre` → the metre quantity prompt appears; type a qty, press Enter → item added, prompt closes, typing still works everywhere.
   - Switch between checkout ↔ inventory ↔ customers ↔ settings several times while a metre prompt was recently open; confirm typing works in every view.
   - In DevTools console: `window.meterPromptActive = true` (simulate stuck) without a prompt element, wait ~1 s → watchdog should flip it back to `false` (watch for the `[watchdog]` console.warn). Verify typing is unaffected.
3. Verify the **obfuscated** output, not just source: `npm run dist`, then confirm the obfuscated scripts still load in order from the staging/asar. `tools/verify.js` only checks source, so after a rebuild you must sanity-run the affected path (search suggestions, metre flow) from the packaged app or a rebuilt staging dir.

---

## 5. Build / installers

```
npm install        # electron, electron-builder, javascript-obfuscator
npm run dist       # verify + stage + obfuscate + minify css + electron-builder -> release/
```

- `tools/build-release.js` = whole pipeline. `SAMTEX_OUTPUT` env var overrides output dir (absolute path).
- Output: `release/Vollar POS Setup 2.0.1.exe` (NSIS), `Vollar POS-portable.exe`, `builder-debug.yml`, `win-unpacked/`.
- **Keep installers** — user explicitly asked not to delete them.
- Bump `version` in `package.json` for a new installer.
- `npm run start` = run source in Electron. `npm run dist:source` = electron-builder on readable (non-obfuscated) source.

## 6. Bouton "raccourci clavier" ne déclenchait pas (fixed)

**Symptômes:** un raccourci affecté à un bouton toggle (ex. couche produit rapide) semblait ne pas fonctionner ; d'autres boutons se déclenchaient en double.

**Cause racine (double-déclenchement):** `js/button-context.js` (écouteur `keydown` enregistré au chargement du script, ligne ~602) et `js/scanner-setup.js` `setupKeyboardRedirect()` (écouteur enregistré plus tard, à l'init) sont TOUS DEUX sur `document` en phase capture. Le premier enregistré (`button-context`) déclenchait `fireShortcut` → `btn.click()`, mais `e.stopPropagation()` n'empêche PAS les autres écouteurs du même élément (`document`) : `scanner-setup` relançait `fireButtonShortcut` → 2e `btn.click()`. Pour un bouton toggle, les deux `click` s'annulaient (1→2→1) → semblant de bug. Pour d'autres boutons, double action.

**Fix 1 — trigger (button-context.js ~662):** `e.stopImmediatePropagation()` au lieu de `e.stopPropagation()` dans le chemin de déclenchement, pour que le second écouteur de scanner-setup soit supprimé.

**Fix 2 — clic parasite à l'enregistrement (button-context.js ~616):** en branchant le raccourci (`action === 'shortcut'`), `recordingShortcut` retombait à `false` (ligne 628) AVANT le tour de scanner-setup, qui lançait alors le raccourci tout juste affecté → clic immédiat du bouton au moment de l'enregistrement. Idem : `e.stopImmediatePropagation()` dans la branche d'enregistrement.

**Vérifié** (harness Electron sur sources, order réel button-context→scanner-setup, currentView=checkout) : après enregistrement aucune frappe parasite (clicks=0), déclenchement exactement 1 click pour un bouton normal ET pour le toggle de couche (`tbClicks=1`, `lbClicks=1`) — PASS avant, FAIL avant fix.

---

## 7. Open items / caveats for the next person

- **Honest limitation (unchanged):** client-side/offline code can't be made literally unreadable. Obfuscation + asar + disabled-menu is the practical ceiling; absolute secrecy needs a server (breaks offline design).
- `stringArray:false` removed string hiding — acceptable, but revisit (single-bundle concatenation) if string invisibility is ever required (see §2).
- Do NOT touch `js/qz-tray.js` (vendored LGPL) or `js/analytics-charts.js` (cohesive IIFE with shared closure). Root `themes.js` is an orphaned unused copy (active system is `js/themes-data.js` + `js/themes.js`).
- Do NOT modify `C:\Users\aker\Desktop\software pos12` — that is a different project (POS 12 confusion happened in prior sessions; ignore it).
- User-facing strings: add to `translations.fr` in `js/language-data.js` **before** the `fr` closing brace (~line 1147); run `node tools/verify.js` after edits.
- After changing build settings, always verify the **obfuscated** output loads (verify.js only covers source).

---

## 8. Session timeline (bullets)

- Fixed Bug A (checkout-scoping: focus.js, scanner-setup.js, cart-router.js resetScanner).
- Fixed Bug B root cause + added self-healing + watchdog (cart-meter.js).
- Re-enabled DevTools (docked) + F11 fullscreen (electron/main.js).
- Fixed obfuscation cross-file string-array collision → `stringArray:false` (tools/build-release.js) + defensive scanner-suggestions.js.
- Rebuilt 2.0.1 installers (kept). `node tools/verify.js` passes.
- Durability fix: `js/database.js` `__dbReq` now resolves on `transaction.oncomplete`, rejects on `tx.onerror`/`tx.onabort` (verified with real Chromium IndexedDB via headless Electron harness).
- Open-data-folder feature: `electron/main.js` ipcMain `open-data-folder` (shell.openPath userData), `preload.js` `window.vollarApp.openDataFolder()`, `index.html` `btn-open-data-folder` + `data-folder-path`, `js/settings.js` system wiring, fr strings.
- Two-layer quick-boxes: `js/quick-boxes.js` (`quickBoxesLayer2`, `getActiveLayer`, `switchQuickBoxesLayer`, new `btn-quick-boxes-layer` in index.html, styles in style.css, fr strings). Right-click context menu works on the toggle like other buttons.
- Racourci fix (see §6): stopImmediatePropagation in button-context trigger + recording branches (double-fire + stray-click-on-record eliminated). Verified single-click in Electron harness. `verify.js` passes.
- Created this HAR.md; deprecated TODO.md as the work log.
