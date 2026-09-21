const fs = require('fs');
const path = require('path');
const vm = require('vm');

const filePath = path.join(__dirname, '..', 'js', 'suppliers', 'suppliers.js');
let code = fs.readFileSync(filePath, 'utf8');

const sig = 'deletePurchase(_0x42762c){';
const start = code.indexOf(sig);
if (start === -1) { console.error('deletePurchase signature not found'); process.exit(1); }

let d = 0, end = -1;
for (let j = start; j < code.length; j++) {
  if (code[j] === '{') d++;
  else if (code[j] === '}') { d--; if (d === 0) { end = j; break; } }
}
if (end === -1) { console.error('function end not found'); process.exit(1); }

const oldFn = code.substring(start, end + 1);

const newFn = (
  'deletePurchase(_0x42762c){' +
  "if(!await showConfirm(t('receiptDeleteConfirm')))return;" +
  'try{' +
  "const _0x44bf1a=await dbGet('purchases',_0x42762c);" +
  "if(!_0x44bf1a){showToast(t('purchaseNotFound')||'R\xc3\xa9ception introuvable','error');return;}" +
  'var _delOps=[];' +
  "_delOps.push({store:'purchases',op:'delete',key:_0x42762c});" +
  "if(Array['isArray'](_0x44bf1a['items'])){" +
  "for(const _0x4d9e6c of _0x44bf1a['items']){" +
  "if(!_0x4d9e6c['barcode'])continue;" +
  "const _0pr=await dbGet('products',_0x4d9e6c['barcode']);" +
  'if(!_0pr)continue;' +
  "_0pr['stock']=Math['max'](0x0,(parseFloat(_0pr['stock'])||0x0)-(parseFloat(_0x4d9e6c['qty'])||0x0));" +
  "_delOps.push({store:'products',op:'put',value:_0pr});" +
  '}}' +
  "if(_delOps['length']>0x0)await dbMultiOp(_delOps);" +
  '_supplierBillStats=null;' +
  "showToast(t('receptionDeleted'),'success');" +
  "}catch(_0x2d5d6f){console['error']('Delete\\x20purchase\\x20error:',_0x2d5d6f),showToast(t('deleteFailed'),'error');}" +
  '}'
);

function braceNet(s) {
  let n = 0;
  for (const ch of s) { if (ch === '{') n++; else if (ch === '}') n--; }
  return n;
}
console.log('old function brace net:', braceNet(oldFn));
console.log('new function brace net:', braceNet(newFn));
if (braceNet(newFn) !== 0) { console.error('new body brace imbalance'); process.exit(1); }

code = code.substring(0, start) + newFn + code.substring(end + 1);

try {
  new vm.Script(code, { filename: 'suppliers.js' });
  console.log('Syntax OK');
} catch (e) {
  console.error('Syntax error:', e.message);
  process.exit(1);
}

fs.writeFileSync(filePath, code, 'utf8');
console.log('deletePurchase patched. Length:', code.length);