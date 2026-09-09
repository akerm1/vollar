// === SEED GENERATOR: suppliers + products ===================================
// Generates a JSON file (seed_samtex_<date>.json) containing 42+ Algerian
// textile/fabric suppliers and 300+ linked articles (products). The output is
// formatted as a valid POS full-backup subset so it can be imported directly
// via the app's Settings -> Import JSON (doSafeImport / restore-safety).
//
// Output object only includes the stores present here; the import replaces
// whatever those stores already contain (restore-safety clears + rewrites).
//
// Usage:
//   node tools/seed-suppliers-products.js
//   -> writes seed_samtex_<date>.json in the repo root
// ============================================================================

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Suppliers: 42 Algerian textile/fabric wholesalers.
// id is explicit (1..42); the app's suppliers store is keyPath id (autoInc).
// ---------------------------------------------------------------------------
const SUPPLIER_NAMES = [
  'Tissus Atlas Blida', 'Soieries Modernes Alger', 'Textile Sahel Oran',
  'Grand Textile Constantine', 'Tissus Tlemcen Tissu', 'Dépôt Tissus Annaba',
  'Fournitures Sétif', 'Textile Béjaïa', 'Tissus Batna', 'Soie & Coton Alger',
  'Textile Sahara Ouargla', 'Tissus Kabylie Tizi-Ouzou', 'Import Cloth Tlemcen',
  'Laine & Tissus Chlef', 'Textile Est Constantine', 'Tissus Centre Alger',
  'Velours & Dentelle Oran', 'Mercerie Universelle Alger', 'Fournitures Couture Sétif',
  'Tissus Prestige Algérois', 'Textile Jijel', 'Broderie & Tulle Mostaganem',
  'Tissus Ghardaïa', 'Saten Import Alger', 'Gaze & Voile Alger',
  'Tissus Souk Ahras', 'Mercerie Moderne Béchar', 'Tissus Biskra',
  'Caftan House Alger', 'Tissus El Oued', 'Voilages & Rideaux Alger',
  'Tissus Skikda', 'Textile Oum El Bouaghi', 'Soierie Constantine',
  'Tissus Bouira', 'Mercerie des frères Alger', 'Tissus Médéa',
  'Import Tissu Chine Alger', 'Tissus Aïn Defla', 'Textile Tébessa',
  'Tissus Guelma', 'Mercerie Centrale Alger'
];

// Wilayas / Algerian addresses for variety.
const WILAYAS = [
  'Alger', 'Oran', 'Constantine', 'Blida', 'Sétif', 'Annaba', 'Tlemcen',
  'Batna', 'Béjaïa', 'Tizi-Ouzou', 'Chlef', 'Ouargla', 'Souk Ahras',
  'Biskra', 'El Oued', 'Ghardaïa', 'Skikda', 'Mostaganem', 'Bouira', 'Médéa'
];

function makeSuppliers() {
  return SUPPLIER_NAMES.map((name, i) => {
    const id = i + 1;
    const digits = String(2000000000 + id * 111).slice(0, 10);
    return {
      id: id,
      name: name,
      phone: '0' + (5 + (id % 3)) + ' ' + String(10000000 + id * 777777).slice(0, 8),
      address: 'Zone industrielle, ' + WILAYAS[i % WILAYAS.length],
      email: 'contact' + id + '@' + name.toLowerCase().replace(/[^a-z0-9]+/g, '') + '.dz',
      nif: digits,
      createdAt: new Date(Date.now() - (i * 86400000)).toISOString()
    };
  });
}

// ---------------------------------------------------------------------------
// Products: 300+ articles spread across textile categories.
// Each links to a supplier via supplierId (supplier index = (k) % 42).
// ---------------------------------------------------------------------------
const CATEGORIES = [
  { name: 'Tissus', unit: 'mètre' },
  { name: 'Mercerie', unit: 'pièce' },
  { name: 'Accessoires', unit: 'pièce' },
  { name: 'Couture', unit: 'mètre' },
  { name: 'Linge de maison', unit: 'pièce' },
  { name: 'Enfant', unit: 'pièce' },
  { name: 'Broderie', unit: 'pièce' },
  { name: 'Robes & Prêt-à-porter', unit: 'pièce' }
];

const PRODUCT_POOL = [
  { cat: 'Tissus', names: ['Tissu satin uni', 'Tissu crêpe', 'Tissu georgette', 'Tissu coton popeline', 'Tissu soie pure', 'Tissu velours', 'Tissu dentelle', 'Tissu mousseline', 'Tissu organza', 'Tissu toilé', 'Tissu jean', 'Tissu lin', 'Tissu gabardine', 'Tissu polyester', 'Tissu viscose', 'Tissu sherpa', 'Tissu tulle', 'Tissu brocart', 'Tissu doublure', 'Tissu éponge'], base: 450 },
  { cat: 'Mercerie', names: ['Bobine fil à coudre', 'Aiguilles à coudre', 'Paquet aiguilles machine', 'Ruban mètre ruban', 'Épingles de couture', 'Ciseaux de couture', 'Dé à coudre', 'Fil à broder', 'Élastique en rouleau', 'Boutons assortis', 'Zips métalliques', 'Craie tailleur', 'Enfile-aiguille', 'Bobine fil overlock', 'Velcro autocollant', 'Tirette zip', 'Patron de couture', 'Marqueur textile', 'Règle de couture', 'Aiguilles à tricoter'], base: 90 },
  { cat: 'Accessoires', names: ['Perles de rocaille', 'Strass thermocollants', 'Biais en coton', 'Galon de finition', 'Passementerie', 'Rubans satin', 'Fermeture invisible', 'Soutache', 'Bande de boutonnière', 'Ruban dentelle', 'Paillettes', 'Perles en bois', 'Chaîne dorée', 'Antenne de sac', 'Carré de mousseline', 'Turban prêt à porter', 'Ruban velours', 'Médaillon décoratif', 'Franges', 'Bride de sac'], base: 140 },
  { cat: 'Couture', names: ['Mètre de soie', 'Mètre de coton', 'Mètre de lin', 'Mètre de polyester', 'Mètre de crêpe', 'Mètre de satin', 'Mètre de tulle', 'Mètre de velours', 'Mètre de georgette', 'Mètre de popeline', 'Mètre de gabardine', 'Mètre de mousseline', 'Mètre de viscose', 'Mètre de brocart', 'Mètre de dentelle', 'Mètre de organza', 'Mètre de sherpa', 'Mètre de doublure', 'Mètre de toilé', 'Mètre de jean'], base: 520 },
  { cat: 'Linge de maison', names: ['Plaid tissé', 'Serviette de bain', 'Nappe en coton', 'Housse d’oreiller', 'Drap-housse', 'Taie d’oreiller', 'Rideau prêt à poser', 'Tapis de bain', 'Plastifieuse housse', 'Housse de couette', 'Sac de rangement', 'Couverture polaire', 'Manchette de cuisine', 'Linge vaisselle', 'Tapis de couloir', 'Coussin décoratif', 'Jeté de lit', 'Parure de lit', 'Essuie-mains', 'Confection serviette'], base: 380 },
  { cat: 'Enfant', names: ['Popeline enfant', 'Tissu coton enfant', 'Vichy enfant', 'Motif mignon', 'Mousseline bébé', 'Éponge bébé', 'Satin enfant', 'Tulle enfant', 'Velours enfant', 'Imprimé ours', 'Coton minky', 'Soupline enfant', 'Gaze bébé', 'Flanelle enfant', 'Tissu broderie anglaise', 'Jacquard enfant', 'Coton biologique', 'Molleton enfant', 'Voilage enfant', 'Crêpe de Chine enfant'], base: 310 },
  { cat: 'Broderie', names: ['Broderie anglaise', 'Ruban brodé', 'Tulle brodé', 'Bordure brodée', 'Apprêt broderie', 'Mètre broderie main', 'Dentelle brodée', 'Filet brodé', 'Organza brodé', 'Satin brodé', 'Voile brodé', 'Ajouré', 'Passepoil brodé', 'Galon brodé', 'Feston brodé', 'Mousseline brodée', 'Coton brodé', 'Sequins brodés', 'Braies brodées', 'Étamine brodée'], base: 230 },
  { cat: 'Robes & Prêt-à-porter', names: ['Robe caftan', 'Robe karakou', 'Robe soirée', 'Robe de cérémonie', 'Blouse tunisienne', 'Costume traditionnel', 'Robe de mariage', 'Caftan de fête', 'Robe de ville', 'Ensemble gandoura', 'Robe brodée', 'Cape féminine', 'Robe enfant fête', 'Robe de printemps', 'Caftan moderne', 'Robe d’été', 'Ensemble karakou', 'Robe de bal', 'Gandoura de nuit', 'Robe chaby'], base: 1800 }
];

function makeProducts(supplierCount) {
  const products = [];
  let barcode = 200000001;
  // Pre-fill per category so names are spread smoothly.
  const perCat = {};
  for (const c of CATEGORIES) perCat[c.name] = 0;

  const totalTarget = 320;
  const catAlloc = {};
  const basePerCat = Math.floor(totalTarget / CATEGORIES.length);
  for (const c of CATEGORIES) catAlloc[c.name] = basePerCat;
  // add remainder to first categories
  for (let r = 0; r < totalTarget % CATEGORIES.length; r++) {
    catAlloc[CATEGORIES[r].name]++;
  }

  for (const c of CATEGORIES) {
    const pool = PRODUCT_POOL.find(p => p.cat === c.name);
    const target = catAlloc[c.name];
    for (let k = 0; k < target; k++) {
      const baseName = pool.names[k % pool.names.length];
      const variation = Math.floor(k / pool.names.length) + 1;
      const name = variation === 1 ? baseName : baseName + ' ' + ['uni', 'fleur', 'rayé', 'imprimé', 'pastel'][(k + variation) % 5];
      const barcodeStr = String(barcode++);
      const price = Math.round(pool.base * (0.7 + ((k * 7) % 20) / 100) * 10) / 10;
      const purchasePrice = Math.round(price * (0.62 + ((k % 13) / 100)) * 10) / 10;
      const supplierId = (barcode - 200000001) % supplierCount + 1;
      const stock = Math.round(8 + ((k * 13) % 180) * 10) / 10;
      products.push({
        barcode: barcodeStr,
        barcodes: [barcodeStr],
        reference: 'SAM-' + c.name.slice(0, 3).toUpperCase() + '-' + String(1000 + k),
        name: name,
        category: c.name,
        unit: c.unit,
        price: price,
        purchasePrice: purchasePrice,
        stock: stock,
        supplierId: supplierId,
        minimumStock: 5,
        batchNumber: '',
        expiryDate: '',
        imageData: '',
        imagePath: ''
      });
      perCat[c.name]++;
    }
  }
  return products;
}

// ---------------------------------------------------------------------------
// Factures / receptions (purchases store).
// Each is a type:'reception' record linking a supplier to a product reception:
//   { id(implicit), supplierId, supplierName, date, invoiceRef, items[{barcode,name,qty,purchasePrice}], totalCost, createdAt }
// We generate 1-3 factures per supplier over the last ~8 months, each pulling
// a few products that belong to that supplier (the same barcodes exist in the
// products store so the hub can resolve them).
// ---------------------------------------------------------------------------
function makeFactures(suppliers, products) {
  const bySupplier = {};
  for (const p of products) {
    if (!bySupplier[p.supplierId]) bySupplier[p.supplierId] = [];
    bySupplier[p.supplierId].push(p);
  }

  const facts = [];
  let factId = 1;
  const today = new Date();

  suppliers.forEach((sup, sIdx) => {
    const supProducts = bySupplier[sup.id] || [];
    if (!supProducts.length) return;

    const nBills = 3 + (sIdx % 3); // 3..5 factures par fournisseur
    for (let b = 0; b < nBills; b++) {
      // date: il y a (b*50 + sIdx%40 + 10) jours
      const d = new Date(today);
      d.setDate(d.getDate() - (b * 52 + (sIdx % 45) + 8));
      const dateStr = d.getFullYear() + '-' +
        String(d.getMonth() + 1).padStart(2, '0') + '-' +
        String(d.getDate()).padStart(2, '0');

      // pick 2..6 distinct products from this supplier
      const count = 2 + ((sIdx * 3 + b) % 5);
      const picked = [];
      const used = new Set();
      let guard = 0;
      while (picked.length < count && guard < supProducts.length * 2) {
        guard++;
        const pr = supProducts[(sIdx + b + picked.length * 7 + guard) % supProducts.length];
        if (used.has(pr.barcode)) continue;
        used.add(pr.barcode);
        picked.push(pr);
      }

      const items = picked.map(pr => {
        const qty = Math.round((3 + ((b + sIdx + pr.price) % 40)) * 10) / 10;
        return {
          barcode: pr.barcode,
          name: pr.name,
          qty: qty,
          purchasePrice: pr.purchasePrice
        };
      });
      const totalCost = Math.round(items.reduce((sum, it) => sum + it.qty * it.purchasePrice, 0) * 100) / 100;

      facts.push({
        id: factId++,
        supplierId: sup.id,
        supplierName: sup.name,
        date: dateStr,
        invoiceRef: 'F-' + String(2026 - b) + '-' + String(1000 + sIdx * 7 + b),
        items: items,
        totalCost: totalCost,
        type: 'reception',
        createdAt: new Date(d).toISOString()
      });
    }
  });

  return facts;
}

function build() {
  const suppliers = makeSuppliers();
  const products = makeProducts(suppliers.length);
  const purchases = makeFactures(suppliers, products);

  const payload = {
    version: '2.0.13',
    timestamp: new Date().toISOString(),
    products: products,
    sales: [],
    customers: [],
    settings: [],
    zreports: [],
    suppliers: suppliers,
    purchases: purchases,
    promotions: [],
    expenses: []
  };

  const fname = 'seed_samtex_' + new Date().toISOString().slice(0, 10) + '.json';
  const out = path.join(process.cwd(), fname);
  fs.writeFileSync(out, JSON.stringify(payload, null, 2), 'utf8');

  // sanity checks
  const barcodes = new Set(products.map(p => p.barcode));
  if (barcodes.size !== products.length) {
    console.error('ERROR: duplicate barcode detected');
    process.exit(1);
  }
  const badLink = products.filter(p => !p.supplierId || p.supplierId < 1 || p.supplierId > suppliers.length);
  if (badLink.length) {
    console.error('ERROR: ' + badLink.length + ' products with invalid supplierId');
    process.exit(1);
  }
  const catCount = {};
  for (const p of products) catCount[p.category] = (catCount[p.category] || 0) + 1;

  const badFact = purchases.filter(ft =>
    !ft.supplierId || !ft.items || !ft.items.length || typeof ft.totalCost !== 'number');
  if (badFact.length) {
    console.error('ERROR: ' + badFact.length + ' factures invalides');
    process.exit(1);
  }
  const factWithSupp = purchases.filter(ft => ft.supplierId >= 1 && ft.supplierId <= suppliers.length).length;
  const suppliersWithFact = new Set(purchases.map(ft => ft.supplierId)).size;

  console.log('✅ Suppliers : ' + suppliers.length);
  console.log('✅ Products  : ' + products.length);
  console.log('✅ Unique barcodes : ' + barcodes.size);
  console.log('✅ Factures (réceptions) : ' + purchases.length);
  console.log('   - couvrant ' + suppliersWithFact + ' fournisseurs');
  console.log('   - montant total : ' + Math.round(purchases.reduce((s, f) => s + f.totalCost, 0)) + ' DA');
  console.log('✅ Categories :');
  for (const c of CATEGORIES) console.log('   - ' + c.name + ' : ' + (catCount[c.name] || 0));
  console.log('📁 Output : ' + out);
}

build();
