
// ============================================================
// EXPOSE FUNCTIONS
// ============================================================
window.loadInventory = loadInventory;
window.renderInventoryTable = renderInventoryTable;
window.loadCategoriesList = loadCategoriesList;
window.addNewCategory = addNewCategory;
window.deleteCategory = deleteCategory;
window.deleteProduct = deleteProduct;
window.bulkDeleteProducts = bulkDeleteProducts;
window.openEditModal = openEditModal;
window.setupProductForm = setupProductForm;
window.setupEditForm = setupEditForm;
window.setupBulkDeleteProducts = setupBulkDeleteProducts;
window.setupCategoryManagement = setupCategoryManagement;

// ============================================================
// SENSITIVE PRICE TOGGLE (blur/reveal buying price, profit, margin)
// ============================================================
(function injectSensitivePriceStyles() {
    const style = document.createElement('style');
    style.id = 'sensitive-price-style';
    style.textContent = `
        .sensitive-price {
            filter: blur(5px);
            user-select: none;
            transition: filter 0.25s ease;
        }
        .sensitive-price.revealed {
            filter: none;
            user-select: auto;
        }
    `;
    document.head.appendChild(style);
})();

let _sensitivePricesRevealed = false;

function toggleSensitivePrices() {
    _sensitivePricesRevealed = !_sensitivePricesRevealed;
    document.querySelectorAll('.sensitive-price').forEach(td => {
        td.classList.toggle('revealed', _sensitivePricesRevealed);
    });
    const btn = document.getElementById('btn-toggle-prices');
    if (btn) {
        btn.textContent = _sensitivePricesRevealed ? '👁️' : '🔒';
        btn.title = _sensitivePricesRevealed ? 'Masquer les prix sensibles' : 'Afficher les prix sensibles';
    }
}

window.toggleSensitivePrices = toggleSensitivePrices;

console.log('📦 Inventory module loaded with purchase price and profit tracking');
