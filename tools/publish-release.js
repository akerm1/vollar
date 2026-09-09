// ============================================================
// PUBLISH RELEASE — build installers + upload to GitHub
// Usage: npm run release   (or: node tools/publish-release.js)
// Flags: --skip-dist     skip the build, upload what's in release/
//        --dry-run       print what would be done, do nothing
// ============================================================
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT       = path.resolve(__dirname, '..');
const PKG        = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const VERSION    = PKG.version;
const TAG        = 'v' + VERSION;

// Output dir: mirror build-release.js (SAMTEX_OUTPUT / VOLLAR_OUTPUT).
const OUTPUT_DIR = process.env.SAMTEX_OUTPUT || process.env.VOLLAR_OUTPUT || path.join(ROOT, 'release');

const EXE       = path.join(OUTPUT_DIR, `Vollar-POS-Setup-${VERSION}.exe`);
const BLOCKMAP  = EXE + '.blockmap';
const LATEST    = path.join(OUTPUT_DIR, 'latest.yml');

const SKIP_DIST = process.argv.includes('--skip-dist');
const DRY_RUN   = process.argv.includes('--dry-run');

function log(msg) { console.log(msg); }

function fail(msg) { console.error('\n❌ ' + msg); process.exit(1); }

// Resolve the gh binary (PATH may not include it yet after install).
function findGh() {
    if (process.env.GH) return process.env.GH;
    try { execSync('gh --version', { stdio: 'ignore' }); return 'gh'; } catch (e) {}
    const winGet = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages');
    if (fs.existsSync(winGet)) {
        const found = [];
        const walk = (dir) => {
            if (!fs.existsSync(dir)) return;
            for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
                const p = path.join(dir, e.name);
                if (e.isDirectory()) walk(p);
                else if (e.name === 'gh.exe') found.push(p);
            }
        };
        walk(winGet);
        if (found.length) return found[found.length - 1];
    }
    return null;
}

const GH = findGh();
if (!GH) {
    fail('GitHub CLI (gh) introuvable. Installez-le (winget install GitHub.cli) puis lancez "gh auth login".');
}

log('=== Vollar POS — Release ' + VERSION + ' ===\n');

// 1. Build installers + update metadata
if (!SKIP_DIST) {
    log('🔨 Building (npm run dist)...\n');
    try {
        execSync('npm run dist', { cwd: ROOT, stdio: 'inherit' });
    } catch (e) {
        fail('Le build a échoué. Corrigez l\'erreur puis relancez "npm run release".');
    }
} else {
    log('⏭️  Skipping build (--skip-dist).');
}

// 2. Verify assets exist
const missing = [EXE, BLOCKMAP, LATEST].filter(f => !fs.existsSync(f));
if (missing.length) {
    fail('Fichiers manquants dans ' + OUTPUT_DIR + ' :\n  ' + missing.join('\n  ') + '\nRelancez sans --skip-dist.');
}
for (const f of [LATEST, BLOCKMAP, EXE]) log('  ok ' + path.basename(f));

// 3. Refuse to overwrite an existing release (version must be bumped)
log('\n🔍 Vérification de la release existante...');
try {
    execSync(`"${GH}" release view ${TAG} --repo ${PKG.build.publish.owner}/${PKG.build.publish.repo}`, { stdio: 'ignore' });
    fail('La release ' + TAG + ' existe déjà. Incrémentez "version" dans package.json puis relancez.');
} catch (e) { /* not found — good */ }
log('  ok ' + TAG + ' est libre.');

// 4. Create + upload
log('\n🚀 Création de la release ' + TAG + '...');
const cmd = `"${GH}" release create ${TAG} --repo ${PKG.build.publish.owner}/${PKG.build.publish.repo} --title "Vollar POS ${VERSION}" --notes "Release automatique via npm run release." --latest "${EXE}" "${BLOCKMAP}" "${LATEST}"`;

if (DRY_RUN) {
    log('\n[DRY-RUN] Commande :\n  ' + cmd + '\n');
    log('✅ Rien n\'a été publié (--dry-run).');
    process.exit(0);
}

try {
    const url = execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim();
    log('\n✅ Publication terminée : ' + url);
    log('   Les machines installées proposeront la mise à jour au prochain check.');
} catch (e) {
    fail('gh release create a échoué :\n' + (e.stderr ? e.stderr.toString() : e.message));
}