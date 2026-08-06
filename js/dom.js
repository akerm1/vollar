// ============================================================
// DOM: DOM References
// ============================================================
const DOM = {
    // Scanner
    scannerInput: document.getElementById('scanner-receiver'),
    
    // Views
    views: {
        checkout: document.getElementById('view-checkout'),
        inventory: document.getElementById('view-inventory'),
        customers: document.getElementById('view-customers'),
        suppliers: document.getElementById('view-suppliers'),
        analytics: document.getElementById('view-analytics'),
        promotions: document.getElementById('view-promotions'),
        settings: document.getElementById('view-settings'),
        users: document.getElementById('view-users')
    },
    navTabs: document.querySelectorAll('.nav-tab'),
    
    // Cart
    cartBody: document.getElementById('cart-table-body'),
    checkoutSubtotal: document.getElementById('checkout-subtotal'),
    checkoutVat: document.getElementById('checkout-vat'),
    checkoutDiscount: document.getElementById('checkout-discount'),
    checkoutGrandtotal: document.getElementById('checkout-grandtotal'),
    cartCount: document.getElementById('cart-count'),
    amountPaidInput: document.getElementById('amount-paid'),
    remainingAmount: document.getElementById('remaining-amount'),
    customerSelect: document.getElementById('customer-select'),
    checkoutCustomerName: document.getElementById('checkout-customer-name'),
    
    // Inventory
    inventoryBody: document.getElementById('inventory-table-body'),
    invProductCount: document.getElementById('inv-product-count'),
    invLowStockCount: document.getElementById('inv-low-stock-count'),
    invTotalValue: document.getElementById('inv-total-value'),
    productForm: document.getElementById('product-form'),
    formBarcode: document.getElementById('form-barcode'),
    formReference: document.getElementById('form-reference'),
    formName: document.getElementById('form-name'),
    formCategory: document.getElementById('form-category'),
    formUnit: document.getElementById('form-unit'),
    formPrice: document.getElementById('form-price'),
    formStock: document.getElementById('form-stock'),
    formImage: document.getElementById('form-image'),
    formImagePreview: document.getElementById('form-image-preview'),
    formPurchasePrice: document.getElementById('form-purchase-price'),
    formSupplier: document.getElementById('form-supplier'),
    formMinStock: document.getElementById('form-min-stock'),
    formFeedback: document.getElementById('form-feedback'),
    btnBulkDelete: document.getElementById('btn-bulk-delete'),
    
    // Categories
    newCategoryInput: document.getElementById('new-category-input'),
    btnAddCategory: document.getElementById('btn-add-category'),
    categoriesList: document.getElementById('categories-list'),
    
    // Analytics
    analyticsTransactions: document.getElementById('analytics-transactions'),
    analyticsTotalDebt: document.getElementById('analytics-total-debt'),
    analyticsCustomersWithDebt: document.getElementById('analytics-customers-with-debt'),
    btnClearSales: document.getElementById('btn-clear-sales'),
    
    // Customers
    customerForm: document.getElementById('customer-form'),
    customerName: document.getElementById('customer-name'),
    customerPhone: document.getElementById('customer-phone'),
    customerAddress: document.getElementById('customer-address'),
    customerFeedback: document.getElementById('customer-feedback'),
    customersList: document.getElementById('customers-list'),
    customerSearch: document.getElementById('customer-search'),
    btnNewCustomer: document.getElementById('btn-new-customer'),
    btnBulkDeleteCustomers: document.getElementById('btn-bulk-delete-customers'),
    
    // Customer Detail Modal
    customerDetailModal: document.getElementById('customer-detail-modal'),
    customerDetailName: document.getElementById('customer-detail-name'),
    detailPhone: document.getElementById('detail-phone'),
    detailAddress: document.getElementById('detail-address'),
    detailDate: document.getElementById('detail-date'),
    detailTotalDebt: document.getElementById('detail-total-debt'),
    customerDebtsBody: document.getElementById('customer-debts-body'),
    btnPayDebt: document.getElementById('btn-pay-debt'),
    btnCloseCustomerModal: document.getElementById('btn-close-customer-modal'),
    partialPaymentAmount: document.getElementById('partial-payment-amount'),
    partialPaymentRemaining: document.getElementById('partial-payment-remaining'),
    btnPartialPayment: document.getElementById('btn-partial-payment'),
    partialPaymentSection: document.getElementById('partial-payment-section'),
    
    // Suppliers
    supplierForm: document.getElementById('supplier-form'),
    supplierName: document.getElementById('supplier-name'),
    supplierPhone: document.getElementById('supplier-phone'),
    supplierAddress: document.getElementById('supplier-address'),
    supplierEmail: document.getElementById('supplier-email'),
    supplierNif: document.getElementById('supplier-nif'),
    supplierFeedback: document.getElementById('supplier-feedback'),
    suppliersList: document.getElementById('suppliers-list'),
    supplierSearch: document.getElementById('supplier-search'),
    
    // Settings
    settingsVat: document.getElementById('settings-vat'),
    settingsLowStock: document.getElementById('settings-low-stock'),
    settingsCurrency: document.getElementById('settings-currency'),
    settingsOpeningFloat: document.getElementById('settings-opening-float'),
    settingsFeedback: document.getElementById('settings-feedback'),
    settingsDbInfo: document.getElementById('settings-db-info'),
    settingsStorageInfo: document.getElementById('settings-storage-info'),
    btnSaveSettings: document.getElementById('btn-save-settings'),
    btnResetSettings: document.getElementById('btn-reset-settings'),
    btnResetAll: document.getElementById('btn-reset-all'),
    btnExportFullBackup: document.getElementById('btn-export-full-backup'),
    fileImportFull: document.getElementById('file-import-full'),
    
    // Buttons
    btnComplete: document.getElementById('btn-complete-transaction'),
    btnClearCart: document.getElementById('btn-clear-cart'),
    paymentStatusDisplay: document.getElementById('payment-status-display'),
    
    // Edit Modal
    editModal: document.getElementById('edit-modal'),
    editForm: document.getElementById('edit-product-form'),
    editBarcode: document.getElementById('edit-barcode'),
    editReference: document.getElementById('edit-reference'),
    editName: document.getElementById('edit-name'),
    editCategory: document.getElementById('edit-category'),
    editUnit: document.getElementById('edit-unit'),
    editPrice: document.getElementById('edit-price'),
    editStock: document.getElementById('edit-stock'),
    editImage: document.getElementById('edit-image'),
    editImagePreview: document.getElementById('edit-image-preview'),
    editPurchasePrice: document.getElementById('edit-purchase-price'),
    editSupplier: document.getElementById('edit-supplier'),
    editMinStock: document.getElementById('edit-min-stock'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    

    // Manual Barcode
    manualBarcode: document.getElementById('manual-barcode'),
    manualScanBtn: document.getElementById('btn-manual-scan'),
    barcodeSuggestions: document.getElementById('barcode-suggestions'),
    
    // Clock
    clockDisplay: document.getElementById('clock-display'),
    btnSettingsHeader: document.getElementById('btn-settings-header'),
    vatRateDisplay: document.getElementById('vat-rate-display'),
    
    // Variants
    variantModal: document.getElementById('variant-modal'),
    variantProductName: document.getElementById('variant-product-name'),
    variantParentBarcode: document.getElementById('variant-parent-barcode'),
    variantList: document.getElementById('variant-list'),
    variantForm: document.getElementById('variant-form'),
    variantId: document.getElementById('variant-id'),
    variantName: document.getElementById('variant-name-input'),
    variantType: document.getElementById('variant-type'),
    variantPrice: document.getElementById('variant-price'),
    variantStock: document.getElementById('variant-stock'),
    variantBarcode: document.getElementById('variant-barcode'),
    btnAddVariantForm: document.getElementById('btn-add-variant-form'),
    btnCloseVariantModal: document.getElementById('btn-close-variant-modal'),
    
    // Variant Picker Modal (checkout)
    variantPickerModal: document.getElementById('variant-picker-modal'),
    variantPickerTitle: document.getElementById('variant-picker-title'),
    variantPickerList: document.getElementById('variant-picker-list'),
    
        // Toast
    toastContainer: document.getElementById('toast-container'),
    
    saleDetailsModal: null
};

console.log('📦 DOM references loaded');