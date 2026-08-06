// ============================================================
// PROMOTIONS: Discount & Promotion System
// ============================================================

window.activePromotions = [];

// ── Load all promotions ──────────────────────────────────────
async function loadPromotions() {
    try {
        window.activePromotions = await dbGetAll('promotions');
        console.log('✅ Promotions loaded:', window.activePromotions.length);
    } catch (err) {
        console.error('❌ Failed to load promotions:', err);
        window.activePromotions = [];
    }
}

// ── Get active promotions (filtered by date and active flag) ──
function getActivePromotions() {
    var now = new Date();
    var today = now.toISOString().split('T')[0];
    return (window.activePromotions || []).filter(function(p) {
        if (!p.active) return false;
        if (p.startDate && p.startDate > today) return false;
        if (p.endDate && p.endDate < today) return false;
        return true;
    });
}

// ── Check if a promo's scope matches a product / customer ────
function promoScopeMatch(promo, product, customer) {
    var scope = promo.scope || 'all';

    if (scope === 'all') return true;

    if (!product) return false;

    if (scope === 'category') {
        return (product.category || '') === promo.scopeValue;
    }

    if (scope === 'product') {
        return product.barcode === promo.scopeValue;
    }

    if (scope === 'supplier') {
        var sid = parseInt(promo.scopeValue);
        if (!isNaN(sid)) {
            return product.supplierId != null && parseInt(product.supplierId) === sid;
        }
        // Name fallback: resolve supplier name → id from the global list
        var supList = (typeof suppliers !== 'undefined') ? suppliers : [];
        for (var s = 0; s < supList.length; s++) {
            if (supList[s].name === promo.scopeValue) {
                return product.supplierId != null && parseInt(product.supplierId) === supList[s].id;
            }
        }
        return false;
    }

    if (scope === 'price_min') {
        var pmin = parseFloat(promo.scopeValue);
        return !isNaN(pmin) && (parseFloat(product.price) >= pmin);
    }

    if (scope === 'price_max') {
        var pmax = parseFloat(promo.scopeValue);
        return !isNaN(pmax) && (parseFloat(product.price) <= pmax);
    }

    if (scope === 'client') {
        if (!customer) return false;
        var cid = parseInt(promo.scopeValue);
        if (!isNaN(cid)) {
            return customer.id != null && parseInt(customer.id) === cid;
        }
        // Name fallback: resolve client name → id from the global list
        var custList = (typeof customers !== 'undefined') ? customers : [];
        for (var c = 0; c < custList.length; c++) {
            if (custList[c].name === promo.scopeValue) {
                return customer.id != null && parseInt(customer.id) === custList[c].id;
            }
        }
        return customer.name === promo.scopeValue;
    }

    return false;
}

// ── Help text explaining each Portée (scope) option ──────────
function promoScopeHelp(scope) {
    var key = 'promoHelpAll';
    if (scope === 'category') key = 'promoHelpCategory';
    else if (scope === 'product') key = 'promoHelpProduct';
    else if (scope === 'supplier') key = 'promoHelpSupplier';
    else if (scope === 'client') key = 'promoHelpClient';
    else if (scope === 'price_min') key = 'promoHelpPriceMin';
    else if (scope === 'price_max') key = 'promoHelpPriceMax';
    return t(key);
}

function updatePromoScopeHelp(scope) {
    var el = document.getElementById('promo-scope-help-text');
    if (el) el.textContent = promoScopeHelp(scope || 'all');
}

// ── Help text explaining what value to fill for each Portée ──
function promoScopeValueHelp(scope) {
    var key = 'promoValueHelpAll';
    if (scope === 'category') key = 'promoValueHelpCategory';
    else if (scope === 'product') key = 'promoValueHelpProduct';
    else if (scope === 'supplier') key = 'promoValueHelpSupplier';
    else if (scope === 'client') key = 'promoValueHelpClient';
    else if (scope === 'price_min') key = 'promoValueHelpPriceMin';
    else if (scope === 'price_max') key = 'promoValueHelpPriceMax';
    return t(key);
}

function updatePromoScopeValueHelp(scope) {
    var el = document.getElementById('promo-scope-value-help-text');
    if (el) el.textContent = promoScopeValueHelp(scope || 'all');
}

// ── Apply promotions to a cart item ──────────────────────────
function applyPromotionsToItem(item, product, customer) {
    var promos = getActivePromotions();
    var bestDiscount = 0;
    var bestPromoName = '';
    var bestPromoId = null;
    var buyXGetYFreeQty = 0;

    for (var i = 0; i < promos.length; i++) {
        var promo = promos[i];

        // Skip cart-level types — handled in calculateCartDiscounts()
        if (promo.type === 'cart_percentage' || promo.type === 'cart_fixed') continue;

        if (!promoScopeMatch(promo, product, customer)) continue;

        if (promo.type === 'percentage') {
            var disc = item.price * (promo.value / 100);
            if (disc > bestDiscount) {
                bestDiscount = disc;
                bestPromoName = promo.name;
                bestPromoId = promo.id;
            }
        } else if (promo.type === 'fixed') {
            var disc = Math.min(promo.value, item.price);
            if (disc > bestDiscount) {
                bestDiscount = disc;
                bestPromoName = promo.name;
                bestPromoId = promo.id;
            }
        } else if (promo.type === 'buy_x_get_y') {
            if (promo.buyQty > 0 && promo.getQty > 0 && item.qty >= promo.buyQty) {
                var freeGroups = Math.floor(item.qty / promo.buyQty);
                var totalFree = freeGroups * promo.getQty;
                buyXGetYFreeQty = Math.min(totalFree, item.qty);
                var disc = buyXGetYFreeQty * item.price;
                if (disc > bestDiscount) {
                    bestDiscount = disc;
                    bestPromoName = promo.name;
                    bestPromoId = promo.id;
                }
            }
        } else if (promo.type === 'tiered') {
            if (promo.minQty > 0 && item.qty >= promo.minQty) {
                var disc = item.price * (promo.value / 100);
                if (disc > bestDiscount) {
                    bestDiscount = disc;
                    bestPromoName = promo.name;
                    bestPromoId = promo.id;
                }
            }
        }
    }

    var discountedPrice = item.price - (bestDiscount / item.qty);
    if (discountedPrice < 0) discountedPrice = 0;

    return {
        discountedPrice: bestDiscount > 0 ? discountedPrice : item.price,
        promotionName: bestPromoName,
        promotionId: bestPromoId,
        discountAmount: bestDiscount,
        buyXGetYFreeQty: buyXGetYFreeQty
    };
}

// ── Calculate cart-level discount ────────────────────────────
function calculateCartDiscounts(cart, products) {
    var itemDiscounts = new Map();
    var totalDiscount = 0;
    var appliedPromotions = [];

    if (!cart || cart.length === 0) {
        return { itemDiscounts: itemDiscounts, totalDiscount: 0, appliedPromotions: [] };
    }

    var fallbackProduct = function(item) {
        return { barcode: item.barcode, name: item.name, price: item.price, category: '', supplierId: item.supplierId };
    };

    // Resolve the customer currently selected at checkout (for client scope)
    var selectedCustomer = null;
    if (typeof DOM !== 'undefined' && DOM.customerSelect) {
        var selCustId = parseInt(DOM.customerSelect.value);
        if (selCustId) {
            var foundCust = (typeof customers !== 'undefined') ? customers.find(function(c) { return c.id === selCustId; }) : null;
            selectedCustomer = foundCust || { id: selCustId, name: String(selCustId) };
        }
    }

    for (var i = 0; i < cart.length; i++) {
        var item = cart[i];
        var product = products ? products.find(function(p) { return p.barcode === item.barcode; }) : null;
        if (!product) {
            product = fallbackProduct(item);
        }

        var result = applyPromotionsToItem(item, product, selectedCustomer);

        if (result.discountAmount > 0) {
            itemDiscounts.set(i, result);
            totalDiscount += result.discountAmount * item.qty;
            if (appliedPromotions.indexOf(result.promotionName) === -1) {
                appliedPromotions.push(result.promotionName);
            }
        }
    }

    // ── Cart-level promotions (cart_percentage / cart_fixed) ──
    var cartPromos = getActivePromotions();
    for (var c = 0; c < cartPromos.length; c++) {
        var cp = cartPromos[c];
        if (cp.type !== 'cart_percentage' && cp.type !== 'cart_fixed') continue;

        var qualifying = [];
        var qSubtotal = 0;

        for (var j = 0; j < cart.length; j++) {
            var qItem = cart[j];
            var qProduct = products ? products.find(function(p) { return p.barcode === qItem.barcode; }) : null;
            if (!qProduct) {
                qProduct = fallbackProduct(qItem);
            }
            if (!promoScopeMatch(cp, qProduct, selectedCustomer)) continue;

            var qPrice = (qItem.reducedPrice !== null && qItem.reducedPrice < qItem.price) ? qItem.reducedPrice : qItem.price;
            qualifying.push({ index: j, item: qItem, price: qPrice });
            qSubtotal += qPrice * qItem.qty;
        }

        if (qualifying.length === 0) continue;
        if (!(cp.minAmount > 0) || qSubtotal < cp.minAmount) continue;

        var lump;
        if (cp.type === 'cart_percentage') {
            lump = qSubtotal * (cp.value / 100);
        } else {
            lump = Math.min(cp.value, qSubtotal);
        }
        if (lump <= 0) continue;

        var factor = lump / qSubtotal;

        for (var q = 0; q < qualifying.length; q++) {
            var entry = qualifying[q];
            var perUnit = entry.price * factor;
            if (perUnit <= 0) continue;

            var existing = itemDiscounts.get(entry.index);
            if (existing) {
                existing.discountAmount += perUnit;
                totalDiscount += perUnit * entry.item.qty;
            } else {
                itemDiscounts.set(entry.index, {
                    discountedPrice: Math.max(0, entry.price - perUnit),
                    promotionName: cp.name,
                    promotionId: cp.id,
                    discountAmount: perUnit,
                    buyXGetYFreeQty: 0
                });
                totalDiscount += perUnit * entry.item.qty;
            }
            if (appliedPromotions.indexOf(cp.name) === -1) {
                appliedPromotions.push(cp.name);
            }
        }
    }

    return { itemDiscounts: itemDiscounts, totalDiscount: totalDiscount, appliedPromotions: appliedPromotions };
}

// ── CRUD Operations ──────────────────────────────────────────
async function savePromotion(promotion) {
    if (!promotion.createdAt) {
        promotion.createdAt = new Date().toISOString();
    }
    var id = await dbPut('promotions', promotion);
    await loadPromotions();
    return id;
}

async function deletePromotion(id) {
    await dbDelete('promotions', id);
    await loadPromotions();
}

async function togglePromotion(id) {
    var promo = await dbGet('promotions', id);
    if (promo) {
        promo.active = !promo.active;
        await dbPut('promotions', promo);
        await loadPromotions();
    }
}

// ── Promotion Management Screen ──────────────────────────────
function renderPromotionsScreen() {
    var container = document.getElementById('promotions-content');
    if (!container) return;

    var promos = window.activePromotions || [];

    var html = '<div class="promotions-container">';

    // LEFT: Form
    html += '<div class="promotions-left">';
    html += '<h3>' + t('promoManagement') + '</h3>';
    html += '<form id="promotion-form" autocomplete="off">';
    html += '<div class="form-group"><label>' + t('promoName') + '</label><input type="text" id="promo-name" placeholder="' + t('promoNamePlaceholder') + '" required></div>';

    html += '<div class="form-group"><label>' + t('promoType') + '</label>';
    html += '<select id="promo-type">';
    html += '<option value="percentage">' + t('promoPercentage') + '</option>';
    html += '<option value="fixed">' + t('promoFixed', {currency: settings.currency || 'DA'}) + '</option>';
    html += '<option value="buy_x_get_y">' + t('promoBuyXGetY') + '</option>';
    html += '<option value="tiered">' + t('promoTiered') + '</option>';
    html += '<option value="cart_percentage">' + t('promoCartPercentage') + '</option>';
    html += '<option value="cart_fixed">' + t('promoCartFixed') + '</option>';
    html += '</select></div>';

    html += '<div class="form-group" id="promo-value-group"><label>' + t('promoValue') + '</label>';
    html += '<input type="number" id="promo-value" step="0.01" min="0" placeholder="10"></div>';

    html += '<div class="form-group" id="promo-buyx-group" style="display:none;">';
    html += '<label>' + t('promoBuyQty') + '</label><input type="number" id="promo-buy-qty" step="1" min="1" placeholder="3"></div>';
    html += '<div class="form-group" id="promo-gety-group" style="display:none;">';
    html += '<label>' + t('promoGetQty') + '</label><input type="number" id="promo-get-qty" step="1" min="1" placeholder="1"></div>';

    html += '<div class="form-group" id="promo-min-qty-group" style="display:none;">';
    html += '<label>' + t('promoMinQty') + '</label><input type="number" id="promo-min-qty" step="1" min="1" placeholder="5"></div>';
    html += '<div class="form-group" id="promo-min-amount-group" style="display:none;">';
    html += '<label>' + t('promoMinAmount', {currency: settings.currency || 'DA'}) + '</label><input type="number" id="promo-min-amount" step="0.01" min="0" placeholder="5000"></div>';

    html += '<div class="form-group"><label>' + t('promoScope') + ' <span class="help-icon">ⓘ<span class="tooltip-text" id="promo-scope-help-text" style="white-space:normal;width:280px;text-align:left;">' + escapeHtml(promoScopeHelp('all')) + '</span></span></label>';
    html += '<select id="promo-scope">';
    html += '<option value="all">' + t('promoAllProducts') + '</option>';
    html += '<option value="category">' + t('promoCategory') + '</option>';
    html += '<option value="product">' + t('promoProduct') + '</option>';
    html += '<option value="supplier">' + t('promoSupplier') + '</option>';
    html += '<option value="client">' + t('promoClient') + '</option>';
    html += '<option value="price_min">' + t('promoPriceMin', {currency: settings.currency || 'DA'}) + '</option>';
    html += '<option value="price_max">' + t('promoPriceMax', {currency: settings.currency || 'DA'}) + '</option>';
    html += '</select></div>';

    html += '<div class="form-group" id="promo-scope-value-group" style="display:none;">';
    html += '<label>' + t('promoScopeValue') + ' <span class="help-icon">ⓘ<span class="tooltip-text" id="promo-scope-value-help-text" style="white-space:normal;width:280px;text-align:left;">' + escapeHtml(promoScopeValueHelp('all')) + '</span></span></label>';
    html += '<div id="promo-scope-field"></div></div>';

    html += '<div class="form-row">';
    html += '<div class="form-group"><label>' + t('promoStartDate') + '</label><input type="date" id="promo-start-date"></div>';
    html += '<div class="form-group"><label>' + t('promoEndDate') + '</label><input type="date" id="promo-end-date"></div>';
    html += '</div>';

    html += '<input type="hidden" id="promo-edit-id" value="">';
    html += '<div class="btn-row">';
    html += '<button type="submit" class="btn btn-primary" id="btn-save-promo">' + t('promoSave') + '</button>';
    html += '<button type="button" class="btn btn-secondary" id="btn-cancel-promo">' + t('promoClear') + '</button>';
    html += '</div>';
    html += '<div id="promo-feedback"></div>';
    html += '</form>';
    html += '</div>';

    // RIGHT: List
    html += '<div class="promotions-right">';
    html += '<h3>' + t('promoList') + '</h3>';

    if (promos.length === 0) {
        html += '<div class="promo-empty">' + t('promoNoPromotions') + '</div>';
    } else {
        html += '<div id="promotions-list">';
        for (var i = 0; i < promos.length; i++) {
            var p = promos[i];
            var cur = settings.currency || 'DA';
            var typeLabel;
            if (p.type === 'percentage') {
                typeLabel = p.value + '%';
            } else if (p.type === 'fixed') {
                typeLabel = p.value + ' ' + cur;
            } else if (p.type === 'buy_x_get_y') {
                typeLabel = t('promoBuyPrefix') + p.buyQty + t('promoFreeSuffix') + p.getQty;
            } else if (p.type === 'tiered') {
                typeLabel = p.value + '%' + t('promoTieredSuffix') + p.minQty;
            } else if (p.type === 'cart_percentage') {
                typeLabel = p.value + '%' + t('promoCartPrefix') + p.minAmount + ' ' + cur + t('promoCartPercentSuffix');
            } else if (p.type === 'cart_fixed') {
                typeLabel = p.value + ' ' + cur + t('promoCartPrefix') + p.minAmount + ' ' + cur + t('promoCartFixedSuffix');
            } else {
                typeLabel = p.type;
            }
            var scopeLabel;
            if (p.scope === 'all') {
                scopeLabel = t('promoLabelAll');
            } else if (p.scope === 'category') {
                scopeLabel = t('promoLabelCat') + p.scopeValue;
            } else if (p.scope === 'product') {
                scopeLabel = t('promoLabelProd') + p.scopeValue;
            } else if (p.scope === 'supplier') {
                scopeLabel = t('promoLabelSupplier') + p.scopeValue;
            } else if (p.scope === 'client') {
                scopeLabel = t('promoLabelClient') + p.scopeValue;
            } else if (p.scope === 'price_min') {
                scopeLabel = t('promoLabelPriceMin') + p.scopeValue + ' ' + cur;
            } else if (p.scope === 'price_max') {
                scopeLabel = t('promoLabelPriceMax') + p.scopeValue + ' ' + cur;
            } else {
                scopeLabel = p.scope;
            }
            var dateRange = '';
            if (p.startDate || p.endDate) {
                dateRange = (p.startDate || '...') + ' → ' + (p.endDate || '...');
            }

            html += '<div class="promo-item' + (p.active ? '' : ' inactive') + '">';
            html += '<div class="info">';
            html += '<div class="name">' + escapeHtml(p.name) + '<span class="promo-active-badge ' + (p.active ? 'active' : 'inactive') + '">' + (p.active ? t('promoActive') : t('promoInactive')) + '</span></div>';
            html += '<div class="meta">' + t('promoTypeLabel') + '<strong>' + escapeHtml(typeLabel) + '</strong>' + t('promoScopePrefix') + '<strong>' + escapeHtml(scopeLabel) + '</strong></div>';
            if (dateRange) {
                html += '<div class="meta">📅 ' + dateRange + '</div>';
            }
            html += '</div>';
            html += '<div class="actions">';
            html += '<button class="btn btn-sm promo-toggle-btn" data-id="' + p.id + '">' + (p.active ? '⏸️' : '▶️') + '</button>';
            html += '<button class="btn btn-sm btn-primary promo-edit-btn" data-id="' + p.id + '">' + t('promoEditBtn') + '</button>';
            html += '<button class="btn btn-sm btn-danger promo-delete-btn" data-id="' + p.id + '">🗑️</button>';
            html += '</div></div>';
        }
        html += '</div>';
    }

    html += '</div>';
    html += '</div>';

    container.innerHTML = html;

    // ── Event listeners ──

    // Type toggle
    var promoType = document.getElementById('promo-type');
    if (promoType) {
        promoType.addEventListener('change', function() {
            var val = this.value;
            var valueGroup = document.getElementById('promo-value-group');
            var buyGroup = document.getElementById('promo-buyx-group');
            var getYGroup = document.getElementById('promo-gety-group');
            var minQtyGroup = document.getElementById('promo-min-qty-group');
            var minAmountGroup = document.getElementById('promo-min-amount-group');

            buyGroup.style.display = 'none';
            getYGroup.style.display = 'none';
            minQtyGroup.style.display = 'none';
            minAmountGroup.style.display = 'none';

            if (val === 'percentage' || val === 'tiered' || val === 'cart_percentage') {
                valueGroup.style.display = 'block';
                valueGroup.querySelector('label').textContent = t('promoValue');
            } else if (val === 'fixed' || val === 'cart_fixed') {
                valueGroup.style.display = 'block';
                valueGroup.querySelector('label').textContent = t('promoFixed', {currency: settings.currency || 'DA'});
            } else {
                valueGroup.style.display = 'none';
            }

            if (val === 'buy_x_get_y') {
                buyGroup.style.display = 'block';
                getYGroup.style.display = 'block';
            } else if (val === 'tiered') {
                minQtyGroup.style.display = 'block';
            } else if (val === 'cart_percentage' || val === 'cart_fixed') {
                minAmountGroup.style.display = 'block';
            }
        });
    }

    // ── Build the scope-value field (select with DB suggestions / price input) ──
    function buildScopeValueField(scope, currentValue) {
        var group = document.getElementById('promo-scope-value-group');
        var field = document.getElementById('promo-scope-field');
        if (!group || !field) return;

        if (scope === 'all') {
            group.style.display = 'none';
            return;
        }

        group.style.display = 'block';

        if (scope === 'price_min' || scope === 'price_max') {
            field.innerHTML = '<input type="number" id="promo-scope-value" step="0.01" min="0" placeholder="0" value="' + (currentValue || '') + '">';
            return;
        }

        var storeMap = { category: 'categories', product: 'products', supplier: 'suppliers', client: 'customers' };
        var store = storeMap[scope];
        if (!store) {
            field.innerHTML = '<input type="text" id="promo-scope-value" placeholder="' + t('promoScopePlaceholder') + '" value="' + (currentValue || '') + '">';
            return;
        }

        field.innerHTML = '<select id="promo-scope-value" style="width:100%;padding:8px;border:1px solid var(--theme-border);border-radius:8px;background:white;font-size:13px;">' +
            '<option value="">— ' + t('promoScopePlaceholder') + ' —</option></select>';
        var sel = document.getElementById('promo-scope-value');

        var fillFrom = function(items) {
            items.forEach(function(it) {
                var opt = document.createElement('option');
                if (scope === 'product') {
                    opt.value = it.barcode;
                    opt.textContent = (it.barcode || '') + (it.name ? ' — ' + it.name : '');
                } else {
                    opt.value = it.name;
                    opt.textContent = it.name;
                }
                if (currentValue && (opt.value === currentValue || opt.textContent === currentValue)) {
                    opt.selected = true;
                }
                sel.appendChild(opt);
            });
        };

        if (scope === 'category') {
            Promise.all([dbGetAll('categories'), dbGetAll('products')]).then(function(res) {
                var names = [];
                var seen = {};
                res[0].forEach(function(c) { if (!seen[c.name]) { seen[c.name] = 1; names.push({ name: c.name }); } });
                res[1].forEach(function(p) { if (p.category && !seen[p.category]) { seen[p.category] = 1; names.push({ name: p.category }); } });
                names.sort(function(a, b) { return a.name.localeCompare(b.name); });
                fillFrom(names);
            }).catch(function(err) { console.error('❌ Promo scope categories:', err); });
        } else {
            dbGetAll(store).then(fillFrom).catch(function(err) { console.error('❌ Promo scope ' + store + ':', err); });
        }
    }

    // Scope toggle
    var promoScope = document.getElementById('promo-scope');
    if (promoScope) {
        promoScope.addEventListener('change', function() {
            var prev = '';
            var existing = document.getElementById('promo-scope-value');
            if (existing) prev = existing.value;
            buildScopeValueField(this.value, prev);
            updatePromoScopeHelp(this.value);
            updatePromoScopeValueHelp(this.value);
        });
    }

    // Form submit
    var form = document.getElementById('promotion-form');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            var name = document.getElementById('promo-name').value.trim();
            var type = document.getElementById('promo-type').value;
            var value = parseFloat(document.getElementById('promo-value').value) || 0;
            var scope = document.getElementById('promo-scope').value;
            var scopeValue = document.getElementById('promo-scope-value').value.trim();
            var startDate = document.getElementById('promo-start-date').value;
            var endDate = document.getElementById('promo-end-date').value;
            var editId = document.getElementById('promo-edit-id').value;
            var buyQty = parseInt(document.getElementById('promo-buy-qty').value) || 0;
            var getQty = parseInt(document.getElementById('promo-get-qty').value) || 0;
            var minQty = parseInt(document.getElementById('promo-min-qty').value) || 0;
            var minAmount = parseFloat(document.getElementById('promo-min-amount').value) || 0;

            var fail = function(msg) {
                document.getElementById('promo-feedback').textContent = msg;
                document.getElementById('promo-feedback').style.color = 'var(--danger)';
            };

            if (!name) {
                fail(t('promoNameRequired'));
                return;
            }

            if (type === 'percentage' && (value <= 0 || value > 100)) {
                fail(t('promoInvalidPercent'));
                return;
            }

            if (type === 'fixed' && value <= 0) {
                fail(t('promoInvalidAmount'));
                return;
            }

            if (type === 'buy_x_get_y' && (buyQty <= 0 || getQty <= 0)) {
                fail(t('promoInvalidQtyXY'));
                return;
            }

            if (type === 'tiered' && (minQty <= 0 || value <= 0 || value > 100)) {
                fail(t('promoInvalidMinQty'));
                return;
            }

            if ((type === 'cart_percentage' || type === 'cart_fixed') && (minAmount <= 0 || value <= 0 || (type === 'cart_percentage' && value > 100))) {
                fail(t('promoInvalidMinAmount'));
                return;
            }

            if ((scope === 'category' || scope === 'product' || scope === 'supplier' || scope === 'client' || scope === 'price_min' || scope === 'price_max') && !scopeValue) {
                fail(t('promoScopeValueRequired'));
                return;
            }

            var promo = {
                name: name,
                type: type,
                value: value,
                scope: scope,
                scopeValue: scopeValue,
                startDate: startDate,
                endDate: endDate,
                active: true,
                buyQty: buyQty,
                getQty: getQty,
                minQty: minQty,
                minAmount: minAmount
            };

            if (editId) {
                promo.id = parseInt(editId);
            } else {
                promo.createdAt = new Date().toISOString();
            }

            await savePromotion(promo);

            document.getElementById('promo-feedback').textContent = editId ? t('promoUpdated') : t('promoCreated');
            document.getElementById('promo-feedback').style.color = 'var(--success)';
            showToast(editId ? t('promoUpdated') : t('promoCreated'), 'success');

            form.reset();
            document.getElementById('promo-edit-id').value = '';
            document.getElementById('btn-save-promo').textContent = t('promoSave');
            document.getElementById('promo-value-group').style.display = 'block';
            document.getElementById('promo-buyx-group').style.display = 'none';
            document.getElementById('promo-gety-group').style.display = 'none';
            document.getElementById('promo-min-qty-group').style.display = 'none';
            document.getElementById('promo-min-amount-group').style.display = 'none';
            document.getElementById('promo-scope-value-group').style.display = 'none';

            renderPromotionsScreen();
        });
    }

    // Cancel button
    var cancelBtn = document.getElementById('btn-cancel-promo');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            var form = document.getElementById('promotion-form');
            if (form) form.reset();
            document.getElementById('promo-edit-id').value = '';
            document.getElementById('btn-save-promo').textContent = t('promoSave');
            updatePromoScopeHelp('all');
            updatePromoScopeValueHelp('all');
            document.getElementById('promo-value-group').style.display = 'block';
            document.getElementById('promo-buyx-group').style.display = 'none';
            document.getElementById('promo-gety-group').style.display = 'none';
            document.getElementById('promo-min-qty-group').style.display = 'none';
            document.getElementById('promo-min-amount-group').style.display = 'none';
            document.getElementById('promo-scope-value-group').style.display = 'none';
        });
    }

    // Toggle buttons
    document.querySelectorAll('.promo-toggle-btn').forEach(function(btn) {
        btn.addEventListener('click', async function() {
            var id = parseInt(this.dataset.id);
            await togglePromotion(id);
            renderPromotionsScreen();
            showToast(t('promoUpdated'), 'success');
        });
    });

    // Edit buttons
    document.querySelectorAll('.promo-edit-btn').forEach(function(btn) {
        btn.addEventListener('click', async function() {
            var id = parseInt(this.dataset.id);
            var promo = await dbGet('promotions', id);
            if (!promo) return;

            document.getElementById('promo-name').value = promo.name || '';
            document.getElementById('promo-type').value = promo.type || 'percentage';
            document.getElementById('promo-value').value = promo.value || '';
            document.getElementById('promo-scope').value = promo.scope || 'all';
            document.getElementById('promo-start-date').value = promo.startDate || '';
            document.getElementById('promo-end-date').value = promo.endDate || '';
            document.getElementById('promo-buy-qty').value = promo.buyQty || '';
            document.getElementById('promo-get-qty').value = promo.getQty || '';
            document.getElementById('promo-min-qty').value = promo.minQty || '';
            document.getElementById('promo-min-amount').value = promo.minAmount || '';
            document.getElementById('promo-edit-id').value = promo.id;
            document.getElementById('btn-save-promo').textContent = t('promoUpdate');

            // Rebuild scope-value field with the saved value pre-selected
            var pScope = promo.scope || 'all';
            if (typeof buildScopeValueField === 'function') {
                buildScopeValueField(pScope, promo.scopeValue || '');
            }
            updatePromoScopeHelp(pScope);
            updatePromoScopeValueHelp(pScope);

            // Trigger type change
            var promoType = document.getElementById('promo-type');
            if (promoType) promoType.dispatchEvent(new Event('change'));

            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    // Delete buttons
    document.querySelectorAll('.promo-delete-btn').forEach(function(btn) {
        btn.addEventListener('click', async function() {
            var id = parseInt(this.dataset.id);
            if (!confirm(t('promoDeleteConfirm'))) return;
            await deletePromotion(id);
            renderPromotionsScreen();
            showToast(t('promoDeleted'), 'success');
        });
    });
}

// ── Analytics: Total discounts per period ────────────────────
async function getDiscountStats() {
    var sales = await dbGetAll('sales');
    var now = new Date();
    var todayKey = now.toISOString().split('T')[0];

    var weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    var stats = { today: 0, week: 0, month: 0, total: 0 };

    for (var i = 0; i < sales.length; i++) {
        var sale = sales[i];
        var discount = sale.discount || 0;
        if (discount <= 0) continue;

        stats.total += discount;

        var saleDate = new Date(sale.timestamp);
        var saleKey = saleDate.toISOString().split('T')[0];

        if (saleKey === todayKey) {
            stats.today += discount;
        }
        if (saleDate >= weekStart) {
            stats.week += discount;
        }
        if (saleDate >= monthStart) {
            stats.month += discount;
        }
    }

    return stats;
}

// Window exports
window.loadPromotions = loadPromotions;
window.getActivePromotions = getActivePromotions;
window.applyPromotionsToItem = applyPromotionsToItem;
window.calculateCartDiscounts = calculateCartDiscounts;
window.savePromotion = savePromotion;
window.deletePromotion = deletePromotion;
window.togglePromotion = togglePromotion;
window.renderPromotionsScreen = renderPromotionsScreen;
window.getDiscountStats = getDiscountStats;
window.promoScopeHelp = promoScopeHelp;
window.updatePromoScopeHelp = updatePromoScopeHelp;
window.promoScopeValueHelp = promoScopeValueHelp;
window.updatePromoScopeValueHelp = updatePromoScopeValueHelp;

console.log('🏷️ Promotions module loaded');
