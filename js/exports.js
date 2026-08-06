// ============================================================
// EXPORTS: Export Functions
// ============================================================
async function exportCSV() {
    try {
        const sales = await dbGetAll('sales');
        if (!sales || sales.length === 0) {
            showToast(t('noSales'), 'error');
            return;
        }

        let csv = t('csvHeaderRow') + '\n';

        sales.forEach(sale => {
            const date = new Date(sale.timestamp).toLocaleString('fr-FR');
            const itemSummary = sale.items.map(item => `${item.name}×${item.qty}`).join('; ');
            const escapedSummary = `"${itemSummary.replace(/"/g, '""')}"`;
            const status = sale.isDebt ? (sale.remainingAmount > 0 ? t('debtStatus') : t('statusPaid')) : t('statusPaid');
            csv += `${sale.id},"${date}","${sale.customerName || t('regularCustomerShort')}",${escapedSummary},${sale.subtotal.toFixed(2)},${sale.vat.toFixed(2)},${(sale.discount || 0).toFixed(2)},${sale.grandTotal.toFixed(2)},${sale.amountPaid.toFixed(2)},${sale.remainingAmount.toFixed(2)},${status}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `ventes_export_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast(t('csvExported'), 'success');
        playSuccess();

    } catch (error) {
        console.error('CSV export error:', error);
        showToast(t('csvExportError'), 'error');
        playError();
    }
}

async function exportJSON() {
    try {
        const sales = await dbGetAll('sales');
        const products = await dbGetAll('products');
        const customersData = await dbGetAll('customers');
        const settingsData = await dbGetAll('settings');
        const zreportsData = await dbGetAll('zreports');
        const suppliersData = await dbGetAll('suppliers');
        const purchasesData = await dbGetAll('purchases');
        const promotionsData = await dbGetAll('promotions');
        
        const backup = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            sales: sales,
            products: products,
            customers: customersData,
            settings: settingsData,
            zreports: zreportsData,
            suppliers: suppliersData,
            purchases: purchasesData,
            promotions: promotionsData
        };
        
        const json = JSON.stringify(backup, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `sauvegarde_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showToast(t('jsonExported'), 'success');
        playSuccess();
        
    } catch (error) {
        console.error('JSON export error:', error);
        showToast(t('jsonExportError'), 'error');
        playError();
    }
}

// ============================================================
// SAFE IMPORT — snapshot avant remplacement + rollback
// ============================================================
const IMPORT_STORES = ['products', 'sales', 'customers', 'settings', 'zreports', 'suppliers', 'purchases', 'promotions'];

async function snapshotDataStores(stores) {
    const snap = {};
    for (const s of stores) snap[s] = await dbGetAll(s);
    return snap;
}

async function restoreSnapshot(snap) {
    for (const [store, records] of Object.entries(snap)) {
        await dbClear(store);
        for (const r of records) await dbPut(store, r);
    }
}

// Valide le schéma : si une clé existe, elle doit être un tableau.
// Retourne true si au moins un conteneur de données est présent.
function validateBackupData(data) {
    if (!data || typeof data !== 'object') return false;
    let hasData = false;
    for (const s of IMPORT_STORES) {
        if (data[s] !== undefined) {
            if (!Array.isArray(data[s])) throw new Error('Format invalide (stock: ' + s + ')');
            if (data[s].length > 0) hasData = true;
        }
    }
    return hasData;
}

// Sauvegarde un instantané AVANT l'import et restaure tout si échec.
async function doSafeImport(data) {
    let snap = null;
    try {
        const valid = validateBackupData(data);
        if (!valid) {
            showToast(t('invalidBackupFormat'), 'error');
            return false;
        }

        // CREATE AUTO-BACKUP du fichier import + instantané en mémoire
        if (typeof window.createAutoBackup === 'function') await window.createAutoBackup();
        snap = await snapshotDataStores(IMPORT_STORES);

        for (const s of IMPORT_STORES) {
            await dbClear(s);
            const records = data[s] || [];
            for (const rec of records) await dbPut(s, rec);
        }

        await loadSettings();
        await loadInventory();
        await loadCustomers();
        await loadSuppliers();
        if (typeof refreshAnalytics === 'function') await refreshAnalytics();
        if (typeof renderCart === 'function') renderCart();

        showToast(t('dataImported'), 'success');
        playSuccess();
        return true;
    } catch (error) {
        console.error('Import error:', error);
        // Rollback vers l'état précédent pour ne jamais perdre de données
        if (snap) {
            try {
                await restoreSnapshot(snap);
                showToast(t('importRolledBack'), 'error');
            } catch (restoreError) {
                console.error('Rollback failed:', restoreError);
                showToast(t('importError'), 'error');
            }
        } else {
            showToast(t('importError'), 'error');
        }
        playError();
        return false;
    }
}

function setupImportFunctions() {
    if (DOM.btnImportJson) {
        DOM.btnImportJson.addEventListener('click', function() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = async function(e) {
                const file = e.target.files[0];
                if (!file) return;
                try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    if (confirm(t('importReplaceConfirm'))) {
                        await doSafeImport(data);
                    }
                } catch (error) {
                    console.error('Import error:', error);
                    showToast(t('importError'), 'error');
                    playError();
                }
            };
            input.click();
        });
    }

    if (DOM.fileImportFull) {
        DOM.fileImportFull.addEventListener('change', async function(e) {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                if (confirm(t('importReplaceConfirm'))) {
                    await doSafeImport(data);
                } else {
                    return;
                }
            } catch (error) {
                console.error('Import error:', error);
                showToast(t('importError'), 'error');
                playError();
            }
            DOM.fileImportFull.value = '';
        });
    }
}