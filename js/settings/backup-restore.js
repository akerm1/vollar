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
    var autoFolder = (settings && settings.autoBackupPath) || '';
    if (autoFolder && autoFolder !== folder && app.listFiles) {
      try { var ra = await app.listFiles(autoFolder); add(autoFolder, ra && ra.files, false); } catch (e) { /* dossier illisible */ }
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
    btnD.type = 'button'; btnD.className = 'btn btn-danger btn-sm';
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
    _brCap(list);
  }

  // Show at most 5 backups before the list scrolls. The cap height is the
  // measured combined height of the first 5 rows, so exactly 5 stay visible no
  // matter the row wrapping; falls back to a fixed value when the settings view
  // is still hidden at first render (offsetHeight reads 0 then).
  function _brCap(list) {
    var rows = list.children;
    if (!rows.length || rows.length <= 5) return;
    var h = 0;
    for (var i = 0; i < 5 && i < rows.length; i++) h += rows[i].offsetHeight;
    if (!h) h = 260;
    list.style.maxHeight = h + 'px';
    list.style.overflowY = 'auto';
  }

  // Inject the panel INSIDE the native « Restauration & Import » settings card
  // (same classes as the rest of Paramètres: form-group / btn-row / btn-*).
  // Scripts run at the end of body, so the settings markup already exists.
  (function _brInject() {
    var fileInput = document.getElementById('file-import-full');
    var host = fileInput ? fileInput.closest('.settings-card-body') : null;
    if (!host) {
      var view = document.getElementById('view-settings');
      if (!view) return;
      host = document.createElement('div');
      host.className = 'settings-card-body';
      var card = document.createElement('div');
      card.className = 'settings-card';
      card.appendChild(host);
      view.insertBefore(card, view.firstChild);
    }

    var group = document.createElement('div');
    group.className = 'form-group full';
    group.id = 'br-restore-group';
    group.style.marginTop = '12px';

    var label = document.createElement('label');
    label.textContent = t('brDetectedLabel');
    group.appendChild(label);

    var desc = document.createElement('p');
    desc.style.cssText = 'font-size:12px;opacity:.75;margin:4px 0 8px;';
    desc.textContent = t('brPanelDesc');
    group.appendChild(desc);

    var hint = document.createElement('div');
    hint.id = 'br-restore-hint';
    hint.style.cssText = 'font-size:12px;opacity:.75;margin-bottom:8px;';
    hint.textContent = t('brFolder') + ' : ' + (_brDir() || t('brDesktop'));
    group.appendChild(hint);

    var list = document.createElement('div');
    list.id = 'br-restore-list';
    list.innerHTML = '<div style="padding:8px;opacity:.8;">' + t('brNone') + '</div>';
    group.appendChild(list);

    var bar = document.createElement('div');
    bar.className = 'btn-row';
    bar.style.marginTop = '10px';
    var refresh = document.createElement('button');
    refresh.type = 'button'; refresh.className = 'btn btn-secondary btn-sm';
    refresh.textContent = t('brRefresh');
    refresh.addEventListener('click', function () { _brRender(); });
    var openData = document.createElement('button');
    openData.type = 'button'; openData.className = 'btn btn-secondary btn-sm';
    openData.textContent = t('brOpenData');
    openData.addEventListener('click', function () {
      var a = _vappBR();
      if (a && a.openDataFolder) a.openDataFolder();
    });
    bar.appendChild(refresh); bar.appendChild(openData);
    group.appendChild(bar);

    host.appendChild(group);
    _brRender();
  })();

  window['backupRestoreRefresh'] = _brRender;

  // Exposed for the crash-recovery flow (maybeOfferCrashRestore) and reused by
  // any future callers: newest-first list of the app's own backup files.
  window['backupRestoreListSources'] = _brListSources;

  // === CRASH / POWER-LOSS RECOVERY ==========================================
  // Called once at startup (see app-init.js). If the previous run did not quit
  // cleanly (electron/main.js session.marker), we:
  //   - restore the newest backup automatically ONLY when the database is empty
  //     (crash wiped / it was never populated) — a real, safe recovery;
  //   - otherwise just notify: IndexedDB is the durable source of truth and
  //     rolling it back to a backup would silently discard newer sales.
  // All restores go through doSafeImport (validation + snapshot + rollback).
  async function maybeOfferCrashRestore() {
    var app = _vappBR();
    if (!app || !app.getCrashFlag) return; // browser mode: N/A
    var crashed = false;
    try { crashed = await app.getCrashFlag(); } catch (e) { crashed = false; }
    if (!crashed) return; // previous run quit cleanly

    var dbEmpty = false;
    try {
      var prods = await dbGetAll('products');
      var sales = await dbGetAll('sales');
      dbEmpty = !prods.length && !sales.length;
    } catch (e) { dbEmpty = false; }

    if (dbEmpty) {
      var items = [];
      try { items = await _brListSources(); } catch (e) { items = []; }
      if (!items.length) {
        showToast(t('crashNotifyNoBackup') || 'Aucune sauvegarde trouvée à restaurer.', 'info');
        return;
      }
      var ok = await showConfirm(t('crashRestoreEmptyBody') || 'Arrêt anormal détecté. La base est vide — restaurer le dernier backup ?', { title: t('crashRestoreTitle') || 'Récupération après arrêt anormal' });
      if (!ok) return;
      await _brRestore(items[0]);
      return;
    }

    showToast(t('crashNotify') || 'L\'arrêt précédent était anormal, mais vos données sont intactes. Les backups sont dans Paramètres > Restauration.', 'info');
  }
  window['maybeOfferCrashRestore'] = maybeOfferCrashRestore;
})();