/* Harness: double-submit lock on completeTransaction (js/transactions/transaction.js). */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

let pass = 0, fail = 0;
function ok(cond, msg) {
  if (cond) { pass++; console.log('PASS: ' + msg); }
  else { fail++; console.log('FAIL: ' + msg); }
}

function buildSandbox() {
  const stores = { products: [], sales: [], product_variants: [] };
  const idSeq = { products: 1, sales: 1, product_variants: 1 };

  const sandbox = {
    console,
    setInterval: () => 0, clearInterval: () => 0,
    setTimeout: (f) => 0, Math, Date, JSON, Promise, Array, Object, String, Number, parseInt, parseFloat, isFinite, RegExp, Map,
    DOM: {
      customerSelect: { value: '' },
      amountPaidInput: { value: '0' },
      btnComplete: { disabled: false },
    },
    document: { getElementById: (id) => (id === 'btn-quick-customer-mode' ? sandbox.__qcmBtn : null) },
    t: (k, v) => {
      const map = {
        waitTransaction: 'Vente en cours...', cartEmpty: 'Panier vide',
        transactionCompleteMsg: 'Vente {total} {currency} (profit {profit})',
        transactionFailed: 'Erreur: {error}', insufficientStock: 'Stock {name}',
        stockWarning: 'Attention {name}', saleCreditNeedsClient: 'Client requis',
        quickCustomerBtn: 'Client rapide', statusPaid: 'payé',
      };
      let s = map[k] || k;
      if (v) for (const p in v) s = s.split('{' + p + '}').join(String(v[p]));
      return s;
    },
    showToast: (m, type) => { sandbox.__toasts.push({ m, type }); },
    playSuccess: () => { sandbox.__plays++; },
    playError: () => { sandbox.__errors++; },
    playWarning: () => {},
    paymentStatus: 'paid',
    paymentMethod: 'especes',
    askCustomerModalOpen: false,
    customerAskShown: false,
    currentView: 'checkout',
    customers: [],
    settings: {
      askCustomerEnabled: false, negativeStock: 'prevent', currency: 'DA',
      printAutoEnabled: false, autoBackupEnabled: false,
    },
    getActiveCartTarget: () => 'main',
    getActiveCart: (quick) => (quick ? sandbox.quickCart || [] : sandbox.cart || []),
    calculateTotals: () => ({ subtotal: 100, vat: 0, discount: 0, grandTotal: 100, itemDiscounts: new Map() }),
    getPaymentMethodData: () => ({ method: 'especes', details: {} }),
    round2: (n) => Math.round(n * 100) / 100,
    round6: (n) => Math.round(n * 1000000) / 1000000,
    formatPrice: (n) => String(n),
    ensureUnitStockForSale: async () => [],
    rollbackUnitOpens: async () => {},
    renderCart: () => {}, onFastClientSold: () => {}, renderFastMoney: () => {},
    updatePaymentStatusDisplay: () => {}, resetPaymentMethod: () => {},
    updateLastScannedItem: () => {}, resetScanner: () => {},
    createAutoBackup: async () => {},
    logAudit: async () => {},
    refreshAnalytics: async () => {}, loadAnalytics: async () => {},
    loadCustomers: () => {},
    openAskCustomerModal: () => { sandbox.askCustomerModalOpen = true; },
    dbGet: async (store, key) => {
      const arr = stores[store] || [];
      const found = arr.find((o) => String(o.barcode === undefined ? o.id : o.barcode) === String(key));
      return found ? JSON.parse(JSON.stringify(found)) : null;
    },
    dbGetAll: async (store) => JSON.parse(JSON.stringify(stores[store] || [])),
    dbMultiOp: async (ops) => {
      await new Promise((r) => setTimeout(r, 15)); // real I/O-like delay -> race would hit without the lock
      sandbox.__multiOps++;
      const results = [];
      for (let i = 0; i < ops.length; i++) {
        const op = ops[i];
        if (op.op === 'getAll') {
          results.push(JSON.parse(JSON.stringify(stores[op.store] || [])));
        } else if (op.op === 'get') {
          const arr = stores[op.store] || [];
          const found = arr.find((o) => String(o.barcode === undefined ? o.id : o.barcode) === String(op.key));
          results.push(found ? JSON.parse(JSON.stringify(found)) : null);
        } else if (op.op === 'put') {
          let val = op.value;
          if (op.valueBuilder) val = op.valueBuilder(results);
          if (val) {
            const arr = stores[op.store];
            const kk = String(val.barcode === undefined ? val.id : val.barcode);
            const idx = arr.findIndex((o) => String(o.barcode === undefined ? o.id : o.barcode) === kk);
            if (idx >= 0) arr[idx] = JSON.parse(JSON.stringify(val)); else arr.push(JSON.parse(JSON.stringify(val)));
          }
          results.push(val);
        }
      }
      return results;
    },
    __toasts: [],
    __multiOps: 0,
    __plays: 0,
    __errors: 0,
    __qcmBtn: { textContent: '', classList: { add() {}, remove() {} } },
    cart: [],
    quickCart: [],
    __stores: stores,
  };
  sandbox.window = sandbox;
  return sandbox;
}

function load(sandbox, file) {
  const code = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: file });
}

function stockById(stores, barcode) {
  return (stores.products.find((p) => p.barcode === barcode) || {}).stock;
}

/* ============ TEST 1: two rapid clicks = ONE sale ============ */
(async function () {
  const s = buildSandbox();
  load(s, 'js/transactions/transaction.js');

  s.cart = [
    { barcode: 'P1', name: 'Tissu', price: 50, qty: 2, reducedPrice: null, unit: 'mètre', reference: '' },
  ];
  s.__stores.products.push({ barcode: 'P1', name: 'Tissu', price: 50, purchasePrice: 30, stock: 10 });

  const p1 = s.completeTransaction();
  const p2 = s.completeTransaction(); // same microtask, flag already set

  const r1 = await p1;
  const r2 = await p2;

  ok(r1 === true, 'first click completes the sale');
  ok(r2 === false, 'second click is refused while the sale is running');
  ok(s.__multiOps === 1, 'dbMultiOp executed exactly once');
  ok(s.__stores.sales.length === 1, 'exactly one sale record written');
  ok(stockById(s.__stores, 'P1') === 8, 'stock decremented once (10 -> 8)');
  ok(s.__toasts.some((t) => t.m === 'Vente en cours...'), '"wait" toast shown on the refused click');
  ok(s.__txInProgress === false, 'lock is released after the sale');
  ok(s.DOM.btnComplete.disabled === false, 'Complète button re-enabled after the sale');

  // A third call after success finds an empty cart -> safe false.
  const r3 = await s.completeTransaction();
  ok(r3 === false && s.__stores.sales.length === 1, 'post-sale call with empty cart does nothing');
})();

/* ============ TEST 2: ask-customer flow does NOT deadlock the lock ============ */
(async function () {
  const s = buildSandbox();
  load(s, 'js/transactions/transaction.js');

  s.cart = [{ barcode: 'P1', name: 'Tissu', price: 50, qty: 1, reducedPrice: null, unit: 'pièce', reference: '' }];
  s.__stores.products.push({ barcode: 'P1', name: 'Tissu', price: 50, purchasePrice: 30, stock: 10 });
  s.settings.askCustomerEnabled = true; // triggers the modal path first

  const r1 = await s.completeTransaction();
  ok(r1 === false, 'first call defers to the ask-customer modal');
  ok(s.askCustomerModalOpen === true, 'ask-customer modal is open');
  ok(s.__txInProgress === false, 'lock released while the modal is open');
  ok(s.DOM.btnComplete.disabled === false, 'button usable while the modal is open');
  ok(s.__stores.sales.length === 0, 'no sale recorded yet');

  // Cashier picks a customer and confirms -> completeTransaction runs again.
  s.askCustomerModalOpen = false;
  s.customerAskShown = true;
  s.DOM.customerSelect.value = '2';

  const r2 = await s.completeTransaction();
  ok(r2 === true, 'second call after customer selection completes the sale');
  ok(s.__stores.sales.length === 1, 'sale recorded after confirmation');
  ok(s.__toasts.some((t) => t.m.indexOf('profit') !== -1), 'success toast shown');
  ok(s.__txInProgress === false, 'lock released after confirmed sale');
})();

setTimeout(function () {
  console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
}, 500);