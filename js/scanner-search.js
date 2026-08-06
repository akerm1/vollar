
// ============================================================
// PRODUCT CACHE
// ============================================================
async function getCachedProducts() {
    const now = Date.now();
    if (cachedProducts.length > 0 && (now - productsCacheTimestamp) < CACHE_TTL) {
        return cachedProducts;
    }
    try {
        cachedProducts = await dbGetAll('products');
        productsCacheTimestamp = now;
        searchResultsCache.clear();
        return cachedProducts;
    } catch (err) {
        console.error('getCachedProducts error:', err);
        return [];
    }
}

async function refreshProductsCache() {
    try {
        cachedProducts = await dbGetAll('products');
        productsCacheTimestamp = Date.now();
        searchResultsCache.clear();
        console.log('Cache refreshed:', cachedProducts.length, 'products');
    } catch (err) {
        console.error('refreshProductsCache error:', err);
    }
}

// ============================================================
// SEARCH ENGINE
// ============================================================
async function fastSearch(query) {
    if (!query) return [];
    const q = query.toLowerCase().trim();
    if (!q) return [];

    if (searchResultsCache.has(q)) return searchResultsCache.get(q);

    const all = await getCachedProducts();
    const scored = [];

    for (const p of all) {
        const name = p.name.toLowerCase();
        const ref  = (p.reference || '').toLowerCase();
        const bc   = p.barcode.toLowerCase();
        let score  = 0;

        if      (name === q)              score = 100;
        else if (name.startsWith(q))      score = 90;
        else if (name.includes(' ' + q))  score = 80;
        else if (name.includes(q))        score = 70;
        else if (ref.includes(q))         score = 60;
        else if (bc.includes(q))          score = 50;
        else {
            // multi-word: every word must appear
            const words = q.split(/\s+/).filter(w => w.length > 1);
            if (words.length > 1) {
                const hits = words.filter(w => name.includes(w)).length;
                if (hits === words.length) score = 65;
                else if (hits > 0)         score = 30 + (hits / words.length) * 20;
            }
        }

        if (score > 0) scored.push({ product: p, score });
    }

    scored.sort((a, b) => b.score - a.score);
    const results = scored.slice(0, 20).map(r => r.product);

    if (searchResultsCache.size > 100) {
        const keys = Array.from(searchResultsCache.keys()).slice(0, 50);
        keys.forEach(k => searchResultsCache.delete(k));
    }
    searchResultsCache.set(q, results);
    return results;
}
