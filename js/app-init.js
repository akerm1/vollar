
// ============================================================
// APPLICATION INITIALIZATION
// ============================================================
async function initApp() {
    console.log('🚀 Initializing ShopPOS Pro...');
    
    // Start clock immediately
    startClock();
    
    try {
        // ============================================
        // STEP 0: Show checkout view immediately to avoid white screen
        // ============================================
        if (typeof switchView === 'function') {
            switchView('checkout');
        }

        // ============================================
        // STEP 1: Apply saved theme immediately
        // ============================================
        applyThemeFromSettings();
        if (typeof applyStructureFromSettings === 'function') applyStructureFromSettings();
        if (typeof applyLanguage === 'function') applyLanguage();

        // ============================================
        // STEP 2: Setup all event listeners
        // ============================================
        console.log('📌 Setting up event listeners...');
        
        // Core systems - IMPORTANT: Setup scanner FIRST
        setupScannerListeners();
        setupFocusManagement();
        setupNavTabs();

        // ============================================
        // STEP 3: Open database
        // ============================================
        if (!useSQLite()) {
            console.log('📦 Opening IndexedDB...');
            db = await openDB();
            console.log('✅ Base de données connectée:', DB_NAME);
        } else {
            console.log('✅ Using SQLite database');
        }
        
        // Payment systems
        setupAmountPaid();
        setupMainButtons();
        setupPaymentMethodSelector();
        
        // Print system
        setupPrintButton();
        
        // Inventory systems
        setupProductForm();
        setupEditForm();
        setupBulkDeleteProducts();
        setupCategoryManagement();
        if (typeof setupVariantForm === 'function') setupVariantForm();
        
        // Customer systems
        setupCustomerForm();
        setupCustomerSearch();
        setupCustomerSelect();
        setupNewCustomerButton();
        setupBulkDeleteCustomers();
        setupPayDebtButton();
        setupPartialPayment();
        setupCustomerModalClose();
        
        // Supplier systems
        setupSupplierForm();
        setupReceptionForm();
        
        // Data management
        setupImportFunctions();
        setupSettingsButtons();
        setupClearSales();
        setupResetAll();
        setupExportFullBackup();
        
        // Keyboard shortcuts
        setupKeyboardShortcuts();
        setupAdditionalShortcuts();
        
        // ============================================
        // SETUP BACKUP TOGGLE BUTTON
        // ============================================
        setupBackupToggleButton();

        // ============================================
        // STEP 4: Check and restore backup
        // ============================================
        const products = await dbGetAll('products');
        const customersData = await dbGetAll('customers');
        
        if (products.length === 0 && customersData.length === 0) {
            console.log('📦 No data found, attempting to restore from backup...');
            const restored = await (window.restoreAutoBackup || (() => Promise.resolve(false)))();
            if (restored) {
                showToast(t('backupRestored'), 'success');
                console.log('✅ Auto-backup restored successfully');
            } else {
                showToast(t('noBackupData'), 'info');
            }
        } else {
            console.log('✅ Data found in database, no restore needed');
        }
        
        // ============================================
        // STEP 5: Load all data - FIXED ORDER
        // ============================================
        console.log('📊 Loading data...');
        await loadSettings();
        if (typeof maybeShowWelcome === 'function') maybeShowWelcome();
        if (typeof applyStructureFromSettings === 'function') applyStructureFromSettings();
        if (typeof window.initAutoUpdateCheck === 'function') window.initAutoUpdateCheck();
        await loadInventory();
        // removed initProductGrid() - product grid section eliminated
        await loadCustomers();
        await loadSuppliers();
        
        // Create analytics dashboard BEFORE loading analytics
        console.log('📊 Creating analytics dashboard...');
        if (typeof window.loadAnalyticsPrefsFromDb === 'function') await window.loadAnalyticsPrefsFromDb();
        if (typeof window.createModernAnalyticsDashboard === 'function') {
            window.createModernAnalyticsDashboard();
        } else {
            console.warn('⚠️ createModernAnalyticsDashboard not available - check if analytics-ui.js loaded');
        }

        // Load analytics data
        await window.loadAnalytics();

        // Initialize advanced charts section
        if (typeof window.initAnalyticsCharts === 'function') {
            window.initAnalyticsCharts();
        }
        if (typeof window.captureAnalyticsChart === 'function') {
            window.captureAnalyticsChart();
        }

        // Load products cache for promotions
        await refreshProductsCache();
        await loadPromotions();

        // Restore cart snapshot from auto-reload (structure/theme switch)
        if (typeof window.restoreCartSnapshot === 'function') window.restoreCartSnapshot();

        renderCart();

        // ============================================
        // STEP 6: Finalize initialization
        // ============================================
        resetPaymentButtons();

        if (typeof applyRolePermissions === 'function') applyRolePermissions();
        if (typeof startAutoLockTimer === 'function') startAutoLockTimer();
        if (typeof switchView === 'function') switchView('checkout');
        
        // Button right-click customization (must run after all buttons are built)
        if (typeof initButtonContext === 'function') initButtonContext();
        
        // Focus the scanner input after everything is loaded
        setTimeout(() => {
            const scannerInput = document.getElementById('scanner-receiver');
            if (scannerInput) {
                scannerInput.focus();
                console.log('🎯 Scanner input focused');
            }
        }, 500);
        
        showToast(t('appReady'), 'success');
        
        console.log('✅ ShopPOS Pro initialized successfully!');
        console.log('💡 Press Space to complete transaction and start new one');
        console.log('💡 Press Ctrl+M to focus manual barcode input');
        console.log('💡 Press Ctrl+Shift+R to reset scanner');
        console.log('🔍 Type letters to search products in checkout');

    } catch (error) {
        console.error('❌ Init error:', error);
        showToast(t('initFailed') + error.message, 'error');
    }
}
