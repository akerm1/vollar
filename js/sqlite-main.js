const { app, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

let db = null;
let dbPath = null;
let migrationDone = false;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS products (
  barcode TEXT PRIMARY KEY,
  name TEXT DEFAULT '',
  category TEXT DEFAULT 'Non catégorisé',
  reference TEXT DEFAULT '',
  unit TEXT DEFAULT 'pièce',
  price REAL DEFAULT 0,
  purchasePrice REAL DEFAULT 0,
  stock REAL DEFAULT 0,
  supplierId INTEGER,
  minimumStock INTEGER DEFAULT 5,
  imageData TEXT DEFAULT '',
  imagePath TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT DEFAULT '',
  customerId INTEGER,
  customerName TEXT,
  items TEXT DEFAULT '[]',
  subtotal REAL DEFAULT 0,
  vat REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  grandTotal REAL DEFAULT 0,
  totalProfit REAL DEFAULT 0,
  amountPaid REAL DEFAULT 0,
  remainingAmount REAL DEFAULT 0,
  paymentStatus TEXT DEFAULT 'paid',
  isDebt INTEGER DEFAULT 0,
  paymentMarked TEXT DEFAULT 'paid',
  quickCustomerSale INTEGER DEFAULT 0,
  paymentMethod TEXT DEFAULT 'especes',
  paymentDetails TEXT DEFAULT '{}',
  _dayLocked INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sales_timestamp ON sales(timestamp);
CREATE INDEX IF NOT EXISTS idx_sales_customerId ON sales(customerId);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  createdAt TEXT DEFAULT '',
  debts TEXT DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS categories (
  name TEXT PRIMARY KEY,
  createdAt TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS zreports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT DEFAULT '',
  generatedAt TEXT DEFAULT '',
  locked INTEGER DEFAULT 0,
  openingFloat REAL DEFAULT 0,
  totalRevenue REAL DEFAULT 0,
  totalCost REAL DEFAULT 0,
  totalProfit REAL DEFAULT 0,
  totalSalesCount INTEGER DEFAULT 0,
  totalItems INTEGER DEFAULT 0,
  totalPaid REAL DEFAULT 0,
  totalRemaining REAL DEFAULT 0,
  paymentBreakdown TEXT DEFAULT '{}',
  cashInDrawer REAL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_zreports_date ON zreports(date);

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  email TEXT DEFAULT '',
  nif TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplierId INTEGER,
  supplierName TEXT DEFAULT '',
  date TEXT DEFAULT '',
  invoiceRef TEXT DEFAULT '',
  items TEXT DEFAULT '[]',
  totalCost REAL DEFAULT 0,
  createdAt TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_purchases_supplierId ON purchases(supplierId);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT DEFAULT '',
  pinHash TEXT DEFAULT '',
  role TEXT DEFAULT 'caissier',
  active INTEGER DEFAULT 1,
  mustChangePin INTEGER DEFAULT 0,
  customPermissions TEXT DEFAULT '{}',
  createdAt TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);

CREATE TABLE IF NOT EXISTS auditlog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT DEFAULT '',
  userId INTEGER,
  userName TEXT DEFAULT 'Systeme',
  actionType TEXT DEFAULT '',
  actionDetails TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_auditlog_timestamp ON auditlog(timestamp);
CREATE INDEX IF NOT EXISTS idx_auditlog_userId ON auditlog(userId);
CREATE INDEX IF NOT EXISTS idx_auditlog_actionType ON auditlog(actionType);

CREATE TABLE IF NOT EXISTS promotions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT DEFAULT '',
  type TEXT DEFAULT 'percentage',
  value REAL DEFAULT 0,
  scope TEXT DEFAULT 'all',
  scopeValue TEXT DEFAULT '',
  startDate TEXT DEFAULT '',
  endDate TEXT DEFAULT '',
  active INTEGER DEFAULT 1,
  buyQty INTEGER DEFAULT 0,
  getQty INTEGER DEFAULT 0,
  createdAt TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS product_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parentBarcode TEXT DEFAULT '',
  name TEXT DEFAULT '',
  type TEXT DEFAULT '',
  price REAL,
  stock REAL,
  barcode TEXT DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_product_variants_parent ON product_variants(parentBarcode);
`;

function saveToDisk() {
  if (!db) { console.warn('SQLite: saveToDisk skipped - no db'); return; }
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
    console.log(`SQLite: Database saved to disk (${buffer.length} bytes)`);
  } catch (err) {
    console.error('SQLite: Failed to save to disk', err);
  }
}

function serializeValue(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function deserializeValue(value, typeHint) {
  if (value === null || value === undefined) return null;
  if (typeHint === 'json') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

const JSON_FIELDS = {
  products: [],
  sales: ['items', 'paymentDetails'],
  settings: ['value'],
  customers: ['debts'],
  categories: [],
  zreports: ['paymentBreakdown'],
  suppliers: [],
  purchases: ['items'],
  users: ['customPermissions'],
  auditlog: [],
  promotions: [],
  product_variants: [],
};

const INTEGER_PK_STORES = ['sales', 'customers', 'zreports', 'suppliers', 'purchases', 'users', 'auditlog', 'promotions', 'product_variants'];

function objectToRow(storeName, obj) {
  const row = {};
  const jsonFields = JSON_FIELDS[storeName] || [];
  for (const [key, value] of Object.entries(obj)) {
    if (jsonFields.includes(key)) {
      row[key] = serializeValue(value);
    } else if (typeof value === 'boolean') {
      row[key] = value ? 1 : 0;
    } else {
      row[key] = value;
    }
  }
  for (const key of jsonFields) {
    if (!(key in row)) {
      row[key] = '{}';
    }
  }
  return row;
}

function rowToObject(storeName, row) {
  if (!row) return null;
  const obj = { ...row };
  const jsonFields = JSON_FIELDS[storeName] || [];
  for (const key of jsonFields) {
    if (obj[key] !== null && obj[key] !== undefined) {
      obj[key] = deserializeValue(obj[key], 'json');
    } else if (key === 'customPermissions') {
      obj[key] = {};
    }
  }
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'number' && (key === 'isDebt' || key === 'quickCustomerSale' || key === 'locked' || key === 'active' || key === 'mustChangePin' || key === '_dayLocked')) {
      obj[key] = !!value;
    }
  }
  return obj;
}

function handleGetAll(event, storeName) {
  try {
    const stmt = db.prepare(`SELECT * FROM ${storeName}`);
    const results = [];
    while (stmt.step()) {
      results.push(rowToObject(storeName, stmt.getAsObject()));
    }
    stmt.free();
    return results;
  } catch (err) {
    console.error(`SQLite getAll error for ${storeName}:`, err);
    return [];
  }
}

function handleGet(event, storeName, key) {
  try {
    let stmt;
    if (storeName === 'products') {
      stmt = db.prepare(`SELECT * FROM products WHERE barcode = ?`);
      stmt.bind([key]);
    } else if (storeName === 'categories') {
      stmt = db.prepare(`SELECT * FROM categories WHERE name = ?`);
      stmt.bind([key]);
    } else if (storeName === 'settings') {
      stmt = db.prepare(`SELECT * FROM settings WHERE key = ?`);
      stmt.bind([key]);
    } else {
      stmt = db.prepare(`SELECT * FROM ${storeName} WHERE id = ?`);
      stmt.bind([Number(key)]);
    }

    let result = null;
    if (stmt.step()) {
      result = rowToObject(storeName, stmt.getAsObject());
    }
    stmt.free();
    return result;
  } catch (err) {
    console.error(`SQLite get error for ${storeName}:`, err);
    return null;
  }
}

function handlePut(event, storeName, data) {
  try {
    const row = objectToRow(storeName, data);
    console.log(`SQLite handlePut: ${storeName}`, row);

    if (storeName === 'products') {
      db.run(
        `INSERT OR REPLACE INTO products (barcode, name, category, reference, unit, price, purchasePrice, stock, supplierId, minimumStock, imageData, imagePath)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.barcode, row.name, row.category, row.reference, row.unit, row.price, row.purchasePrice, row.stock, row.supplierId, row.minimumStock, row.imageData, row.imagePath]
      );
    } else if (storeName === 'settings') {
      db.run(
        `INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`,
        [row.key, row.value]
      );
    } else if (storeName === 'categories') {
      db.run(
        `INSERT OR REPLACE INTO categories (name, createdAt) VALUES (?, ?)`,
        [row.name, row.createdAt]
      );
    } else if (storeName === 'sales') {
      if (row.id) {
        db.run(
          `INSERT OR REPLACE INTO sales (id, timestamp, customerId, customerName, items, subtotal, vat, discount, grandTotal, totalProfit, amountPaid, remainingAmount, paymentStatus, isDebt, paymentMarked, quickCustomerSale, paymentMethod, paymentDetails, _dayLocked)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [row.id, row.timestamp, row.customerId, row.customerName, row.items, row.subtotal, row.vat, row.discount, row.grandTotal, row.totalProfit, row.amountPaid, row.remainingAmount, row.paymentStatus, row.isDebt, row.paymentMarked, row.quickCustomerSale, row.paymentMethod, row.paymentDetails, row._dayLocked]
        );
      } else {
        db.run(
          `INSERT INTO sales (timestamp, customerId, customerName, items, subtotal, vat, discount, grandTotal, totalProfit, amountPaid, remainingAmount, paymentStatus, isDebt, paymentMarked, quickCustomerSale, paymentMethod, paymentDetails, _dayLocked)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [row.timestamp, row.customerId, row.customerName, row.items, row.subtotal, row.vat, row.discount, row.grandTotal, row.totalProfit, row.amountPaid, row.remainingAmount, row.paymentStatus, row.isDebt, row.paymentMarked, row.quickCustomerSale, row.paymentMethod, row.paymentDetails, row._dayLocked]
        );
      }
    } else if (storeName === 'customers') {
      if (row.id) {
        db.run(
          `INSERT OR REPLACE INTO customers (id, name, phone, address, createdAt, debts)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [row.id, row.name, row.phone, row.address, row.createdAt, row.debts]
        );
      } else {
        db.run(
          `INSERT INTO customers (name, phone, address, createdAt, debts)
           VALUES (?, ?, ?, ?, ?)`,
          [row.name, row.phone, row.address, row.createdAt, row.debts]
        );
      }
    } else if (storeName === 'zreports') {
      if (row.id) {
        db.run(
          `INSERT OR REPLACE INTO zreports (id, date, generatedAt, locked, openingFloat, totalRevenue, totalCost, totalProfit, totalSalesCount, totalItems, totalPaid, totalRemaining, paymentBreakdown, cashInDrawer)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [row.id, row.date, row.generatedAt, row.locked, row.openingFloat, row.totalRevenue, row.totalCost, row.totalProfit, row.totalSalesCount, row.totalItems, row.totalPaid, row.totalRemaining, row.paymentBreakdown, row.cashInDrawer]
        );
      } else {
        db.run(
          `INSERT INTO zreports (date, generatedAt, locked, openingFloat, totalRevenue, totalCost, totalProfit, totalSalesCount, totalItems, totalPaid, totalRemaining, paymentBreakdown, cashInDrawer)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [row.date, row.generatedAt, row.locked, row.openingFloat, row.totalRevenue, row.totalCost, row.totalProfit, row.totalSalesCount, row.totalItems, row.totalPaid, row.totalRemaining, row.paymentBreakdown, row.cashInDrawer]
        );
      }
    } else if (storeName === 'suppliers') {
      if (row.id) {
        db.run(
          `INSERT OR REPLACE INTO suppliers (id, name, phone, address, email, nif)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [row.id, row.name, row.phone, row.address, row.email, row.nif]
        );
      } else {
        db.run(
          `INSERT INTO suppliers (name, phone, address, email, nif)
           VALUES (?, ?, ?, ?, ?)`,
          [row.name, row.phone, row.address, row.email, row.nif]
        );
      }
    } else if (storeName === 'purchases') {
      if (row.id) {
        db.run(
          `INSERT OR REPLACE INTO purchases (id, supplierId, supplierName, date, invoiceRef, items, totalCost, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [row.id, row.supplierId, row.supplierName, row.date, row.invoiceRef, row.items, row.totalCost, row.createdAt]
        );
      } else {
        db.run(
          `INSERT INTO purchases (supplierId, supplierName, date, invoiceRef, items, totalCost, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [row.supplierId, row.supplierName, row.date, row.invoiceRef, row.items, row.totalCost, row.createdAt]
        );
      }
    } else if (storeName === 'users') {
      if (row.id) {
        db.run(
          `INSERT OR REPLACE INTO users (id, name, pinHash, role, active, mustChangePin, customPermissions, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [row.id, row.name, row.pinHash, row.role, row.active, row.mustChangePin, row.customPermissions, row.createdAt]
        );
      } else {
        db.run(
          `INSERT INTO users (name, pinHash, role, active, mustChangePin, customPermissions, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [row.name, row.pinHash, row.role, row.active, row.mustChangePin, row.customPermissions, row.createdAt]
        );
      }
    } else if (storeName === 'auditlog') {
      if (row.id) {
        db.run(
          `INSERT OR REPLACE INTO auditlog (id, timestamp, userId, userName, actionType, actionDetails)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [row.id, row.timestamp, row.userId, row.userName, row.actionType, row.actionDetails]
        );
      } else {
        db.run(
          `INSERT INTO auditlog (timestamp, userId, userName, actionType, actionDetails)
           VALUES (?, ?, ?, ?, ?)`,
          [row.timestamp, row.userId, row.userName, row.actionType, row.actionDetails]
        );
      }
    } else if (storeName === 'promotions') {
      if (row.id) {
        db.run(
          `INSERT OR REPLACE INTO promotions (id, name, type, value, scope, scopeValue, startDate, endDate, active, buyQty, getQty, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [row.id, row.name, row.type, row.value, row.scope, row.scopeValue, row.startDate, row.endDate, row.active, row.buyQty, row.getQty, row.createdAt]
        );
      } else {
        db.run(
          `INSERT INTO promotions (name, type, value, scope, scopeValue, startDate, endDate, active, buyQty, getQty, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [row.name, row.type, row.value, row.scope, row.scopeValue, row.startDate, row.endDate, row.active, row.buyQty, row.getQty, row.createdAt]
        );
      }
    } else if (storeName === 'product_variants') {
      if (row.id) {
        db.run(
          `INSERT OR REPLACE INTO product_variants (id, parentBarcode, name, type, price, stock, barcode)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [row.id, row.parentBarcode, row.name, row.type, row.price, row.stock, row.barcode]
        );
      } else {
        db.run(
          `INSERT INTO product_variants (parentBarcode, name, type, price, stock, barcode)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [row.parentBarcode, row.name, row.type, row.price, row.stock, row.barcode]
        );
      }
    }

    saveToDisk();

    if (INTEGER_PK_STORES.includes(storeName) && !data.id) {
      const lastId = db.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0];
      return lastId;
    }
    return data.id || data.key || data.barcode || data.name;
  } catch (err) {
    console.error(`SQLite put error for ${storeName}:`, err);
    throw err;
  }
}

function handleDelete(event, storeName, key) {
  try {
    if (storeName === 'products') {
      db.run(`DELETE FROM products WHERE barcode = ?`, [key]);
    } else if (storeName === 'categories') {
      db.run(`DELETE FROM categories WHERE name = ?`, [key]);
    } else if (storeName === 'settings') {
      db.run(`DELETE FROM settings WHERE key = ?`, [key]);
    } else {
      db.run(`DELETE FROM ${storeName} WHERE id = ?`, [Number(key)]);
    }
    saveToDisk();
  } catch (err) {
    console.error(`SQLite delete error for ${storeName}:`, err);
    throw err;
  }
}

function handleClear(event, storeName) {
  try {
    db.run(`DELETE FROM ${storeName}`);
    saveToDisk();
  } catch (err) {
    console.error(`SQLite clear error for ${storeName}:`, err);
    throw err;
  }
}

function handleMigrationStatus() {
  return migrationDone;
}

function handleSeedFromIndexedDB(event, allData) {
  try {
    db.run('BEGIN TRANSACTION');
    for (const [storeName, items] of Object.entries(allData)) {
      if (!items || !items.length) continue;
      for (const item of items) {
        handlePut(null, storeName, item);
      }
    }
    db.run('COMMIT');
    saveToDisk();
    migrationDone = true;
    console.log('SQLite: Migration from IndexedDB complete');
    return true;
  } catch (err) {
    console.error('SQLite: Migration error', err);
    try { db.run('ROLLBACK'); } catch {}
    return false;
  }
}

async function initSQLite() {
  const SQL = await initSqlJs();
  dbPath = path.join(app.getPath('userData'), 'shoppos_v13.db');

  try {
    if (fs.existsSync(dbPath)) {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
      console.log('SQLite: Opened existing database at', dbPath);
    } else {
      db = new SQL.Database();
      console.log('SQLite: Created new database');
    }
  } catch (err) {
    console.error('SQLite: Failed to open/create DB, creating fresh', err);
    db = new SQL.Database();
  }

  db.run(SCHEMA);
  try {
    db.run("ALTER TABLE users ADD COLUMN customPermissions TEXT DEFAULT '{}'");
    console.log('SQLite: Added customPermissions column to users table');
  } catch (e) {
    // Column already exists — fine
  }
  // Fix existing rows: NULL customPermissions → '{}', clear stuck mustChangePin
  db.run("UPDATE users SET customPermissions = '{}' WHERE customPermissions IS NULL");
  db.run('UPDATE users SET mustChangePin = 0 WHERE mustChangePin = 1');
  saveToDisk();

  migrationDone = !isDBEmpty();
  console.log(`SQLite: Init complete. migrationDone=${migrationDone}, dbFile=${fs.existsSync(dbPath) ? fs.statSync(dbPath).size + ' bytes' : 'N/A'}`);

  ipcMain.handle('db:getAll', handleGetAll);
  ipcMain.handle('db:get', handleGet);
  ipcMain.handle('db:put', handlePut);
  ipcMain.handle('db:delete', handleDelete);
  ipcMain.handle('db:clear', handleClear);
  ipcMain.handle('db:migrationStatus', handleMigrationStatus);
  ipcMain.handle('db:seedFromIndexedDB', handleSeedFromIndexedDB);

  console.log('SQLite: IPC handlers registered');
}

function isDBEmpty() {
  try {
    const result = db.exec("SELECT count(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    const tableCount = result[0]?.values[0][0] || 0;
    if (tableCount === 0) return true;

    const tables = ['products', 'sales', 'customers', 'users'];
    for (const table of tables) {
      const r = db.exec(`SELECT count(*) FROM ${table}`);
      const count = r[0]?.values[0][0] || 0;
      if (count > 0) return false;
    }
    return true;
  } catch {
    return true;
  }
}

module.exports = { initSQLite };
