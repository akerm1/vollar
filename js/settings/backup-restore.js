// === RESTORE PANEL (desktop) ================================================
// Listed in Paramètres: finds the app's backup files (dossier d'export horaire
// + Bureau en repli), newest first, and restores one with a single click via
// doSafeImport (validation + snapshot + rollback — the safe path).
// Desktop-only: needs the vollarApp bridge (listFiles / readBackupFile /
// deleteFile / openDataFolder). In the browser the panel is not injected;
// use the JSON import in Settings instead.
// ============================================================================
(function () {
  function _vappBR() { return (typeof vollarApp !== 'undefined') ? vollarApp : null; }
  if (!_vappBR()) return; // mode navigateur : import JSON manuel uniquement

  var _brLoaded = false;

  function _brDir() {
    var s = (typeof settings !== 'undefined' && settings) ? settings : {};
    return s.hourlyExportPath || '';
  }

  function _brFormatWhen(mtime) {
    try { return new Date(mtime).toLocaleString('fr-FR'); } catch (e) { return ''; }
  }

  // Union of the hourly export folder and the Desktop (shutdown-backup fallback),
  // deduped by file name (the hourly folder wins), newest first.
  async function _brListSources() {
    var app = _vappBR(), out = [], seen = {};
    function add(dir, files, isDesktop) {
      (files || []).forEach(function (f) {
        if (!f || !f.name || !/^(backup_|export_)[A-Za-z0-9._-]+\.json$/.test(f.name)) return;
        if (seen[f.name]) return;
        seen[f.name] = true;
        out.push({ dir: dir, name: f.name, mtime: f.mtime || 0, isDesktop: !!isDesktop });
      });
    }
    var folder = _brDir();
    if (folder && app.listFiles) {
      try { var r = await app.listFiles(folder); add(folder, r && r.files, false); } catch (e) { /* dossier illisible */ }
    }
    if (app.getDesktopPath && app.listFiles) {
      try {
        var d = await app.getDesktopPath();
        if (d && d.path) { var r2 = await app.listFiles(d.path); add(d.path, r2 && r2.files, true); }
      } catch (e) { /* pas de bureau */ }
    }
    out.sort(function (a, b) { return b.mtime - a.mtime; });
    return out;
  }

  async function _brRestore(item) {
    var app = _vappBR();
    if (!app || !app.readBackupFile) return;
    var res = null;
    try { res = await app.readBackupFile(item.dir, item.name); } catch (e) { res = null; }
    if (!res || !res.ok) { showToast(t('brListFailed'), 'error'); playError(); return; }
    var payload = null;
    try { payload = JSON.parse(res.content); } catch (e) { payload = null; }
    if (!payload) { showToast(t('invalidBackupFormat'), 'error'); playError(); return; }
    var ok = (typeof showConfirm === 'function') ? await showConfirm(t('importReplaceConfirm')) : true;
    if (!ok) return;
    showToast(t('brRestoring'), 'info');
    if (typeof doSafeImport === 'function') await doSafeImport(payload);
  }

  async function _brDelete(item) {
    var app = _vappBR();
    if (!app || !app.deleteFile) return;
    var ok = (typeof showConfirm === 'function') ? await showConfirm(t('brDeleteConfirm')) : false;
    if (!ok) return;
    try { await app.deleteFile(item.dir + '/' + item.name); } catch (e) { /* ignore */ }
    _brRender();
  }

  function _brRow(item) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 8px;border-bottom:1px solid rgba(128,128,128,.25);flex-wrap:wrap;';
    var left = document.createElement('div');
    left.style.cssText = 'flex:1;min-width:180px;';
    // item.name is strictly [A-Za-z0-9._-] (regex above) — no HTML injection.
    left.innerHTML = '<div style="font-weight:600;word-break:break-all;">' + item.name + '</div>'
      + '<div style="opacity:.75;font-size:.85em;">' + t('brWhen') + ' ' + _brFormatWhen(item.mtime)
      + ' — ' + (item.isDesktop ? t('brDesktop') : t('brFolder')) + '</div>';
    var btnR = document.createElement('button');
    btnR.type = 'button'; btnR.className = 'btn btn-primary btn-sm';
    btnR.textContent = t('brRestoreBtn');
    btnR.addEventListener('click', function () { _brRestore(item); });
    var btnD = document.createElement('button');
    btnD.type = 'button'; btnD.className = 'btn btn-sm';
    btnD.textContent = t('brDeleteBtn');
    btnD.addEventListener('click', function () { _brDelete(item); });
    row.appendChild(left); row.appendChild(btnR); row.appendChild(btnD);
    return row;
  }

  async function _brRender() {
    var list = document.getElementById('br-restore-list');
    var hint = document.getElementById('br-restore-hint');
    if (!list) return;
    if (hint) hint.textContent = t('brFolder') + ' : ' + (_brDir() || t('brDesktop'));
    list.innerHTML = '<div style="padding:8px;opacity:.8;">…</div>';
    var items = null;
    try { items = await _brListSources(); } catch (e) { items = null; }
    if (!items) {
      list.innerHTML = '<div style="padding:8px;opacity:.8;">' + t('brListFailed') + '</div>';
      return;
    }
    if (!items.length) {
      list.innerHTML = '<div style="padding:8px;opacity:.8;">' + t('brNone') + '</div>';
      return;
    }
    var frag = document.createDocumentFragment();
    items.forEach(function (it) { frag.appendChild(_brRow(it)); });
    list.innerHTML = '';
    list.appendChild(frag);
  }

  // Inject the panel at the top of Paramètres (scripts run at the end of body,
  // so the view markup already exists — same pattern as cart-name-style.js).
  (function _brInject() {
    var view = document.getElementById('view-settings');
    if (!view) return;
    var box = document.createElement('details');
    box.id = 'br-restore-box';
    box.style.cssText = 'margin:12px 0;';
    var sum = document.createElement('summary');
    sum.style.cssText = 'cursor:pointer;font-weight:700;padding:8px;';
    sum.textContent = '♻️ ' + t('brRestoreTitle');
    var body = document.createElement('div');
    body.style.cssText = 'padding:8px;';
    var hint = document.createElement('div');
    hint.id = 'br-restore-hint';
    hint.style.cssText = 'opacity:.75;font-size:.85em;margin-bottom:6px;';
    hint.textContent = t('brFolder') + ' : ' + (_brDir() || t('brDesktop'));
    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;gap:8px;margin:6px 0;flex-wrap:wrap;';
    var refresh = document.createElement('button');
    refresh.type = 'button'; refresh.className = 'btn btn-sm';
    refresh.textContent = t('brRefresh');
    refresh.addEventListener('click', function () { _brRender(); });
    var openData = document.createElement('button');
    openData.type = 'button'; openData.className = 'btn btn-sm';
    openData.textContent = t('brOpenData');
    openData.addEventListener('click', function () {
      var a = _vappBR();
      if (a && a.openDataFolder) a.openDataFolder();
    });
    bar.appendChild(refresh); bar.appendChild(openData);
    var list = document.createElement('div');
    list.id = 'br-restore-list';
    list.innerHTML = '<div style="padding:8px;opacity:.8;">' + t('brNone') + '</div>';
    body.appendChild(hint); body.appendChild(bar); body.appendChild(list);
    box.appendChild(sum); box.appendChild(body);
    view.insertBefore(box, view.firstChild);
    box.addEventListener('toggle', function () {
      if (box.open && !_brLoaded) { _brLoaded = true; _brRender(); }
    });
  })();

  window['backupRestoreRefresh'] = _brRender;
})();