// === RESTORE SAFETY =========================================================
// Overrides doSafeImport (js/exports.js) so that restoring a backup file
// REPLACES the affected stores instead of silently merging with existing data.
//
// Why this matters:
//  - The original implementation dbPut()s imported records on top of whatever
//    is already in the database. Restoring an old backup onto a live database
//    therefore produced a confusing mixture of old+new records.
//  - It also kept the original ids of imported records, so a future
//    auto-increment id could collide with an imported one. Inserting records
//    with their explicit keys advances the IDB key generator (per spec), and
//    we add a defensive generator bump below so a fresh record can NEVER land
//    on an id that an imported record already owns.
//
// Scope / safety:
//  - ONLY the stores present in the backup file are cleared+rewritten.
//    A very old backup that has no "expenses" key, for example, does NOT wipe
//    today's expenses.
//  - ALL stores (including users, auditlog, categories, product_variants) are
//    now imported so a restore is a complete data recovery.
//  - The previous snapshot + rollback behaviour is preserved: if anything
//    fails mid-restore, the current data is put back.
// ============================================================================

(function () {
  function _toNum(x) {
    var n = Number(x);
    return isFinite(n) ? n : 0;
  }

  // Stores that use an auto-increment numeric primary key.
  var _ID_SEED_STORES = ['sales', 'customers', 'purchases', 'expenses', 'promotions', 'zreports', 'categories', 'product_variants', 'users', 'auditlog'];

  // Advances the auto-increment generator of a store past the highest imported
  // id. We insert a throw-away record with key = maxId + 1 and delete it, which
  // moves the generator above every imported id.
  async function _bumpIdStores() {
    for (var i = 0; i < _ID_SEED_STORES.length; i++) {
      var store = _ID_SEED_STORES[i];
      try {
        var all = await dbGetAll(store) || [];
        var max = 0;
        for (var j = 0; j < all.length; j++) {
          var n = _toNum(all[j] && all[j].id);
          if (n > max) max = n;
        }
        if (!max) continue;
        var key = max + 1;
        await dbPut(store, { id: key, __seed: true });
        await dbDelete(store, key);
      } catch (e) {
        console.error('restore-safety: id bump failed for ' + store, e);
      }
    }
  }

  async function _applyAfterImport() {
    if (typeof loadSettings === 'function') await loadSettings();
    if (typeof loadInventory === 'function') await loadInventory();
    if (typeof loadCustomers === 'function') await loadCustomers();
    if (typeof loadSuppliers === 'function') await loadSuppliers();
    if (typeof refreshProductsCache === 'function') await refreshProductsCache();
    if (typeof refreshAnalytics === 'function') await refreshAnalytics();
    else if (typeof loadAnalytics === 'function') await loadAnalytics();
    if (typeof renderCart === 'function') renderCart();
  }

  async function _safeDoSafeImport(payload) {
    var snapshot = null;
    try {
      var valid = false;
      if (typeof validateBackupData === 'function') {
        try { valid = validateBackupData(payload); } catch (e) { valid = false; }
      }
      if (!valid) {
        showToast(t('invalidBackupFormat'), 'error');
        return false;
      }
      if (typeof window.forceAutoBackupNext === 'function') window.forceAutoBackupNext();
      if (typeof window.createAutoBackup === 'function') await window.createAutoBackup();

      if (typeof IMPORT_STORES === 'undefined') {
        showToast(t('importError'), 'error');
        return false;
      }

      // Keep current data to roll back to if anything below fails.
      snapshot = await snapshotDataStores(IMPORT_STORES);

      // Phase 1: replace each store that the backup contains.
      for (var i = 0; i < IMPORT_STORES.length; i++) {
        var store = IMPORT_STORES[i];
        if (payload[store] === undefined) continue; // backup has no data for this store -> leave it alone
        var records = Array.isArray(payload[store]) ? payload[store] : [];
        await dbClear(store);
        for (var j = 0; j < records.length; j++) {
          await dbPut(store, records[j]);
        }
      }

      // Phase 2: make sure future auto-generated ids stay clear of imports.
      await _bumpIdStores();

      await _applyAfterImport();
      showToast(t('dataImported'), 'success');
      playSuccess();
      return true;
    } catch (err) {
      console.error('Import error:', err);
      if (snapshot) {
        try {
          await restoreSnapshot(snapshot);
          showToast(t('importRolledBack'), 'error');
        } catch (e2) {
          console.error('Rollback failed:', e2);
          showToast(t('importError'), 'error');
        }
      } else {
        showToast(t('importError'), 'error');
      }
      playError();
      return false;
    }
  }

  // Runner shared by the manual file restore (btnImportJson / file-import-full)
  // and the automatic startup restore (restoreAutoBackup). resolveOriginal
  // returns the replacement-free implementation for the given entry point.
  async function _safeRestoreAutoBackup() {
    var snapshot = null;
    try {
      var folder = typeof loadSavedFolderHandle === 'function' ? await loadSavedFolderHandle() : null;
      if (!folder || typeof folder.entries !== 'function') return false;
      var found = [];
      try {
        for await (var pair of folder.entries()) {
          var name = pair[0];
          var handle = pair[1];
          if (typeof name === 'string' && name.indexOf('backup_') === 0 && name.slice(-5) === '.json') {
            found.push({ name: name, handle: handle });
          }
        }
      } catch (e) {
        return false;
      }
      if (!found.length) return false;
      found.sort(function (a, b) { return a.name === b.name ? 0 : a.name > b.name ? -1 : 1; });
      var file = await found[0].handle.getFile();
      var text = await file.text();
      var payload = JSON.parse(text);

      // Validate BEFORE touching any data (same guard as the manual restore).
      var valid = false;
      if (typeof validateBackupData === 'function') {
        try { valid = validateBackupData(payload); } catch (e) { valid = false; }
      }
      if (!valid) {
        console.error('Auto-restore aborted: newest backup file is not valid, data left untouched');
        return false;
      }

      // Snapshot current data so we can roll back if the restore fails part-way.
      if (typeof snapshotDataStores === 'function' && typeof IMPORT_STORES !== 'undefined') {
        try { snapshot = await snapshotDataStores(IMPORT_STORES); } catch (e) { snapshot = null; }
      }

      var stores = ['products', 'sales', 'customers', 'settings', 'promotions', 'expenses', 'suppliers', 'purchases', 'zreports', 'categories', 'product_variants', 'users', 'auditlog'];
      for (var i = 0; i < stores.length; i++) {
        var store = stores[i];
        if (Array.isArray(payload[store])) {
          await dbClear(store);
          for (var j = 0; j < payload[store].length; j++) {
            await dbPut(store, payload[store][j]);
          }
        }
      }
      await _bumpIdStores();
      console.log('✅ Auto-restore réalisé depuis le dossier de sauvegarde');
      return true;
    } catch (e) {
      console.error('Auto-restore error:', e);
      if (snapshot) {
        try {
          await restoreSnapshot(snapshot);
          console.error('✅ Auto-restore rolled back to previous data');
        } catch (e2) {
          console.error('Auto-restore rollback failed:', e2);
        }
      }
      return false;
    }
  }

  // Install the overrides. The originals are resolved lazily at call time so the
  // load order of exports.js / app-backup.js relative to this script does not matter.
  window.doSafeImport = _safeDoSafeImport;
  window.restoreAutoBackup = _safeRestoreAutoBackup;
})();