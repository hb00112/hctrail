function loadPendingOrders() {
    const pendingOrdersBody = document.getElementById('pendingOrdersBody');
    const detailedHeader = document.getElementById('pendingOrdersHeadDetailed');
    const summarizedHeader = document.getElementById('pendingOrdersHeadSummarized');
    pendingOrdersBody.innerHTML = '';
    
    const isDetailed = document.getElementById('viewToggle').checked;
    
    // Toggle visibility of headers
    detailedHeader.style.display = isDetailed ? '' : 'none';
    summarizedHeader.style.display = isDetailed ? 'none' : '';

    firebase.database().ref('orders').orderByChild('status').equalTo('Pending').once('value')
        .then(snapshot => {
            if (snapshot.exists()) {
                snapshot.forEach(childSnapshot => {
                    const order = childSnapshot.val();
                    const row = createOrderRow(order, childSnapshot.key, isDetailed);
                    pendingOrdersBody.appendChild(row);
                });
            } else {
                pendingOrdersBody.innerHTML = `<tr><td colspan="${isDetailed ? 5 : 4}">No pending orders found</td></tr>`;
            }
        })
        .catch(error => {
            console.error("Error loading orders: ", error);
            pendingOrdersBody.innerHTML = `<tr><td colspan="${isDetailed ? 5 : 4}">Error loading orders</td></tr>`;
        });
}

// Function to create order row
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
            <td></td>
        `;
    }
    
    return row;
}

// Function to get items summary (for detailed view)
function getItemsSummary(items) {
    if (!items || !Array.isArray(items)) return 'No items';
    
    return items.map(item => 
        `${item.name} (${Object.entries(item.quantities || {}).map(([size, qty]) => `${size}/${qty}`).join(', ')})`
    ).join('; ');
}

// Function to get total quantity (for summarized view)
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
            loadBillingOrders(); // Assuming this function exists
        })
        .catch(error => {
            console.error("Error marking order for billing: ", error);
        });
}

// Function to view order details
function viewOrderDetails(orderId) {
    firebase.database().ref('orders').child(orderId).once('value')
        .then(snapshot => {
            const order = snapshot.val();
            // Create and show a modal with order details
            // This is left as an exercise, you can create a similar modal to the confirmation modal
        })
        .catch(error => {
            console.error("Error fetching order details: ", error);
        });
}

document.getElementById('pendingOrdersBody').addEventListener('click', function(e) {
    if (e.target.classList.contains('complete-order')) {
        markForBilling(e.target.getAttribute('data-order-id'));
    } else if (e.target.classList.contains('view-order')) {
        viewOrderDetails(e.target.getAttribute('data-order-id'));
    }
});

document.getElementById('viewToggle').addEventListener('change', function() {
    const orderItems = document.querySelectorAll('.order-items');
    orderItems.forEach(item => {
        const orderId = item.closest('tr').querySelector('.view-order').getAttribute('data-order-id');
        firebase.database().ref('orders').child(orderId).once('value')
            .then(snapshot => {
                const order = snapshot.val();
                item.textContent = getItemsSummary(order.items);
            });
    });
});

document.getElementById('pendingOrdersBody').addEventListener('click', function(e) {
    if (!document.getElementById('viewToggle').checked) return; // Only process clicks in detailed view
    if (e.target.classList.contains('complete-order')) {
        markForBilling(e.target.getAttribute('data-order-id'));
    } else if (e.target.classList.contains('view-order')) {
        viewOrderDetails(e.target.getAttribute('data-order-id'));
    }
});

// Toggle switch functionality
document.getElementById('viewToggle').addEventListener('change', function() {
    loadPendingOrders();
});

// Call this function when the page loads

document.addEventListener('DOMContentLoaded', loadPendingOrders);
