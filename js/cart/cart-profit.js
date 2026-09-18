// === BÉNÉFICE AU SURVOL DU NOM DE PRODUIT (CAISSE) ===
// Calcule le bénéfice de la caisse active (panier principal ou client rapide),
// en miroir de la logique de completeTransaction : prix effectif (réduit le cas
// échéant) - remises promo par ligne - prix d'achat unitaire, multiplié par la quantité.
function computeCartProfit(target) {
  var cart = (target === 'quick' ? (window['quickCart'] || []) : (window['cart'] || []));
  if (!cart || !cart.length) return 0;
  var totals = typeof calculateTotals === 'function' ? calculateTotals(target === 'quick' ? 'quick' : 'main') : null;
  var itemDiscounts = totals && totals['itemDiscounts'] ? totals['itemDiscounts'] : null;
  var products = window['_productsCache'] || window['productsCache'] || [];
  var profit = 0;
  for (var i = 0; i < cart.length; i++) {
    var item = cart[i];
    var effPrice = item['reducedPrice'] !== null && item['reducedPrice'] !== undefined && item['reducedPrice'] < item['price'] ? item['reducedPrice'] : item['price'];
    var itemDisc = itemDiscounts && itemDiscounts['get'] ? (parseFloat(itemDiscounts['get'](i)) || 0) : 0;
    var soldPrice = Math.max(0, effPrice - itemDisc);
    var product = null;
    for (var j = 0; j < products.length; j++) {
      if (products[j] && products[j]['barcode'] === item['barcode']) { product = products[j]; break; }
    }
    var purchasePrice = product && product['purchasePrice'] != null ? product['purchasePrice'] : (item['purchasePrice'] != null ? item['purchasePrice'] : item['price']);
    profit += (soldPrice - purchasePrice) * item['qty'];
  }
  return typeof round2 === 'function' ? round2(profit) : Math.round(profit * 100) / 100;
}

function lineItemProfit(target, index, totals, products) {
  var cart = (target === 'quick' ? (window['quickCart'] || []) : (window['cart'] || []));
  var item = cart[index];
  if (!item) return { profit: 0, item: null };
  var itemDiscounts = totals && totals['itemDiscounts'] ? totals['itemDiscounts'] : null;
  var effPrice = item['reducedPrice'] !== null && item['reducedPrice'] !== undefined && item['reducedPrice'] < item['price'] ? item['reducedPrice'] : item['price'];
  var itemDisc = itemDiscounts && itemDiscounts['get'] ? (parseFloat(itemDiscounts['get'](index)) || 0) : 0;
  var soldPrice = Math.max(0, effPrice - itemDisc);
  var product = null;
  for (var j = 0; j < products.length; j++) {
    if (products[j] && products[j]['barcode'] === item['barcode']) { product = products[j]; break; }
  }
  var purchasePrice = product && product['purchasePrice'] != null ? product['purchasePrice'] : (item['purchasePrice'] != null ? item['purchasePrice'] : item['price']);
  var profit = (soldPrice - purchasePrice) * item['qty'];
  return { profit: profit, item: item };
}

function initSubtotalProfitTooltip() {
  var tip = document.createElement('div');
  tip.id = 'subtotal-profit-tooltip';
  tip.style.cssText = 'position:fixed;z-index:99999;pointer-events:none;opacity:0;' +
    'background:#111;color:#fff;padding:6px 10px;border-radius:6px;font-size:12px;font-weight:600;' +
    'box-shadow:0 2px 8px rgba(0,0,0,.25);white-space:nowrap;font-family:var(--font-family,sans-serif);' +
    'max-width:380px;overflow:hidden;text-overflow:ellipsis;';
  document.body.appendChild(tip);

  var ROW_SEL = '#cart-table-body tr, #quick-cart-table-body tr, #classic-cart-body tr, #classic-quick-body tr';
  var currentAnchor = null;
  var totalsCache = null;
  var totalsKey = null;

  function targetForTbody(tr) {
    var tb = tr.parentElement;
    var id = tb && tb.id;
    if (id === 'quick-cart-table-body' || id === 'classic-quick-body') return 'quick';
    return 'main';
  }
  function indexForRow(tr, target) {
    var di = tr.getAttribute ? tr.getAttribute('data-index') : null;
    if (di !== null && di !== '') {
      var n = parseInt(di, 10);
      if (!isNaN(n)) return n;
    }
    var parent = tr.parentElement;
    if (parent && parent.rows) {
      for (var i = 0; i < parent.rows.length; i++) {
        if (parent.rows[i] === tr) return i;
      }
    }
    return -1;
  }
  function nameCellOf(tr, target) {
    if (!tr.cells || !tr.cells.length) return null;
    if (targetForTbody(tr) === 'main' && tr.parentElement && tr.parentElement.id === 'cart-table-body') return tr.cells[0];
    if (tr.parentElement && (tr.parentElement.id === 'classic-cart-body' || tr.parentElement.id === 'classic-quick-body')) return tr.cells[1] || null;
    return tr.cells[0];
  }
  function getTotals(target, index) {
    var key = target + ':' + index;
    if (totalsKey === key && totalsCache) return totalsCache;
    totalsCache = typeof calculateTotals === 'function' ? calculateTotals(target === 'quick' ? 'quick' : 'main') : null;
    totalsKey = key;
    return totalsCache;
  }
  function findRowAt(x, y) {
    var rows = document.querySelectorAll(ROW_SEL);
    for (var i = 0; i < rows.length; i++) {
      var tr = rows[i];
      var target = targetForTbody(tr);
      var nameCell = nameCellOf(tr, target);
      if (!nameCell) continue;
      var rect = nameCell.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      var style = getComputedStyle(nameCell);
      if (style && (style.display === 'none' || style.visibility === 'hidden')) continue;
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return tr;
    }
    return null;
  }
  function positionTip(anchor) {
    var rect = anchor.getBoundingClientRect();
    var w = tip.offsetWidth || 180;
    var h = tip.offsetHeight || 28;
    var x = Math.max(4, Math.min(rect.left + rect.width / 2 - w / 2, window.innerWidth - w - 4));
    var y = rect.top - h - 8;
    if (y < 4) y = rect.bottom + 8;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  }
  function showTip(tr, nameCell) {
    var target = targetForTbody(tr);
    var index = indexForRow(tr, target);
    if (index < 0) { hideTip(); return; }
    var products = window['_productsCache'] || window['productsCache'] || [];
    var totals = getTotals(target, index);
    var r = lineItemProfit(target, index, totals, products);
    if (!r.item) { hideTip(); return; }
    var currency = typeof settings !== 'undefined' && settings && settings['currency'] ? settings['currency'] : 'DA';
    var rounded = typeof round2 === 'function' ? round2(r.profit) : Math.round(r.profit * 100) / 100;
    var label = typeof t === 'function' ? t('profitTooltip') : 'Bénéfice';
    var big = rounded > 0;
    var small = rounded < 0;
    var color = small ? '#ff8a8a' : (big ? '#b9f6b9' : '#fff');
    tip.style.color = color;
    try {
      tip.textContent = String(r.item['name'] || '') + ' — ' + label + ' : ' + (typeof formatPrice === 'function' ? formatPrice(rounded) : String(rounded)) + ' ' + currency;
    } catch (e) {
      tip.style.opacity = '0'; currentAnchor = null; return;
    }
    positionTip(nameCell);
    currentAnchor = tr;
    tip.style.opacity = '1';
  }
  function hideTip() { tip.style.opacity = '0'; currentAnchor = null; }

  document.addEventListener('pointermove', function(e) {
    var tr = findRowAt(e.clientX, e.clientY);
    if (tr) {
      if (currentAnchor !== tr) showTip(tr, nameCellOf(tr, targetForTbody(tr)));
      else positionTip(nameCellOf(tr, targetForTbody(tr)));
    }
    else if (currentAnchor) { hideTip(); }
  });
  window.addEventListener('mouseleave', hideTip);
  window.addEventListener('resize', hideTip);
  document.addEventListener('scroll', hideTip, true);
}

initSubtotalProfitTooltip();

if (typeof window !== 'undefined') window['computeCartProfit'] = computeCartProfit;