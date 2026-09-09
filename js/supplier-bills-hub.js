// === SUPPLIER BILLS HUB — remplace l'ancienne Fiche Fournisseur ===
// Ce fichier se charge APRÈS js/suppliers.js et redéfinit certains globals :
// - renderSupplierList : lignes = nom + nombre de factures + boutons 📦 ✏️ 🗑
// - openSupplierDetail : hub « factures » (colonne de factures, regroupement, recherche)
// - supplierReceiptDetail : vers le hub (utilisé quand on supprime un article)
// - recordSupplierEvent : en mode hub, ajoute l'article À la facture ouverte au lieu d'en créer une neuve
// - openSupplierReceptionEdit : masque les champs fournisseur / date / n° de facture

window.__hubAppendBillId = null;
window.__hubExpandAfter = null;
window.__hub = null;

const _origRecordSupplierEvent = typeof recordSupplierEvent === 'function' ? recordSupplierEvent : null;
const _origOpenSupplierReceptionEdit = typeof openSupplierReceptionEdit === 'function' ? openSupplierReceptionEdit : null;
const _origOpenSupplierAddStock = typeof openSupplierAddStock === 'function' ? openSupplierAddStock : null;
const _origOpenSupplierAddProduct = typeof openSupplierAddProduct === 'function' ? openSupplierAddProduct : null;

// Note : on n'utilise PAS de déclaration de fonction portant le même nom pour
// recordSupplierEvent / openSupplierReceptionEdit (les déclarations sont hoistées
// et écraseraient la référence stockée ci-dessus). Les wrappers sont nommés
// différemment puis assignés à la fin du fichier.

// === helpers ===
function _hubToday() {
  const _d = new Date();
  return _d.getFullYear() + '-' + String(_d.getMonth() + 1).padStart(2, '0') + '-' + String(_d.getDate()).padStart(2, '0');
}

function _hubFmtDate(_d) {
  if (!_d) return '—';
  try {
    const _dt = new Date(String(_d) + 'T12:00:00');
    if (isNaN(_dt.getTime())) return String(_d);
    const _months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    return _dt.getDate() + ' ' + _months[_dt.getMonth()] + ' ' + _dt.getFullYear();
  } catch (_e) {
    return String(_d);
  }
}

// Champ date lisible : le mois s'affiche en toutes lettres (ex : 5 septembre 2026)
function _hubDateFieldHtml(_0hid, _0val) {
  return '<span class="hub-date-field" style="display:inline-flex;gap:6px;align-items:center;">' +
    '<input type="date" id="' + _0hid + '" value="' + _hubAttr(_0val || _hubToday()) + '" style="display:none;">' +
    '<input type="text" id="' + _0hid + '-text" readonly style="padding:7px 9px;border:1px solid #e0e0e0;border-radius:6px;font-size:13px;background:#fafafa;width:160px;color:#333;">' +
    '<button type="button" class="expense-btn expense-btn--ghost" id="' + _0hid + '-pick" title="' + escapeHtml(t('supplierBillPickDate')) + '">🗓</button>' +
  '</span>';
}

function _hubWireDateField(_0hid, _0val) {
  const _0inp = document.getElementById(_0hid);
  if (!_0inp) return;
  if (_0val) _0inp.value = _0val;
  const _0text = document.getElementById(_0hid + '-text');
  if (_0text) _0text.value = _hubFmtDate(_0inp.value);
  const _0btn = document.getElementById(_0hid + '-pick');
  if (_0btn) {
    _0btn.addEventListener('click', function (_0ev) {
      _0ev.preventDefault();
      try { if (typeof _0inp.showPicker === 'function') { _0inp.showPicker(); return; } } catch (_e) {}
      _0inp.focus();
      _0inp.click();
    });
  }
  _0inp.addEventListener('change', function () {
    if (_0text) _0text.value = _hubFmtDate(_0inp.value);
  });
}

function _hubAttr(s) {
  return String(s == null ? '' : s)
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('&quot;')
    .split("'").join('&#39;');
}

function _hubFilterBill(_p, _sid) {
  if (!_p) return false;
  if (String(_p.supplierId) !== String(_sid)) return false;
  if (_p.type === 'supplier_add') return false;
  return true;
}

function _hubSortBills(_arr) {
  _arr.sort(function (_a, _b) {
    return (String(_b.date || '').localeCompare(String(_a.date || ''))) ||
      (String(_b.createdAt || '').localeCompare(String(_a.createdAt || '')));
  });
}

// === compteurs « factures » alignés sur le hub ===
// Redéfinition globale : compte les MÊMES records que la liste de factures du
// hub (exclut type 'supplier_add', qui n'est pas une facture d'achat).
function _refreshSupplierBillStats() {
  return (async function () {
    try {
      const _0arr = await dbGetAll('purchases');
      const _0map = {};
      (_0arr || []).forEach(function (_pp) {
        if (_pp && _pp.type === 'supplier_add') return;
        const _0kk = String(_pp.supplierId || '');
        if (!_0kk) return;
        const _0ee = _0map[_0kk] || (_0map[_0kk] = { count: 0, total: 0 });
        _0ee.count++;
        _0ee.total += parseFloat(_pp.totalCost) || 0;
      });
      _supplierBillStats = _0map;
    } catch (_er) {
      _supplierBillStats = null;
    }
  })();
}

// === renderSupplierList : lignes simplifiées ===
async function renderSupplierList(_0q) {
  const _0el = document.getElementById('suppliers-list');
  if (!_0el) return;
  if (!_supplierBillStats) await _refreshSupplierBillStats();
  let _0arr = suppliers || [];
  if (_0q) {
    const _0lq = String(_0q).toLowerCase();
    _0arr = _0arr.filter(function (_0s) {
      return (String(_0s.name || '').toLowerCase().indexOf(_0lq) !== -1) ||
        (String(_0s.phone || '').indexOf(_0lq) !== -1) ||
        (String(_0s.nif || '').indexOf(_0lq) !== -1);
    });
  }
  if (!_0arr.length) {
    _0el.innerHTML = '<div style="text-align:center;color:#999;padding:20px;">' + t('noSupplierRegistered') + '</div>';
    return;
  }
  _0el.innerHTML = _0arr.map(function (_0s) {
    const _0billLine = _supplierBillLineHtml(_0s.id);
    return '<div class="supplier-row">' +
      '<div class="supplier-row-info">' +
        '<div class="supplier-row-name">' + escapeHtml(_0s.name || '') + '</div>' +
        '<div class="supplier-row-phone">' +
          ((_0s.phone) ? '<span class="supplier-row-phone-val">📞 ' + escapeHtml(_0s.phone) + '</span>' : '') +
          ((_0s.nif) ? '<span class="supplier-row-nif">🧾 ' + escapeHtml(_0s.nif) + '</span>' : '') +
        '</div>' +
        _0billLine +
      '</div>' +
      '<div class="supplier-row-actions">' +
        '<button class="supplier-act supplier-act--view" onclick="openSupplierDetail(' + _0s.id + ')" title="' + escapeHtml(t('supplierView')) + '">📦 ' + escapeHtml(t('supplierBillsBtn')) + '</button>' +
        '<button class="supplier-act supplier-act--edit" onclick="editSupplier(' + _0s.id + ')">✏️ ' + escapeHtml(t('supplierEditTitle')) + '</button>' +
        '<button class="supplier-act supplier-act--del" onclick="deleteSupplier(' + _0s.id + ')">🗑 ' + escapeHtml(t('supplierDeleteTitle')) + '</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

// === HUB : fiche fournisseur en factures ===
async function openSupplierDetail(_0id) {
  window.__hubAppendBillId = null;
  const _0e = window.__hubExpandAfter;
  window.__hubExpandAfter = null;

  let _0sup = null;
  try {
    _0sup = (suppliers || []).find(function (_0s) { return String(_0s.id) === String(_0id); });
  } catch (_err) { _0sup = null; }
  if (!_0sup) {
    try { _0sup = await dbGet('suppliers', _0id); } catch (_err) { _0sup = null; }
  }
  if (!_0sup) { showToast(t('unknownSupplier'), 'error'); return; }

  const _0old = document.getElementById('supplier-detail-overlay');
  if (_0old) _0old.remove();
  const _0old2 = document.getElementById('supplier-receipt-detail-overlay');
  if (_0old2) _0old2.remove();
  const _0pop = document.getElementById('supplier-bill-popup-overlay');
  if (_0pop) _0pop.remove();

  const _0bills = await dbGetAll('purchases');
  const _0mine = (_0bills || []).filter(function (_p) { return _hubFilterBill(_p, _0sup.id); });
  _hubSortBills(_0mine);

  window.__hub = {
    supplierId: _0sup.id,
    supplier: _0sup,
    bills: _0mine,
    search: '',
    editDate: {},
    newBillId: null
  };

  const _0ov = document.createElement('div');
  _0ov.className = 'expense-move-overlay supplier-detail-overlay';
  _0ov.id = 'supplier-detail-overlay';
  _0ov.innerHTML = _hubModalHtml(_0sup);
  document.body.appendChild(_0ov);

  _hubBindEvents();
  _hubRender();
  const _0s = document.getElementById('supplier-hub-search');
  if (_0s) setTimeout(function () { _0s.focus(); }, 30);
  if (_0e != null) setTimeout(function () { hubViewBill(_0e); }, 30);
}

function _hubModalHtml(_0sup) {
  return '<div class="supplier-detail-modal supplier-hub-modal">' +
    '<div class="supplier-detail-head">' +
      '<div><h3>' + escapeHtml(t('supplierDetailTitle')) + '</h3>' +
      '<div class="supplier-detail-name">🏷️ ' + escapeHtml(_0sup.name || '') + '</div></div>' +
      '<button class="expense-btn expense-btn--ghost" id="supplier-hub-close" title="' + escapeHtml(t('closeModal')) + '">✕</button>' +
    '</div>' +
    '<div class="supplier-hub-search">' +
      '<input type="text" id="supplier-hub-search" placeholder="' + escapeHtml(t('supplierHubSearchPlaceholder')) + '" autocomplete="off">' +
    '</div>' +
    '<div class="supplier-hub-toolbar">' +
      '<button class="expense-btn expense-btn--primary expense-btn--full" id="supplier-hub-new">' + escapeHtml(t('supplierNewInvoice')) + '</button>' +
    '</div>' +
    '<div class="supplier-detail-body hub-body">' +
      '<div class="supplier-detail-section">' +
        '<h4>' + escapeHtml(t('supplierReceiptsTitle')) + ' <span class="sd-count" id="supplier-hub-count">0</span></h4>' +
        '<div class="supplier-receipts-scroll" id="supplier-hub-bills"></div>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function _hubClose() {
  window.__hubAppendBillId = null;
  window.__hubExpandAfter = null;
  window.__hub = null;
  const _0ov = document.getElementById('supplier-detail-overlay');
  if (_0ov) _0ov.remove();
}

function _hubBindEvents() {
  const _0ov = document.getElementById('supplier-detail-overlay');
  if (!_0ov) return;
  _0ov.addEventListener('click', function (_ev) {
    if (_ev.target === _0ov) _hubClose();
  });
  const _0cl = document.getElementById('supplier-hub-close');
  if (_0cl) _0cl.addEventListener('click', _hubClose);
  const _0sr = document.getElementById('supplier-hub-search');
  if (_0sr) _0sr.addEventListener('input', function () {
    if (!window.__hub) return;
    window.__hub.search = _0sr.value;
    _hubRender();
  });
  const _0new = document.getElementById('supplier-hub-new');
  if (_0new) _0new.addEventListener('click', function () { _hubNewBill(); });
}

function _hubRender() {
  const _0h = window.__hub;
  const _0box = document.getElementById('supplier-hub-bills');
  if (!_0h || !_0box) return;
  const _0q = String(_0h.search || '').toLowerCase();
  let _0shown = 0;
  const _0parts = [];
  (_0h.bills || []).forEach(function (_0bill) {
    const _0m = _hubBillMatch(_0bill, _0q);
    if (!_0m.show) return;
    _0parts.push(_hubBillHtml(_0bill, _0m, _0shown));
    _0shown++;
  });
  _0box.innerHTML = _0parts.length
    ? _0parts.join('')
    : '<div class="supplier-detail-empty">' + escapeHtml(t('supplierNoBills')) + '</div>';
  const _0cnt = document.getElementById('supplier-hub-count');
  if (_0cnt) _0cnt.textContent = _0shown;
  const _0sr = document.getElementById('supplier-hub-search');
  if (_0sr) _0sr.value = _0h.search || '';
}

function _hubBillMatch(_bill, _q) {
  if (!_q) {
    return { show: true, q: null };
  }
  const _hitDate = String(_bill.date || '').toLowerCase().indexOf(_q) !== -1;
  const _hitRef = String(_bill.invoiceRef || '').toLowerCase().indexOf(_q) !== -1;
  const _hitProd = (_bill.items || []).some(function (_it) {
    return String(_it.name || '').toLowerCase().indexOf(_q) !== -1 ||
      String(_it.barcode || '').toLowerCase().indexOf(_q) !== -1;
  });
  return {
    show: _hitDate || _hitRef || _hitProd,
    q: _hitProd ? _q : null
  };
}

function _hubBillHtml(_bill, _m, _i) {
  const _0h = window.__hub;
  if (!_0h) return '';
  const _0newMode = _0h.newBillId === _bill.id;
  const _0editDate = !!(_0h.editDate && _0h.editDate[_bill.id]);
  const _0items = (_bill.items || []).length;
  const _0preset = _m.q ? ',\'' + String(_m.q).replace(/'/g, "\\'") + '\'' : '';

  let _0left = '';
  if (_0newMode) {
    _0left = '<div class="hub-new-bill-fields" onclick="event.stopPropagation();">' +
      _hubDateFieldHtml('hub-ndate-' + _bill.id, _bill.date) +
      '<input type="text" id="hub-nref-' + _bill.id + '" placeholder="' + escapeHtml(t('receptionInvoicePlaceholder')) + '" value="' + _hubAttr(_bill.invoiceRef) + '" autocomplete="off">' +
      '<button class="expense-btn expense-btn--primary" onclick="hubSaveNewBill(' + _bill.id + ')">' + escapeHtml(t('supplierHubSaveDate')) + '</button>' +
      '</div>';
  } else {
    const _0dateHtml = _0editDate
      ? '<span class="hub-date-edit" onclick="event.stopPropagation();">' +
        '<input type="date" id="hde-' + _bill.id + '" value="' + (_bill.date || _hubToday()) + '">' +
        '<button class="expense-btn expense-btn--primary" onclick="hubSaveBillDate(' + _bill.id + ')">' + escapeHtml(t('supplierHubSaveDate')) + '</button>' +
        '</span>'
      : '<span class="hub-bill-date">📅 ' + _hubFmtDate(_bill.date) + '</span>';
    _0left = _0dateHtml +
      ((_bill.invoiceRef) ? '<span class="hub-bill-ref">🧾 ' + escapeHtml(_bill.invoiceRef) + '</span>' : '') +
      '<span class="hub-bill-count">📦 ' + _0items + ' ' + escapeHtml(t('itemsCountSuffix')) + '</span>' +
      '<span class="hub-bill-total">' + formatPrice(_bill.totalCost || 0) + ' DA</span>';
  }

  const _0right = _0newMode ? '' :
    '<button class="expense-btn expense-btn--ghost hub-edit-date" onclick="event.stopPropagation();hubEditBill(' + _bill.id + ')" title="' + escapeHtml(t('supplierEditBill')) + '">' + escapeHtml(t('supplierEditBill')) + '</button>' +
    '<button class="expense-btn expense-btn--ghost hub-open-bill" onclick="event.stopPropagation();hubViewBill(' + _bill.id + _0preset + ')" title="' + escapeHtml(t('supplierViewBill')) + '">' + escapeHtml(t('supplierViewBill')) + '</button>' +
    '<button class="expense-btn expense-btn--primary hub-add-item" onclick="event.stopPropagation();hubAddItem(' + _bill.id + ')" title="' + escapeHtml(t('supplierHubAddItem')) + '">' + escapeHtml(t('supplierHubAddItem')) + '</button>';

  return '<div class="hub-bill hub-bill-c' + ((_i || 0) % 10) + '" data-bill="' + _bill.id + '">' +
    '<div class="hub-bill-head" onclick="hubToggleBill(' + _bill.id + ')" data-toggle="' + _bill.id + '">' +
      '<span class="hub-bill-chevron">▸</span>' +
      '<div class="hub-bill-labels">' + _0left + '</div>' +
      '<div class="hub-bill-right">' + _0right + '</div>' +
    '</div>' +
    '<div class="hub-bill-body hub-bill-body--closed">' + _hubItemsHtml(_bill) + '</div>' +
  '</div>';
}

function hubToggleBill(_id) {
  const _0card = document.querySelector('.hub-bill[data-bill="' + _id + '"]');
  if (!_0card) return;
  const _0body = _0card.querySelector('.hub-bill-body');
  if (!_0body) return;
  const _0open = _0body.classList.contains('hub-bill-body--open');
  if (_0open) {
    _0body.classList.remove('hub-bill-body--open');
    _0body.classList.add('hub-bill-body--closed');
    _0card.classList.remove('hub-bill--open');
  } else {
    _0body.classList.remove('hub-bill-body--closed');
    _0body.classList.add('hub-bill-body--open');
    _0card.classList.add('hub-bill--open');
  }
}

function _hubItemsHtml(_bill, _q) {
  const _rows = [];
  const _supId = String(_bill.supplierId);
  (_bill.items || []).forEach(function (_it, _idx) {
    if (_q) {
      const _n = String(_it.name || '').toLowerCase();
      const _b = String(_it.barcode || '').toLowerCase();
      if (_n.indexOf(_q) === -1 && _b.indexOf(_q) === -1) return;
    }
    const _bc = String(_it.barcode || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    _rows.push('<div class="sd-table-row">' +
      '<span>' + escapeHtml(_it.barcode || '—') + '</span>' +
      '<span>' + escapeHtml(_it.name || '—') + '</span>' +
      '<span>' + (_it.qty || 0) + '</span>' +
      '<span>' + formatPrice(_it.purchasePrice || 0) + ' DA</span>' +
      '<span class="hub-item-actions">' +
        '<button class="expense-btn expense-btn--ghost sd-edit-btn" onclick="openSupplierReceptionEdit(' + _supId + ',' + _bill.id + ',' + _idx + ',\'' + _bc + '\',' + (_it.qty || 0) + ',' + (_it.purchasePrice || 0) + ')" title="' + escapeHtml(t('editProductAction')) + '">' + escapeHtml(t('hubItemEdit')) + '</button>' +
        '<button class="expense-btn expense-btn--ghost sd-move-btn" onclick="hubTransferItem(' + _bill.id + ',' + _idx + ')" title="' + escapeHtml(t('supplierTransferItem')) + '">' + escapeHtml(t('hubItemMove')) + '</button>' +
        '<button class="expense-btn expense-btn--ghost sd-del-btn" onclick="hubDeleteItem(' + _supId + ',' + _bill.id + ',' + _idx + ')" title="' + escapeHtml(t('receptionItemDeleteButton')) + '">' + escapeHtml(t('hubItemDelete')) + '</button>' +
      '</span>' +
    '</div>');
  });
  if (!_rows.length) {
    return '<div class="supplier-detail-empty">' + escapeHtml(t('supplierBillEmpty')) + '</div>';
  }
  return '<div class="supplier-detail-table">' +
    '<div class="sd-table-row sd-table-head">' +
      '<span>' + escapeHtml(t('tableBarcode')) + '</span>' +
      '<span>' + escapeHtml(t('tableNom')) + '</span>' +
      '<span>' + escapeHtml(t('tableQuantity')) + '</span>' +
      '<span>' + escapeHtml(t('tablePurchasePrice')) + '</span>' +
      '<span></span>' +
    '</div>' +
    _rows.join('') +
  '</div>';
}

// === handlers hub ===
function hubEditDate(_0id) {
  const _0h = window.__hub;
  if (!_0h) return;
  _0h.editDate[_0id] = true;
  _hubRender();
}

async function hubSaveBillDate(_0id) {
  const _0h = window.__hub;
  if (!_0h) return;
  const _0bill = (_0h.bills || []).find(function (_b) { return String(_b.id) === String(_0id); });
  if (!_0bill) return;
  const _0el = document.getElementById('hde-' + _0id);
  let _0d = _0el ? _0el.value : '';
  if (!_0d) _0d = _hubToday();
  _0bill.date = _0d;
  try { await dbPut('purchases', _0bill); } catch (_err) { console.error('Save bill date error:', _err); return; }
  delete _0h.editDate[_0id];
  if (typeof _supplierBillStats !== 'undefined') _supplierBillStats = null;
  if (typeof loadSuppliers === 'function') loadSuppliers();
  _hubRender();
}

async function _hubNewBill() {
  const _0h = window.__hub;
  if (!_0h) return;
  const _0nb = {
    supplierId: _0h.supplierId,
    supplierName: _0h.supplier.name || 'Inconnu',
    date: _hubToday(),
    invoiceRef: '',
    items: [],
    totalCost: 0,
    type: 'reception',
    createdAt: new Date().toISOString()
  };
  try {
    await dbPut('purchases', _0nb);
  } catch (_err) {
    console.error('New bill error:', _err);
    showToast(t('saveFailed'), 'error');
    return;
  }
  const _0all = await dbGetAll('purchases');
  const _0fresh = (_0all || []).find(function (_p) { return _p.createdAt === _0nb.createdAt; });
  if (!_0fresh) {
    showToast(t('saveFailed'), 'error');
    return;
  }
  _0h.bills = (_0all || []).filter(function (_p) { return _hubFilterBill(_p, _0h.supplierId); });
  _hubSortBills(_0h.bills);
  _0h.search = '';
  _0h.editDate = {};
  _0h.newBillId = _0fresh.id;
  if (typeof _supplierBillStats !== 'undefined') _supplierBillStats = null;
  if (typeof loadSuppliers === 'function') loadSuppliers();
  _hubRender();
  setTimeout(function () {
    _hubWireDateField('hub-ndate-' + _0fresh.id, _0fresh.date);
    const _0in = document.getElementById('hub-ndate-' + _0fresh.id + '-text');
    if (_0in) _0in.focus();
    const _0sc = document.getElementById('supplier-hub-bills');
    if (_0sc) _0sc.scrollTop = 0;
  }, 30);
}

async function hubSaveNewBill(_0id) {
  const _0h = window.__hub;
  if (!_0h) return;
  const _0bill = (_0h.bills || []).find(function (_b) { return String(_b.id) === String(_0id); });
  if (!_0bill) return;
  const _0de = document.getElementById('hub-ndate-' + _0id);
  const _0re = document.getElementById('hub-nref-' + _0id);
  let _0d = _0de ? _0de.value : '';
  if (!_0d) _0d = _hubToday();
  _0bill.date = _0d;
  _0bill.invoiceRef = (_0re ? _0re.value : '').replace(/\s+/g, ' ').trim();
  try { await dbPut('purchases', _0bill); } catch (_err) { console.error('Save new bill error:', _err); return; }
  _0h.newBillId = null;
  delete _0h.editDate[_0id];
  if (typeof _supplierBillStats !== 'undefined') _supplierBillStats = null;
  if (typeof loadSuppliers === 'function') loadSuppliers();
  _hubRender();
}

async function hubAddItem(_0id) {
  const _0h = window.__hub;
  if (!_0h) return;
  const _0bill = (_0h.bills || []).find(function (_b) { return String(_b.id) === String(_0id); });
  if (!_0bill) return;
  if (_0h.newBillId === _0bill.id) await hubSaveNewBill(_0id); // enregistre date/réf avant ajout
  window.__hubAppendBillId = _0bill.id;
  if (typeof openSupplierProductChooser === 'function') openSupplierProductChooser(_0h.supplier);
}

async function hubDeleteBill(_0id) {
  const _0h = window.__hub;
  if (typeof deletePurchase === 'function') {
    await deletePurchase(_0id); // gère la confirmation + la remise en stock
  }
  if (_0h) {
    delete _0h.editDate[_0id];
    const _0all = await dbGetAll('purchases');
    _0h.bills = (_0all || []).filter(function (_p) { return _hubFilterBill(_p, _0h.supplierId); });
    _hubSortBills(_0h.bills);
    if (typeof _supplierBillStats !== 'undefined') _supplierBillStats = null;
    if (typeof loadSuppliers === 'function') loadSuppliers();
    _hubRender();
  }
  if (window.__hubBillView && String(window.__hubBillView.billId) === String(_0id)) hubViewClose();
}

async function hubDeleteItem(_0supplierId, _0billId, _0idx) {
  if (typeof deleteReceptionItem === 'function') {
    await deleteReceptionItem(_0supplierId, _0billId, _0idx);
  }
}

// === computation des totaux ===
function _hubTotals(_0items) {
  let _0tot = 0;
  (_0items || []).forEach(function (_0it) {
    _0tot += (parseFloat(_0it.qty) || 0) * (parseFloat(_0it.purchasePrice) || 0);
  });
  return _0tot;
}

function _hubBillById(_0id) {
  const _0h = window.__hub;
  if (_0h && (_0h.bills || []).length) {
    const _0f = (_0h.bills || []).find(function (_b) { return String(_b.id) === String(_0id); });
    if (_0f) return _0f;
  }
  return null;
}

// === MODIFIER LA FACTURE : date / n° facture / fournisseur ===
async function hubEditBill(_0id) {
  const _0h = window.__hub;
  if (!_0h) return;
  let _0bill = _hubBillById(_0id);
  if (!_0bill) {
    try { _0bill = await dbGet('purchases', _0id); } catch (_e) { _0bill = null; }
  }
  if (!_0bill) { showToast(t('purchaseNotFound'), 'error'); return; }
  await ensureSuppliersLoaded();
  const _0old = document.getElementById('supplier-bill-edit-overlay');
  if (_0old) _0old.remove();
  const _0ov = document.createElement('div');
  _0ov.className = 'expense-move-overlay supplier-add-product-overlay';
  _0ov.id = 'supplier-bill-edit-overlay';
  const _0opts = '<option value="">' + escapeHtml(t('supplierOption')) + '</option>' +
    (suppliers || []).map(function (_0s) {
      return '<option value="' + _0s.id + '"' + (String(_0s.id) === String(_0bill.supplierId) ? ' selected' : '') + '>' + escapeHtml(_0s.name || '') + '</option>';
    }).join('');
  _0ov.innerHTML =
    '<div class="supplier-add-product-modal">' +
      '<div class="supplier-add-product-head">' +
        '<div><h3>' + escapeHtml(t('supplierEditBillTitle')) + '</h3>' +
        '<div class="supplier-add-product-name">🏷️ ' + escapeHtml(_0h.supplier ? (_0h.supplier.name || '') : (_0bill.supplierName || '')) + '</div></div>' +
        '<button class="expense-btn expense-btn--ghost" id="sbe-close" title="' + escapeHtml(t('closeModal')) + '">✕</button>' +
      '</div>' +
      '<div class="supplier-add-product-body">' +
        '<div class="form-row">' +
          '<div class="form-group" style="flex:1;">' +
            '<label for="sbe-date">' + escapeHtml(t('supplierBillDateLabel')) + '</label>' +
            _hubDateFieldHtml('sbe-date', _0bill.date) +
          '</div>' +
          '<div class="form-group" style="flex:1;">' +
            '<label for="sbe-ref">' + escapeHtml(t('supplierBillRefLabel')) + '</label>' +
            '<input type="text" id="sbe-ref" placeholder="' + escapeHtml(t('receptionInvoicePlaceholder')) + '">' +
          '</div>' +
        '</div>' +
        '<div class="form-row">' +
          '<div class="form-group" style="flex:1;">' +
            '<label for="sbe-supplier">' + escapeHtml(t('supplierBillSupplierLabel')) + '</label>' +
            '<select id="sbe-supplier">' + _0opts + '</select>' +
          '</div>' +
        '</div>' +
        '<div style="margin-top:8px;font-size:11px;color:#999;">' + escapeHtml(t('supplierBillEditSupplierHint')) + '</div>' +
      '</div>' +
      '<div class="supplier-add-product-actions">' +
        '<button type="button" class="expense-btn expense-btn--ghost hub-danger" id="sbe-del" style="margin-right:auto;">' + escapeHtml(t('supplierHubDeleteBill')) + '</button>' +
      '<button type="button" class="expense-btn expense-btn--primary" id="sbe-save">' + escapeHtml(t('saveReceptionChanges')) + '</button>' +
        '<button type="button" class="expense-btn expense-btn--ghost" id="sbe-cancel">' + escapeHtml(t('supplierProductCancel')) + '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(_0ov);
  _hubWireDateField('sbe-date', _0bill.date);
  const _0re = document.getElementById('sbe-ref');
  if (_0re) _0re.value = _0bill.invoiceRef || '';
  const _0s = document.getElementById('sbe-supplier');
  if (_0s && !_0s.value && _0bill.supplierId != null) _0s.value = String(_0bill.supplierId);
  const _0close = function () { _0ov.remove(); };
  _0ov.addEventListener('click', function (_ev) { if (_ev.target === _0ov) _0close(); });
  document.getElementById('sbe-close').addEventListener('click', _0close);
  document.getElementById('sbe-cancel').addEventListener('click', _0close);
  document.getElementById('sbe-save').addEventListener('click', function () { hubEditBillSave(_0bill.id); });
  const _0del = document.getElementById('sbe-del');
  if (_0del) _0del.addEventListener('click', async function () {
    await hubDeleteBill(_0bill.id);
    let _0gone = false;
    try { _0gone = (await dbGet('purchases', _0bill.id)) == null; } catch (_e) { _0gone = false; }
    if (!_0gone) return; // l'utilisateur a annulé la confirmation
    const _0ee = document.getElementById('supplier-bill-edit-overlay');
    if (_0ee) _0ee.remove();
  });
}

async function hubEditBillSave(_0id) {
  const _0h = window.__hub || {};
  let _0bill = null;
  try {
    _0bill = _hubBillById(_0id);
    if (!_0bill) _0bill = await dbGet('purchases', _0id);
  } catch (_e) { _0bill = null; }
  if (!_0bill) { showToast(t('purchaseNotFound'), 'error'); return; }
  const _0de = document.getElementById('sbe-date');
  const _0re = document.getElementById('sbe-ref');
  const _0se = document.getElementById('sbe-supplier');
  const _0newDate = (_0de && _0de.value) ? _0de.value : _hubToday();
  const _0newRef = (_0re ? _0re.value : '').replace(/\s+/g, ' ').trim();
  const _0oldSup = _0bill.supplierId;
  let _0newSup = _0oldSup;
  let _0newSupName = _0bill.supplierName || '';
  if (_0se && _0se.value) {
    _0newSup = parseInt(_0se.value);
    const _0sup = (suppliers || []).find(function (_0s) { return String(_0s.id) === String(_0newSup); });
    if (_0sup) _0newSupName = _0sup.name;
  }
  _0bill.date = _0newDate;
  _0bill.invoiceRef = _0newRef;
  if (_0newSup) {
    _0bill.supplierId = _0newSup;
    if (_0newSupName) _0bill.supplierName = _0newSupName;
  }
  delete _0h.editDate[_0id];
  try {
    await dbPut('purchases', _0bill);
    if (_0newSup && String(_0newSup) !== String(_0oldSup) && Array.isArray(_0bill.items)) {
      for (const _0it of _0bill.items) {
        if (!_0it || !_0it.barcode) continue;
        try {
          const _0prod = await dbGet('products', _0it.barcode);
          if (_0prod) { _0prod.supplierId = _0newSup; await dbPut('products', _0prod); }
        } catch (_e2) { /* ignore foreign product */ }
      }
    }
    _supplierBillStats = null;
    if (typeof loadSuppliers === 'function') loadSuppliers();
    showToast(t('supplierBillSaved'), 'success');
    if (typeof playSuccess === 'function') playSuccess();
    const _0ov = document.getElementById('supplier-bill-edit-overlay');
    if (_0ov) _0ov.remove();
    window.__hubExpandAfter = _0id;
    await openSupplierDetail(_0newSup || _0h.supplierId);
  } catch (_e3) {
    console.error('Save bill edit error:', _e3);
    showToast(t('saveFailed'), 'error');
  }
}

// === TRANSFERT produit vers une autre facture ===
async function hubTransferItem(_0billId, _0idx) {
  const _0h = window.__hub;
  if (!_0h) return;
  let _0bill = _hubBillById(_0billId);
  if (!_0bill) {
    try { _0bill = await dbGet('purchases', _0billId); } catch (_e) { _0bill = null; }
  }
  if (!_0bill || !Array.isArray(_0bill.items) || !_0bill.items[_0idx]) return;
  const _0item = _0bill.items[_0idx];
  const _0cand = (_0h.bills || []).filter(function (_b) { return String(_b.id) !== String(_0billId); });
  const _0old = document.getElementById('supplier-transfer-overlay');
  if (_0old) _0old.remove();
  const _0ov = document.createElement('div');
  _0ov.className = 'expense-move-overlay supplier-add-product-overlay';
  _0ov.id = 'supplier-transfer-overlay';
  let _0body = '';
  if (_0cand.length) {
    _0body = '<div class="supplier-chooser-grid">' + _0cand.map(function (_b) {
      return '<button type="button" class="supplier-chooser-card" data-target="' + _b.id + '">' +
        '<div class="supplier-chooser-icon">📄</div>' +
        '<div class="supplier-chooser-name">' + escapeHtml(_hubFmtDate(_b.date)) + '</div>' +
        '<div class="supplier-chooser-desc">' +
          ((_b.invoiceRef) ? '🧾 ' + escapeHtml(_b.invoiceRef) + ' • ' : '') +
          (_b.items || []).length + ' ' + escapeHtml(t('itemsCountSuffix')) + ' • ' +
          formatPrice(_b.totalCost || 0) + ' DA' +
        '</div></button>';
    }).join('') + '</div>';
  } else {
    _0body = '<div style="padding:10px;color:#999;text-align:center;font-size:12px;">' + escapeHtml(t('supplierNoTransferTargets')) + '</div>';
  }
  _0ov.innerHTML =
    '<div class="supplier-add-product-modal supplier-chooser-modal">' +
      '<div class="supplier-add-product-head">' +
        '<div><h3>' + escapeHtml(t('supplierTransferTitle')) + '</h3>' +
        '<div class="supplier-add-product-name">⇄ ' + escapeHtml(_0item.name || '') + ' × ' + (_0item.qty || 0) + '</div></div>' +
        '<button class="expense-btn expense-btn--ghost" id="st-close" title="' + escapeHtml(t('closeModal')) + '">✕</button>' +
      '</div>' +
      '<div class="supplier-add-product-body">' +
        _0body +
        '<button type="button" class="supplier-chooser-card" data-target="__new__" style="margin-top:10px;width:100%;">' +
          '<div class="supplier-chooser-icon">🆕</div>' +
          '<div class="supplier-chooser-name">' + escapeHtml(t('supplierTransferNewBill')) + '</div>' +
          '<div class="supplier-chooser-desc">' + escapeHtml(t('supplierTransferNewBillDesc')) + '</div>' +
        '</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(_0ov);
  const _0close = function () { _0ov.remove(); };
  _0ov.addEventListener('click', function (_ev) { if (_ev.target === _0ov) _0close(); });
  document.getElementById('st-close').addEventListener('click', _0close);
  _0ov.querySelectorAll('.supplier-chooser-card').forEach(function (_0card) {
    _0card.addEventListener('click', function () {
      _0close();
      hubTransferDo(_0billId, _0idx, _0card.getAttribute('data-target'));
    });
  });
}

async function hubTransferDo(_0billId, _0idx, _0target) {
  const _0h = window.__hub;
  if (!_0h) return;
  let _0src = null;
  try {
    _0src = _hubBillById(_0billId);
    if (!_0src) _0src = await dbGet('purchases', _0billId);
  } catch (_e) { _0src = null; }
  if (!_0src || !Array.isArray(_0src.items) || !_0src.items[_0idx]) { showToast(t('purchaseNotFound'), 'error'); return; }
  const _0item = _0src.items.splice(_0idx, 1)[0];
  let _0dst = null;
  if (_0target === '__new__') {
    _0dst = {
      supplierId: _0src.supplierId,
      supplierName: _0src.supplierName || 'Inconnu',
      date: _hubToday(),
      invoiceRef: '',
      items: [],
      totalCost: 0,
      type: _0src.type === 'supplier_add' ? 'supplier_add' : 'reception',
      createdAt: new Date().toISOString()
    };
  } else {
    try {
      _0dst = _hubBillById(_0target);
      if (!_0dst) _0dst = await dbGet('purchases', _0target);
    } catch (_e2) { _0dst = null; }
    if (!_0dst) { showToast(t('purchaseNotFound'), 'error'); return; }
  }
  _0dst.items = _0dst.items || [];
  _0dst.items.push(_0item);
  _0src.totalCost = _hubTotals(_0src.items);
  _0dst.totalCost = _hubTotals(_0dst.items);
  try {
    if (typeof dbMultiOp === 'function') {
      await dbMultiOp([
        { store: 'purchases', op: 'put', value: _0dst },
        { store: 'purchases', op: 'put', value: _0src }
      ]);
    } else {
      await dbPut('purchases', _0dst);
      await dbPut('purchases', _0src);
    }
  } catch (_e3) {
    console.error('Transfer item error:', _e3);
    showToast(t('saveFailed'), 'error');
    return;
  }
  _supplierBillStats = null;
  if (typeof loadSuppliers === 'function') loadSuppliers();
  showToast(t('supplierTransferSuccess'), 'success');
  if (typeof playSuccess === 'function') playSuccess();
  window.__hubExpandAfter = _0billId;
  await openSupplierDetail(_0src.supplierId || _0h.supplierId);
}

// === POPUP facture : liste produits dans une nouvelle fenêtre ===
function _hubBillPopupHtml(_bill, _0sup) {
  return '<div class="supplier-detail-modal supplier-hub-modal bill-popup-modal">' +
    '<div class="supplier-detail-head">' +
      '<div><h3>' + escapeHtml(t('supplierBillDateTitle', { date: _hubFmtDate(_bill.date) })) + '</h3>' +
      '<div class="supplier-detail-name">🏷️ ' + escapeHtml(_0sup ? (_0sup.name || '') : (_bill.supplierName || '')) + '</div></div>' +
      '<button class="expense-btn expense-btn--ghost" id="bill-popup-close" title="' + escapeHtml(t('closeModal')) + '">✕</button>' +
    '</div>' +
    '<div class="bill-popup-meta">' +
      ((_bill.invoiceRef) ? '<span class="hub-bill-ref">🧾 ' + escapeHtml(_bill.invoiceRef) + '</span>' : '') +
      '<span class="hub-bill-count">📦 ' + (_bill.items || []).length + ' ' + escapeHtml(t('itemsCountSuffix')) + '</span>' +
      '<span class="hub-bill-total">💰 ' + formatPrice(_bill.totalCost || 0) + ' DA</span>' +
    '</div>' +
    '<div class="supplier-hub-search bill-popup-search">' +
      '<input type="text" id="bill-popup-search" placeholder="' + escapeHtml(t('supplierHubSearchPlaceholder')) + '" autocomplete="off">' +
    '</div>' +
    '<div class="supplier-detail-body hub-body">' +
      '<div class="supplier-receipts-scroll bill-popup-items" id="bill-popup-items"></div>' +
    '</div>' +
    '<div class="supplier-detail-actions">' +
      '<button class="expense-btn expense-btn--primary" id="bill-popup-add">' + escapeHtml(t('supplierHubAddItem')) + '</button>' +
      '<button class="expense-btn expense-btn--ghost" id="bill-popup-edit">' + escapeHtml(t('supplierEditBill')) + '</button>' +
      '<button class="expense-btn expense-btn--ghost hub-danger" id="bill-popup-del">' + escapeHtml(t('supplierHubDeleteBill')) + '</button>' +
    '</div>' +
  '</div>';
}

async function hubViewBill(_0id, _0presetQ) {
  const _0h = window.__hub;
  if (!_0h) return;
  let _0bill = null;
  try {
    _0bill = (_0h.bills || []).find(function (_b) { return String(_b.id) === String(_0id); });
    if (!_0bill) _0bill = await dbGet('purchases', _0id);
  } catch (_e) {
    _0bill = null;
  }
  if (!_0bill) return;
  const _0old = document.getElementById('supplier-bill-popup-overlay');
  if (_0old) _0old.remove();
  window.__hubBillView = {
    billId: Number(_0bill.id),
    search: _0presetQ ? String(_0presetQ).toLowerCase() : ''
  };
  const _0ov = document.createElement('div');
  _0ov.className = 'expense-move-overlay supplier-detail-overlay';
  _0ov.id = 'supplier-bill-popup-overlay';
  _0ov.innerHTML = _hubBillPopupHtml(_0bill, _0h.supplier);
  document.body.appendChild(_0ov);
  _hubPopupBind(_0bill);
  _hubPopupRender(_0bill);
  const _0s = document.getElementById('bill-popup-search');
  if (_0s) setTimeout(function () { _0s.focus(); }, 30);
}

function hubViewClose() {
  const _0ov = document.getElementById('supplier-bill-popup-overlay');
  if (_0ov) _0ov.remove();
  window.__hubBillView = null;
}

function _hubPopupBind(_0bill) {
  const _0ov = document.getElementById('supplier-bill-popup-overlay');
  if (!_0ov) return;
  _0ov.addEventListener('click', function (_ev) {
    if (_ev.target === _0ov) hubViewClose();
  });
  const _0cl = document.getElementById('bill-popup-close');
  if (_0cl) _0cl.addEventListener('click', hubViewClose);
  const _0sr = document.getElementById('bill-popup-search');
  if (_0sr) _0sr.addEventListener('input', function () {
    if (!window.__hubBillView) return;
    window.__hubBillView.search = _0sr.value;
    _hubPopupRender(_0bill);
  });
  const _0add = document.getElementById('bill-popup-add');
  if (_0add) _0add.addEventListener('click', function () { hubAddItem(_0bill.id); });
  const _0edit = document.getElementById('bill-popup-edit');
  if (_0edit) _0edit.addEventListener('click', function () { hubEditBill(_0bill.id); });
  const _0del = document.getElementById('bill-popup-del');
  if (_0del) _0del.addEventListener('click', function () { hubDeleteBill(_0bill.id); });
}

function _hubPopupRender(_0bill) {
  const _0box = document.getElementById('bill-popup-items');
  if (!_0box) return;
  const _0q = window.__hubBillView ? String(window.__hubBillView.search || '') : '';
  _0box.innerHTML = _hubItemsHtml(_0bill, _0q);
  const _0s = document.getElementById('bill-popup-search');
  if (_0s) _0s.value = _0q;
}

// === openSupplierAddStock / openSupplierAddProduct : champs date/réf masqués ===
function _hubHideReceptionDateRef(_ids) {
  if (!window.__hub) return; // hors contexte hub, on garde les champs
  setTimeout(function () {
    (_ids || []).forEach(function (_id) {
      const _0el = document.getElementById(_id);
      if (!_0el) return;
      const _0p = _0el.closest('.form-group');
      if (_0p) _0p.style.display = 'none';
    });
  }, 0);
}

async function _hubOpenSupplierAddStock(_0s) {
  const _0ret = _origOpenSupplierAddStock
    ? await _origOpenSupplierAddStock.call(this, _0s)
    : null;
  _hubHideReceptionDateRef(['as-reception-date', 'as-reception-invoice']);
  return _0ret;
}

async function _hubOpenSupplierAddProduct(_0s) {
  const _0ret = _origOpenSupplierAddProduct
    ? await _origOpenSupplierAddProduct.call(this, _0s)
    : null;
  _hubHideReceptionDateRef(['sd-reception-date', 'sd-reception-invoice']);
  return _0ret;
}

// === recordSupplierEvent : ajout dans la facture ouverte ===
async function _hubRecordSupplierEvent(_0sid, _0type, _0items, _0meta) {
  const _0bid = window.__hubAppendBillId;
  if (_0bid != null && _0bid !== '' && _0type !== 'supplier_add') {
    try {
      const _0ov = document.getElementById('supplier-detail-overlay');
      if (_0ov) {
        const _0bill = await dbGet('purchases', _0bid);
        if (_0bill && String(_0bill.supplierId) === String(_0sid)) {
          window.__hubAppendBillId = null;
          const _0list = (_0bill.items || []).slice();
          (_0items || []).forEach(function (_it) {
            _0list.push({
              barcode: String(_it.barcode || ''),
              name: String(_it.name || ''),
              qty: parseFloat(_it.qty) || 0,
              purchasePrice: parseFloat(_it.purchasePrice) || 0
            });
          });
          let _0tot = 0;
          _0list.forEach(function (_it) { _0tot += (parseFloat(_it.qty) || 0) * (parseFloat(_it.purchasePrice) || 0); });
          _0bill.items = _0list;
          _0bill.totalCost = _0tot;
          if (!_0bill.date && _0meta && _0meta.date) _0bill.date = _0meta.date;
          if (!_0bill.invoiceRef && _0meta && _0meta.invoiceRef) _0bill.invoiceRef = _0meta.invoiceRef;
          await dbPut('purchases', _0bill);
          if (typeof _supplierBillStats !== 'undefined') _supplierBillStats = null;
          if (typeof loadSuppliers === 'function') loadSuppliers();
          window.__hubExpandAfter = _0bid;
          setTimeout(function () {
            if (typeof openSupplierDetail === 'function') openSupplierDetail(_0sid);
          }, 60);
          return _0bill;
        }
      }
    } catch (_err) {
      console.error('hub append error:', _err);
    }
  }
  if (_origRecordSupplierEvent) return _origRecordSupplierEvent.call(this, _0sid, _0type, _0items, _0meta);
  return null;
}

// === openSupplierReceptionEdit : champs fournisseur/date/facture masqués ===
async function _hubOpenSupplierReceptionEdit(_0a, _0b, _0c, _0d, _0e, _0f) {
  if (_0b != null) window.__hubExpandAfter = _0b; // re-ouvre la même facture après sauvegarde
  const _0ret = _origOpenSupplierReceptionEdit
    ? await _origOpenSupplierReceptionEdit.call(this, _0a, _0b, _0c, _0d, _0e, _0f)
    : null;
  setTimeout(function () {
    ['sre-supplier', 'sre-date', 'sre-invoice'].forEach(function (_id) {
      const _0el = document.getElementById(_id);
      if (!_0el) return;
      const _0p = _0el.closest('.form-group');
      if (_0p) _0p.style.display = 'none';
    });
  }, 0);
  return _0ret;
}

// === supplierReceiptDetail : retour au hub ===
async function supplierReceiptDetail(_0arg, _0sid) {
  let _0expandId = null;
  if (typeof _0arg === 'string') {
    try {
      const _0ids = JSON.parse(_0arg);
      if (Array.isArray(_0ids) && _0ids.length) _0expandId = _0ids[0];
    } catch (_err) { _0expandId = null; }
  }
  if (_0expandId != null) window.__hubExpandAfter = _0expandId;
  if (_0sid != null && typeof openSupplierDetail === 'function') {
    const _0ov = document.getElementById('supplier-detail-overlay');
    if (_0ov) await openSupplierDetail(_0sid);
  }
}

// === openReceptionPopover : layout réorganisé en 2 sections ===
function _hubOpenReceptionPopover(_0opt) {
  _0opt = _0opt || {};
  const _0sup = _0opt['supplier'] || null;
  const _0id = _0opt['id'] || null;
  try { if (_receptionOverlay) { _receptionOverlay.remove(); _receptionOverlay = null; } } catch (_e) {}
  _receptionEditingId = _0id;

  let _0opts = '<option value="">' + escapeHtml(t('receptionSelectPrompt')) + '</option>';
  (suppliers || []).forEach(function (_s) {
    const _sel = _0sup && String(_s.id) === String(_0sup.id) ? ' selected' : '';
    _0opts += '<option value="' + _s.id + '"' + _sel + '>' + escapeHtml(_s.name || '') + '</option>';
  });

  const _0ov = document.createElement('div');
  _0ov.className = 'expense-move-overlay supplier-detail-overlay';
  _0ov.id = 'reception-popover-overlay';
  _0ov.innerHTML =
    '<div class="supplier-detail-modal reception-popover reception-popover-box">' +
      '<div class="supplier-detail-head">' +
        '<div><h3>' + escapeHtml(t(_0id ? 'editReceptionTitle' : 'receptionTitle')) + '</h3>' +
        '<div class="supplier-detail-name" id="reception-name-line">' + (_0sup ? ('🏷️ ' + escapeHtml(_0sup.name)) : '') + '</div></div>' +
        '<button class="expense-btn expense-btn--ghost" id="reception-popover-close" title="' + escapeHtml(t('closeModal')) + '">✕</button>' +
      '</div>' +
      '<div class="supplier-detail-body reception-body">' +
        '<div class="reception-section-title">1. ' + escapeHtml(t('receptionInfoTitle')) + '</div>' +
        '<div class="form-row">' +
          '<div class="form-group" style="flex:2;">' +
            '<label>' + escapeHtml(t('receptionSupplier')) + '</label>' +
            '<select id="reception-supplier" required>' + _0opts + '</select>' +
          '</div>' +
          '<div class="form-group" style="flex:1;">' +
            '<label>' + escapeHtml(t('receptionDate')) + '</label>' +
            '<input type="date" id="reception-date">' +
          '</div>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>' + escapeHtml(t('receptionInvoice')) + '</label>' +
          '<input type="text" id="reception-invoice" placeholder="' + escapeHtml(t('receptionInvoicePlaceholder')) + '">' +
        '</div>' +
        '<div class="reception-section-title reception-section-title--items">2. ' + escapeHtml(t('receptionItems')) + '</div>' +
        '<div class="reception-items-toolbar">' +
          '<button type="button" class="expense-btn expense-btn--primary" id="btn-add-reception-item">' + escapeHtml(t('addReceptionItem')) + '</button>' +
        '</div>' +
        '<div class="reception-empty-hint" id="reception-empty-hint">' + escapeHtml(t('receptionNoItemsHint')) + '</div>' +
        '<div id="reception-items-container" class="reception-items-container"></div>' +
      '</div>' +
      '<div class="supplier-detail-actions reception-actions">' +
        '<div class="reception-total"><span>' + escapeHtml(t('totalLabel')) + ' :</span> <b id="reception-total">0.00</b> DA</div>' +
        '<div class="reception-action-btns">' +
          (_0id ? '<button type="button" class="expense-btn expense-btn--ghost hub-danger" id="btn-del-reception">' + escapeHtml(t('supplierHubDeleteBill')) + '</button>' : '') +
          '<button type="button" class="expense-btn expense-btn--ghost" id="btn-cancel-reception">' + escapeHtml(t('cancel')) + '</button>' +
          '<button type="button" class="expense-btn expense-btn--primary" id="btn-save-reception">' + escapeHtml(t(_0id ? 'saveReceptionChanges' : 'saveReception')) + '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(_0ov);
  _receptionOverlay = _0ov;

  const _0close = function () {
    try { _0ov.remove(); } catch (_e) {}
    _receptionOverlay = null;
    _receptionEditingId = null;
  };
  _0ov.addEventListener('click', function (_ev) { if (_ev.target === _0ov) _0close(); });
  const _0cl = document.getElementById('reception-popover-close');
  if (_0cl) _0cl.addEventListener('click', _0close);
  const _0ca = document.getElementById('btn-cancel-reception');
  if (_0ca) _0ca.addEventListener('click', _0close);

  const _0hideHint = function () {
    const _0h = document.getElementById('reception-empty-hint');
    if (_0h) _0h.style.display = 'none';
  };

  if (_0id) {
    loadReceptionIntoPopover(_0id, _0sup);
    _0hideHint();
  } else {
    const _0dt = document.getElementById('reception-date');
    if (_0dt) _0dt.value = new Date().toISOString().split('T')[0];
    addReceptionItemRow();
    _0hideHint();
  }

  const _0updName = function () {
    const _0nml = document.getElementById('reception-name-line');
    if (!_0nml) return;
    const _0sel = document.getElementById('reception-supplier');
    const _0su = (suppliers || []).find(function (_s) { return String(_s.id) === String(_0sel ? _0sel.value : ''); });
    _0nml.textContent = _0su ? '🏷️ ' + _0su.name : '';
  };
  const _0sel = document.getElementById('reception-supplier');
  if (_0sel) _0sel.addEventListener('change', _0updName);
  const _0add = document.getElementById('btn-add-reception-item');
  if (_0add) _0add.addEventListener('click', function () { _0hideHint(); addReceptionItemRow(); });
  const _0save = document.getElementById('btn-save-reception');
  if (_0save) _0save.addEventListener('click', async function () { await saveReception(_0close); });
  const _0del = document.getElementById('btn-del-reception');
  if (_0del) _0del.addEventListener('click', async function () {
    const _0bid = _receptionEditingId;
    if (typeof deletePurchase === 'function') await deletePurchase(_0bid);
    let _0gone = false;
    try { _0gone = _0bid != null && (await dbGet('purchases', _0bid)) == null; } catch (_e) { _0gone = false; }
    if (!_0gone) return; // l'utilisateur a annulé la confirmation
    _0close();
  });
}
window.openReceptionPopover = _hubOpenReceptionPopover;

// === exports pour les onclick en ligne ===
recordSupplierEvent = _hubRecordSupplierEvent;
openSupplierReceptionEdit = _hubOpenSupplierReceptionEdit;
openSupplierAddStock = _hubOpenSupplierAddStock;
openSupplierAddProduct = _hubOpenSupplierAddProduct;

window.hubViewBill = hubViewBill;
window.hubViewClose = hubViewClose;
window.hubEditDate = hubEditDate;
window.hubSaveBillDate = hubSaveBillDate;
window.hubSaveNewBill = hubSaveNewBill;
window.hubAddItem = hubAddItem;
window.hubDeleteBill = hubDeleteBill;
window.hubDeleteItem = hubDeleteItem;
window.hubEditBill = hubEditBill;
window.hubEditBillSave = hubEditBillSave;
window.hubTransferItem = hubTransferItem;
window.hubTransferDo = hubTransferDo;