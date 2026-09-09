/* Harness to functionally exercise js/supplier-bills-hub.js in Node. */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

class El {
  constructor(tag, id) {
    this.tagName = tag;
    this.id = id || '';
    this.className = '';
    this.children = [];
    this.handlers = {};
    this._innerHTML = '';
    this.textContent = '';
    this.value = '';
    this.style = {};
    this.dataset = {};
    this.scrollTop = 0;
    this.scrollHeight = 0;
  }
set innerHTML(v) { this._innerHTML = String(v); this.children = []; this._registerIds(); }
  get innerHTML() { return this._innerHTML; }
  _registerIds() {
    const re = /id="([^"]+)"/g;
    let m;
    while ((m = re.exec(this._innerHTML))) {
      if (!byId(m[1])) { const c = new El('div', m[1]); c._owner = this; registry.push(c); }
    }
  }
  remove() {
    const me = this;
    const survives = (e) => {
      if (e === me) return false;
      let o = e._owner;
      while (o) { if (o === me) return false; o = o._owner; }
      return true;
    };
    for (let i = registry.length - 1; i >= 0; i--) { if (!survives(registry[i])) registry.splice(i, 1); }
  }
  addEventListener(t, f) { (this.handlers[t] = this.handlers[t] || []).push(f); }
  setAttribute(k, v) { if (k === 'data-bill') this.dataset.bill = v; }
  getAttribute(k) { if (k === 'data-bill') return String(this.dataset.bill); }
  closest(sel) { if (!sel) return null; const el = this; return { style: { set display(v) { el.disp = v; }, get display() { return el.disp; } } }; }
  focus() { this._focused = true; }
}

const registry = [];
function register(el) {
  if (el.id) {
    registry.push(el);
  }
}
function byId(id) {
  return registry.find((e) => e.id === id) || null;
}

const stubs = {
  document: {
    createElement(tag) { return new El(tag); },
    getElementById: byId,
    body: { appendChild(c) { registry.push(c); } },
  },
  window: null, // set below
};

/* in-memory stores */
const DB = { purchases: [], suppliers: [], products: [] };
let idSeq = 1;

global.dbGetAll = async (store) => DB[store] || [];
global.dbGet = async (store, key) => {
  const arr = DB[store] || [];
  return arr.find((o) => String(o.id) === String(key)) || null;
};
global.dbPut = async (store, obj) => {
  if (!obj.id) obj.id = idSeq++;
  const arr = DB[store];
  const i = arr.findIndex((o) => String(o.id) === String(obj.id));
  if (i >= 0) arr[i] = obj; else arr.push(obj);
  return obj.id;
};
global.dbDelete = async (store, key) => {
  const arr = DB[store];
  const i = arr.findIndex((o) => String(o.id) === String(key));
  if (i >= 0) arr.splice(i, 1);
};

const _TRANS = {
  supplierBillsLine: '{{count}} facture(s) • {{total}} DA',
  supplierNoBills: 'Aucune facture',
  supplierBillEmpty: 'Facture vide',
  supplierHubSearchPlaceholder: 'Rechercher facture / produit…',
};
global.t = (k, v) => {
  let s = _TRANS[k] || k;
  if (v) for (const p in v) s = s.split('{{' + p + '}}').join(String(v[p]));
  return s;
};
global.escapeHtml = (s) => String(s == null ? '' : s).split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;').split('"').join('&quot;');
global.formatPrice = (n) => { const x = Number(n).toFixed(6).replace(/\.?0+$/, ''); return x === '' ? '0' : x; };
global.showToast = (m) => { /* noop */ };
global.playSuccess = () => {};
global.suppliers = [];
global._supplierBillStats = null;
global._refreshSupplierBillStats = async () => {
  const m = {};
  for (const p of DB.purchases) {
    if (!m[String(p.supplierId)]) m[String(p.supplierId)] = { count: 0, total: 0 };
    m[String(p.supplierId)].count++;
    m[String(p.supplierId)].total += parseFloat(p.totalCost) || 0;
  }
  global._supplierBillStats = m;
};
global._supplierBillLine = (id) => {
  const st = global._supplierBillStats && global._supplierBillStats[String(id)];
  return st && st.count ? t('supplierBillsLine', { count: st.count, total: formatPrice(st.total) }) : '';
};
global._supplierBillLineHtml = (id) => {
  const li = global._supplierBillLine(id);
  return li ? '<div style="font-size:11px;color:#2e7d32;font-weight:600;margin-top:3px;">' + li + '</div>' : '';
};
global.loadSuppliers = async () => { /* noop */ };
global.showConfirm = async () => true;
global.editSupplier = () => {};
global.deleteSupplier = () => {};
global.openSupplierProductChooser = () => {};
global.openSupplierAddStock = async () => {};
global.openSupplierAddProduct = async () => {};
global.recordSupplierEvent = async (sid, type, items, meta) => {
  const sup = global.suppliers.find((s) => String(s.id) === String(sid));
  let tot = 0;
  const its = (items || []).map((it) => { tot += (parseFloat(it.qty) || 0) * (parseFloat(it.purchasePrice) || 0); return { barcode: it.barcode || '', name: it.name || '', qty: it.qty || 0, purchasePrice: it.purchasePrice || 0 }; });
  const rec = { supplierId: sid, supplierName: sup ? sup.name : 'Inconnu', date: (meta && meta.date) || new Date().toISOString().split('T')[0], invoiceRef: (meta && meta.invoiceRef) || '', items: its, totalCost: tot, type, createdAt: new Date().toISOString() };
  await global.dbPut('purchases', rec);
  return rec;
};
global.openSupplierReceptionEdit = async () => ({ fake: 'save' });
global.openSupplierAddStock = async () => {
  for (const f of ['as-reception-date', 'as-reception-invoice']) { const e = new El('input', f); registry.push(e); }
};
global.openSupplierAddProduct = async () => {
  for (const f of ['sd-reception-date', 'sd-reception-invoice']) { const e = new El('input', f); registry.push(e); }
};
global.deleteReceptionItem = async (sid, pid, idx) => {
  const p = DB.purchases.find((o) => String(o.id) === String(pid));
  if (!p) return;
  p.items.splice(idx, 1);
  let tt = 0;
  p.items.forEach((it) => { tt += (parseFloat(it.qty) || 0) * (parseFloat(it.purchasePrice) || 0); });
  p.totalCost = tt;
  await global.dbPut('purchases', p);
  if (typeof global.supplierReceiptDetail === 'function') await global.supplierReceiptDetail(JSON.stringify([pid]), sid);
};
global.deletePurchase = async (pid) => {
  const p = DB.purchases.find((o) => String(o.id) === String(pid));
  if (!p) return;
  await global.dbDelete('purchases', pid);
  for (const it of p.items || []) {
    const pr = DB.products.find((o) => String(o.barcode) === String(it.barcode));
    if (pr) pr.stock = Math.max(0, (parseFloat(pr.stock) || 0) - (parseFloat(it.qty) || 0));
  }
};

stubs.window = global;
global.window = global;
global.document = stubs.document;

/* static DOM nodes present in index.html */
const staticList = new El('div', 'suppliers-list');
registry.push(staticList);

/* seed data */
(async () => {
const supA = await global.dbPut('suppliers', { name: 'Import Tlemcen' });
const supB = await global.dbPut('suppliers', { name: 'Textile Oran' });
global.suppliers = [
  { id: supA, name: 'Import Tlemcen', phone: '0555' },
  { id: supB, name: 'Textile Oran' },
];
await global.dbPut('products', { barcode: '8001', name: 'Tissu coton', stock: 10, price: 300 });
await global.dbPut('products', { barcode: '8002', name: 'Fermeture éclair', stock: 40, price: 25 });
/* bill 1 for supA with 2 items */
const bill1Id = await global.dbPut('purchases', {
  supplierId: supA, supplierName: 'Import Tlemcen', date: '2026-09-01', invoiceRef: 'F-001', type: 'reception', createdAt: '2026-09-01T10:00:00.000Z',
  items: [{ barcode: '8001', name: 'Tissu coton', qty: 5, purchasePrice: 200 }, { barcode: '8002', name: 'Fermeture éclair', qty: 20, purchasePrice: 15 }],
  totalCost: 5 * 200 + 20 * 15,
});
await global.dbPut('purchases', {
  supplierId: supA, supplierName: 'Import Tlemcen', date: '2026-09-05', invoiceRef: '', type: 'reception', createdAt: '2026-09-05T10:00:00.000Z',
  items: [{ barcode: '8001', name: 'Tissu coton', qty: 3, purchasePrice: 190 }],
  totalCost: 570,
});

/* load the module into the same global context */
const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'supplier-bills-hub.js'), 'utf8');
const vmCtx = vm.createContext(global);
vm.runInContext(code, vmCtx, { filename: 'supplier-bills-hub.js' });

const assert = (cond, msg) => { if (!cond) { console.error('FAIL:', msg); process.exitCode = 1; } else { console.log('PASS:', msg); } };

/* ---- Test renderSupplierList row shape ---- */
await global._refreshSupplierBillStats();
await global.renderSupplierList('');
const rows = Array.from(document.getElementById('suppliers-list').innerHTML.matchAll(/onclick="openSupplierDetail\((\d+)\)"/g)).map((m) => m[1]);
assert(rows.length === 2, 'two suppliers rendered');
assert(document.getElementById('suppliers-list').innerHTML.includes('Import Tlemcen'), 'supplier name shown');
assert(document.getElementById('suppliers-list').innerHTML.includes('facture(s)'), 'bill count line shown');
assert(!document.getElementById('suppliers-list').innerHTML.includes('openSupplierInvoice'), 'no 🧾 button in rows');
assert(!document.getElementById('suppliers-list').innerHTML.includes('📍'), 'no address line in rows');

/* ---- Test openSupplierDetail builds hub ---- */
await global.openSupplierDetail(supA);
let overlay = document.getElementById('supplier-detail-overlay');
assert(!!overlay, 'hub overlay created');
const billsBox = document.getElementById('supplier-hub-bills');
const html = billsBox.innerHTML;
assert(html.includes('F-001'), 'bill reference rendered');
assert(html.includes('hub-bill-head'), 'bill headings rendered');
assert(String(document.getElementById('supplier-hub-count').textContent) === '2', 'count badge = 2 bills');
assert(html.includes('hubViewBill'), 'view-popup buttons present');
assert(html.includes('hub-edit-date'), 'edit-date button present');
assert(html.includes('hub-bill-body') === false, 'no inline item expansion anymore');

/* ---- Test hub-wide search filters by ref ---- */
document.getElementById('supplier-hub-search').value = 'f-001';
document.getElementById('supplier-hub-search').handlers.input[0].call(document.getElementById('supplier-hub-search'));
assert(document.getElementById('supplier-hub-bills').innerHTML.includes('F-001'), 'search "f-001" still shows matching bill');
assert(String(document.getElementById('supplier-hub-count').textContent) === '1', 'search filters count to 1');

/* ---- Test search by product name keeps the bill visible (popup shows items) ---- */
document.getElementById('supplier-hub-search').value = 'coton';
document.getElementById('supplier-hub-search').handlers.input[0].call(document.getElementById('supplier-hub-search'));
const h2 = document.getElementById('supplier-hub-bills').innerHTML;
assert(/sd-table-row/.test(h2) === false, 'no inline products rendered in hub rows');
assert(h2.includes('hubViewBill') && String(document.getElementById('supplier-hub-count').textContent) === '2', 'product search keeps matching bills visible');

/* ---- Test popup opens with products ---- */
await global.hubViewBill(bill1Id);
let pop = document.getElementById('supplier-bill-popup-overlay');
assert(!!pop, 'bill popup overlay created');
const popItems = document.getElementById('bill-popup-items');
assert(popItems && popItems.innerHTML.includes('Tissu coton'), 'popup lists bill products');
assert(popItems.innerHTML.includes('openSupplierReceptionEdit(' + supA + ','), 'popup item edit wired (SRE)');
assert(popItems.innerHTML.includes('hubDeleteItem(' + supA + ','), 'popup item delete wired');
assert(document.getElementById('bill-popup-add') !== null, 'popup has add-product button');
assert(document.getElementById('bill-popup-del') !== null, 'popup has delete-bill button');
global.window.__hubAppendBillId = null;
document.getElementById('bill-popup-search').value = 'ferm';
document.getElementById('bill-popup-search').handlers.input[0].call(document.getElementById('bill-popup-search'));
const popFiltered = document.getElementById('bill-popup-items').innerHTML;
assert(popFiltered.includes('Fermeture') && !popFiltered.includes('Tissu'), 'popup product search filters the list');
global.hubViewClose();
assert(document.getElementById('supplier-bill-popup-overlay') === null, 'popup closes');

/* ---- Test new bill creation ---- */
await global._hubNewBill();
const nbills = DB.purchases.filter((p) => String(p.supplierId) === String(supA) && p.type !== 'supplier_add').length;
assert(nbills === 3, 'new bill persisted (3 receptions)');
assert(!!document.getElementById('hub-ndate-' + (nbills === 3 ? DB.purchases.find((p) => p.items.length === 0).id : 0)), 'new bill date editor shown');

/* ---- Test append item to the new bill ---- */
const emptyBill = DB.purchases.find((p) => p.items.length === 0);
global.window.__hubAppendBillId = emptyBill.id;
const shouldAppend = await global.recordSupplierEvent(supA, 'reception', [{ barcode: '8002', name: 'Fermeture éclair', qty: 10, purchasePrice: 14 }], {});
assert(shouldAppend && String(shouldAppend.id) === String(emptyBill.id), 'append targets the open new bill');
const after = DB.purchases.find((p) => String(p.id) === String(emptyBill.id));
assert(after.items.length === 1 && after.totalCost === 10 * 14, 'append merged into the open bill and recomputed total (' + after.totalCost + ')');
await new Promise((r) => setTimeout(r, 200));
const ov = document.getElementById('supplier-detail-overlay');
assert(!!ov, 'hub still open after append');
const pop2 = document.getElementById('supplier-bill-popup-overlay');
assert(!!pop2, 'popup re-opens after append (__hubExpandAfter)');
const popHtml = document.getElementById('bill-popup-items') ? document.getElementById('bill-popup-items').innerHTML : '';
assert(popHtml.includes('Fermeture') && popHtml.includes('sd-table-row'), 'appended bill popup shows products after reopen');
global.hubViewClose();

/* ---- Test direct append (no new-bill mode, existing bill) via __hubAppendBillId ---- */
global.window.__hubAppendBillId = bill1Id; // bill1 of supA
const secondResult = await global.recordSupplierEvent(supA, 'reception', [{ barcode: '8001', name: 'Tissu coton', qty: 1, purchasePrice: 210 }], {});
assert(secondResult && DB.purchases.find((p) => String(p.id) === String(bill1Id)).items.length === 3, 'append into existing bill id=' + bill1Id + ' works');

/* ---- Test date-edit mode stops propagation and saves date (no item toggle) ---- */
global.hubEditDate(bill1Id);
let rowHtml = document.getElementById('supplier-hub-bills').innerHTML;
assert(rowHtml.includes('class="hub-date-edit" onclick="event.stopPropagation();"'), 'date editor stops click propagation (no popup/inline toggle)');
const hde = document.getElementById('hde-' + bill1Id);
hde.value = '2026-08-01';
await global.hubSaveBillDate(bill1Id);
assert(DB.purchases.find((p) => String(p.id) === String(bill1Id)).date === '2026-08-01', 'hubSaveBillDate persisted the new date');
rowHtml = document.getElementById('supplier-hub-bills').innerHTML;
assert(rowHtml.includes('hub-date-edit') === false, 'date editor closes after save');
assert(document.getElementById('supplier-bill-popup-overlay') === null, 'no popup opened by editing the date');

/* ---- Test delete bill ---- */
const bill2Id = DB.purchases.find((p) => p.id !== bill1Id && p.items.length > 0 && p.id !== 0 && String(p.supplierId) === String(supA)).id;
const beforeDel = DB.purchases.length;
await global.hubDeleteBill(bill2Id);
assert(DB.purchases.find((p) => String(p.id) === String(bill2Id)) === undefined && DB.purchases.length === beforeDel - 1, 'hubDeleteBill removes the bill from db');

/* ---- Test deleteReceptionItem keeps hub open + recomputes ---- */
const target = DB.purchases.find((p) => String(p.id) === String(bill1Id));
const oldTot = target.totalCost;
const oldN = target.items.length;
await global.hubDeleteItem(supA, bill1Id, target.items.length - 1);
const t2 = DB.purchases.find((p) => String(p.id) === String(bill1Id));
assert(DB.purchases.find((p) => String(p.id) === String(bill1Id)) !== undefined, 'hubDeleteItem keeps bill');
assert(t2.items.length === oldN - 1 && t2.totalCost < oldTot, 'hubDeleteItem removed the item and recomputed total');

/* ---- Test SRE wrapper hides the 3 fields and returns original result ---- */
for (const f of ['sre-supplier', 'sre-date', 'sre-invoice']) {
  const els = new El('input', f);
  registry.push(els);
}
const sreRes = await global._hubOpenSupplierReceptionEdit(supA, bill1Id, 0, 'b', 1, 2);
assert(sreRes && sreRes.fake === 'save', 'SRE wrapper returns original save result');
await new Promise((r) => setTimeout(r, 5));
assert(document.getElementById('sre-supplier').disp === 'none' &&
  document.getElementById('sre-date').disp === 'none' &&
  document.getElementById('sre-invoice').disp === 'none', 'SRE wrapper hides fournisseur/date/facture fields');

/* ---- Test add-stock & add-product modals hide date + ref in hub ---- */
await global.openSupplierAddStock({ id: supA, name: 'Import Tlemcen' });
await new Promise((r) => setTimeout(r, 5));
assert(document.getElementById('as-reception-date').disp === 'none', 'add-stock modal hides the reception date');
assert(document.getElementById('as-reception-invoice').disp === 'none', 'add-stock modal hides the invoice ref');
await global.openSupplierAddProduct({ id: supA, name: 'Import Tlemcen' });
await new Promise((r) => setTimeout(r, 5));
assert(document.getElementById('sd-reception-date').disp === 'none', 'add-product modal hides the reception date');
assert(document.getElementById('sd-reception-invoice').disp === 'none', 'add-product modal hides the invoice ref');
console.log('done2');

console.log('done');
})();