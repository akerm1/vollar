async function _completeTransactionOriginal(_0x36ae76=![]){console['log']('🔄\x20Starting\x20transaction...');const _0x43a8f9=_0x36ae76||getActiveCartTarget()==='quick',_0x421033=getActiveCart(_0x36ae76);console['log']('📋\x20Cart\x20items:',_0x421033?_0x421033['length']:0x0),console['log']('💳\x20Payment\x20status:',paymentStatus,'|\x20Method:',paymentMethod);if(!_0x421033||_0x421033['length']===0x0)return showToast(t('cartEmpty'),'error'),playError(),![];const _0x5c432f=DOM['customerSelect']&&DOM['customerSelect']['value']?parseInt(DOM['customerSelect']['value']):null;if(askCustomerModalOpen)return![];if(settings['askCustomerEnabled']&&!_0x43a8f9&&!_0x5c432f&&!customerAskShown)return customerAskShown=!![],openAskCustomerModal(),![];if(paymentMethod==='credit'&&!_0x5c432f)return showToast(t('saleCreditNeedsClient'),'error'),playError(),![];const _0x13d634=typeof getPaymentMethodData==='function'?getPaymentMethodData():{'method':'especes','details':{}},_0x4e82ae=calculateTotals(_0x43a8f9?'quick':'main');let _0x35a158=0x0;const _0x399eeb=[];let _0x4f3ab1=0x0;for(const _0x179405 of _0x421033){let _0xe08142=await dbGet('products',_0x179405['barcode']);if(!_0xe08142)return showToast(t('productNotFound',{'name':_0x179405['name']}),'error'),playError(),![];if(!_0x179405['variantKey']&&_0xe08142&&!_0xe08142['linkedUnitProductId']&&typeof ensureUnitStockForSale==='function')try{await ensureUnitStockForSale(_0xe08142,_0x179405['qty']);}catch(_0x101f3b){console['error']('[Transaction]\x20auto-open\x20pack\x20error:',_0x101f3b);}if(_0x179405['variantKey']){const _0x3ed535=await dbGetAll('product_variants'),_0x5bbba8=_0x3ed535['find'](_0x569d70=>{if(_0x569d70['barcode']&&_0x179405['variantKey']===_0x569d70['barcode'])return!![];if(_0x179405['variantKey']===_0xe08142['barcode']+'-var-'+_0x569d70['id'])return!![];return![];}),_0xbb7af=_0x5bbba8&&_0x5bbba8['stock']!=null?_0x5bbba8['stock']:_0xe08142['stock'];if(_0xbb7af<_0x179405['qty']){if(settings['negativeStock']==='prevent')return showToast(t('insufficientStock',{'name':_0x179405['name']+'\x20('+_0x179405['variantName']+')','stock':_0xbb7af}),'error'),playError(),![];settings['negativeStock']==='warn'&&showToast(t('stockWarning',{'name':_0x179405['name']+'\x20('+_0x179405['variantName']+')','stock':_0xbb7af}),'warning');}}else{if(_0xe08142['stock']<_0x179405['qty']){if(settings['negativeStock']==='prevent')return showToast(t('insufficientStock',{'name':_0x179405['name'],'stock':_0xe08142['stock']}),'error'),playError(),![];settings['negativeStock']==='warn'&&showToast(t('stockWarning',{'name':_0x179405['name'],'stock':_0xe08142['stock']}),'warning');}}const _0x3e96b6=_0x179405['reducedPrice']!==null&&_0x179405['reducedPrice']<_0x179405['price']?_0x179405['reducedPrice']:_0x179405['price'],_0x4c168e=_0x4e82ae['itemDiscounts']&&_0x4e82ae['itemDiscounts']['get'](_0x4f3ab1)||0x0,_0x27a0a6=_0x3e96b6-_0x4c168e,_0x8aab01=_0xe08142['purchasePrice']||_0xe08142['price'],_0x207fd5=(_0x27a0a6-_0x8aab01)*_0x179405['qty'];_0x35a158+=_0x207fd5;const _0x5996d2=Math['max'](0x0,(_0x179405['price']-_0x27a0a6)*_0x179405['qty']),_0x44a1d2={'name':_0x179405['name'],'barcode':_0x179405['barcode'],'reference':_0x179405['reference']||'','qty':_0x179405['qty'],'unit':_0x179405['unit']||'pièce','originalPrice':_0x179405['price'],'soldPrice':round6(_0x27a0a6),'reducedPrice':_0x179405['reducedPrice'],'purchasePrice':_0x8aab01,'profit':_0x207fd5,'discounted':_0x5996d2>0x0,'discountAmount':_0x5996d2};if(_0x179405['variantName'])_0x44a1d2['variantName']=_0x179405['variantName'];if(_0x179405['variantKey'])_0x44a1d2['variantKey']=_0x179405['variantKey'];_0x399eeb['push'](_0x44a1d2),_0x4f3ab1++;}const _0x469f47=_0x4e82ae['grandTotal'],_0x4e6dc6=parseFloat(DOM['amountPaidInput']?DOM['amountPaidInput']['value']:0x0)||0x0,_0x42e9d9=paymentStatus==='paid';let _0xb7dfc2=0x0,_0x5ab5c3=![],_0x61cbd3='paid',_0x526ea2=_0x469f47;if(_0x13d634['method']==='especes'){_0x526ea2=Math['min'](_0x4e6dc6,_0x469f47);if(_0x526ea2>=_0x469f47)_0xb7dfc2=0x0,_0x5ab5c3=![],_0x61cbd3='paid';else _0x526ea2>0x0?(_0xb7dfc2=_0x469f47-_0x526ea2,_0x5ab5c3=!![],_0x61cbd3='partial'):(_0x526ea2=_0x469f47,_0xb7dfc2=0x0,_0x5ab5c3=![],_0x61cbd3='paid');}else _0x13d634['method']==='credit'?(_0xb7dfc2=_0x469f47,_0x5ab5c3=!![],_0x61cbd3='credit'):(_0x526ea2=_0x469f47,_0xb7dfc2=0x0,_0x5ab5c3=![],_0x61cbd3='paid');if(_0x5ab5c3&&!_0x5c432f)return showToast(t('saleCreditNeedsClient'),'error'),playError(),![];console['log']('👤\x20Customer\x20ID:',_0x5c432f,'|\x20Effective\x20paid:',_0x526ea2,'|\x20Remaining:',_0xb7dfc2);try{for(const _0x23e690 of _0x421033){if(!_0x23e690['variantKey']){const _0x5c0bb5=await dbGet('products',_0x23e690['barcode']);_0x5c0bb5&&(_0x5c0bb5['stock']-=_0x23e690['qty'],await dbPut('products',_0x5c0bb5));}if(_0x23e690['variantKey']){const _0x20dc76=await dbGetAll('product_variants');let _0x3fa8c5=_0x20dc76['find'](_0x108d18=>{if(_0x108d18['barcode']&&_0x23e690['variantKey']===_0x108d18['barcode'])return!![];if(_0x23e690['variantKey']===_0x23e690['barcode']+'-var-'+_0x108d18['id'])return!![];return![];});_0x3fa8c5&&_0x3fa8c5['stock']!=null&&(_0x3fa8c5['stock']-=_0x23e690['qty'],await dbPut('product_variants',_0x3fa8c5));}}const _0x367cf9={'timestamp':new Date()['toISOString'](),'customerId':_0x5c432f,'customerName':_0x5c432f?customers['find'](_0x65a620=>_0x65a620['id']===_0x5c432f)?.['name']||null:null,'items':_0x399eeb,'subtotal':_0x4e82ae['subtotal'],'vat':_0x4e82ae['vat'],'discount':_0x4e82ae['discount'],'grandTotal':_0x4e82ae['grandTotal'],'totalProfit':_0x35a158,'amountPaid':_0x526ea2,'remainingAmount':_0xb7dfc2,'paymentStatus':_0x61cbd3,'isDebt':_0x5ab5c3,'paymentMarked':_0x42e9d9?'paid':'unpaid','quickCustomerSale':_0x43a8f9,'paymentMethod':_0x13d634['method']||'especes','paymentDetails':_0x13d634['details']||{}};_0x367cf9['id']=Date['now'](),await dbPut('sales',_0x367cf9);const _0x94b2f6=_0x367cf9['id'];console['log']('✅\x20Sales\x20record\x20saved\x20with\x20ID:',_0x94b2f6,'Total\x20Profit:',_0x35a158);if(_0x5c432f&&_0x5ab5c3){console['log']('💰\x20Creating\x20debt\x20for\x20customer:',_0x5c432f);const _0x2a005e=await dbGet('customers',_0x5c432f);if(_0x2a005e){!_0x2a005e['debts']&&(_0x2a005e['debts']=[]);const _0x4efa46={'saleId':_0x94b2f6,'date':new Date()['toISOString'](),'items':_0x421033['map'](_0x3500bd=>({'name':_0x3500bd['name'],'qty':_0x3500bd['qty'],'unit':_0x3500bd['unit']||'pièce','originalPrice':_0x3500bd['price'],'soldPrice':_0x3500bd['reducedPrice']!==null&&_0x3500bd['reducedPrice']<_0x3500bd['price']?_0x3500bd['reducedPrice']:_0x3500bd['price'],'reducedPrice':_0x3500bd['reducedPrice'],'reference':_0x3500bd['reference']||''})),'totalAmount':_0x4e82ae['grandTotal'],'paidAmount':_0x526ea2,'remainingAmount':_0xb7dfc2,'status':'pending'};_0x2a005e['debts']['push'](_0x4efa46),console['log']('✅\x20Debt\x20added\x20to\x20customer:',_0x4efa46),await dbPut('customers',_0x2a005e),console['log']('✅\x20Customer\x20updated\x20with\x20debt');}}if(_0x43a8f9){window['quickCart']=[],window['quickCustomerMode']=![],window['quickCustomerActive']=![];window['quickCustomerSnapshot']&&(window['cart']=JSON['parse'](JSON['stringify'](window['quickCustomerSnapshot']['mainCart'])));const _0x362140=document['getElementById']('btn-quick-customer-mode');_0x362140&&(_0x362140['textContent']=t('quickCustomerBtn'),_0x362140['classList']['remove']('btn-warning'),_0x362140['classList']['add']('btn-secondary'));}else window['cart']=[];renderCart();if(typeof onFastClientSold==='function')onFastClientSold();if(typeof renderFastMoney==='function')renderFastMoney();if(DOM['amountPaidInput'])DOM['amountPaidInput']['value']='0';paymentStatus='paid',updatePaymentStatusDisplay();if(typeof resetPaymentMethod==='function')resetPaymentMethod();playSuccess();_0x42e9d9?showToast(t('transactionCompleteMsg',{'total':formatPrice(_0x4e82ae['grandTotal']),'currency':settings['currency'],'profit':formatPrice(_0x35a158)}),'success'):showToast(t('debtRecordedMsg',{'total':formatPrice(_0x4e82ae['grandTotal']),'currency':settings['currency']}),'warning');settings['printAutoEnabled']&&typeof printReceipt==='function'&&setTimeout(function(){printReceipt(null);},0x1f4);if(settings['autoBackupEnabled']!==![])await createAutoBackup();if(typeof logAudit==='function'){const _0xf36dbf=_0x61cbd3==='paid'?t('statusPaid'):_0x61cbd3==='partial'?t('statusPartial'):t('statusCredit');await logAudit('SALE_CREATED','Vente\x20#'+_0x94b2f6+'\x20-\x20'+_0x421033['length']+'\x20articles\x20-\x20'+formatPrice(_0x4e82ae['grandTotal'])+'\x20'+settings['currency']+'\x20-\x20'+_0xf36dbf);}if(typeof refreshAnalytics==='function')await refreshAnalytics();else typeof loadAnalytics==='function'&&await loadAnalytics();return currentView==='customers'&&loadCustomers(),updateLastScannedItem(null),resetScanner(),customerAskShown=![],!![];}catch(_0x4e181b){return console['error']('❌\x20Transaction\x20error:',_0x4e181b),playError(),showToast(t('transactionFailed',{'error':_0x4e181b['message']}),'error'),![];}}

// === ATOMIC TRANSACTION SUPPORT ===
function _txDecrementStock(product, qty) {
  if (product && product.stock != null) product.stock -= qty;
  return product;
}
function _txDecrementVariant(variants, item) {
  if (!variants) return null;
  var variant = variants.find(function(v) {
    if (v.barcode && item.variantKey === v.barcode) return true;
    if (item.variantKey === item.barcode + '-var-' + v.id) return true;
    return false;
  });
  if (variant && variant.stock != null) variant.stock -= item.qty;
  return variant;
}
async function completeTransaction(isQuickCart) {
  // Double-submit protection: only one transaction may run at a time.
  // The flag is set synchronously (before any await), so a second click or
  // Enter press during validation always sees it and is ignored.
  if (window.__txInProgress) { showToast(t('waitTransaction'), 'info'); playWarning(); return false; }
  window.__txInProgress = true;
  if (DOM && DOM.btnComplete) DOM.btnComplete.disabled = true;
  try {
  // Phase 1-3: validate (uses legacy function's validation logic via inline copy)
  // We call the original to validate, but intercept at the write phase
  // Actually: we inline validation here to avoid re-running DB reads
  
  var _isQuick = isQuickCart || getActiveCartTarget() === 'quick';
  var _cart = getActiveCart(isQuickCart);
  if (!_cart || _cart.length === 0) { showToast(t('cartEmpty'), 'error'); playError(); return false; }
  var _customerId = DOM.customerSelect && DOM.customerSelect.value ? parseInt(DOM.customerSelect.value) : null;
  if (askCustomerModalOpen) return false;
  if (settings.askCustomerEnabled && !_isQuick && _customerId === null && !customerAskShown) { customerAskShown = true; openAskCustomerModal(); return false; }
  if (paymentMethod === 'credit' && !_customerId) { showToast(t('saleCreditNeedsClient'), 'error'); playError(); return false; }

  var _paymentData = typeof getPaymentMethodData === 'function' ? getPaymentMethodData() : { method: 'especes', details: {} };
  var _totals = calculateTotals(_isQuick ? 'quick' : 'main');

  // Phase 3: Validate stock + build sale items (matches legacy behaviour)
  var _profit = 0;
  var _saleItems = [];
  var _itemIdx = 0;
  var _openedPacks = [];
  for (var _ci = 0; _ci < _cart.length; _ci++) {
    var _item = _cart[_ci];
    var _product = await dbGet('products', _item.barcode);
    if (!_product) { showToast(t('productNotFound', { name: _item.name }), 'error'); playError(); return false; }
    if (!_item.variantKey && _product && !_product.linkedUnitProductId && typeof ensureUnitStockForSale === 'function') {
      try {
        var _opened = await ensureUnitStockForSale(_product, _item.qty, _openedPacks);
        if (_opened && _opened.length) _openedPacks = _openedPacks.concat(_opened);
      } catch(_e) { console.error('[Transaction] auto-open pack error:', _e); }
    }
    var _stock = _product.stock;
    var _variant = null;
    if (_item.variantKey) {
      var _variants = await dbGetAll('product_variants');
      _variant = _variants.find(function(v) {
        if (v.barcode && _item.variantKey === v.barcode) return true;
        if (_item.variantKey === _item.barcode + '-var-' + v.id) return true;
        return false;
      });
      _stock = _variant && _variant.stock != null ? _variant.stock : _product.stock;
    }
    if (_stock < _item.qty) {
      if (settings.negativeStock === 'prevent') {
        var _preventName = _item.variantKey && _item.variantName ? _item.name + ' (' + _item.variantName + ')' : _item.name;
        showToast(t('insufficientStock', { name: _preventName, stock: _stock }), 'error'); playError(); if (typeof rollbackUnitOpens === 'function') await rollbackUnitOpens(_openedPacks); return false;
      }
      if (settings.negativeStock === 'warn') {
        var _warnName = _item.variantKey && _item.variantName ? _item.name + ' (' + _item.variantName + ')' : _item.name;
        showToast(t('stockWarning', { name: _warnName, stock: _stock }), 'warning');
      }
    }
    // Compute per-item financials (faithful to legacy)
    var _effPrice = _item.reducedPrice !== null && _item.reducedPrice < _item.price ? _item.reducedPrice : _item.price;
    var _itemDisc = _totals.itemDiscounts && _totals.itemDiscounts.get(_itemIdx) || 0;
    var _soldPrice = Math.max(0, round2 ? round2(_effPrice - _itemDisc) : (_effPrice - _itemDisc));
    var _purchasePrice = _product.purchasePrice != null ? _product.purchasePrice : _product.price;
    var _itemProfit = round2 ? round2((_soldPrice - _purchasePrice) * _item.qty) : ((_soldPrice - _purchasePrice) * _item.qty);
    _profit += _itemProfit;
    var _discAmt = Math.max(0, round2 ? round2((_item.price - _soldPrice) * _item.qty) : ((_item.price - _soldPrice) * _item.qty));
    var _saleItemObj = {
      name: _item.name, barcode: _item.barcode, reference: _item.reference || '',
      qty: _item.qty, unit: _item.unit || 'pièce', originalPrice: _item.price,
      soldPrice: round6 ? round6(_soldPrice) : _soldPrice, reducedPrice: _item.reducedPrice,
      purchasePrice: _purchasePrice, profit: _itemProfit, discounted: _discAmt > 0, discountAmount: _discAmt
    };
    if (_item.variantName) { _saleItemObj.variantName = _item.variantName; _saleItemObj.variantKey = _item.variantKey; }
    else if (_item.variantKey) { _saleItemObj.variantKey = _item.variantKey; }
    _saleItems.push(_saleItemObj);
    _itemIdx++;
  }

  // Phase 4: Calculate payment (faithful to legacy _0x61cbd3 logic)
  var _grandTotal = _totals.grandTotal;
  var _payTotal = typeof round2 === 'function' ? round2(_grandTotal) : _grandTotal;
  var _amountPaid = Math.max(0, typeof round2 === 'function' ? round2(parseFloat(DOM.amountPaidInput && DOM.amountPaidInput.value) || 0) : (parseFloat(DOM.amountPaidInput && DOM.amountPaidInput.value) || 0));
  var _markedPaid = paymentStatus === 'paid';
  var _remaining = 0;
  var _needsCustomer = false;
  var _computedStatus = 'paid';
  var _effectivePaid = _grandTotal;
  if (_paymentData.method === 'especes') {
    _effectivePaid = Math.min(_amountPaid, _payTotal);
    if (_effectivePaid >= _payTotal) { _effectivePaid = _payTotal; _remaining = 0; _needsCustomer = false; _computedStatus = 'paid'; }
    else if (_effectivePaid > 0) { _remaining = typeof round2 === 'function' ? round2(_payTotal - _effectivePaid) : (_payTotal - _effectivePaid); _needsCustomer = true; _computedStatus = 'partial'; }
    else { _effectivePaid = _payTotal; _remaining = 0; _needsCustomer = false; _computedStatus = 'paid'; }
  } else if (_paymentData.method === 'credit') {
    _remaining = _grandTotal; _effectivePaid = 0; _needsCustomer = true; _computedStatus = 'credit';
  } else {
    _effectivePaid = _grandTotal; _remaining = 0; _needsCustomer = false; _computedStatus = 'paid';
  }
  if (_needsCustomer && !_customerId) { showToast(t('saleCreditNeedsClient'), 'error'); playError(); if (typeof rollbackUnitOpens === 'function') await rollbackUnitOpens(_openedPacks); return false; }

  // Phase 5: ATOMIC write
  try {
    var _txSaleId = Date.now();
    var _ops = [];

    for (var _ti = 0; _ti < _cart.length; _ti++) {
      var _tiItem = _cart[_ti];
      if (!_tiItem.variantKey) {
        _ops.push({ store: 'products', op: 'get', key: _tiItem.barcode });
        (function(idx, qty) {
          _ops.push({ store: 'products', op: 'put', valueBuilder: function(r) {
            var p = r[idx]; if (p) p.stock -= qty; return p;
          }});
        })(_ops.length - 1, _tiItem.qty);
      } else {
        _ops.push({ store: 'product_variants', op: 'getAll' });
        (function(idx, item) {
          _ops.push({ store: 'product_variants', op: 'put', valueBuilder: function(r) {
            var all = r[idx]; if (!all) return null;
            var v = all.find(function(vv) {
              if (vv.barcode && item.variantKey === vv.barcode) return true;
              if (item.variantKey === item.barcode + '-var-' + vv.id) return true;
              return false;
            });
            if (v && v.stock != null) v.stock -= item.qty;
            return v;
          }});
        })(_ops.length - 1, _tiItem);
      }
    }

    _ops.push({ store: 'sales', op: 'put', value: {
      id: _txSaleId, timestamp: new Date().toISOString(), customerId: _customerId,
      customerName: _customerId ? customers.find(function(c2) { return c2.id === _customerId; }) && customers.find(function(c2) { return c2.id === _customerId; }).name || null : null,
      items: _saleItems, subtotal: _totals.subtotal, vat: _totals.vat, discount: _totals.discount,
      grandTotal: _totals.grandTotal, totalProfit: _profit, amountPaid: _effectivePaid,
      remainingAmount: _remaining, paymentStatus: _computedStatus,
      isDebt: _needsCustomer, paymentMarked: _markedPaid ? 'paid' : 'unpaid', quickCustomerSale: _isQuick,
      paymentMethod: _paymentData.method || 'especes', paymentDetails: _paymentData.details || {}
    }});

    if (_customerId && _needsCustomer) {
      (function(custId, saleId, items, gt, ap, ra) {
        _ops.push({ store: 'customers', op: 'get', key: custId });
        var ci = _ops.length - 1;
        _ops.push({ store: 'customers', op: 'put', valueBuilder: function(r) {
          var cust = r[ci]; if (!cust) return null;
          if (!cust.debts) cust.debts = [];
          cust.debts.push({ saleId: saleId, date: new Date().toISOString(),
            items: items.map(function(it) { return { name: it.name, qty: it.qty, unit: it.unit || 'pièce', originalPrice: it.price, soldPrice: it.reducedPrice !== null && it.reducedPrice < it.price ? it.reducedPrice : it.price, reducedPrice: it.reducedPrice, reference: it.reference || '' }; }),
            totalAmount: gt, paidAmount: ap, remainingAmount: ra, status: 'pending' });
          return cust;
        }});
      })(_customerId, _txSaleId, _cart, _totals.grandTotal, _effectivePaid, _remaining);
    }

    var _results = await dbMultiOp(_ops);
    var _txSavedId = _txSaleId;

    // Quick cart cleanup
    if (_isQuick) {
      window.quickCart = [];
      window.quickCustomerMode = false;
      window.quickCustomerActive = false;
      if (window.quickCustomerSnapshot) { window.cart = JSON.parse(JSON.stringify(window.quickCustomerSnapshot.mainCart)); }
      var _qcmBtn = document.getElementById('btn-quick-customer-mode');
      if (_qcmBtn) { _qcmBtn.textContent = t('quickCustomerBtn'); _qcmBtn.classList.remove('btn-warning'); _qcmBtn.classList.add('btn-secondary'); }
    } else { window.cart = []; }

    renderCart();
    if (typeof onFastClientSold === 'function') onFastClientSold();
    if (typeof renderFastMoney === 'function') renderFastMoney();
    if (DOM.amountPaidInput) DOM.amountPaidInput.value = '0';
    paymentStatus = 'paid'; updatePaymentStatusDisplay();
    if (typeof resetPaymentMethod === 'function') resetPaymentMethod();
    playSuccess();
    _markedPaid ? showToast(t('transactionCompleteMsg', { total: formatPrice(_totals.grandTotal), currency: settings.currency, profit: formatPrice(_profit) }), 'success') : showToast(t('debtRecordedMsg', { total: formatPrice(_totals.grandTotal), currency: settings.currency }), 'warning');
    if (settings.printAutoEnabled && typeof printReceipt === 'function') setTimeout(function() { printReceipt(null); }, 500);
    if (settings.autoBackupEnabled !== false) await createAutoBackup();
    if (typeof logAudit === 'function') {
      var _payLabel = _computedStatus === 'paid' ? t('statusPaid') : _computedStatus === 'partial' ? t('statusPartial') : t('statusCredit');
      await logAudit('SALE_CREATED', 'Vente #' + _txSavedId + ' - ' + _cart.length + ' articles - ' + formatPrice(_totals.grandTotal) + ' ' + settings.currency + ' - ' + _payLabel);
    }
    if (typeof refreshAnalytics === 'function') await refreshAnalytics(); else if (typeof loadAnalytics === 'function') await loadAnalytics();
    if (currentView === 'customers') loadCustomers();
    updateLastScannedItem(null); resetScanner(); customerAskShown = false;
    return true;
  } catch (err) {
    console.error('Transaction error:', err); playError();
    if (typeof rollbackUnitOpens === 'function') await rollbackUnitOpens(_openedPacks);
    showToast(t('transactionFailed', { error: err.message }), 'error');
    return false;
  }
  } finally {
    window.__txInProgress = false;
    if (DOM && DOM.btnComplete) DOM.btnComplete.disabled = false;
  }
}
