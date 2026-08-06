// This script updates cart-render.js to be more compatible with modern UI structure




const fs = require('fs');

// Read the current cart-render.js file
let content = fs.readFileSync('js/cart-render.js', 'utf8');

// Make the function more resilient to DOM changes
content = content.replace(
  /function renderCart\(\) {[\s\S]*?if \(!DOM\.cartBody\) return;/,
  `function renderCart() {
    // Use flexible element selection to work with both old and new structure
    const cartBody = document.getElementById('cart-table-body') ||
                    document.querySelector('.cart-table tbody') ||
                    document.querySelector('#view-checkout tbody');

    const checkoutSubtotal = document.getElementById('checkout-subtotal') ||
                           document.querySelector('.totals-row .value') ||
                           document.getElementById('cart-subtotal');

    const checkoutGrandtotal = document.getElementById('checkout-grandtotal') ||
                             document.querySelector('.totals-row.grand .value') ||
                             document.getElementById('cart-grand-total');

    const amountPaidInput = document.getElementById('amount-paid') ||
                          document.querySelector('.payment-row input[type="number"]') ||
                          document.getElementById('amount-tendered');

    const remainingAmount = document.getElementById('remaining-amount') ||
                          document.querySelector('.payment-row .value') ||
                          document.getElementById('change-amount');

    const cartCount = document.getElementById('cart-count') ||
                    document.querySelector('.cart-summary span') ||
                    document.getElementById('cart-item-count');

    if (!cartBody) {
        console.warn('Cart body element not found');
        return;`
);

// Update the empty cart message to use 5 columns instead of 8
content = content.replace(
  /colspan=\\"8\\" class=\\"empty-cart-msg\\"/g,
  'colspan=\"5\" class=\"empty-cart-msg\"'
);

// Update the quick cart empty message too
content = content.replace(
  /colspan=\\"8\\" class=\\'empty-cart-msg\\'/g,
  'colspan=\"5\" class=\'empty-cart-msg\''
);

// Write the updated file
fs.writeFileSync('js/cart-render.js', content);
console.log('Updated cart-render.js with more flexible DOM selection');