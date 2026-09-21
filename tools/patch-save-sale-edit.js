const fs = require('fs');
const path = require('path');
const vm = require('vm');

const filePath = path.join(__dirname, '..', 'js', 'analytics', 'analytics-ui.js');
let code = fs.readFileSync(filePath, 'utf8');

// --- marker uniqueness checks ---
function countOccurrences(str, sub) {
  let n = 0, i = 0;
  while ((i = str.indexOf(sub, i)) !== -1) { n++; i += sub.length; }
  return n;
}

const setMarker = "const _0x3ec6c4=new Set";
const ifCheckMarker = "if(_0x4c8d8f['length']===0x0)";
if (countOccurrences(code, setMarker) !== 1) { console.error('set marker count != 1:', countOccurrences(code, setMarker)); process.exit(1); }
if (countOccurrences(code, ifCheckMarker) !== 1) { console.error('if-check marker count != 1:', countOccurrences(code, ifCheckMarker)); process.exit(1); }

// --- snippet 1: variant qty maps (insert BEFORE the old/new qty Set) ---
const newMapCode =
  "var _oldVarQtyMap={},_newVarQtyMap={};" +
  "for(const _oi of _0x1ee2b5['items']||[]){if(_oi['variantKey']){const _vk=_oi['variantKey'];_oldVarQtyMap[_vk]=(_oldVarQtyMap[_vk]||0x0)+(_oi['qty']||0x0);}}" +
  "for(const _ni of _0x4c8d8f){if(_ni['variantKey']){const _vk2=_ni['variantKey'];_newVarQtyMap[_vk2]=(_newVarQtyMap[_vk2]||0x0)+(_ni['qty']||0x0);}}";

// --- snippet 2: variant stock reconciliation + opened-pack reversal (insert BEFORE the empty-valid-items check) ---
const reversalCode =
  // variant reconciliation: mirror the product loop over variant stock
  "const _allVarKeys=new Set([...Object['keys'](_oldVarQtyMap),...Object['keys'](_newVarQtyMap)]);" +
  "for(const _vk3 of _allVarKeys){if(!_vk3)continue;" +
  "const _oq=_oldVarQtyMap[_vk3]||0x0,_nq=_newVarQtyMap[_vk3]||0x0,_vdelta=_oq-_nq;" +
  "if(Math['abs'](_vdelta)<0.0001)continue;" +
  "try{const _vAll=await dbGetAll('product_variants');" +
  "const _vr=Array['isArray'](_vAll)?_vAll['find'](function(v){return v['id']==_vk3||String(v['id'])===String(_vk3)||v['barcode']===_vk3;}):null;" +
  "if(_vr){const _vs=_vr['stock']||0x0;_vr['stock']=Math['max'](0x0,_vs+_vdelta);" +
  "await dbPut('product_variants',_vr);" +
  "if(_vdelta>0x0)_0x34a75d+=_vdelta;else _0x319c4a+=Math['abs'](_vdelta);}" +
  "}catch(_ve){console['error']('Variant stock adjustment error for '+_vk3+':',_ve);}}" +
  // opened-pack reversal (only when total qty decreased)
  "var _oldOpened=_0x1ee2b5['openedPacks']||[];" +
  "if(_oldOpened['length']>0x0){" +
  "var _oldTotalQty=0x0,_newTotalQty=0x0;" +
  "for(const _oi2 of _0x1ee2b5['items']||[]){_oldTotalQty+=(_oi2['qty']||0x0);}" +
  "for(const _ni2 of _0x4c8d8f){_newTotalQty+=(_ni2['qty']||0x0);}" +
  "if(_newTotalQty<_oldTotalQty){" +
  "var _qtyDelta=_oldTotalQty-_newTotalQty;" +
  "for(const _op of _oldOpened){" +
  "try{" +
  "if(_op['packBarcode']){var _unitProd=await dbGet('products',_op['packBarcode']);" +
  "if(_unitProd){" +
  "var _unitsPer=_op['units']&&_op['packs']?(_op['units']/_op['packs']):0x0;" +
  "if(_unitsPer>0x0){" +
  "var _packsToRevert=Math['ceil'](_qtyDelta/_unitsPer);" +
  "_packsToRevert=Math['min'](_packsToRevert,_op['packs']||0x0);" +
  "if(_packsToRevert>0x0){" +
  // unit product (source of transfer): give whole packs back -> stock += packs
  "_unitProd['stock']=(_unitProd['stock']||0x0)+_packsToRevert;" +
  "await dbPut('products',_unitProd);" +
  "if(_op['unitBarcode']){var _packProd=await dbGet('products',_op['unitBarcode']);" +
  "if(_packProd){" +
  // pack product (target of transfer): take the transferred pieces back out
  "_packProd['stock']=Math['max'](0x0,(_packProd['stock']||0x0)-(_packsToRevert*_unitsPer));" +
  "await dbPut('products',_packProd);" +
  "}" +
  "}" +
  "}" +
  "}" +
  "}" +
  "}" +
  "}catch(_ope){console['error']('Pack reversal error:',_ope);}" +
  "}" +
  "}" +
  "}";

// --- brace-balance self check on snippets ---
function braceNet(s) {
  let net = 0;
  for (const ch of s) { if (ch === '{') net++; else if (ch === '}') net--; }
  return net;
}
console.log('newMapCode brace net:', braceNet(newMapCode));
console.log('reversalCode brace net:', braceNet(reversalCode));
if (braceNet(newMapCode) !== 0 || braceNet(reversalCode) !== 0) { console.error('snippet brace imbalance'); process.exit(1); }

// --- insert ---
const setIdx = code.indexOf(setMarker);
code = code.substring(0, setIdx) + newMapCode + code.substring(setIdx);

const ifCheckIdx = code.indexOf(ifCheckMarker);
code = code.substring(0, ifCheckIdx) + reversalCode + code.substring(ifCheckIdx);

// --- compile check (same as tools/verify.js step 1) ---
try {
  new vm.Script(code, { filename: 'analytics-ui.js' });
  console.log('Syntax OK');
} catch (e) {
  console.error('Syntax error:', e.message);
  const m = e.stack.match(/analytics-ui\.js:(\d+):(\d+)/);
  if (m) {
    const line = parseInt(m[1]);
    const lines = code.split('\n');
    console.log('Around error:', lines[line - 1] && lines[line - 1].substring(Math.max(0, parseInt(m[2]) - 90), parseInt(m[2]) + 40));
  }
  process.exit(1);
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('File written. Length:', code.length);