// ============================================================
// TRANSACTION: Transaction Completion (with Profit Tracking)
// ============================================================
async function completeTransaction(forceQuickCart = false) {
    console.log('🔄 Starting transaction...');
    const isQuickCheckout = forceQuickCart || (Boolean(window.quickCustomerMode || window.quickCustomerActive) && Array.isArray(window.quickCart) && window.quickCart.length > 0);
    const activeCart = isQuickCheckout ? window.quickCart : window.cart;
    console.log('📋 Cart items:', activeCart ? activeCart.length : 0);
    console.log('💳 Payment status:', paymentStatus, '| Method:', paymentMethod);
    
    if (!activeCart || activeCart.length === 0) {
        showToast(t('cartEmpty'), 'error');
        playError();
        return false;
    }

    const customerId = DOM.customerSelect && DOM.customerSelect.value ? parseInt(DOM.customerSelect.value) : null;

    // Modal ouvert → ignore les nouvelles tentatives de validation
    if (askCustomerModalOpen) {
        return false;
    }

    // Settings: askCustomerEnabled — invite à sélectionner un client avant chaque vente
    if (settings.askCustomerEnabled && !isQuickCheckout && !customerId && !customerAskShown) {
        customerAskShown = true;
        openAskCustomerModal();
        return false;
    }

    // Validate credit requires customer
    if (paymentMethod === 'credit' && !customerId) {
        showToast(t('saleCreditNeedsClient'), 'error');
        playError();
        return false;
    }

    // Get payment method details
    const pmData = typeof getPaymentMethodData === 'function' ? getPaymentMethodData() : { method: 'especes', details: {} };

    // Check stock and get purchase prices
    let totalProfit = 0;
    const saleItems = [];
    
    for (const item of activeCart) {
        let product = await dbGet('products', item.barcode);
        if (!product) {
            showToast(t('productNotFound', { name: item.name }), 'error');
            playError();
            return false;
        }
        
        if (item.variantKey) {
            const variants = await dbGetAll('product_variants');
            const variant = variants.find(v => {
                if (v.barcode && item.variantKey === v.barcode) return true;
                if (item.variantKey === product.barcode + '-var-' + v.id) return true;
                return false;
            });
            const variantStock = variant && variant.stock != null ? variant.stock : product.stock;
            // Settings: negativeStock — vérification finale avant validation de la transaction (évite les race conditions)
            if (variantStock < item.qty) {
                if (settings.negativeStock === 'prevent') {
                    showToast(t('insufficientStock', { name: item.name + ' (' + item.variantName + ')', stock: variantStock }), 'error');
                    playError();
                    return false;
                }
                if (settings.negativeStock === 'warn') {
                    showToast(t('stockWarning', { name: item.name + ' (' + item.variantName + ')', stock: variantStock }), 'warning');
                }
            }
        } else {
            // Settings: negativeStock — idem pour les produits sans variante
            if (product.stock < item.qty) {
                if (settings.negativeStock === 'prevent') {
                    showToast(t('insufficientStock', { name: item.name, stock: product.stock }), 'error');
                    playError();
                    return false;
                }
                if (settings.negativeStock === 'warn') {
                    showToast(t('stockWarning', { name: item.name, stock: product.stock }), 'warning');
                }
            }
        }
        
        // Calculate profit for this item
        const effectivePrice = item.reducedPrice !== null && item.reducedPrice < item.price ? item.reducedPrice : item.price;
        const purchasePrice = product.purchasePrice || product.price;
        const itemProfit = (effectivePrice - purchasePrice) * item.qty;
        totalProfit += itemProfit;
        
        const itemDiscountAmount = Math.max(0, (item.price - effectivePrice) * item.qty);
        const saleItem = {
            name: item.name,
            barcode: item.barcode,
            reference: item.reference || '',
            qty: item.qty,
            unit: item.unit || 'pièce',
            originalPrice: item.price,
            soldPrice: effectivePrice,
            reducedPrice: item.reducedPrice,
            purchasePrice: purchasePrice,
            profit: itemProfit,
            discounted: itemDiscountAmount > 0,
            discountAmount: itemDiscountAmount
        };
        if (item.variantName) saleItem.variantName = item.variantName;
        if (item.variantKey) saleItem.variantKey = item.variantKey;
        saleItems.push(saleItem);
    }

    const totals = calculateTotals(isQuickCheckout ? 'quick' : 'main');
    const totalAmount = totals.grandTotal;
    const paidAmount = parseFloat(DOM.amountPaidInput ? DOM.amountPaidInput.value : 0) || 0;
    
    // Determine payment status
    const isPaymentMarkedPaid = paymentStatus === 'paid';
    
    let remainingAmountValue = 0;
    let isDebt = false;
    let finalPaymentStatus = 'paid';
    let effectivePaid = totalAmount;
    
    if (pmData.method === 'especes') {
        effectivePaid = Math.min(paidAmount, totalAmount);
        if (effectivePaid >= totalAmount) {
            remainingAmountValue = 0;
            isDebt = false;
            finalPaymentStatus = 'paid';
        } else if (effectivePaid > 0) {
            remainingAmountValue = totalAmount - effectivePaid;
            isDebt = true;
            finalPaymentStatus = 'partial';
        } else {
            // Default to paid if no amount is entered (assume full payment)
            effectivePaid = totalAmount;
            remainingAmountValue = 0;
            isDebt = false;
            finalPaymentStatus = 'paid';
        }
    } else if (pmData.method === 'credit') {
        remainingAmountValue = totalAmount;
        isDebt = true;
        finalPaymentStatus = 'credit';
    } else {
        effectivePaid = totalAmount;
        remainingAmountValue = 0;
        isDebt = false;
        finalPaymentStatus = 'paid';
    }
    
    console.log('👤 Customer ID:', customerId, '| Effective paid:', effectivePaid, '| Remaining:', remainingAmountValue);

    try {
        // --- Transaction 1: Deduct stock + save sales record ---
        const tx1 = db.transaction(['products', 'sales', 'product_variants'], 'readwrite');
        const productStore = tx1.objectStore('products');
        const salesStore = tx1.objectStore('sales');
        const variantStore = tx1.objectStore('product_variants');

        // Deduct stock
        for (const item of activeCart) {
            const product = await new Promise((resolve, reject) => {
                const req = productStore.get(item.barcode);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });

            if (product) {
                product.stock -= item.qty;
                await new Promise((resolve, reject) => {
                    const req = productStore.put(product);
                    req.onsuccess = () => resolve();
                    req.onerror = () => reject(req.error);
                });
            }

            // Deduct variant stock if applicable
            if (item.variantKey) {
                const allVariants = await dbGetAll('product_variants');
                let variant = allVariants.find(v => {
                    if (v.barcode && item.variantKey === v.barcode) return true;
                    if (item.variantKey === item.barcode + '-var-' + v.id) return true;
                    return false;
                });
                if (variant && variant.stock != null) {
                    variant.stock -= item.qty;
                    await new Promise((resolve, reject) => {
                        const req = variantStore.put(variant);
                        req.onsuccess = () => resolve();
                        req.onerror = () => reject(req.error);
                    });
                }
            }
        }

        // Create sales record with profit
        const salesRecord = {
            timestamp: new Date().toISOString(),
            customerId: customerId,
            customerName: customerId ? customers.find(c => c.id === customerId)?.name || null : null,
            items: saleItems,
            subtotal: totals.subtotal,
            vat: totals.vat,
            discount: totals.discount,
            grandTotal: totals.grandTotal,
            totalProfit: totalProfit,
            amountPaid: effectivePaid,
            remainingAmount: remainingAmountValue,
            paymentStatus: finalPaymentStatus,
            isDebt: isDebt,
            paymentMarked: isPaymentMarkedPaid ? 'paid' : 'unpaid',
            quickCustomerSale: isQuickCheckout,
            paymentMethod: pmData.method || 'especes',
            paymentDetails: pmData.details || {}
        };

        // Save sales record
        const saleId = await new Promise((resolve, reject) => {
            const req = salesStore.add(salesRecord);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        console.log('✅ Sales record saved with ID:', saleId, 'Total Profit:', totalProfit);

        // --- Transaction 2: Save customer debt (separate tx to avoid auto-commit) ---
        if (customerId && isDebt) {
            console.log('💰 Creating debt for customer:', customerId);
            
            const tx2 = db.transaction(['customers'], 'readwrite');
            const customerStore = tx2.objectStore('customers');
            
            const customer = await new Promise((resolve, reject) => {
                const req = customerStore.get(customerId);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
            
            if (customer) {
                if (!customer.debts) {
                    customer.debts = [];
                }
                
                const debtEntry = {
                    saleId: saleId,
                    date: new Date().toISOString(),
                    items: activeCart.map(item => ({
                        name: item.name,
                        qty: item.qty,
                        unit: item.unit || 'pièce',
                        originalPrice: item.price,
                        soldPrice: item.reducedPrice !== null && item.reducedPrice < item.price ? item.reducedPrice : item.price,
                        reducedPrice: item.reducedPrice,
                        reference: item.reference || ''
                    })),
                    totalAmount: totals.grandTotal,
                    paidAmount: 0,
                    remainingAmount: totals.grandTotal,
                    status: 'pending'
                };
                
                customer.debts.push(debtEntry);
                console.log('✅ Debt added to customer:', debtEntry);
                
                await new Promise((resolve, reject) => {
                    const req = customerStore.put(customer);
                    req.onsuccess = () => resolve();
                    req.onerror = () => reject(req.error);
                });
                
                console.log('✅ Customer updated with debt');
            }
        }

        // Clear cart and restore main cart if quick-customer checkout
        if (isQuickCheckout) {
            window.quickCart = [];
            window.quickCustomerMode = false;
            window.quickCustomerActive = false;
            if (window.quickCustomerSnapshot) {
                window.cart = JSON.parse(JSON.stringify(window.quickCustomerSnapshot.mainCart));
            }
            const btn = document.getElementById('btn-quick-customer-mode');
            if (btn) {
                btn.textContent = t('quickCustomerBtn');
                btn.classList.remove('btn-warning');
                btn.classList.add('btn-secondary');
            }
        } else {
            window.cart = [];
        }
        renderCart();
        if (DOM.amountPaidInput) DOM.amountPaidInput.value = '0';
        
        paymentStatus = 'paid';
        updatePaymentStatusDisplay();
        if (typeof resetPaymentMethod === 'function') resetPaymentMethod();
        
        playSuccess();
        
        if (isPaymentMarkedPaid) {
            showToast(t('transactionCompleteMsg', { total: totals.grandTotal.toFixed(2), currency: settings.currency, profit: totalProfit.toFixed(2) }), 'success');
        } else {
            showToast(t('debtRecordedMsg', { total: totals.grandTotal.toFixed(2), currency: settings.currency }), 'warning');
        }

        // Settings: printAutoEnabled — si true, imprime automatiquement le ticket 500ms après la vente
        if (settings.printAutoEnabled && typeof printReceipt === 'function') {
            setTimeout(function() { printReceipt(null); }, 500);
        }

        // Settings: autoBackupEnabled — si false, ne fait pas de sauvegarde automatique après la vente
        if (settings.autoBackupEnabled !== false) await createAutoBackup();
        
        if (typeof logAudit === 'function') {
            const paymentLabel = finalPaymentStatus === 'paid' ? t('statusPaid') : (finalPaymentStatus === 'partial' ? t('statusPartial') : t('statusCredit'));
            await logAudit('SALE_CREATED', `Vente #${saleId} - ${cart.length} articles - ${totals.grandTotal.toFixed(2)} ${settings.currency} - ${paymentLabel}`);
        }
        
        // Always refresh analytics so recette/profit show live data
        if (typeof refreshAnalytics === 'function') {
            await refreshAnalytics();
        } else if (typeof loadAnalytics === 'function') {
            await loadAnalytics();
        }
        if (currentView === 'customers') {
            loadCustomers();
        }
        
        // Clear last scanned item display
        updateLastScannedItem(null);
        
        resetScanner();
        customerAskShown = false;
        return true;

    } catch (error) {
        console.error('❌ Transaction error:', error);
        playError();
        showToast(t('transactionFailed', { error: error.message }), 'error');
        return false;
    }
}