
// ============================================================
// ASK CUSTOMER: Modal de sélection du client
// ============================================================
function openAskCustomerModal() {
    askCustomerModalOpen = true;
    focusLockEnabled = false;
    formInputActive = true;

    let overlay = document.getElementById('ask-customer-modal');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'ask-customer-modal';
        overlay.className = 'modal-overlay';
        overlay.innerHTML = `
            <div class="modal" style="max-width:520px;max-height:86vh;overflow-y:auto;display:flex;flex-direction:column;">
                <h3>${t('askCustomerTitle')}</h3>
                <p style="font-size:14px;color:#666;margin:4px 0 12px 0;">${t('askCustomerSubtitle')}</p>
                <input type="text" id="ask-customer-search" placeholder="${t('searchCustomer')}"
                    style="width:100%;padding:10px 14px;border:2px solid #e0e0e0;border-radius:var(--radius-sm);font-size:15px;font-family:var(--font-family);margin-bottom:12px;">
                <div id="ask-customer-list" style="flex:1;overflow-y:auto;border:1px solid #eee;border-radius:var(--radius-sm);min-height:80px;"></div>
                <div style="display:flex;gap:10px;margin-top:16px;">
                    <button class="btn btn-primary" id="btn-ask-customer-none" style="flex:2;">${t('continueWithoutCustomer')}</button>
                    <button class="btn btn-secondary" id="btn-ask-customer-cancel" style="flex:1;">${t('cancel')}</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('btn-ask-customer-cancel').addEventListener('click', function() {
            closeAskCustomerModal(false);
        });
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) closeAskCustomerModal(false);
        });

        const searchInput = document.getElementById('ask-customer-search');
        searchInput.addEventListener('input', function() { renderAskCustomerList(); });

        document.getElementById('btn-ask-customer-none').addEventListener('click', function() {
            closeAskCustomerModal(true);
            customerAskShown = true;
            completeTransaction();
        });
    }

    renderAskCustomerList();
    overlay.classList.add('active');
    const searchInput = document.getElementById('ask-customer-search');
    if (searchInput) {
        searchInput.value = '';
        setTimeout(function() { searchInput.focus(); }, 50);
    }
}

function renderAskCustomerList() {
    const list = document.getElementById('ask-customer-list');
    if (!list) return;
    const searchInput = document.getElementById('ask-customer-search');
    const query = (searchInput && searchInput.value ? searchInput.value.toLowerCase().trim() : '');
    const source = (typeof customers !== 'undefined' && Array.isArray(customers)) ? customers : [];

    const filtered = query
        ? source.filter(function(c) {
            const haystack = ((c.name || '') + ' ' + (c.phone || '')).toLowerCase();
            return haystack.indexOf(query) !== -1;
        })
        : source;

    if (filtered.length === 0) {
        list.innerHTML = `<div style="padding:16px;color:#999;font-size:14px;text-align:center;">${t('noCustomers')}</div>`;
        return;
    }

    list.innerHTML = filtered.map(function(c) {
        return `<div class="ask-customer-item" data-id="${c.id}" style="padding:10px 14px;cursor:pointer;border-bottom:1px solid #f0f0f0;display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:14px;"
            onmouseover="this.style.background='#f0f4ff'" onmouseout="this.style.background='white'">
            <span style="font-weight:600;">${escapeHtml(c.name || '')}</span>
            <span style="font-size:12px;color:#888;">${escapeHtml(c.phone || '')}</span>
        </div>`;
    }).join('');

    Array.from(list.children).forEach(function(row) {
        row.addEventListener('click', function() {
            const id = row.dataset.id;
            if (DOM.customerSelect) DOM.customerSelect.value = id;
            closeAskCustomerModal(true);
            completeTransaction();
        });
    });
}

function closeAskCustomerModal(completed) {
    const overlay = document.getElementById('ask-customer-modal');
    if (overlay) overlay.classList.remove('active');
    askCustomerModalOpen = false;
    focusLockEnabled = true;
    formInputActive = false;
    if (!completed) customerAskShown = false;
}
