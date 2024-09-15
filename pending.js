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

    filterButton.addEventListener('click', openFilterModal);
    closeBtn.addEventListener('click', () => closeFilterModal(false));
    selectAllBtn.addEventListener('click', selectAllPartyNames);
    deselectAllBtn.addEventListener('click', deselectAllPartyNames);
    saveFilterBtn.addEventListener('click', applyFilters);
    clearFiltersButton.addEventListener('click', clearFilters);
    viewToggle.addEventListener('change', handleViewToggle);

    window.addEventListener('click', function(event) {
        if (event.target == filterModal) {
            closeFilterModal(false);
        }
    });

    document.getElementById('pendingOrdersBody').addEventListener('click', handleOrderActions);
      // Initially hide the Clear Filters button
      updateClearFiltersButtonVisibility();
}

let currentFilters = [];

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
                orders = orders.filter(order => 
                    currentFilters.length === 0 || currentFilters.includes(order.partyName)
                );
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
    loadPartyNames();
}

function closeFilterModal(applyFilter = false) {
    const filterModal = document.getElementById('filterModal4');
    filterModal.style.display = 'none';
    
    if (!applyFilter) {
        // Reset the UI to match currentFilters
        const partyNameButtons = document.querySelectorAll('.party-name-btn');
        partyNameButtons.forEach(button => {
            button.classList.toggle('selected', currentFilters.includes(button.textContent));
        });
    }
}

function loadPartyNames() {
    const partyNameList = document.getElementById('partyNameList');
    partyNameList.innerHTML = '';

    firebase.database().ref('orders').orderByChild('status').equalTo('Pending').once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                const partyNames = new Set();
                snapshot.forEach(childSnapshot => {
                    const order = childSnapshot.val();
                    if (order.partyName) {
                        partyNames.add(order.partyName);
                    }
                });
                partyNames.forEach(partyName => {
                    const button = document.createElement('button');
                    button.textContent = partyName;
                    button.classList.add('party-name-btn');
                    button.classList.toggle('selected', currentFilters.includes(partyName));
                    button.addEventListener('click', togglePartyNameSelection);
                    partyNameList.appendChild(button);
                });
            } else {
                partyNameList.innerHTML = '<p>No party names found</p>';
            }
        })
        .catch(error => {
            console.error("Error loading party names: ", error);
            partyNameList.innerHTML = '<p>Error loading party names</p>';
        });
}

function togglePartyNameSelection(event) {
    event.target.classList.toggle('selected');
    updateSelectionCount();
}

function updateSelectionCount() {
    const selectedParties = document.querySelectorAll('.party-name-btn.selected');
    const selectionCountElement = document.getElementById('selectionCount');
    selectionCountElement.textContent = `${selectedParties.length} parties selected`;
}

function selectAllPartyNames() {
    const partyNameButtons = document.querySelectorAll('.party-name-btn');
    partyNameButtons.forEach(button => button.classList.add('selected'));
    updateSelectionCount();
}

function deselectAllPartyNames() {
    const partyNameButtons = document.querySelectorAll('.party-name-btn');
    partyNameButtons.forEach(button => button.classList.remove('selected'));
    updateSelectionCount();
}

function applyFilters() {
    currentFilters = Array.from(document.querySelectorAll('.party-name-btn.selected')).map(btn => btn.textContent);
    
    if (currentFilters.length === 0) {
        showMessage('No filter selected');
        return;
    }
    
    document.getElementById('filterButton').classList.toggle('active', currentFilters.length > 0);
    closeFilterModal(true);
    updateClearFiltersButtonVisibility();
    loadPendingOrders(); // Reload orders with new filters
}

function clearFilters() {
    currentFilters = [];
    document.getElementById('filterButton').classList.remove('active');
    const partyNameButtons = document.querySelectorAll('.party-name-btn');
    partyNameButtons.forEach(button => button.classList.remove('selected'));
    updateSelectionCount();
    updateClearFiltersButtonVisibility();
    loadPendingOrders(); // Reload orders without filters
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
// New function to update Clear Filters button visibility
function updateClearFiltersButtonVisibility() {
    const clearFiltersButton = document.getElementById('clearFiltersButton');
    if (currentFilters.length > 0) {
        clearFiltersButton.style.display = 'inline-block';
    } else {
        clearFiltersButton.style.display = 'none';
    }
}
