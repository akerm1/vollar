// ============================================================
// BUILD RELEASE — Secured Electron build with obfuscated JS
// Usage: npm run dist
// ============================================================
'use strict';

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const JavaScriptObfuscator = require('javascript-obfuscator');

const ROOT      = path.resolve(__dirname, '..');
// Per-build unique staging dir (avoids colliding with a leftover/locked
// staging folder from a previous run or interrupted build).
const STAGING   = path.join(ROOT, '_build_staging_' + Date.now());
// Installer output dir (computed in stage()); used for the latest.yml check.
let OUTPUT_DIR  = null;
const JS_SRC    = path.join(ROOT, 'js');
const ELECTRON  = path.join(ROOT, 'electron');
const BUILD_DIR = path.join(ROOT, 'build');

// ── Files to copy to staging (relative to ROOT) ────────────────
const STAGE_FILES = [
  'index.html',
  'style.css',
  'classic-pos.css',
  'modern-enhancements.css',
  'modern-views.css',
  'icon.svg',
];
const STAGE_DIRS = ['js', 'electron'];

// ── Obfuscator settings: fast & hard-to-read ───────────────────
// renameGlobals MUST be false — cross-file globals (top-level
// function declarations, window.x exports) are called by name.
// renameProperties MUST be false — dynamic property access
// (DOM.*, p.barcode, template inline handlers) break otherwise.
// No dead-code / control-flow flattening — keeps POS fast.
const OBSFUSCATOR_OPTIONS = {
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false,
  renameProperties: false,
  selfDefending: false,
  simplify: true,
  splitStrings: false,
  // stringArray is DISABLED. Each obfuscated file declares a top-level
  // `function _0x412b` (the string-array decoder) with the SAME name, and all
  // scripts load into ONE shared global scope (no modules). The decoders
  // collide on the global name, so a function from file A calls the decoder
  // from whichever file defined it last, which indexes A's DECODER against a
  // DIFFERENT string array -> out-of-range -> undefined -> runtime TypeError
  // (e.g. "Cannot read properties of undefined (reading 'charAt')" during
  // applyStructure). A load-order check (verify.js) does NOT catch this — it
  // only fails at runtime. Keeping stringArray:false avoids the collision;
  // control-flow, identifier renaming and DevTools-disable still obfuscate.
  // renameGlobals/renameProperties stay false — cross-file globals + dynamic
  // property access (DOM.*, p.barcode, inline onclick) must keep their names.
  stringArray: false,
  stringArrayCallsTransform: false,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: false,
  stringArrayRotate: false,
  stringArrayShuffle: false,
  stringArrayWrappersCount: 1,
  stringArrayWrappersChainedCalls: false,
  stringArrayWrappersParametersMaxCount: 2,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 1,
  target: 'browser',
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
};

// ── Helpers ─────────────────────────────────────────────────────
function rimrafSync(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

// True when another process (e.g. VS Code) has the file open in a way that
// blocks REPLACE/DELETE — same access electron-builder needs to empty the
// output dir (error: "being used by another process"). A write-open probe is
// NOT enough (shared write locks still block delete); rename is the exact
// FILE_SHARE_DELETE probe electron-builder's removal would use.
function isFileLocked(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const probe = filePath + '.lockprobe';
  try {
    fs.renameSync(filePath, probe);
    fs.renameSync(probe, filePath);
    return false;
  } catch (e) {
    try { if (fs.existsSync(probe)) fs.renameSync(probe, filePath); } catch (e2) {}
    return true;
  }
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDirRecursive(src, dest, skipNames) {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (skipNames && skipNames.includes(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath, skipNames);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

// ── Sync APP_VERSION into the staged config.js ──────────────────
// package.json version is the single source of truth; rewrite the
// staged js/core/config.js so APP_VERSION always matches the release.
function syncAppVersion(version) {
  const cfg = path.join(STAGING, 'js', 'core', 'config.js');
  if (!fs.existsSync(cfg)) return;
  let code = fs.readFileSync(cfg, 'utf8');
  const before = code;
  code = code.replace(/APP_VERSION='[^']*'/, `APP_VERSION='${version}'`);
  if (code !== before) {
    fs.writeFileSync(cfg, code, 'utf8');
    console.log('  APP_VERSION synced to ' + version);
  }
}

// ── Stage the project ───────────────────────────────────────────
function stage() {
  console.log('📦 Staging project...');
  rimrafSync(STAGING);

  for (const f of STAGE_FILES) {
    const src = path.join(ROOT, f);
    if (fs.existsSync(src)) copyFile(src, path.join(STAGING, f));
  }
  // Icons live in build/ — copy them into the staging root (skip any
  // leftover staging junk that may exist inside build/).
  for (const icon of ['icon.ico', 'icon.png']) {
    const src = path.join(ROOT, 'build', icon);
    if (fs.existsSync(src)) copyFile(src, path.join(STAGING, icon));
  }
  for (const d of STAGE_DIRS) {
    const src = path.join(ROOT, d);
    if (fs.existsSync(src)) copyDirRecursive(src, path.join(STAGING, d), ['dist', 'dist-build', 'node_modules']);
  }
  // Copy package.json with build config (used by electron-builder),
  // then adapt it to the staging layout (icons copied to staging root).
  copyFile(path.join(ROOT, 'package.json'), path.join(STAGING, 'package.json'));
  const stagedPkg = path.join(STAGING, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(stagedPkg, 'utf8'));
  if (pkg.build && pkg.build.win && pkg.build.win.icon) {
    pkg.build.win.icon = path.basename(pkg.build.win.icon);
  }
  // Output installers directly into the ROOT release/ folder (or a custom
  // output dir via the SAMTEX_OUTPUT env var; VOLLAR_OUTPUT kept as a legacy
  // alias) so they don't get buried in the (temp) staging dir.
  if (pkg.build && pkg.build.directories) {
    pkg.build.directories.output = process.env.SAMTEX_OUTPUT
      ? path.resolve(process.env.SAMTEX_OUTPUT)
      : process.env.VOLLAR_OUTPUT
        ? path.resolve(process.env.VOLLAR_OUTPUT)
        : path.join(ROOT, 'release');
  }
  fs.writeFileSync(stagedPkg, JSON.stringify(pkg, null, 2), 'utf8');
  OUTPUT_DIR = pkg.build.directories.output;
  syncAppVersion(pkg.version);
  console.log('  Staged: index.html, css, js/, electron/, icons, package.json');

  // VS Code (or anything else) may map win-unpacked/resources/app.asar from a
  // previous build, which makes electron-builder fail to empty the output dir.
  // Detect it now and fall back to a temp output dir so the build never breaks.
  if (process.platform === 'win32' && OUTPUT_DIR) {
    const lockedAsar = path.join(OUTPUT_DIR, 'win-unpacked', 'resources', 'app.asar');
    if (fs.existsSync(lockedAsar) && isFileLocked(lockedAsar)) {
      const fallback = path.join(process.env.TEMP || '.', 'pos-release_' + Date.now());
      console.log('  ⚠ ' + outputRelative(lockedAsar) + ' is locked by another process (VS Code?).');
      console.log('  ⚠ Building into ' + fallback + ' instead of ' + OUTPUT_DIR + '.\n');
      fs.mkdirSync(fallback, { recursive: true });
      const stagedPkg2 = path.join(STAGING, 'package.json');
      const pkg2 = JSON.parse(fs.readFileSync(stagedPkg2, 'utf8'));
      pkg2.build.directories.output = fallback;
      fs.writeFileSync(stagedPkg2, JSON.stringify(pkg2, null, 2), 'utf8');
      OUTPUT_DIR = fallback;
    }
  }
}

function outputRelative(p) {
  return path.relative(ROOT, p) || p;
}

// ── Recursively list js files (relative paths, e.g. 'core/config.js') ──
function listJsFiles(dir) {
  const out = [];
  const walk = (d, prefix) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const rel = prefix ? prefix + '/' + entry.name : entry.name;
      if (entry.isDirectory()) walk(path.join(d, entry.name), rel);
      else if (entry.name.endsWith('.js')) out.push(rel);
    }
  };
  walk(dir, '');
  return out.sort();
}

// ── Obfuscate all JS files ──────────────────────────────────────
function obfuscateJS() {
  const jsStage = path.join(STAGING, 'js');
  const files = listJsFiles(jsStage);
  console.log(`🔒 Obfuscating ${files.length} JS files...`);

  for (const f of files) {
    const filePath = path.join(jsStage, f);
    const code = fs.readFileSync(filePath, 'utf8');

    const result = JavaScriptObfuscator.obfuscate(code, {
      ...OBSFUSCATOR_OPTIONS,
      inputFileName: f,
      sourceMap: false,
    });

    fs.writeFileSync(filePath, result.getObfuscatedCode(), 'utf8');
    process.stdout.write(`  ${f}\n`);
  }
  console.log('  Done.');
  obfuscateShell();
}

// ── Obfuscate the Electron shell (main + preload) ───────────────
// Same identifier-only settings as js/ (renameGlobals/renameProperties off):
// the renderer talks to the shell ONLY through property access
// (`vollarApp.openDataFolder(...)`), and IPC channel names are strings, so
// none of the externally-visible names change. This keeps the packaged
// main.js/preload.js unreadable like the rest of the app.
function obfuscateShell() {
  const shellFiles = ['main.js', 'preload.js'];
  console.log('🔒 Obfuscating Electron shell...');
  for (const f of shellFiles) {
    const filePath = path.join(STAGING, 'electron', f);
    if (!fs.existsSync(filePath)) continue;
    const code = fs.readFileSync(filePath, 'utf8');
    const result = JavaScriptObfuscator.obfuscate(code, {
      ...OBSFUSCATOR_OPTIONS,
      inputFileName: 'electron/' + f,
      sourceMap: false,
    });
    fs.writeFileSync(filePath, result.getObfuscatedCode(), 'utf8');
    process.stdout.write(`  electron/${f}\n`);
  }
  console.log('  Done.');
}

// ── Minify CSS (strip comments & excess whitespace) ─────────────
function minifyCSS() {
  const cssFiles = STAGE_FILES.filter(f => f.endsWith('.css'));
  console.log(`🎨 Minifying ${cssFiles.length} CSS files...`);
  for (const f of cssFiles) {
    const p = path.join(STAGING, f);
    if (!fs.existsSync(p)) continue;
    let css = fs.readFileSync(p, 'utf8');
    // Remove multi-line comments (keep single-line //)
    css = css.replace(/\/\*[\s\S]*?\*\//g, '');
    // Collapse whitespace
    css = css.replace(/\s{2,}/g, ' ').trim();
    fs.writeFileSync(p, css, 'utf8');
  }
  console.log('  Done.');
}

// ── Run electron-builder ────────────────────────────────────────
function buildExe() {
  console.log('\n🔨 Running electron-builder...');
  // electron-builder resolves the electron binary from the project's
  // node_modules. Create a junction in the staging dir so it can find
  // the electron installed in the ROOT project (works offline, no download).
  const nodeModulesLink = path.join(STAGING, 'node_modules');
  if (!fs.existsSync(nodeModulesLink)) {
    const mkdir = (process.platform === 'win32')
      ? `cmd /c mklink /J "${nodeModulesLink}" "${path.join(ROOT, 'node_modules')}"`
      : `ln -s "${path.join(ROOT, 'node_modules')}" "${nodeModulesLink}"`;
    execSync(mkdir, { cwd: ROOT, stdio: 'inherit' });
  }
  // --publish never: generate update metadata (latest.yml / .blockmap) but
  // never upload (uploading happens manually via gh release or the web UI).
  const cmd = 'npx electron-builder --publish never';
  console.log('  ' + cmd + ' (cwd=' + STAGING + ')');
  execSync(cmd, { cwd: STAGING, stdio: 'inherit' });
}

// ── Verify update metadata was produced ─────────────────────────
function checkUpdateMetadata() {
  const latestYml = path.join(OUTPUT_DIR, 'latest.yml');
  if (fs.existsSync(latestYml)) {
    console.log('  ✅ latest.yml present — auto-update feed is ready.');
  } else {
    console.warn('  ⚠ latest.yml NOT generated. Auto-update will not work;');
    console.warn('    check the "publish" block in package.json build config.');
  }
}

// ── MAIN ─────────────────────────────────────────────────────────
function main() {
  console.log('=== Vollar POS — Secured Build ===\n');

  // Verify source first
  console.log('Running verify.js on source...');
  try {
    execSync('node tools/verify.js', { cwd: ROOT, stdio: 'inherit' });
  } catch (e) {
    console.error('❌ Source verification failed. Aborting.');
    process.exit(1);
  }
  console.log('');

  stage();
  obfuscateJS();
  minifyCSS();

  console.log('');
  buildExe();
  checkUpdateMetadata();

  // Cleanup staging (best-effort — electron-builder may leave locked files)
  console.log('\n🧹 Cleaning staging dir...');
  try {
    const nm = path.join(STAGING, 'node_modules');
    if (process.platform === 'win32' && fs.existsSync(nm)) {
      try { execSync(`cmd /c rmdir "${nm}"`); } catch (_) { /* junction already gone */ }
    }
    rimrafSync(STAGING);
    console.log('  staging cleaned.');
  } catch (e) {
    console.log('  ⚠ staging cleanup incomplete (locked file) — safe to remove later:', e.message);
  }
  console.log('✅ Build complete. Check release/ for new installers.\n');
}

main();
