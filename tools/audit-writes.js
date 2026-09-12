// === WRITE-SITE AUDIT =====================================================
// Scans every dbPut/dbDelete/dbClear/dbMultiOp call across js/ and flags:
//   A) references to an unknown/typo'd store name
//   B) dbPut into 'settings' that does NOT set the 'key' member
//      (settings store keyPath is 'key' — a record without it throws DataError
//       and the write silently fails)
//   C) dbPut into 'products' without 'barcode', or 'categories' without 'name'
//      (non-auto-increment keyPath stores must carry their key field)
// Run: node tools/audit-writes.js
// ============================================================================
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const KEY_FIELD = {
  products: 'barcode',
  sales: 'id',
  customers: 'id',
  settings: 'key',
  categories: 'name',
  zreports: 'id',
  suppliers: 'id',
  purchases: 'id',
  users: 'id',
  auditlog: 'id',
  promotions: 'id',
  product_variants: 'id',
  expenses: 'id'
};
const KNOWN = new Set(Object.keys(KEY_FIELD));

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

// Substring from openIdx (a '(' ) up to and including its matching ')',
// ignoring parens inside single/double-quoted strings (honouring backslash escapes).
function matchParens(s, openIdx) {
  let depth = 0, inStr = null, i = openIdx;
  for (; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (ch === '\\') { i++; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === "'" || ch === '"') { inStr = ch; continue; }
    if (ch === '(') depth++;
    else if (ch === ')') { depth--; if (depth === 0) return s.slice(openIdx, i + 1); }
  }
  return null;
}

function unquoteStr(q) { return q.slice(1, -1).replace(/\\(.)/g, '$1'); }

// First string-literal argument of a call (the store name).
function callStoreArg(call) {
  const m = call.match(/\(\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/);
  return m ? unquoteStr(m[1]) : null;
}

// The object literal passed as the 2nd arg (after the store string) for dbPut.
function callObjectArg(call) {
  const m = call.match(/\(\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")\s*,/);
  if (!m) return '';
  return call.substr(m[0].length);
}

function findCalls(src, fnName) {
  const res = [];
  let idx = 0;
  const marker = fnName + '(';
  while ((idx = src.indexOf(marker, idx)) >= 0) {
    const call = matchParens(src, idx + fnName.length);
    if (call) res.push(call);
    idx += marker.length;
  }
  return res;
}

let bad = 0;
for (const file of walk(path.join(ROOT, 'js'), [])) {
  const src = fs.readFileSync(file, 'utf8');
  const rel = file.slice((ROOT + path.sep).length).replace(/\\/g, '/');

  for (const call of findCalls(src, 'dbPut')) {
    const store = callStoreArg(call);
    if (!store) continue;
    if (!KNOWN.has(store)) { bad++; console.log(`[unknown-store] ${rel} :: dbPut('${store}',…)`); continue; }
    const keyF = KEY_FIELD[store];
    const obj = callObjectArg(call).trimStart();
    // Only inline object literals (`{…}`) can be checked statically; records passed
    // as variables carry their own key and produce false positives here.
    if (!obj.startsWith('{')) continue;
    if (keyF === 'key') {
      if (!/(?:'key'|key)\s*:/.test(obj)) {
        bad++; console.log(`[settings-no-key] ${rel} :: dbPut('settings',…) inline literal missing 'key' => ${obj.substring(0, 90)}`);
      }
    } else if (keyF === 'barcode' || keyF === 'name') {
      const re = new RegExp("(?:'" + keyF + "'|" + keyF + ")\\s*:");
      if (!re.test(obj)) {
        bad++; console.log(`[missing-keyField] ${rel} :: dbPut('${store}',…) inline literal missing '${keyF}'`);
      }
    }
  }

  for (const call of findCalls(src, 'dbDelete')) {
    const store = callStoreArg(call);
    if (store && !KNOWN.has(store)) { bad++; console.log(`[unknown-store] ${rel} :: dbDelete('${store}',…)`); }
  }
  for (const call of findCalls(src, 'dbClear')) {
    const store = callStoreArg(call);
    if (store && !KNOWN.has(store)) { bad++; console.log(`[unknown-store] ${rel} :: dbClear('${store}')`); }
  }
  for (const call of findCalls(src, 'dbMultiOp')) {
    const re = /(?:'store'|store)\s*:\s*'(?:[^'\\]|\\.)*'/g;
    let m;
    while ((m = re.exec(call))) {
      const st = unquoteStr(m[0].replace(/(?:'store'|store)\s*:\s*/, ''));
      if (!KNOWN.has(st)) { bad++; console.log(`[unknown-store] ${rel} :: dbMultiOp store '${st}'`); }
    }
  }
}
console.log(bad === 0
  ? '\nAUDIT OK — no unknown stores, no settings writes missing \'key\', no missing key fields.'
  : `\nAUDIT: ${bad} issue(s) found`);