// === Returns (Retour produit) module ===
// Simplified, no-popup return flow:
  //   - Toggle "↩️ Retour" -> scan/add is marked isReturn:true and appears as RED
  //     line in the normal cart. Mode auto-exits after each item; re-click to return another.
  //   - "Finaliser" splits the cart: normal lines -> regular sale path, return lines ->
  //     negative sale record (type:'retour', isReturn:true) with stock restored
  //     atomically (dbMultiOp). Charts, metric cards, daily breakdown, day-export,
  //     z-report all REDUCE revenue/profit/cash.
  //   - After each return item the mode exits automatically (re-click to continue).
// Settings gates (extras, default OFF until enabled):
//   returnsEnabled              - master switch (default ON)
//   returnsReceiptEnabled       - auto-print a return receipt
//   returnsPermissionEnabled    - require hasPermission('returns.view')
// Loaded AFTER zreport.js so it can wrap add/render/complete globals.
(function () {
  function _num(v) { return parseFloat(v) || 0; }
  var _esc = typeof escapeHtml === 'function' ? escapeHtml : function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] || c; }); };

  window.returnModeActive = false;

  var _origAddToCartWithQuantity = window.addToCartWithQuantity;
  var _origAddVariantToCart = window.addVariantToCart;
  var _origRenderCart = window.renderCart;
  var _origCompleteTransaction = window.completeTransaction;

  // ============================================================
  // SETTINGS HELPERS
  // ============================================================
  function _enabled() { return !window.settings || window.settings.returnsEnabled !== false; }
  function _receiptEnabled() { return !!(window.settings && window.settings.returnsReceiptEnabled); }
  function _permissionEnabled() { return !!(window.settings && window.settings.returnsPermissionEnabled); }

  function _getReturnReason() {
    var sel = document.getElementById('return-reason-select');
    if (sel && sel.value) return sel.value;
    return 'other';
  }

  function _canUseReturns() {
    if (!_enabled()) {
      if (typeof showToast === 'function') showToast(t('returnsDisabled'), 'warning');
      if (typeof playWarning === 'function') playWarning();
      return false;
    }
    if (_permissionEnabled() && typeof hasPermission === 'function' && !hasPermission('returns.view')) {
      if (typeof showToast === 'function') showToast(t('returnsPermissionDenied'), 'error');
      if (typeof playError === 'function') playError();
      return false;
    }
    return true;
  }

  // ============================================================
  // LINE HELPERS
  // ============================================================
  function _effective(line) {
    return (line.reducedPrice !== null && line.reducedPrice !== undefined && line.reducedPrice < line.price)
      ? line.reducedPrice : line.price;
  }

  // Async: find the original (non-return) sale for this product, calculate
  // how much was sold vs already returned, clamp qty if over-sold, and
  // attach originalSaleId / soldTimestamp to the return line.
  async function _validateAndLinkSale(line, product, qty, variant) {
    try {
      if (typeof dbGetAll !== 'function') return;
      var sales = await dbGetAll('sales');
      if (!Array.isArray(sales)) return;

      var barcode = product.barcode;
      var variantKey = line.variantKey || barcode;
      var soldQty = 0;
      var returnedQty = 0;
      var originalSaleId = null;
      var soldTimestamp = null;

      for (var i = sales.length - 1; i >= 0; i--) {
        var s = sales[i];
        if (!s || !Array.isArray(s.items)) continue;

        var match = null;
        for (var j = 0; j < s.items.length; j++) {
          var si = s.items[j];
          if (si.barcode === barcode) { match = si; break; }
          if (variantKey && si.variantKey && si.variantKey === variantKey) { match = si; break; }
        }
        if (!match) continue;

        if (s.isReturn || s.type === 'retour') {
          returnedQty += Math.abs(_num(match.qty));
        } else {
          soldQty += Math.abs(_num(match.qty));
          if (!originalSaleId) {
            originalSaleId = s.id;
            soldTimestamp = s.timestamp;
          }
        }
      }

      // Attach original sale reference
      if (originalSaleId) {
        line.originalSaleId = originalSaleId;
        line.soldTimestamp = soldTimestamp;
      } else {
        // No prior sale found — allow return but warn
        if (typeof showToast === 'function') showToast(t('returnNoOriginalSale', { name: product.name || barcode }), 'warning');
        if (typeof playWarning === 'function') playWarning();
      }

      // Clamp qty if exceeds available
      var available = soldQty - returnedQty;
      if (available > 0 && qty > available) {
        if (typeof showToast === 'function') showToast(t('returnQtyClamped', { requested: qty, available: available }), 'warning');
        if (typeof playWarning === 'function') playWarning();
        line.qty = available;
        if (typeof renderCart === 'function') renderCart();
      }
    } catch (e) {
      console.error('[Returns] validateAndLinkSale:', e);
    }
  }

  function _cartReturnTotal() {
    var cart = window.cart || [];
    var total = 0;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i] && cart[i].isReturn) total += _num(_effective(cart[i])) * _num(cart[i].qty);
    }
    return total;
  }

  // Push a red return line into the normal cart.
  function _addReturnLine(product, qty, variant) {
    if (!product) return;
    var q = (qty === undefined || qty === null) ? 1 : _num(qty);
    if (q <= 0) q = 1;
    var price = (variant && variant.price != null) ? variant.price : (product.price || 0);
    var pp = product.purchasePrice != null ? product.purchasePrice : (product.price || 0);

    var line = {
      barcode: product.barcode,
      name: product.name,
      price: _num(price),
      purchasePrice: _num(pp),
      reference: product.reference || '',
      reducedPrice: null,
      unit: product.unit || 'pièce',
      qty: q,
      isReturn: true,
      returnReason: _getReturnReason()
    };
    if (variant) {
      line.variantKey = variant.barcode || (product.barcode + '-var-' + variant.id);
      line.variantName = variant.name || '';
    } else {
      line.category = product.category || '';
      line.supplierId = product.supplierId != null ? product.supplierId : null;
    }

    var cart = window.cart || (window.cart = []);
    var key = line.variantKey || line.barcode;
    var existing = null;
    for (var i = 0; i < cart.length; i++) {
      var l = cart[i];
      if (l && l.isReturn && ((l.variantKey || l.barcode) === key)) { existing = l; break; }
    }
     if (existing) existing.qty = _num(existing.qty) + q;
     else cart.push(line);

     var targetLine = existing || line;

     if (typeof updateLastScannedItem === 'function') updateLastScannedItem(product);
     if (typeof playScan === 'function') playScan();
     if (typeof syncActiveColumnFromCart === 'function') { try { syncActiveColumnFromCart(); } catch (e) {} }
     if (typeof renderFastClientColumns === 'function') { try { renderFastClientColumns(); } catch (e) {} }

     // Auto-exit return mode after each returned item so the user must
     // re-click "↩️ Retour" for the next item.
     window.returnModeActive = false;
     _syncModeUI();
     if (typeof renderCart === 'function') renderCart();
     if (typeof resetScanner === 'function') resetScanner();
     if (typeof lockFocus === 'function') { try { lockFocus(); } catch (e) {} }

     // Async: validate against original sale + link originalSaleId
     _validateAndLinkSale(targetLine, product, _num(targetLine.qty), variant);
   }

  // ============================================================
  // WRAP addToCartWithQuantity / addVariantToCart
  // ============================================================
  if (typeof _origAddToCartWithQuantity === 'function') {
    window.addToCartWithQuantity = function (product, qty) {
      if (!window.returnModeActive) return _origAddToCartWithQuantity.apply(this, arguments);
      return _addReturnLine(product, qty, null);
    };
  }
  if (typeof _origAddVariantToCart === 'function') {
    window.addVariantToCart = function (product, variant, qty) {
      if (!window.returnModeActive) return _origAddVariantToCart.apply(this, arguments);
      return _addReturnLine(product, qty, variant);
    };
  }

  // ============================================================
  // RENDER DECORATION (red rows + net total + button label)
  // ============================================================
  function _setMoney(el, value) {
    if (!el) return;
    var cur = (window.settings && window.settings.currency) ? window.settings.currency : 'DA';
    var n = _num(value);
    el.textContent = (n < 0 ? '−' : '') + formatPrice(Math.abs(n)) + ' ' + cur;
    el.classList.toggle('negative-total', n < 0);
  }

  function _decorateReturns() {
    var cart = window.cart || [];
    var hasReturn = false;
    for (var i = 0; i < cart.length; i++) { if (cart[i] && cart[i].isReturn) { hasReturn = true; break; } }

    // Red rows
    var body = document.getElementById('cart-table-body');
    if (body) {
      var btns = body.querySelectorAll('.btn-delete-row[data-index]');
      for (var b = 0; b < btns.length; b++) {
        var idx = parseInt(btns[b].getAttribute('data-index'), 10);
        var line = cart[idx];
        var tr = btns[b].closest ? btns[b].closest('tr') : null;
        if (!tr) continue;
        if (line && line.isReturn) tr.classList.add('cart-return-line');
        else tr.classList.remove('cart-return-line');
      }
    }

    // Finalize button label
    var btn = document.getElementById('btn-complete-transaction');
    if (btn) {
      if (hasReturn) { btn.textContent = t('returnValidateBtn'); btn.classList.add('btn-return-active'); }
      else { btn.textContent = t('completeSale'); btn.classList.remove('btn-return-active'); }
    }

    // Net total (sale — refund) — always reset to avoid stale red color
     if (typeof calculateTotals === 'function') {
       var returnTotal = hasReturn ? _cartReturnTotal() : 0;
       var totals = calculateTotals('main');
       if (totals) {
         var netGrand = _num(totals.grandTotal) - 2 * returnTotal;
         var netSub = _num(totals.subtotal) - 2 * returnTotal;
         _setMoney(document.getElementById('checkout-top-total'), netGrand);
         _setMoney(document.getElementById('checkout-grandtotal'), netGrand);
         var subEl = document.getElementById('checkout-subtotal');
         if (subEl) {
           var cur = (window.settings && window.settings.currency) ? window.settings.currency : 'DA';
           subEl.textContent = (netSub < 0 ? '−' : '') + formatPrice(Math.abs(netSub)) + ' ' + cur;
           subEl.classList.toggle('negative-total', netSub < 0);
         }
       }
     }
  }

  if (typeof _origRenderCart === 'function') {
    window.renderCart = function () {
      var r = _origRenderCart.apply(this, arguments);
      try { _decorateReturns(); } catch (e) { console.error('[Returns] decorate:', e); }
      return r;
    };
  }

  // ============================================================
  // MODE UI
  // ============================================================
  function _syncModeUI() {
    var btn = document.getElementById('btn-toggle-return');
    if (btn) {
      if (window.returnModeActive) {
        btn.textContent = t('returnCancelMode');
        btn.classList.remove('btn-warning'); btn.classList.add('btn-danger');
      } else {
        btn.textContent = t('btnReturn');
        btn.classList.add('btn-warning'); btn.classList.remove('btn-danger');
      }
      btn.style.display = _enabled() ? '' : 'none';
    }
     var banner = document.getElementById('return-mode-banner');
     if (banner) banner.style.display = window.returnModeActive ? 'block' : 'none';
     document.body.classList.toggle('return-mode', !!window.returnModeActive);
     // Show/hide return reason selector when return mode toggles
     var reasonSel = document.getElementById('return-reason-selector');
     if (reasonSel) reasonSel.style.display = window.returnModeActive ? 'block' : 'none';
  }

  function toggleReturnMode() {
    if (window.returnModeActive) {
      window.returnModeActive = false;
    } else {
      if (!_canUseReturns()) return;
      if (window.__txInProgress) {
        if (typeof showToast === 'function') showToast(t('waitTransaction'), 'warning');
        return;
      }
      window.returnModeActive = true;
    }
    _syncModeUI();
    if (typeof renderCart === 'function') renderCart();
    if (typeof resetScanner === 'function') resetScanner();
    if (typeof lockFocus === 'function') { try { lockFocus(); } catch (e) {} }
  }
  window.toggleReturnMode = toggleReturnMode;

  // ============================================================
  // COMPLETE (split cart -> sale + negative return record)
  // ============================================================
  if (typeof _origCompleteTransaction === 'function') {
    window.completeTransaction = async function (isQuickCart) {
      var cart = window.cart || [];
      var returnItems = [];
      for (var i = 0; i < cart.length; i++) { if (cart[i] && cart[i].isReturn) returnItems.push(cart[i]); }
      if (!returnItems.length) return _origCompleteTransaction.apply(this, arguments);
      return _completeMixed(isQuickCart, returnItems);
    };
  }

  async function _completeMixed(isQuickCart, returnItems) {
    var fullCart = (window.cart || []).slice();
    var saleItems = fullCart.filter(function (it) { return it && !it.isReturn; });

    if (DOM && DOM.btnComplete) DOM.btnComplete.disabled = true;
    try {
      // 1) Normal sale part (if any) through the regular transaction path.
      if (saleItems.length) {
        window.cart = saleItems.slice();
        var ok = false;
        try { ok = await _origCompleteTransaction(isQuickCart); } catch (e) { ok = false; }
        if (!ok) {
          // Aborted (e.g. ask-customer modal / credit without client) -> restore cart.
          window.cart = fullCart;
          if (typeof renderCart === 'function') renderCart();
          return false;
        }
      }

      // 2) Return part -> atomic restock + negative sale record.
      var res = await _processReturns(returnItems);

      // 3) Cleanup
       window.cart = [];
      if (typeof renderCart === 'function') renderCart();
      window.returnModeActive = false;
      _syncModeUI();
      if (typeof resetScanner === 'function') resetScanner();
      return res;
    } catch (err) {
      console.error('[Returns] complete error:', err);
      if (typeof playError === 'function') playError();
      if (typeof showToast === 'function') showToast(t('returnFailedMsg', { error: err.message || err }), 'error');
      return false;
    } finally {
      if (DOM && DOM.btnComplete) DOM.btnComplete.disabled = false;
    }
  }

  async function _processReturns(returnItems) {
    if (!returnItems || !returnItems.length) return false;
    if (window.__txInProgress) {
      if (typeof showToast === 'function') showToast(t('waitTransaction'), 'info');
      return false;
    }
    window.__txInProgress = true;
    try {
      var refundTotal = 0;
      var profitTotal = 0;
      var saleItems = [];
      for (var i = 0; i < returnItems.length; i++) {
        var line = returnItems[i];
        var qty = _num(line.qty);
        if (qty <= 0) continue;
        var eff = _num(_effective(line));
        var lineProfit = (eff - _num(line.purchasePrice)) * qty;
        refundTotal += eff * qty;
        profitTotal += lineProfit;
        var it = {
          name: line.name,
          barcode: line.barcode,
          reference: line.reference || '',
          qty: -qty,
          unit: line.unit || 'pièce',
          originalPrice: _num(line.price),
          soldPrice: eff,
          reducedPrice: null,
          purchasePrice: _num(line.purchasePrice),
          profit: -lineProfit,
          discounted: false,
          discountAmount: 0
        };
          if (line.variantKey) it.variantKey = line.variantKey;
          if (line.variantName) it.variantName = line.variantName;
          if (line.originalSaleId) it.originalSaleId = line.originalSaleId;
          if (line.soldTimestamp) it.soldTimestamp = line.soldTimestamp;
          if (line.returnReason) it.returnReason = line.returnReason;
         saleItems.push(it);
      }
      if (!saleItems.length) return false;

      // ATOMIC write: restock products/variants + persist negative sale
      var ops = [];
      for (var si = 0; si < saleItems.length; si++) {
        var item = saleItems[si];
        if (item.variantKey) {
          ops.push({ store: 'product_variants', op: 'getAll' });
          (function (idx, it2) {
            ops.push({ store: 'product_variants', op: 'put', valueBuilder: function (r) {
              var all = r[idx];
              if (!Array.isArray(all)) return null;
              var v = all.find(function (vv) {
                if (vv && vv.barcode && it2.variantKey === vv.barcode) return true;
                if (vv && it2.variantKey === it2.barcode + '-var-' + vv.id) return true;
                return false;
              });
              if (v) v.stock = _num(v.stock) + Math.abs(it2.qty);
              return v;
            }});
          })(ops.length - 1, item);
        } else {
          ops.push({ store: 'products', op: 'get', key: item.barcode });
          (function (idx, it2) {
            ops.push({ store: 'products', op: 'put', valueBuilder: function (r) {
              var p = r[idx];
              if (!p) return null;
              p.stock = _num(p.stock) + Math.abs(it2.qty);
              return p;
            }});
          })(ops.length - 1, item);
        }
      }

      var saleId = Date.now();
      var saleRecord = {
        id: saleId,
        timestamp: new Date().toISOString(),
        customerId: null,
        customerName: null,
        items: saleItems,
        subtotal: -refundTotal,
        vat: 0,
        discount: 0,
        grandTotal: -refundTotal,
        totalProfit: -profitTotal,
        amountPaid: -refundTotal,
        remainingAmount: 0,
        paymentStatus: 'paid',
        paymentMarked: 'paid',
        isDebt: false,
        quickCustomerSale: false,
        paymentMethod: 'especes',
        paymentDetails: { refund: true, isReturn: true },
        openedPacks: [],
        type: 'retour',
        isReturn: true
      };

      if (typeof dbMultiOp === 'function') {
        ops.push({ store: 'sales', op: 'put', value: saleRecord });
        await dbMultiOp(ops);
      } else if (typeof dbGet === 'function' && typeof dbGetAll === 'function' && typeof dbPut === 'function') {
        for (var vi = 0; vi < saleItems.length; vi++) {
          var vit = saleItems[vi];
          var back = Math.abs(vit.qty);
          if (vit.variantKey) {
            var allv = await dbGetAll('product_variants');
            var vv = allv.find(function (x) {
              if (x && x.barcode && vit.variantKey === x.barcode) return true;
              if (x && vit.variantKey === vit.barcode + '-var-' + x.id) return true;
              return false;
            });
            if (vv) { vv.stock = _num(vv.stock) + back; await dbPut('product_variants', vv); }
          } else {
            var pr = await dbGet('products', vit.barcode);
            if (pr) { pr.stock = _num(pr.stock) + back; await dbPut('products', pr); }
          }
        }
        await dbPut('sales', saleRecord);
      }

      if (typeof playSuccess === 'function') playSuccess();
      if (typeof showToast === 'function') {
        var cur = (window.settings && window.settings.currency) ? window.settings.currency : 'DA';
        showToast(t('returnCompletedMsg', { total: formatPrice(refundTotal), currency: cur }), 'success');
      }

      // Optional receipt
      if (_receiptEnabled() && typeof printReceipt === 'function') {
        var receiptData = {
          items: saleItems.map(function (it) {
            return {
              name: it.name || 'Produit',
              reference: it.reference || '—',
              qty: Math.abs(it.qty),
              originalPrice: it.originalPrice,
              reducedPrice: it.reducedPrice,
              soldPrice: it.soldPrice || it.originalPrice,
              variantName: it.variantName,
               originalSaleId: it.originalSaleId,
               isReturn: true
            };
          }),
          grandTotal: -refundTotal,
          subtotal: -refundTotal,
          amountPaid: -refundTotal,
          isDebt: false,
          remainingAmount: 0,
          customerName: t('returnRefundLabel'),
          isReturnReceipt: true
        };
        setTimeout(function () { try { printReceipt(receiptData); } catch (e) { console.error('[Returns] print:', e); } }, 500);
      }

      // Audit
      if (typeof logAudit === 'function') {
        var cur2 = (window.settings && window.settings.currency) ? window.settings.currency : 'DA';
        try {
          await logAudit('SALE_REFUNDED', 'Retour #' + saleId + ' - ' + saleItems.length + ' article(s) - ' + formatPrice(refundTotal) + ' ' + cur2 + ' (remboursé)');
        } catch (e) { console.error('[Returns] audit:', e); }
      }

      // Backup
      try { if (window.settings && window.settings.autoBackupEnabled !== false && typeof createAutoBackup === 'function') await createAutoBackup(); } catch (e) {}

      // Refresh analytics + caches
      try { if (typeof refreshAnalytics === 'function') await refreshAnalytics(); else if (typeof loadAnalytics === 'function') await loadAnalytics(); } catch (e) {}
      try { if (typeof refreshProductsCache === 'function') await refreshProductsCache(); } catch (e) {}
      try {
        var rp = document.getElementById('returns-history-panel');
        var rl = document.getElementById('returns-history-list');
        if (rp && rl && getComputedStyle(rp).display !== 'none') renderReturnsHistory();
      } catch (e) {}
      return true;
    } catch (err) {
      console.error('[Returns] processReturns error:', err);
      if (typeof playError === 'function') playError();
      if (typeof showToast === 'function') showToast(t('returnFailedMsg', { error: err.message || err }), 'error');
      return false;
    } finally {
      window.__txInProgress = false;
    }
  }

  // ============================================================
  // GUARDS (block editing/restoring/deleting return records)
  // ============================================================
  if (typeof window.restoreTransactionToCart === 'function') {
    var _origRestore = window.restoreTransactionToCart;
    window.restoreTransactionToCart = async function (saleId) {
      try {
        var sale = await dbGet('sales', Number(saleId));
        if (sale && sale.isReturn) {
          if (typeof showToast === 'function') showToast(t('returnRestoreBlocked'), 'warning');
          if (typeof playWarning === 'function') playWarning();
          return;
        }
      } catch (e) {}
      return _origRestore(saleId);
    };
  }

  if (typeof window.openEditSaleModal === 'function') {
    var _origEdit = window.openEditSaleModal;
    window.openEditSaleModal = async function (saleId) {
      try {
        var sale = await dbGet('sales', Number(saleId));
        if (sale && sale.isReturn) {
          if (typeof showToast === 'function') showToast(t('returnEditBlocked'), 'warning');
          if (typeof playWarning === 'function') playWarning();
          return;
        }
      } catch (e) {}
      return _origEdit(saleId);
    };
  }

  if (typeof window.deleteSale === 'function') {
    var _origDeleteSale = window.deleteSale;
    window.deleteSale = async function (saleId) {
      try {
        var sale = await dbGet('sales', Number(saleId));
        if (sale && sale.isReturn) {
          if (typeof showToast === 'function') showToast(t('returnDeleteBlocked'), 'warning');
          if (typeof playWarning === 'function') playWarning();
          return;
        }
      } catch (e) {}
      return _origDeleteSale(saleId);
    };
  }

   // ============================================================
   // RETURNS HISTORY (Stock view)
   // ============================================================
   var _returnsCache = [];

   function _returnsSearchQuery() {
    var inp = document.getElementById('returns-search-input');
    return (inp && inp.value) ? String(inp.value).trim().toLowerCase() : '';
   }

   function _filterReturns(returns, q) {
    if (!q) return returns;
    var out = [];
    for (var i = 0; i < returns.length; i++) {
      var r = returns[i];
      var id = String(r.id || r.saleId || '');
      var match = id.toLowerCase().indexOf(q) !== -1;
      if (!match && Array.isArray(r.items)) {
        for (var j = 0; j < r.items.length; j++) {
          var it = r.items[j];
          if (!it) continue;
          var name = (it.name != null ? String(it.name) : '') + (it.variantName != null ? ' ' + String(it.variantName) : '');
          var ref = it.reference != null ? String(it.reference) : '';
          var bar = it.barcode != null ? String(it.barcode) : '';
          if (name.toLowerCase().indexOf(q) !== -1 || ref.toLowerCase().indexOf(q) !== -1 || bar.toLowerCase().indexOf(q) !== -1) { match = true; break; }
        }
      }
      if (match) out.push(r);
    }
    return out;
   }

   async function renderReturnsHistory() {
    var panel = document.getElementById('returns-history-list');
    if (!panel) return;
    try {
      var sales = typeof dbGetAll === 'function' ? await dbGetAll('sales') : [];
      var returns = [];
      if (Array.isArray(sales)) {
        for (var i = 0; i < sales.length; i++) {
          var s = sales[i];
          if (s && (s.isReturn || s.type === 'retour')) returns.push(s);
        }
      }
      // Sort by most recent first
      returns.sort(function(a, b) {
        return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
      });
      _returnsCache = returns;
      _renderReturnsList(returns, _returnsSearchQuery());
    } catch (e) {
      console.error('[Returns] history fetch:', e);
      panel.innerHTML = '<div style="text-align:center;color:#e74c3c;padding:12px;">' + _esc(t('errorFetchingSales')) + '</div>';
    }
   }

   function _renderReturnsList(returns, q) {
    var panel = document.getElementById('returns-history-list');
    if (!panel) return;
    var cur = (window.settings && window.settings.currency) ? window.settings.currency : 'DA';
    returns = _filterReturns(returns, q);

    if (!returns.length) {
      panel.innerHTML = '<div style="text-align:center;color:#999;padding:16px;">' + _esc(_returnsCache.length ? t('returnsSearchEmpty') : t('returnsHistoryEmpty')) + '</div>';
      return;
    }

    var reasonMap = {
      defective: t('returnReasonDefective'),
      change: t('returnReasonChange'),
      error: t('returnReasonError'),
      other: t('returnReasonOther')
    };

    var html = '<div style="font-family:var(--font-family);">';
    for (var i = 0; i < returns.length; i++) {
      var r = returns[i];
      var date = r.timestamp ? new Date(r.timestamp).toLocaleString('fr-FR') : '—';
      var id = r.id || r.saleId || '—';
      var total = _num(r.grandTotal);
      var items = (r.items && r.items.length) ? r.items : [];
      var reasons = {};

      html += '<div style="margin-bottom:8px;border:1px solid #e8e8e8;border-radius:var(--radius-sm);padding:8px 10px;background:#fafafa;">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:8px;">';
      html += '<span style="font-weight:600;font-size:12px;color:#333;">📅 ' + _esc(date) + '</span>';
      html += '<span style="display:flex;align-items:center;gap:6px;">';
      html += '<span style="font-size:11px;color:#666;">' + t('returnsHistoryId') + ' : ' + _esc(String(id)) + '</span>';
      html += '<button type="button" class="btn-return-delete" data-return-id="' + _esc(String(id)) + '" title="' + _esc(t('returnsDeleteBtn')) + '" style="background:#e74c3c;color:#fff;border:none;border-radius:4px;padding:2px 7px;font-size:11px;cursor:pointer;line-height:1.5;">🗑</button>';
      html += '</span>';
      html += '</div>';

      html += '<div>';
      for (var j = 0; j < items.length; j++) {
        var it = items[j];
        var itQty = Math.abs(_num(it.qty));
        var itName = it.name ? String(it.name) : (it.barcode ? String(it.barcode) : t('product'));
        var itUnit = it.unit || 'pièce';
        var itPrice = (it.soldPrice != null) ? _num(it.soldPrice) : _num(it.originalPrice);
        var itTotal = itQty * itPrice;
        var reason = it.returnReason || '';
        var reasonLabel = (reason && reasonMap[reason]) ? ' <span style="color:#e74c3c;">[' + _esc(reasonMap[reason]) + ']</span>' : '';
        if (reason) reasons[reason] = true;
        html += '<div style="font-size:12px;padding:2px 0;border-bottom:1px dashed #ececec;color:#333;">';
        html += '• ' + itQty + ' × ' + _esc(itName);
        if (it.variantName) html += ' (' + _esc(String(it.variantName)) + ')';
        html += ' <span style="color:#888;font-size:11px;">[' + _esc(itUnit) + ']</span>';
        html += ' — ' + formatPrice(itTotal) + ' ' + cur;
        html += reasonLabel;
        html += '</div>';
      }
      html += '</div>';

      var reasonLabels = '';
      for (var k in reasons) { if (reasonMap[k]) reasonLabels += (reasonLabels ? ' · ' : '') + _esc(reasonMap[k]); }

      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;gap:8px;font-size:12px;">';
      if (reasonLabels) html += '<span style="color:#e74c3c;font-size:11px;">' + reasonLabels + '</span>';
      else html += '<span></span>';
      html += '<span style="font-weight:700;color:#e74c3c;">' + t('returnsHistoryRefundTotal') + ' : ' + formatPrice(Math.abs(total)) + ' ' + cur + '</span>';
      html += '</div>';

      html += '</div>';
    }
    html += '</div>';
    panel.innerHTML = html;
   }

   function _stockDownOps(sale, ops) {
    if (!Array.isArray(sale.items)) return ops;
    for (var i = 0; i < sale.items.length; i++) {
      var it = sale.items[i];
      if (!Math.abs(_num(it.qty))) continue;
      if (it.variantKey) {
        ops.push({ store: 'product_variants', op: 'getAll' });
        (function (idx, it2) {
          ops.push({ store: 'product_variants', op: 'put', valueBuilder: function (r) {
            var all = r[idx];
            if (!Array.isArray(all)) return null;
            var v = null;
            for (var vi = 0; vi < all.length; vi++) {
              var vv = all[vi];
              if (vv && vv.barcode && it2.variantKey === vv.barcode) { v = vv; break; }
              if (vv && it2.variantKey === it2.barcode + '-var-' + vv.id) { v = vv; break; }
            }
            if (v) v.stock = Math.max(0, _num(v.stock) - Math.abs(it2.qty));
            return v;
          }});
        })(ops.length - 1, it);
      } else {
        ops.push({ store: 'products', op: 'get', key: it.barcode });
        (function (idx, it2) {
          ops.push({ store: 'products', op: 'put', valueBuilder: function (r) {
            var p = r[idx];
            if (!p) return null;
            p.stock = Math.max(0, _num(p.stock) - Math.abs(it2.qty));
            return p;
          }});
        })(ops.length - 1, it);
      }
    }
    return ops;
   }

   async function _afterReturnDeleted(msg) {
    await renderReturnsHistory();
    try { if (typeof logAudit === 'function') await logAudit('RETURN_DELETED', msg); } catch (e) {}
    try { if (window.settings && window.settings.autoBackupEnabled !== false && typeof createAutoBackup === 'function') await createAutoBackup(); } catch (e) {}
    try { if (typeof refreshProductsCache === 'function') await refreshProductsCache(); } catch (e) {}
    try { if (typeof loadInventory === 'function') await loadInventory(); } catch (e) {}
    try { if (typeof refreshAnalytics === 'function') await refreshAnalytics(); else if (typeof loadAnalytics === 'function') await loadAnalytics(); } catch (e) {}
   }

   async function deleteReturn(saleId) {
    try {
      var id = Number(saleId);
      var sale = typeof dbGet === 'function' ? await dbGet('sales', id) : null;
      if (!sale || !(sale.isReturn || sale.type === 'retour')) {
        if (typeof showToast === 'function') showToast(t('returnsHistoryNotFound'), 'error');
        return;
      }
      if (typeof showConfirm === 'function') {
        if (!await showConfirm(t('returnsDeleteConfirm'), { danger: true })) return;
      }
      var ops = [{ store: 'sales', op: 'delete', key: id }];
      ops = _stockDownOps(sale, ops);
      if (typeof dbMultiOp === 'function') {
        await dbMultiOp(ops);
      } else if (typeof dbDelete === 'function') {
        await dbDelete('sales', id);
      }
      if (typeof playSuccess === 'function') playSuccess();
      if (typeof showToast === 'function') showToast(t('returnsDeleted'), 'success');
      await _afterReturnDeleted('Retour #' + id + ' supprimé');
    } catch (err) {
      console.error('[Returns] deleteReturn:', err);
      if (typeof playError === 'function') playError();
      if (typeof showToast === 'function') showToast(t('returnsDeleteFailed'), 'error');
    }
   }
   window.deleteReturn = deleteReturn;

   async function deleteAllReturns() {
    try {
      var sales = typeof dbGetAll === 'function' ? await dbGetAll('sales') : [];
      var returns = [];
      if (Array.isArray(sales)) {
        for (var i = 0; i < sales.length; i++) {
          var s = sales[i];
          if (s && (s.isReturn || s.type === 'retour')) returns.push(s);
        }
      }
      if (!returns.length) {
        if (typeof showToast === 'function') showToast(t('returnsHistoryEmpty'), 'info');
        return;
      }
      if (typeof showConfirm === 'function') {
        if (!await showConfirm(t('returnsDeleteAllConfirm', { count: returns.length }), { danger: true })) return;
      }
      var ops = [];
      for (var i = 0; i < returns.length; i++) ops = _stockDownOps(returns[i], ops);
      for (var i = 0; i < returns.length; i++) ops.push({ store: 'sales', op: 'delete', key: returns[i].id });
      if (typeof dbMultiOp === 'function') {
        await dbMultiOp(ops);
      } else if (typeof dbDelete === 'function') {
        for (var v = 0; v < returns.length; v++) await dbDelete('sales', returns[v].id);
      }
      if (typeof playSuccess === 'function') playSuccess();
      if (typeof showToast === 'function') showToast(t('returnsAllDeleted'), 'success');
      await _afterReturnDeleted('Tous les retours supprimés (' + returns.length + ')');
    } catch (err) {
      console.error('[Returns] deleteAllReturns:', err);
      if (typeof playError === 'function') playError();
      if (typeof showToast === 'function') showToast(t('returnsDeleteFailed'), 'error');
    }
   }
   window.deleteAllReturns = deleteAllReturns;

   function showReturnsHistory() {
    var panel = document.getElementById('returns-history-panel');
    if (panel) { panel.style.display = 'block'; }
    renderReturnsHistory();
   }

  function hideReturnsHistory() {
    var panel = document.getElementById('returns-history-panel');
    if (panel) { panel.style.display = 'none'; }
  }

  function toggleReturnsHistory() {
    var panel = document.getElementById('returns-history-panel');
    if (!panel) return;
    if (panel.style.display === 'none' || !panel.style.display) {
      showReturnsHistory();
    } else {
      hideReturnsHistory();
    }
  }

   // ============================================================
   // INIT
   // ============================================================
   function init() {
    var btn = document.getElementById('btn-toggle-return');
    if (btn) btn.addEventListener('click', toggleReturnMode);
    _syncModeUI();

    var searchInput = document.getElementById('returns-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        _renderReturnsList(_returnsCache || [], _returnsSearchQuery());
      });
    }
    var histList = document.getElementById('returns-history-list');
    if (histList) {
      histList.addEventListener('click', function (ev) {
        var del = ev.target && ev.target.closest ? ev.target.closest('[data-return-id]') : null;
        if (del) { ev.preventDefault(); ev.stopPropagation(); deleteReturn(del.getAttribute('data-return-id')); }
      });
    }
    var btnDelAll = document.getElementById('btn-delete-all-returns');
    if (btnDelAll) btnDelAll.addEventListener('click', deleteAllReturns);

    if (window.__returnsSettingsHook) { try { clearInterval(window.__returnsSettingsHook); } catch (e) {} }
    window.__returnsSettingsHook = setInterval(function () {
      if (!_enabled() && window.returnModeActive) {
        window.returnModeActive = false;
        _syncModeUI();
        if (typeof renderCart === 'function') renderCart();
      }
      // Toggle button visibility
      var b = document.getElementById('btn-toggle-return');
      if (b) b.style.display = _enabled() ? '' : 'none';

      // Render returns history once when the Stock view becomes visible
      var invView = document.getElementById('view-inventory');
      var isInvActive = invView && getComputedStyle(invView).display !== 'none';
      if (isInvActive) {
        if (!window.__returnsStockShown) {
          window.__returnsStockShown = true;
          renderReturnsHistory();
        }
      } else {
        window.__returnsStockShown = false;
      }
    }, 800);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('[Returns] module active');
})();
