
// ============================================================
// LOAD CATEGORIES LIST - NOW FROM DEDICATED STORE
// ============================================================
async function loadCategoriesList() {
    try {
        // Load from dedicated categories store + product categories
        const storedCategories = await dbGetAll('categories');
        const products = await dbGetAll('products');
        
        // Build a map of all categories with counts
        const categoriesMap = new Map();
        
        // Add stored categories first
        storedCategories.forEach(cat => {
            categoriesMap.set(cat.name, { count: 0, stored: true });
        });
        
        // Count products per category
        products.forEach(p => {
            const cat = p.category || 'Non catégorisé';
            if (categoriesMap.has(cat)) {
                categoriesMap.get(cat).count++;
            } else {
                categoriesMap.set(cat, { count: 1, stored: false });
            }
        });
        
        const sortedCategories = Array.from(categoriesMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        
        const container = document.getElementById('categories-list');
        if (!container) return;
        
        if (sortedCategories.length === 0) {
            container.innerHTML = `<span style="color: #999; font-size: 13px;">${t('noCategoryCreated')}</span>`;
            return;
        }
        
        let html = '';
        sortedCategories.forEach(([category, data]) => {
            const color = getCategoryColor(category);
            html += `
                <div class="category-chip" style="
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    background: ${color}15;
                    border: 1px solid ${color}40;
                    border-radius: 20px;
                    padding: 4px 12px 4px 14px;
                    font-size: 13px;
                    transition: var(--transition);
                ">
                    <span style="
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        background: ${color};
                        display: inline-block;
                    "></span>
                    <span style="font-weight: 600; color: #333;">${escapeHtml(category)}</span>
                    <span style="font-size: 11px; color: #999; background: #f0f0f0; padding: 0 6px; border-radius: 10px;">${data.count}</span>
                    ${category !== 'Non catégorisé' ? `
                        <button class="btn-delete-category" data-category="${escapeHtml(category)}" style="
                            background: none;
                            border: none;
                            color: #999;
                            cursor: pointer;
                            font-size: 14px;
                            padding: 0 4px;
                            transition: var(--transition);
                            line-height: 1;
                        " title="${t('supplierDeleteTitle')}">✕</button>
                    ` : ''}
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        container.querySelectorAll('.btn-delete-category').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const category = this.dataset.category;
                deleteCategory(category);
            });
        });
        
        updateCategoryDropdowns(sortedCategories.map(([cat]) => cat));
        
    } catch (error) {
        console.error('Load categories list error:', error);
    }
}

// ============================================================
// UPDATE CATEGORY DROPDOWNS
// ============================================================
function updateCategoryDropdowns(categories) {
    const formCategory = DOM.formCategory;
    const editCategory = document.getElementById('edit-category');
    
    const updateDropdown = (select, categoriesArray) => {
        if (!select) return;
        const currentValue = select.value;
        
        select.innerHTML = '<option value="">' + t('selectCategory') + '</option>';
        
        categoriesArray.forEach(cat => {
            if (cat && cat !== 'Non catégorisé') {
                const option = document.createElement('option');
                option.value = cat;
                option.textContent = cat;
                select.appendChild(option);
            }
        });
        
        if (categoriesArray.includes('Non catégorisé')) {
            const option = document.createElement('option');
            option.value = 'Non catégorisé';
            option.textContent = 'Non catégorisé';
            select.appendChild(option);
        }
        
        const newOption = document.createElement('option');
        newOption.value = '__new__';
        newOption.textContent = t('newCategoryPlaceholder');
        select.appendChild(newOption);
        
        if (currentValue && categoriesArray.includes(currentValue)) {
            select.value = currentValue;
        }
    };
    
    updateDropdown(formCategory, categories);
    updateDropdown(editCategory, categories);
}

// ============================================================
// ADD NEW CATEGORY - NOW ACTUALLY SAVES TO DATABASE
// ============================================================
async function addNewCategory(categoryName) {
    if (!categoryName || !categoryName.trim()) {
        showToast(t('categoryPrompt'), 'warning');
        return;
    }
    
    categoryName = categoryName.trim();
    
    // Check if category already exists in store
    const existing = await dbGet('categories', categoryName);
    if (existing) {
        showToast(t('categoryExists', { name: categoryName }), 'warning');
        return;
    }
    
    // Also check in products (legacy check)
    const products = await dbGetAll('products');
    const existingCategories = new Set();
    products.forEach(p => {
        if (p.category) existingCategories.add(p.category);
    });
    
    if (existingCategories.has(categoryName)) {
        showToast(t('categoryExistsWithProducts', { name: categoryName }), 'warning');
        return;
    }
    
    // ACTUALLY SAVE THE CATEGORY
    try {
        await dbPut('categories', { name: categoryName, createdAt: new Date().toISOString() });
        showToast(t('categoryCreated', { name: categoryName }), 'success');
        await loadCategoriesList();
        await updateCategoryFilter();
    } catch (error) {
        console.error('Save category error:', error);
        showToast(t('categoryError'), 'error');
    }
}

// ============================================================
// DELETE CATEGORY
// ============================================================
async function deleteCategory(categoryName) {
    if (!categoryName || categoryName === 'Non catégorisé') {
        showToast(t('categoryDeleteError'), 'warning');
        return;
    }
    
    const products = await dbGetAll('products');
    const count = products.filter(p => p.category === categoryName).length;
    
    if (count === 0) {
        // No products use this category, safe to delete from store
        try {
            await dbDelete('categories', categoryName);
            showToast(t('categoryDeleted', { name: categoryName }), 'success');
            await loadCategoriesList();
            return;
        } catch (error) {
            console.error('Delete category error:', error);
        }
    }
    
    if (!confirm(t('categoryDeleteConfirm', { name: categoryName, count: count, uncategorized: t('uncategorized') }))) {
        return;
    }
    
    try {
        // Delete from categories store
        await dbDelete('categories', categoryName);
        
        let updated = 0;
        for (const product of products) {
            if (product.category === categoryName) {
                product.category = 'Non catégorisé';
                await dbPut('products', product);
                updated++;
            }
        }
        
        showToast(t('categoryDeletedMoved', { count: updated, uncategorized: t('uncategorized') }), 'success');
        await loadCategoriesList();
        await loadInventory();
        await updateCategoryFilter();
        await (window.createAutoBackup || (() => Promise.resolve()))();
    } catch (error) {
        console.error('Delete category error:', error);
        showToast(t('deleteFailed'), 'error');
    }
}

// ============================================================
// UPDATE CATEGORY FILTER
// ============================================================
function updateCategoryFilter() {
    loadCategoriesList();
}

// ============================================================
// SETUP CATEGORY MANAGEMENT
// ============================================================
function setupCategoryManagement() {
    const addBtn = document.getElementById('btn-add-category');
    const input = document.getElementById('new-category-input');
    
    if (addBtn) {
        addBtn.addEventListener('click', async function() {
            if (!input) return;
            const categoryName = input.value.trim();
            if (categoryName) {
                await addNewCategory(categoryName);
                input.value = '';
                input.focus();
            } else {
                showToast(t('categoryPrompt'), 'warning');
                input.focus();
            }
        });
    }
    
    if (input) {
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                addBtn?.click();
            }
        });
    }
}
