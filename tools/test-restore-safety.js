/* Harness for js/core/restore-safety.js + js/settings/exports.js restore semantics. */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const LOG = [];
let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('PASS: ' + msg); }
  else { fail++; console.log('FAIL: ' + msg); }
}

function buildSandbox() {
  const stores = {
    products: [], sales: [], customers: [], settings: [],
    zreports: [], suppliers: [], purchases: [], promotions: [],
    expenses: [], users: [], auditlog: [], categories: [],
    product_variants: [],
  };
  const idSeq = {};
  Object.keys(stores).forEach((k) => { idSeq[k] = 1; });
  const clearLog = [];
  const seedLog = [];

  const sandbox = {
    console,
    setInterval: () => 0, clearInterval: () => 0,
    setTimeout: (f) => 0, Math, Date, JSON, Promise, Array, Object, String, Number, parseInt, parseFloat, isFinite, RegExp,
    t: (k, v) => (v && k === 'supplierBillDateTitle') ? 'Facture du ' + v.date : (k),
    showToast: (m, type) => { sandbox.__lastToast = { m, type }; },
    playSuccess: () => { sandbox.__playedSuccess = true; },
    playError: () => { sandbox.__playedError = true; },
    dbGetAll: async (store) => JSON.parse(JSON.stringify(stores[store] || [])),
    dbGet: async (store, key) => {
      const arr = stores[store] || [];
      return JSON.parse(JSON.stringify(arr.find((o) => String(o.id) === String(key)))) || null;
    },
    dbPut: async (store, obj) => {
      if (obj && obj.__seed === true) seedLog.push(store);
      const arr = stores[store];
      const copy = JSON.parse(JSON.stringify(obj || {}));
      if (copy && copy.id === undefined) {
        copy.id = idSeq[store]++;
      } else if (copy && typeof copy.id === 'number') {
        // Emulate the IndexedDB key generator: an explicit key at or above the
        // current number moves the generator to key + 1.
        if (copy.id >= idSeq[store]) idSeq[store] = copy.id + 1;
      }
      const i = arr.findIndex((o) => String(o.id) === String(copy.id));
      if (i >= 0) arr[i] = copy; else arr.push(copy);
      return copy.id;
    },
    dbDelete: async (store, key) => {
      const arr = stores[store];
      const i = arr.findIndex((o) => String(o.id) === String(key));
      if (i >= 0) arr.splice(i, 1);
    },
    dbClear: async (store) => {
      clearLog.push(store);
      stores[store] = [];
    },
    loadSettings: async () => {},
    loadInventory: async () => {},
    loadCustomers: async () => {},
    loadSuppliers: async () => {},
    refreshProductsCache: async () => {},
    refreshAnalytics: async () => {},
    loadAnalytics: async () => {},
    renderCart: () => {},
    createAutoBackup: async () => {},
    __stores: stores,
    __clearLog: clearLog,
    __seedLog: seedLog,
  };
  sandbox.window = sandbox;
  return sandbox;
}

function load(sandbox, file) {
  const code = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: file });
}

/* ============ TEST A: clean replace, survivors kept, ids seeded ============ */
(async function () {
  const s = buildSandbox();
  load(s, 'js/settings/exports.js');
  load(s, 'js/core/restore-safety.js');

  // Pre-existing live data (what the shop currently has).
  s.__stores.products.push({ barcode: 'P1', name: 'Old', stock: 5 });
  s.__stores.products.push({ barcode: 'P2', name: 'Old2', stock: 3 });
  s.__stores.sales.push({ id: 900, grandTotal: 100 });
  s.__stores.customers.push({ id: 500, name: 'OldCustomer' });
  s.__stores.suppliers.push({ id: 77, name: 'OldSup' });
  s.__stores.purchases.push({ id: 90, type: 'reception', supplierId: 77, totalCost: 90 });
  s.__stores.expenses.push({ id: 600, label: 'pending' });
  s.__stores.users.push({ id: 1, name: 'Admin', pinHash: 'x' });

  // Old backup: different content, contains purchases+suppliers, NO expenses key.
  const payload = {
    version: '2.0',
    products: [{ barcode: 'N1', name: 'New', stock: 1 }],
    sales: [{ id: 1, timestamp: '2020-01-01', grandTotal: 7 }],
    customers: [{ id: 2, name: 'NewCust' }],
    suppliers: [{ id: 3, name: 'NewSup' }],
    purchases: [{ id: 4, type: 'reception', supplierId: 3, totalCost: 100, items: ['a'] }],
    zreports: [{ id: 5 }],
    promotions: [],
  };

  const res = await s.doSafeImport(payload);

  ok(res === true, 'doSafeImport returns true (old backup accepted)');
  ok(s.__playedSuccess === true, 'success sound played');
  ok(s.__lastToast && s.__lastToast.m === 'dataImported', 'dataImported toast shown');

  // Stores present in backup were cleared + replaced (no merge).
  ok(s.__stores.products.length === 1 && s.__stores.products[0].barcode === 'N1', 'products fully replaced (no old leftover)');
  ok(s.__stores.sales.length === 1 && s.__stores.sales[0].id === 1, 'sales fully replaced (no old leftover)');
  ok(s.__stores.customers.length === 1 && s.__stores.customers[0].id === 2, 'customers fully replaced');
  ok(s.__stores.suppliers.length === 1 && s.__stores.suppliers[0].id === 3, 'suppliers fully replaced');
  ok(s.__stores.purchases.length === 1 && s.__stores.purchases[0].id === 4, 'purchases fully replaced');
  ok(s.__stores.zreports.length === 1 && s.__stores.zreports[0].id === 5, 'zreports fully replaced');
  ok(s.__stores.promotions.length === 0, 'empty promotions array is authoritative (cleared)');

  // Stores NOT in the backup survive.
  ok(s.__stores.expenses.length === 1 && s.__stores.expenses[0].id === 600, 'expenses (missing in backup) NOT wiped');
  ok(s.__stores.users.length === 1, 'users store untouched (login profiles survive)');

  // Every present store got dbClear'd; missing/absent stores did not.
  ok(s.__clearLog.indexOf('products') >= 0, 'products cleared');
  ok(s.__clearLog.indexOf('sales') >= 0, 'sales cleared');
  ok(s.__clearLog.indexOf('expenses') < 0, 'expenses not cleared (no key in backup)');

  // The id generator bump ran for id-keyed stores that contain imported ids.
  ok(s.__seedLog.indexOf('sales') >= 0, 'id seed bump ran for sales');
  ok(s.__seedLog.indexOf('purchases') >= 0, 'id seed bump ran for purchases');

  // New records created after the restore get fresh ids (no reuse of imported ids).
  const newSaleId = await s.dbPut('sales', { grandTotal: 50 });
  ok(newSaleId !== 1 && newSaleId > 1, 'new sale id ' + newSaleId + ' does not collide with imported id 1');
})();

/* ============ TEST B: rollback on mid-import failure ============ */
(async function () {
  const s = buildSandbox();
  load(s, 'js/settings/exports.js');
  load(s, 'js/core/restore-safety.js');

  s.__stores.products.push({ barcode: 'KEEP', name: 'Survivor', stock: 9 });
  s.__stores.sales.push({ id: 42, grandTotal: 1 });

  // Make the import fail midway: any put into 'purchases' throws.
  const realPut = s.dbPut;
  s.dbPut = async (store, obj) => {
    if (store === 'purchases') throw new Error('simulated storage failure');
    return realPut(store, obj);
  };

  const payload = {
    products: [{ barcode: 'N1', name: 'New', stock: 1 }],
    purchases: [{ id: 4, type: 'reception', supplierId: 3, totalCost: 100 }],
  };
  const res = await s.doSafeImport(payload);

  ok(res === false, 'doSafeImport reports failure');
  ok(s.__playedError === true, 'error sound played on failure');
  ok(s.__lastToast && s.__lastToast.m === 'importRolledBack', 'rollback toast shown');
  ok(s.__stores.products.length === 1 && s.__stores.products[0].barcode === 'KEEP', 'products rolled back to pre-restore state');
  ok(s.__stores.sales.length === 1 && s.__stores.sales[0].id === 42, 'sales rolled back to pre-restore state');
})();

/* ============ TEST C: invalid backup rejected ============ */
(async function () {
  const s = buildSandbox();
  load(s, 'js/settings/exports.js');
  load(s, 'js/core/restore-safety.js');
  const res = await s.doSafeImport({ version: '2.0', products: 'not-an-array' });
  ok(res === false, 'malformed backup rejected (validateBackupData)');
  ok(s.__lastToast && s.__lastToast.m === 'invalidBackupFormat', 'invalid-format toast shown');
})();

setTimeout(function () {
  console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
}, 400);