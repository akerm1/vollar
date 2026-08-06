// ============================================================
// PRODUCT GRID: Quick product cards in checkout view
// ============================================================

function getProductImageMarkup(product) {
    if (product.imageData) {
        return `<img src="${product.imageData}" alt="${escapeHtml(product.name)}">`;
    }

    if (product.imagePath) {
        return `<img src="${product.imagePath}" alt="${escapeHtml(product.name)}">`;
    }

    const initial = (product.name || '?').trim().charAt(0).toUpperCase() || '?';
    const color = ['#6C63FF', '#FF6B6B', '#2ECC71', '#FFA502', '#3498DB', '#9B59B6'][Math.abs((product.barcode || '').length + (product.name || '').length) % 6];
    return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${color};color:white;font-size:34px;font-weight:800;">${escapeHtml(initial)}</div>`;
}

function renderProductGrid() {
    const container = document.getElementById('product-grid');
    if (!container) return;

    container.innerHTML = '';

    const showLoadingState = !window.productsCache || window.productsCache.length === 0;
    if (showLoadingState) {
        container.innerHTML = `
            <div class="product-grid-loading">
                <div class="product-grid-skeleton"></div>
                <div class="product-grid-skeleton"></div>
                <div class="product-grid-skeleton"></div>
                <div class="product-grid-skeleton"></div>
            </div>
        `;
        return;
    }

    const products = [...window.productsCache].sort((a, b) => a.name.localeCompare(b.name));
    const fragment = document.createDocumentFragment();

    products.forEach(product => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'product-grid-card';
        if (product.stock <= 0) {
            card.classList.add('disabled');
            card.disabled = true;
        }

        const stockClass = product.stock <= 0 ? 'out' : (product.stock <= (product.minimumStock || settings.lowStockThreshold) ? 'low' : '');
        const stockLabel = product.stock <= 0 ? t('outOfStock') : `${product.stock} ${product.unit === 'mètre' ? 'm' : 'dispo.'}`;

        card.innerHTML = `
            <div class="product-grid-card-image">
                ${getProductImageMarkup(product)}
                ${product.stock <= 0 ? `<div class="product-grid-card-overlay">${t('outOfStock')}</div>` : ''}
            </div>
            <div class="product-grid-card-body">
                <div class="product-grid-card-name">${escapeHtml(product.name)}</div>
                <div class="product-grid-card-price">${Number(product.price || 0).toFixed(2)} ${getCurrency()}</div>
                <div class="product-grid-card-stock ${stockClass}">${stockLabel}</div>
            </div>
        `;

        // ============================================================
        // FIXED: Meter products now trigger the quantity prompt
        // ============================================================
        card.addEventListener('click', async () => {
            if (product.stock <= 0) {
                showToast(t('productUnavailable'), 'warning');
                return;
            }
            // For meter products, call without quantity to trigger the prompt
            // For piece products, pass quantity 1 directly
            if (product.unit === 'mètre') {
                await addToCart(product);
            } else {
                await addToCart(product, 1);
            }
            if (window.currentView === 'checkout') {
                document.getElementById('scanner-receiver')?.focus();
            }
        });

        fragment.appendChild(card);
    });

    container.innerHTML = '';
    container.appendChild(fragment);
}

async function refreshProductGrid() {
    try {
        const products = await dbGetAll('products');
        window.productsCache = products || [];
        renderProductGrid();
    } catch (error) {
        console.error('Product grid refresh error:', error);
    }
}

async function initProductGrid() {
    const container = document.getElementById('product-grid');
    if (!container) return;

    renderProductGrid();
    await refreshProductGrid();
}

window.renderProductGrid = renderProductGrid;
window.refreshProductGrid = refreshProductGrid;
window.initProductGrid = initProductGrid;

console.log('🛍️ Product grid module loaded');