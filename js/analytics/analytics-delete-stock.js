// === Analytics delete: complete stock-restoration replacement ===
// Replaces window.deleteSale / deleteAllSales / clearAllSales with clean
// implementations that always restore stock correctly, including:
//   1. Products found by barcode (with variant support)
//   2. Auto-opened packs (openedPacks): reverse the transfer so pack stock
//      goes down and unit stock goes back up
//   3. Items without barcode: fallback to exact product-name match
//   4. Customer debt removal
// Loaded AFTER analytics-ui.js so we overwrite the originals.
//
// openedPacks field mapping (from ensureUnitStockForSale):
//   packBarcode = the UNIT product barcode (source of transfer, stock was decreased)
//   unitBarcode = the PACK product barcode (target of transfer, stock was increased)
//   packs       = number of packs opened from the unit product
//   units       = total pieces transferred to the pack product
(function () {
  function _num(v) { return parseFloat(v) || 0; }

  // ---- single-item stock restoration ----
  async function _restoreItemStock(item) {
    var qty = _num(item.qty);
    if (qty <= 0) return 0;
    var barcode = item.barcode;

    // Variant
    if (item.variantKey) {
      try {
        var variants = await dbGetAll('product_variants');
        if (Array.isArray(variants)) {
          var v = variants.find(function (x) {
            return (x.barcode && item.variantKey === x.barcode) ||
              item.variantKey === (barcode + '-var-' + x.id);
          });
          if (v) {
            var old = _num(v.stock);
            v.stock = old + qty;
            await dbPut('product_variants', v);
            console.log('[DeleteStock] variant +' + qty + ' for ' + item.name);
            return qty;
          }
        }
      } catch (e) { console.error('[DeleteStock] variant restore:', e); }
    }

    // Normal product by barcode
    if (barcode) {
      try {
        var prod = await dbGet('products', barcode);
        if (prod) {
          var old = _num(prod.stock);
          prod.stock = old + qty;
          await dbPut('products', prod);
          console.log('[DeleteStock] product +' + qty + ' for ' + (prod.name || item.name) + ' (' + barcode + ') stock: ' + old + ' -> ' + prod.stock);
          return qty;
        } else {
          console.warn('[DeleteStock] product not found for barcode:', barcode);
        }
      } catch (e) { console.error('[DeleteStock] product restore:', e); }
    }

    // Fallback: match by exact product name (for items without barcode)
    if (!barcode && item.name) {
      try {
        var all = await dbGetAll('products');
        var match = all.find(function (p) { return (p.name || '').trim() === item.name.trim(); });
        if (match) {
          var old = _num(match.stock);
          match.stock = old + qty;
          await dbPut('products', match);
          console.log('[DeleteStock] name-match +' + qty + ' for ' + match.name);
          return qty;
        }
      } catch (e) { console.error('[DeleteStock] name fallback:', e); }
    }

    return 0;
  }

  // ---- revert auto-opened packs ----
  // ensureUnitStockForSale transfers stock from linked unit products to the
  // pack when pack stock is insufficient for the sale. Reversal:
  //   - pack product (o.unitBarcode): stock -= units (pieces transferred)
  //   - unit product (o.packBarcode): stock += packs (packs taken from it)
  async function _revertOpenedPacks(openedPacks) {
    if (!Array.isArray(openedPacks) || !openedPacks.length) return;
    for (var i = 0; i < openedPacks.length; i++) {
      var o = openedPacks[i];
      if (!o) continue;
      var packsTaken = _num(o.packs);
      var unitsTransferred = _num(o.units);

      // Restore unit product stock (o.packBarcode = unit product barcode, source of transfer)
      if (o.packBarcode && packsTaken > 0) {
        try {
          var unitProd = await dbGet('products', o.packBarcode);
          if (unitProd) {
            var old = _num(unitProd.stock);
            unitProd.stock = old + packsTaken;
            await dbPut('products', unitProd);
            console.log('[DeleteStock] unit stock +' + packsTaken + ' for ' + unitProd.name + ' (restoring opened packs)');
          }
        } catch (e) { console.error('[DeleteStock] unit revert:', e); }
      }

      // Reverse pack product stock increase (o.unitBarcode = pack product barcode, target of transfer)
      if (o.unitBarcode && unitsTransferred > 0) {
        try {
          var packProd = await dbGet('products', o.unitBarcode);
          if (packProd) {
            var old = _num(packProd.stock);
            packProd.stock = Math.max(0, old - unitsTransferred);
            await dbPut('products', packProd);
            console.log('[DeleteStock] pack stock -' + unitsTransferred + ' for ' + packProd.name + ' (reversing transfer)');
          }
        } catch (e) { console.error('[DeleteStock] pack revert:', e); }
      }
    }
  }

  // ---- remove customer debt ----
  async function _removeDebt(sale) {
    if (!sale || !sale.customerId) return;
    try {
      var cust = await dbGet('customers', sale.customerId);
      if (cust && cust.debts) {
        var idx = cust.debts.findIndex(function (d) { return d.saleId === sale.id; });
        if (idx !== -1) {
          cust.debts.splice(idx, 1);
          if (cust.debts.length === 0) cust.debts = [];
          await dbPut('customers', cust);
          console.log('[DeleteStock] debt removed for customer:', cust.name);
        }
      }
    } catch (e) { console.error('[DeleteStock] debt removal:', e); }
  }

  // ---- refresh all views ----
  async function _refresh() {
    try { if (typeof refreshProductsCache === 'function') await refreshProductsCache(); } catch (e) {}
    try { if (typeof loadInventory === 'function') await loadInventory(); } catch (e) {}
    try { if (typeof loadCustomers === 'function') await loadCustomers(); } catch (e) {}
    try { if (typeof refreshAnalytics === 'function') await refreshAnalytics(); } catch (e) {}
    try { if (typeof createAutoBackup === 'function') await createAutoBackup(); } catch (e) {}
  }

  // ============================================================
  // REPLACE deleteSale — single-sale deletion with full restore
  // ============================================================
  window.deleteSale = async function (saleId) {
    try {
      if (typeof showConfirm === 'function') {
        var msg = 'Supprimer la vente #' + saleId + ' ?\n\nLes articles seront RESTITU\u00c9S au stock.';
        if (!await showConfirm(msg)) return;
      }
      var sale = await dbGet('sales', Number(saleId));
      if (!sale) {
        if (typeof showToast === 'function') showToast('Vente introuvable', 'error');
        return;
      }
      console.log('[DeleteStock] deleting sale #' + saleId, 'items:', (sale.items || []).length);

      var totalRestored = 0;
      var details = [];

      // 1. Restore stock for each item
      if (Array.isArray(sale.items)) {
        for (var i = 0; i < sale.items.length; i++) {
          var it = sale.items[i];
          var r = await _restoreItemStock(it);
          if (r > 0) {
            totalRestored += r;
            if (details.length < 3) details.push(it.name + ' (+' + r + ')');
          }
        }
      }

      // 2. Revert opened packs (reverse of ensureUnitStockForSale transfer)
      if (Array.isArray(sale.openedPacks) && sale.openedPacks.length) {
        await _revertOpenedPacks(sale.openedPacks);
      }

      // 3. Remove customer debt
      await _removeDebt(sale);

      // 4. Delete the sale record
      await dbDelete('sales', Number(saleId));

      // 5. Toast
      var toastMsg = 'Vente #' + saleId + ' supprim\u00e9e';
      if (totalRestored > 0) {
        toastMsg += ' - ' + totalRestored + ' article(s) restitu\u00e9s en stock';
        if (details.length) toastMsg += ' (' + details.join(', ') + ')';
      } else {
        toastMsg += ' - Aucun stock restitu\u00e9';
      }
      if (typeof showToast === 'function') showToast(toastMsg, 'success');
      if (typeof playSuccess === 'function') playSuccess();

      // 6. Refresh all views + caches
      await _refresh();
      console.log('[DeleteStock] sale #' + saleId + ' deleted, ' + totalRestored + ' items restored');
    } catch (e) {
      console.error('[DeleteStock] deleteSale error:', e);
      if (typeof showToast === 'function') showToast('Erreur suppression: ' + (e.message || e), 'error');
      if (typeof playError === 'function') playError();
    }
  };

  // ============================================================
  // REPLACE deleteAllSales — delete everything with full restore
  // ============================================================
  window.deleteAllSales = async function () {
    try {
      if (typeof showConfirm === 'function') {
        if (!await showConfirm('Supprimer TOUTES les ventes ?\n\nTous les articles seront RESTITU\u00c9S au stock.')) return;
        if (!await showConfirm('\u00cates-vous absolument s\u00fbr ?')) return;
      }
      var allSales = await dbGetAll('sales');
      if (!allSales || !allSales.length) {
        if (typeof showToast === 'function') showToast('Aucune vente \u00e0 supprimer', 'info');
        return;
      }

      var totalRestored = 0;
      var allItems = [];
      var allPacks = [];

      for (var s = 0; s < allSales.length; s++) {
        var sale = allSales[s];
        if (Array.isArray(sale.items)) allItems = allItems.concat(sale.items);
        if (Array.isArray(sale.openedPacks)) allPacks = allPacks.concat(sale.openedPacks);
      }

      for (var i = 0; i < allItems.length; i++) {
        totalRestored += await _restoreItemStock(allItems[i]);
      }

      if (allPacks.length) await _revertOpenedPacks(allPacks);

      await dbClear('sales');

      var msg = 'Toutes les ventes supprim\u00e9es';
      if (totalRestored > 0) msg += ' - ' + totalRestored + ' article(s) restitu\u00e9s';
      if (typeof showToast === 'function') showToast(msg, 'success');
      if (typeof playSuccess === 'function') playSuccess();
      await _refresh();
    } catch (e) {
      console.error('[DeleteStock] deleteAllSales error:', e);
      if (typeof showToast === 'function') showToast('Erreur: ' + (e.message || e), 'error');
      if (typeof playError === 'function') playError();
    }
  };

  // ============================================================
  // REPLACE clearAllSales
  // ============================================================
  window.clearAllSales = window.deleteAllSales;

  console.log('[DeleteStock] delete stock-restoration replacement active');
})();
