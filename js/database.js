// ============================================================
// DATABASE: SQLite (via IPC) > IndexedDB fallback
// ============================================================

const useSQLite = () => window.sqlite && typeof window.sqlite.getAll === 'function';

// Sur certains navigateurs/onglets, la connexion IndexedDB globale peut etre
// fermee puis re-ouverte (versionchange, bascule de stockage, multi-onglets).
// Lancer une transaction sur une connexion fermee leve InvalidStateError
// ("state had changed since it was read from disk"). On rouvre alors la base
// une fois et on reessaie automatiquement.
// Perf : helpers internes prefixes pour eviter TOUTE collision avec les autres
// scripts (beaucoup de fichiers utilisent des helpers globaux courts).
function __dbReq(dbConn, storeName, mode, makeRequest) {
    return new Promise((resolve, reject) => {
        try {
            const tx = dbConn.transaction(storeName, mode);
            const store = tx.objectStore(storeName);
            const req = makeRequest(store);
            req.onsuccess = () => resolve(req.result);
            req.onerror = (e) => reject(e.target.error || new Error('IDB request failed'));
        } catch (err) {
            reject(err);
        }
    });
}

async function __dbTxn(storeName, mode, makeRequest) {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            // Ne réutilise jamais consciemment une connexion invalide : on repart
            // toujours d'un `db` non fermé quand on l'a marquée comme obsolète.
            if (!db || db.__stale === true) {
                db = await openDB();
            }
            return await __dbReq(db, storeName, mode, makeRequest);
        } catch (err) {
            const isStale = err && (err.name === 'InvalidStateError' || err.name === 'TransactionInactiveError' || err.name === 'AbortError');
            if (isStale && attempt < 2) {
                console.warn(`âš ï¸Extended: IDB stale connection (${err.name}), reopening and retrying ${storeName}...`);
                // Marque l'ancienne connexion comme obsolète, la ferme et en ouvre une neuve.
                try { if (db) { db.__stale = true; try { db.close(); } catch (_) {} db = null; } } catch (_) {}
                try { db = await openDB(); } catch (e) { throw e; }
                continue;
            }
            throw err;
        }
    }
    throw new Error(`IDB retry failed for ${storeName}`);
}

// Refund records store `items` as a JSON string while normal sales store an
// array. Normalize on read so consumers can always use `sale.items` as array.
function _normalizeSaleItems(sale) {
    if (sale && typeof sale.items === 'string') {
        try { sale.items = JSON.parse(sale.items); } catch (e) { sale.items = []; }
    }
    return sale;
}

async function dbGetAll(storeName) {
    const normalize = storeName === 'sales' ? _normalizeSaleItems : null;

    if (useSQLite()) {
        try {
            const result = await window.sqlite.getAll(storeName);
            console.log(`âœ… [SQLite] Retrieved ${result.length} items from ${storeName}`);
            return normalize ? result.map(normalize) : result;
        } catch (err) {
            console.warn(`âš ï¸ [SQLite] getAll failed for ${storeName}, falling back to IndexedDB`, err);
        }
    }

    try {
        const result = await __dbTxn(storeName, 'readonly', (store) => store.getAll());
        console.log(`âœ… [IndexedDB] Retrieved ${(result || []).length} items from ${storeName}`);
        return normalize ? (result || []).map(normalize) : (result || []);
    } catch (err) {
        console.error(`Error getting all from ${storeName}:`, err);
        throw err;
    }
}

async function dbGet(storeName, key) {
    if (useSQLite()) {
        try {
            const result = await window.sqlite.get(storeName, key);
            console.log(`âœ… [SQLite] Retrieved from ${storeName}:`, result);
            return result;
        } catch (err) {
            console.warn(`âš ï¸ [SQLite] get failed for ${storeName}, falling back to IndexedDB`, err);
        }
    }

    try {
        const result = await __dbTxn(storeName, 'readonly', (store) => store.get(key));
        return storeName === 'sales' ? _normalizeSaleItems(result) : (result || null);
    } catch (err) {
        console.error(`Error getting from ${storeName}:`, err);
        throw err;
    }
}

async function dbPut(storeName, data) {
    let sqliteError = null;
    if (useSQLite()) {
        try {
            await window.sqlite.put(storeName, data);
            console.log(`âœ… [SQLite] Saved to ${storeName}:`, data);
        } catch (err) {
            sqliteError = err;
            console.warn(`âš ï¸ [SQLite] put failed for ${storeName}`, err);
        }
    }

    try {
        const id = await __dbTxn(storeName, 'readwrite', (store) => store.put(data));
        console.log(`âœ… [IndexedDB] Saved to ${storeName}:`, data);
        if (sqliteError) {
            console.warn(`âš ï¸ Data saved to IndexedDB only (SQLite failed)`, sqliteError);
        }
        return id;
    } catch (err) {
        console.error(`Error saving to ${storeName}:`, err);
        throw err;
    }
}

async function dbDelete(storeName, key) {
    if (useSQLite()) {
        try {
            await window.sqlite.delete(storeName, key);
            console.log(`âœ… [SQLite] Deleted from ${storeName}:`, key);
        } catch (err) {
            console.warn(`âš ï¸ [SQLite] delete failed for ${storeName}`, err);
        }
    }

    try {
        await __dbTxn(storeName, 'readwrite', (store) => store.delete(key));
        console.log(`âœ… [IndexedDB] Deleted from ${storeName}:`, key);
    } catch (err) {
        console.error(`Error deleting from ${storeName}:`, err);
        throw err;
    }
}

async function dbClear(storeName) {
    if (useSQLite()) {
        try {
            await window.sqlite.clear(storeName);
            console.log(`âœ… [SQLite] Cleared ${storeName}`);
        } catch (err) {
            console.warn(`âš ï¸ [SQLite] clear failed for ${storeName}`, err);
        }
    }

    try {
        await __dbTxn(storeName, 'readwrite', (store) => store.clear());
        console.log(`âœ… [IndexedDB] Cleared ${storeName}`);
    } catch (err) {
        console.error(`Error clearing ${storeName}:`, err);
        throw err;
    }
}

async function migrateToSQLite() {
    if (!useSQLite()) {
        console.log('SQLite not available, skipping migration');
        return false;
    }

    try {
        const migrated = await window.sqlite.getMigrationStatus();
        if (migrated) {
            console.log('âœ… SQLite already has data, skipping migration');
            return true;
        }

        console.log('ðŸ”„ SQLite is empty, migrating from IndexedDB...');
        if (!db) {
            try { db = await openDB(); } catch (err) {
                console.log('No IndexedDB data to migrate');
                return true;
            }
        }

        const allData = {};
        const stores = ['products', 'sales', 'settings', 'customers', 'categories', 'zreports', 'suppliers', 'purchases', 'users', 'auditlog', 'promotions', 'product_variants'];

        for (const storeName of stores) {
            try {
                const tx = db.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                const req = store.getAll();
                allData[storeName] = await new Promise((resolve) => {
                    req.onsuccess = () => resolve(req.result || []);
                    req.onerror = () => resolve([]);
                });
            } catch {
                allData[storeName] = [];
            }
        }

        const totalItems = Object.values(allData).reduce((sum, arr) => sum + arr.length, 0);
        if (totalItems === 0) {
            console.log('âœ… No IndexedDB data to migrate');
            await window.sqlite.getMigrationStatus();
            return true;
        }

        console.log(`ðŸ”„ Migrating ${totalItems} items to SQLite...`);
        const success = await window.sqlite.seedFromIndexedDB(allData);

        if (success) {
            console.log('âœ… Migration to SQLite complete!');
            return true;
        } else {
            console.error('âŒ Migration failed');
            return false;
        }
    } catch (err) {
        console.error('Migration error:', err);
        return false;
    }
}

function openDB() {
    return new Promise((resolve, reject) => {
        const checkRequest = indexedDB.open(DB_NAME);
        let existingVersion = 0;
        
        checkRequest.onsuccess = function(ev) {
            const dbCheck = ev.target.result;
            existingVersion = dbCheck.version;
            dbCheck.close();
            
            console.log('ðŸ“¦ Existing database version:', existingVersion);
            console.log('ðŸ“¦ Target database version:', DB_VERSION);
            
            if (existingVersion >= DB_VERSION) {
                console.log('ðŸ“¦ Database already up to date, opening...');
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                
                request.onsuccess = (ev) => {
                    db = ev.target.result;
                    console.log('âœ… Database connected successfully');
                    resolve(db);
                };
                
                request.onerror = (ev) => {
                    console.error('Database open error:', ev.target.error);
                    reject(ev.target.error);
                };
                
                return;
            }
            
            const openVersion = DB_VERSION;
            console.log('ðŸ“¦ Upgrading database to version:', openVersion);
            
            const request = indexedDB.open(DB_NAME, openVersion);
            
            request.onupgradeneeded = (ev) => {
                const d = ev.target.result;
                console.log('ðŸ“¦ Upgrading database schema...');
                
                if (!d.objectStoreNames.contains('products')) {
                    const productStore = d.createObjectStore('products', { keyPath: 'barcode' });
                    productStore.createIndex('name', 'name', { unique: false });
                    productStore.createIndex('category', 'category', { unique: false });
                    console.log('âœ… Products store created');
                }
                
                if (!d.objectStoreNames.contains('sales')) {
                    const salesStore = d.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
                    salesStore.createIndex('timestamp', 'timestamp', { unique: false });
                    salesStore.createIndex('customerId', 'customerId', { unique: false });
                    console.log('âœ… Sales store created');
                }
                
                if (!d.objectStoreNames.contains('settings')) {
                    d.createObjectStore('settings', { keyPath: 'key' });
                    console.log('âœ… Settings store created');
                }
                
                if (!d.objectStoreNames.contains('customers')) {
                    d.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
                    console.log('âœ… Customers store created');
                }
                
                if (!d.objectStoreNames.contains('categories')) {
                    d.createObjectStore('categories', { keyPath: 'name' });
                    console.log('âœ… Categories store created');
                }
                
                if (!d.objectStoreNames.contains('zreports')) {
                    const zrStore = d.createObjectStore('zreports', { keyPath: 'id', autoIncrement: true });
                    zrStore.createIndex('date', 'date', { unique: false });
                    console.log('âœ… Z-Reports store created');
                }
                
                if (!d.objectStoreNames.contains('suppliers')) {
                    const supStore = d.createObjectStore('suppliers', { keyPath: 'id', autoIncrement: true });
                    supStore.createIndex('name', 'name', { unique: false });
                    console.log('âœ… Suppliers store created');
                }
                
                if (!d.objectStoreNames.contains('purchases')) {
                    const purStore = d.createObjectStore('purchases', { keyPath: 'id', autoIncrement: true });
                    purStore.createIndex('supplierId', 'supplierId', { unique: false });
                    purStore.createIndex('date', 'date', { unique: false });
                    console.log('âœ… Purchases store created');
                }

                if (!d.objectStoreNames.contains('users')) {
                    const userStore = d.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
                    userStore.createIndex('name', 'name', { unique: false });
                    console.log('âœ… Users store created');
                }

                if (!d.objectStoreNames.contains('auditlog')) {
                    const auditStore = d.createObjectStore('auditlog', { keyPath: 'id', autoIncrement: true });
                    auditStore.createIndex('timestamp', 'timestamp', { unique: false });
                    auditStore.createIndex('userId', 'userId', { unique: false });
                    auditStore.createIndex('actionType', 'actionType', { unique: false });
                    console.log('âœ… AuditLog store created');
                }

                if (!d.objectStoreNames.contains('promotions')) {
                    d.createObjectStore('promotions', { keyPath: 'id', autoIncrement: true });
                    console.log('âœ… Promotions store created');
                }

                if (!d.objectStoreNames.contains('product_variants')) {
                    const varStore = d.createObjectStore('product_variants', { keyPath: 'id', autoIncrement: true });
                    varStore.createIndex('parentBarcode', 'parentBarcode', { unique: false });
                    varStore.createIndex('barcode', 'barcode', { unique: false });
                    console.log('âœ… Product Variants store created');
                }
            };
            
            request.onsuccess = (ev) => {
                db = ev.target.result;
                console.log('âœ… Database upgraded and connected successfully');
                addPurchasePriceToExistingProducts();
                resolve(db);
            };
            
            request.onerror = (ev) => {
                console.error('Database open error:', ev.target.error);
                reject(ev.target.error);
            };
        };
        
        checkRequest.onerror = function(ev) {
            console.log('ðŸ“¦ No existing database, creating new...');
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onupgradeneeded = (ev) => {
                const d = ev.target.result;
                console.log('ðŸ“¦ Creating database schema...');
                
                const productStore = d.createObjectStore('products', { keyPath: 'barcode' });
                productStore.createIndex('name', 'name', { unique: false });
                productStore.createIndex('category', 'category', { unique: false });
                
                const salesStore = d.createObjectStore('sales', { keyPath: 'id', autoIncrement: true });
                salesStore.createIndex('timestamp', 'timestamp', { unique: false });
                salesStore.createIndex('customerId', 'customerId', { unique: false });
                
                d.createObjectStore('settings', { keyPath: 'key' });
                d.createObjectStore('customers', { keyPath: 'id', autoIncrement: true });
                d.createObjectStore('categories', { keyPath: 'name' });
                
                const zrStore = d.createObjectStore('zreports', { keyPath: 'id', autoIncrement: true });
                zrStore.createIndex('date', 'date', { unique: false });
                
                const supStore = d.createObjectStore('suppliers', { keyPath: 'id', autoIncrement: true });
                supStore.createIndex('name', 'name', { unique: false });
                
                const purStore = d.createObjectStore('purchases', { keyPath: 'id', autoIncrement: true });
                purStore.createIndex('supplierId', 'supplierId', { unique: false });
                purStore.createIndex('date', 'date', { unique: false });

                const userStore = d.createObjectStore('users', { keyPath: 'id', autoIncrement: true });
                userStore.createIndex('name', 'name', { unique: false });

                const auditStore = d.createObjectStore('auditlog', { keyPath: 'id', autoIncrement: true });
                auditStore.createIndex('timestamp', 'timestamp', { unique: false });
                auditStore.createIndex('userId', 'userId', { unique: false });
                auditStore.createIndex('actionType', 'actionType', { unique: false });

                d.createObjectStore('promotions', { keyPath: 'id', autoIncrement: true });

                const varStore = d.createObjectStore('product_variants', { keyPath: 'id', autoIncrement: true });
                varStore.createIndex('parentBarcode', 'parentBarcode', { unique: false });
                varStore.createIndex('barcode', 'barcode', { unique: false });
                
                console.log('âœ… Database schema created (all stores)');
            };
            
            request.onsuccess = (ev) => {
                db = ev.target.result;
                console.log('âœ… Database connected successfully');
                resolve(db);
            };
            
            request.onerror = (ev) => {
                console.error('Database open error:', ev.target.error);
                reject(ev.target.error);
            };
        };
    });
}

async function addPurchasePriceToExistingProducts() {
    try {
        const products = await dbGetAll('products');
        let updated = 0;
        
        for (const product of products) {
            if (product.purchasePrice === undefined || product.purchasePrice === null) {
                product.purchasePrice = product.price || 0;
                await dbPut('products', product);
                updated++;
            }
        }
        
        if (updated > 0) {
            console.log(`âœ… Added purchasePrice to ${updated} products`);
        } else {
            console.log('âœ… All products already have purchasePrice');
        }
    } catch (error) {
        console.error('Error adding purchasePrice:', error);
    }
}


