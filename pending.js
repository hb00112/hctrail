document.addEventListener('DOMContentLoaded', function() {
    initializeUI();
    loadPendingOrders();
});

function initializeUI() {
    const filterButton = document.getElementById('filterButton');
    const filterModal = document.getElementById('filterModal4');
    const closeBtn = filterModal.querySelector('.close4');
    const selectAllBtn = document.getElementById('selectAllBtn');
    const deselectAllBtn = document.getElementById('deselectAllBtn');
    const saveFilterBtn = document.getElementById('saveFilterBtn');
    const clearFiltersButton = document.getElementById('clearFiltersButton');
    const viewToggle = document.getElementById('viewToggle');
    const filterMenu = document.getElementById('filterMenu');

    filterButton.addEventListener('click', openFilterModal);
    closeBtn.addEventListener('click', () => closeFilterModal(false));
    selectAllBtn.addEventListener('click', selectAllItems);
    deselectAllBtn.addEventListener('click', deselectAllItems);
    saveFilterBtn.addEventListener('click', applyFilters);
    clearFiltersButton.addEventListener('click', clearFilters);
    viewToggle.addEventListener('change', handleViewToggle);
    filterMenu.addEventListener('click', handleFilterMenuClick);

    window.addEventListener('click', function(event) {
        if (event.target == filterModal) {
            closeFilterModal(false);
        }
    });

    document.getElementById('pendingOrdersBody').addEventListener('click', handleOrderActions);
    updateClearFiltersButtonVisibility();
}

let currentFilters = {
    partyName: [],
    date: []
};

function loadPendingOrders() {
    const pendingOrdersBody = document.getElementById('pendingOrdersBody');
    const detailedHeader = document.getElementById('pendingOrdersHeadDetailed');
    const summarizedHeader = document.getElementById('pendingOrdersHeadSummarized');
    const isDetailed = document.getElementById('viewToggle').checked;
    
    console.log('View mode:', isDetailed ? 'Detailed' : 'Summarized');
    console.log('Current filters:', currentFilters);

    pendingOrdersBody.innerHTML = '';
    detailedHeader.style.display = isDetailed ? '' : 'none';
    summarizedHeader.style.display = isDetailed ? 'none' : '';

    firebase.database().ref('orders').orderByChild('status').equalTo('Pending').once('value')
        .then(snapshot => {
            console.log('Raw snapshot:', snapshot.val());
            if (snapshot.exists()) {
                let orders = [];
                snapshot.forEach(childSnapshot => {
                    const order = childSnapshot.val();
                    order.id = childSnapshot.key;
                    orders.push(order);
                });

                console.log('Total orders:', orders.length);

                // Apply filters
                orders = orders.filter(order => {
                    const dateMatches = currentFilters.date.length === 0 || 
                        currentFilters.date.includes(new Date(order.dateTime).toLocaleDateString());
                    const partyMatches = currentFilters.partyName.length === 0 || 
                        currentFilters.partyName.includes(order.partyName);
                    return dateMatches && partyMatches;
                });
                console.log('Orders after filtering:', orders.length);

                if (orders.length > 0) {
                    if (isDetailed) {
                        displayDetailedOrders(orders, pendingOrdersBody);
                    } else {
                        displaySummarizedOrders(orders, pendingOrdersBody);
                    }
                } else {
                    pendingOrdersBody.innerHTML = `<tr><td colspan="${isDetailed ? 5 : 3}">No pending orders found</td></tr>`;
                }
            } else {
                console.log('No pending orders found in snapshot');
                pendingOrdersBody.innerHTML = `<tr><td colspan="${isDetailed ? 5 : 3}">No pending orders found</td></tr>`;
            }
        })
        .catch(error => {
            console.error("Error loading orders: ", error);
            pendingOrdersBody.innerHTML = `<tr><td colspan="${isDetailed ? 5 : 3}">Error loading orders</td></tr>`;
        });
}

function displayDetailedOrders(orders, container) {
    console.log('Displaying detailed orders. Total orders:', orders.length);
    container.innerHTML = '';
    orders.forEach(order => {
        const row = createOrderRow(order, order.id, true);
        container.appendChild(row);
    });
}

function displaySummarizedOrders(orders, container) {
    console.log('Displaying summarized orders. Total orders:', orders.length);
    container.innerHTML = '';
    const groupedOrders = groupOrdersBySummary(orders);
    console.log('Grouped orders:', groupedOrders);
    
    for (const [key, group] of Object.entries(groupedOrders)) {
        const [date, partyName] = key.split('|');
        const totalQty = group.reduce((sum, order) => sum + getTotalQuantity(order.items), 0);
        
        console.log('Creating row for:', date, partyName, 'Total Quantity:', totalQty);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${date}</td>
            <td>${partyName}</td>
            <td>${totalQty}</td>
        `;
        container.appendChild(row);
    }
}

function groupOrdersBySummary(orders) {
    console.log('Grouping orders for summary');
    const groups = orders.reduce((groups, order) => {
        const date = new Date(order.dateTime).toLocaleDateString();
        const key = `${date}|${order.partyName}`;
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(order);
        console.log('Added order to group:', key, 'Group size:', groups[key].length);
        return groups;
    }, {});
    console.log('Grouping complete. Total groups:', Object.keys(groups).length);
    return groups;
}

function createOrderRow(order, orderId, isDetailed) {
    const row = document.createElement('tr');
    
    if (isDetailed) {
        row.innerHTML = `
            <td>${order.orderNumber || 'N/A'}</td>
            <td>${order.partyName || 'N/A'}</td>
            <td class="order-items">${getItemsSummary(order.items)}</td>
            <td>${order.status || 'N/A'}</td>
            <td>
                <button class="btn btn-sm btn-primary view-order" data-order-id="${orderId}">View</button>
                <button class="btn btn-sm btn-success complete-order" data-order-id="${orderId}">Mark for Billing</button>
            </td>
        `;
    } else {
        const orderDate = new Date(order.dateTime).toLocaleDateString();
        const totalQty = getTotalQuantity(order.items);
        
        row.innerHTML = `
            <td>${orderDate}</td>
            <td>${order.partyName || 'N/A'}</td>
            <td>${totalQty}</td>
        `;
    }
    
    return row;
}

function getItemsSummary(items) {
    if (!items || !Array.isArray(items)) return 'No items';
    
    return items.map(item => 
        `${item.name} (${Object.entries(item.quantities || {}).map(([size, qty]) => `${size}/${qty}`).join(', ')})`
    ).join('; ');
}

function getTotalQuantity(items) {
    if (!items || !Array.isArray(items)) return 0;
    
    return items.reduce((total, item) => {
        const itemTotal = Object.values(item.quantities || {}).reduce((sum, qty) => sum + parseInt(qty), 0);
        return total + itemTotal;
    }, 0);
}

function markForBilling(orderId) {
    firebase.database().ref('orders').child(orderId).update({ status: 'Waiting for Billing' })
        .then(() => {
            console.log("Order marked for billing successfully");
            loadPendingOrders();
        })
        .catch(error => {
            console.error("Error marking order for billing: ", error);
        });
}

function viewOrderDetails(orderId) {
    firebase.database().ref('orders').child(orderId).once('value')
        .then(snapshot => {
            const order = snapshot.val();
            console.log("Order details:", order);
            // Implement modal display logic here
        })
        .catch(error => {
            console.error("Error fetching order details: ", error);
        });
}

function handleOrderActions(e) {
    if (e.target.classList.contains('complete-order')) {
        markForBilling(e.target.getAttribute('data-order-id'));
    } else if (e.target.classList.contains('view-order')) {
        viewOrderDetails(e.target.getAttribute('data-order-id'));
    }
}

function openFilterModal() {
    const filterModal = document.getElementById('filterModal4');
    filterModal.style.display = 'block';
    loadFilterItems('partyName');
}

function closeFilterModal(applyFilter = false) {
    const filterModal = document.getElementById('filterModal4');
    filterModal.style.display = 'none';
    
    if (!applyFilter) {
        resetFilterUI();
    }
}

function loadFilterItems(filterType) {
    const filterList = document.getElementById('filterItemList');
    filterList.innerHTML = '';

    firebase.database().ref('orders').orderByChild('status').equalTo('Pending').once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                const items = new Set();
                snapshot.forEach(childSnapshot => {
                    const order = childSnapshot.val();
                    if (filterType === 'partyName' && order.partyName) {
                        items.add(order.partyName);
                    } else if (filterType === 'date' && order.dateTime) {
                        items.add(new Date(order.dateTime).toLocaleDateString());
                    }
                });
                items.forEach(item => {
                    const button = document.createElement('button');
                    button.textContent = item;
                    button.classList.add('filter-item-btn');
                    button.classList.toggle('selected', currentFilters[filterType].includes(item));
                    button.addEventListener('click', () => toggleFilterItemSelection(item, filterType));
                    filterList.appendChild(button);
                });
            } else {
                filterList.innerHTML = '<p>No items found</p>';
            }
        })
        .catch(error => {
            console.error(`Error loading ${filterType} items:`, error);
            filterList.innerHTML = `<p>Error loading ${filterType} items</p>`;
        });
}

function toggleFilterItemSelection(item, filterType) {
    const index = currentFilters[filterType].indexOf(item);
    if (index > -1) {
        currentFilters[filterType].splice(index, 1);
    } else {
        currentFilters[filterType].push(item);
    }
    updateSelectionCount(filterType);
    resetFilterUI();
}

function updateSelectionCount(filterType) {
    const selectionCountElement = document.getElementById('selectionCount');
    const count = currentFilters[filterType].length;
    selectionCountElement.textContent = `${count} ${filterType === 'partyName' ? 'parties' : 'dates'} selected`;
}

function selectAllItems() {
    const activeFilterType = document.querySelector('.filter-item.active').dataset.filter;
    const filterButtons = document.querySelectorAll('.filter-item-btn');
    filterButtons.forEach(button => {
        button.classList.add('selected');
        if (!currentFilters[activeFilterType].includes(button.textContent)) {
            currentFilters[activeFilterType].push(button.textContent);
        }
    });
    updateSelectionCount(activeFilterType);
}

function deselectAllItems() {
    const activeFilterType = document.querySelector('.filter-item.active').dataset.filter;
    const filterButtons = document.querySelectorAll('.filter-item-btn');
    filterButtons.forEach(button => button.classList.remove('selected'));
    currentFilters[activeFilterType] = [];
    updateSelectionCount(activeFilterType);
}

function applyFilters() {
    if (Object.values(currentFilters).every(arr => arr.length === 0)) {
        showMessage('No filter selected');
        return;
    }
    
    document.getElementById('filterButton').classList.add('active');
    closeFilterModal(true);
    updateClearFiltersButtonVisibility();
    loadPendingOrders();
}

function clearFilters() {
    currentFilters = {
        partyName: [],
        date: []
    };
    document.getElementById('filterButton').classList.remove('active');
    resetFilterUI();
    updateClearFiltersButtonVisibility();
    loadPendingOrders();
}

function resetFilterUI() {
    const activeFilterType = document.querySelector('.filter-item.active').dataset.filter;
    const filterButtons = document.querySelectorAll('.filter-item-btn');
    filterButtons.forEach(button => {
        button.classList.toggle('selected', currentFilters[activeFilterType].includes(button.textContent));
    });
    updateSelectionCount(activeFilterType);
}

function handleFilterMenuClick(event) {
    if (event.target.classList.contains('filter-item')) {
        const filterItems = document.querySelectorAll('.filter-item');
        filterItems.forEach(item => item.classList.remove('active'));
        event.target.classList.add('active');
        loadFilterItems(event.target.dataset.filter);
    }
}

function updateClearFiltersButtonVisibility() {
    const clearFiltersButton = document.getElementById('clearFiltersButton');
    const hasActiveFilters = Object.values(currentFilters).some(arr => arr.length > 0);
    clearFiltersButton.style.display = hasActiveFilters ? 'inline-block' : 'none';
}

function showMessage(message) {
    const messageElement = document.getElementById('noFilterSelectedMessage');
    messageElement.textContent = message;
    messageElement.style.display = 'block';
    setTimeout(() => {
        messageElement.style.display = 'none';
    }, 2000);
}

function handleViewToggle() {
    loadPendingOrders();
}
