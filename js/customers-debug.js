
// ============================================================
// DEBUG FUNCTIONS
// ============================================================
window.testCustomerDropdown = function() {
    console.log('🧪 Testing customer dropdown...');
    console.log('Customers:', customers);
    console.log('Customer Select Element:', DOM.customerSelect);
    populateCustomerSelect();
    console.log('✅ Customer dropdown populated');
};

window.debugCustomerDebts = async function(customerId) {
    if (!customerId) {
        console.log('❌ Please provide a customer ID');
        console.log('Usage: debugCustomerDebts(1)');
        return;
    }
    
    try {
        const customer = await dbGet('customers', customerId);
        if (!customer) {
            console.log('❌ Customer not found');
            return;
        }
        
        console.log('📋 Customer:', customer.name);
        console.log('💳 Customer ID:', customer.id);
        console.log('💰 Debts:', customer.debts || []);
        console.log('💵 Total Debt:', customer.debts ? customer.debts.reduce((sum, d) => sum + d.remainingAmount, 0) : 0);
        
        return customer;
    } catch (error) {
        console.error('Debug error:', error);
    }
};

window.debugAllCustomers = async function() {
    try {
        const allCustomers = await dbGetAll('customers');
        console.log('📋 All Customers:', allCustomers.length);
        
        allCustomers.forEach(c => {
            const totalDebt = c.debts ? c.debts.reduce((sum, d) => sum + d.remainingAmount, 0) : 0;
            if (totalDebt > 0) {
                console.log(`💰 ${c.name}: ${totalDebt.toFixed(2)} ${settings.currency}`);
                console.log('   Debts:', c.debts);
            }
        });
        
        return allCustomers;
    } catch (error) {
        console.error('Debug error:', error);
    }
};
