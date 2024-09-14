let cart = [];

function addToCart() {
    const itemName = document.getElementById('itemSearch').value;
    const item = items.find(i => i.name === itemName);
    
    if (!item) {
        alert('Please select a valid item.');
        return;
    }

    const selectedCategory = document.querySelector('input[name="category"]:checked');
    const category = selectedCategory ? selectedCategory.value : '';

    const selectedQuantities = {};
    item.sizes.forEach(size => {
        const selectedQty = document.querySelector(`input[name="qty_${size}"]:checked`);
        if (selectedQty) {
            const qty = selectedQty.value === '_' ? 
                selectedQty.nextElementSibling.value : 
                selectedQty.value;
            if (qty && parseInt(qty) > 0) {
                selectedQuantities[size] = parseInt(qty);
            }
        }
    });

    if (Object.keys(selectedQuantities).length === 0) {
        alert('Please select at least one size and quantity.');
        return;
    }

    const existingItemIndex = cart.findIndex(cartItem => cartItem.name === itemName);

    if (existingItemIndex !== -1) {
        // Merge quantities for existing item
        Object.entries(selectedQuantities).forEach(([size, qty]) => {
            if (cart[existingItemIndex].quantities[size]) {
                cart[existingItemIndex].quantities[size] += qty;
            } else {
                cart[existingItemIndex].quantities[size] = qty;
            }
        });
        cart[existingItemIndex].total = Object.values(cart[existingItemIndex].quantities).reduce((sum, qty) => sum + qty, 0);
    } else {
        // Add new item to cart
        const cartItem = {
            name: itemName,
            category: category,
            quantities: selectedQuantities,
            total: Object.values(selectedQuantities).reduce((sum, qty) => sum + qty, 0)
        };
        cart.push(cartItem);
    }

    updateCartSummary();
    resetItemSelection();
}

function updateCartSummary() {
    const cartSummary = document.getElementById('cartSummary') || createCartSummaryTable();
    const tbody = cartSummary.querySelector('tbody');
    tbody.innerHTML = '';

    let totalQuantity = 0;

    cart.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.name} ${item.category ? `(${item.category})` : ''}</td>
            <td>${Object.entries(item.quantities)
                .map(([size, qty]) => `${size}/${qty}`)
                .join(', ')}</td>
            <td>${item.total}</td>
        `;
        row.addEventListener('click', () => showEditItemModal(index, false));
        tbody.appendChild(row);
        totalQuantity += item.total;
    });

    // Update total quantity in the cart button
    const cartButton = document.getElementById('saveOrderBtn');
    cartButton.textContent = `Cart (${totalQuantity})`;
}

// Function to show edit item modal
function showEditItemModal(itemIndex, isOrderSummaryModal = false) {
    const item = cart[itemIndex];
    const allSizes = items.find(i => i.name === item.name).sizes;
    
    // Remove any existing edit modal
    const existingModal = document.getElementById('editItemModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'editItemModal';
    modal.setAttribute('tabindex', '-1');
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Edit Item: ${item.name}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    ${allSizes.map(size => `
                        <div class="mb-3 d-flex align-items-center">
                            <label class="form-label me-2 mb-0" style="width: 50px;">${size}</label>
                            <div class="input-group" style="width: 150px;">
                                <button class="btn btn-outline-secondary minus-btn" type="button" data-size="${size}">-</button>
                                <input type="number" class="form-control text-center" id="qty_${size}" value="${item.quantities[size] || 0}" min="0" readonly>
                                <button class="btn btn-outline-secondary plus-btn" type="button" data-size="${size}">+</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-danger" id="deleteItemBtn">Delete Item</button>
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="saveItemBtn">Save Item</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const editModalInstance = new bootstrap.Modal(document.getElementById('editItemModal'));

    // Add event listeners for plus and minus buttons
    modal.querySelectorAll('.minus-btn').forEach(btn => {
        btn.addEventListener('click', () => updateQuantity(btn.dataset.size, -1));
    });
    modal.querySelectorAll('.plus-btn').forEach(btn => {
        btn.addEventListener('click', () => updateQuantity(btn.dataset.size, 1));
    });

    document.getElementById('saveItemBtn').addEventListener('click', () => {
        editCartSummaryItem(itemIndex, isOrderSummaryModal);
        editModalInstance.hide();
    });

    document.getElementById('deleteItemBtn').addEventListener('click', () => {
        deleteCartItem(itemIndex, isOrderSummaryModal);
        editModalInstance.hide();
    });

    editModalInstance.show();
}
// Function to update quantity
function updateQuantity(size, change) {
    const input = document.getElementById(`qty_${size}`);
    let newValue = parseInt(input.value) + change;
    newValue = Math.max(0, newValue); // Ensure non-negative value
    input.value = newValue;
}

// Function to edit cart summary item
function editCartSummaryItem(itemIndex, isOrderSummaryModal = false) {
    const item = cart[itemIndex];
    const allSizes = items.find(i => i.name === item.name).sizes;
    let newTotal = 0;

    allSizes.forEach(size => {
        const newQty = parseInt(document.getElementById(`qty_${size}`).value);
        if (newQty > 0) {
            item.quantities[size] = newQty;
            newTotal += newQty;
        } else {
            delete item.quantities[size];
        }
    });

    item.total = newTotal;

    if (newTotal === 0) {
        deleteCartItem(itemIndex, isOrderSummaryModal);
    } else {
        updateCartSummary();
        if (isOrderSummaryModal) {
            updateModalCartSummary();
        }
    }
}
// Function to delete cart item
function deleteCartItem(itemIndex, isOrderSummaryModal = false) {
    cart.splice(itemIndex, 1);
    updateCartSummary();
    if (isOrderSummaryModal) {
        updateModalCartSummary();
    }
}
function createCartSummaryTable() {
    const table = document.createElement('table');
    table.id = 'cartSummary';
    table.className = 'table table-bordered mt-4';
    table.innerHTML = `
        <thead>
            <tr>
                <th>Item Name</th>
                <th>Sizes and Qty</th>
                <th>Item Total</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    document.getElementById('orders').appendChild(table);
    return table;
}

function resetItemSelection() {
    document.getElementById('itemSearch').value = '';
    const itemDetailsContainer = document.getElementById('itemDetailsContainer');
    if (itemDetailsContainer) {
        itemDetailsContainer.remove();
    }
}

function showOrderSummaryModal() {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'modal3';
    modal.setAttribute('tabindex', '-1');
    modal.innerHTML = `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Order Summary</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p><strong>Party Name:</strong> <span id="modalPartyName"></span></p>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Item Name</th>
                                <th>Sizes and Qty</th>
                                <th>Item Total</th>
                            </tr>
                        </thead>
                        <tbody id="modalCartSummary"></tbody>
                        <tfoot>
                            <tr>
                                <td colspan="2"><strong>Total Quantity</strong></td>
                                <td id="modalTotalQuantity"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary" id="placeOrderBtn">Place Order</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    const modalInstance = new bootstrap.Modal(document.getElementById('modal3'));
    
    // Populate modal with data
    document.getElementById('modalPartyName').textContent = document.getElementById('partySearch').value;
    updateModalCartSummary();

    // Add event listener to Place Order button
    document.getElementById('placeOrderBtn').addEventListener('click', showOrderConfirmationModal);

    modalInstance.show();
}
function saveOrderToFirebase(order) {
    return firebase.database().ref('orders').push(order);
}
// Function to show the order confirmation modal
function showOrderConfirmationModal() {
    bootstrap.Modal.getInstance(document.getElementById('modal3')).hide();

    const partyName = document.getElementById('partySearch').value;
    const dateTime = new Date().toISOString();

    // Create and append modal immediately
    const modal = createModal(partyName, dateTime);
    document.body.appendChild(modal);
    const modalInstance = new bootstrap.Modal(document.getElementById('modal4'));

    // Show modal immediately
    modalInstance.show();

    // Play sound effect
    playConfirmationSound();

    getNextOrderNumber().then(orderNumber => {
        const order = {
            orderNumber: orderNumber,
            partyName: partyName,
            dateTime: dateTime,
            items: cart,
            status: 'Pending'
        };

        saveOrderToFirebase(order)
            .then(() => {
                // Update modal content with order number
                updateModalContent(orderNumber);

                // Send notification to Telegram
                sendTelegramNotification(partyName, getTotalQuantity(cart), orderNumber);
                loadPendingOrders();
            })
            .catch(error => {
                console.error("Error saving order: ", error);
                alert("An error occurred while saving the order. Please try again.");
            });
    }).catch(error => {
        console.error("Error getting next order number: ", error);
        alert("An error occurred while generating the order number. Please try again.");
    });
}

function createModal(partyName, dateTime) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'modal4';
    modal.setAttribute('tabindex', '-1');
    modal.innerHTML = `
        <style>
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes slideUp {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
            @keyframes drawCheck {
                0% { stroke-dashoffset: 100; }
                100% { stroke-dashoffset: 0; }
            }
            .modal-content {
                background-color: #ffffff;
                border: none;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                animation: fadeIn 0.6s ease-out;
            }
            .modal-header {
                border-bottom: 1px solid #f0f0f0;
                padding: 1.5rem 2rem;
            }
            .modal-title {
                font-family: 'Arial', sans-serif;
                font-weight: 600;
                color: #333333;
                font-size: 1.5rem;
            }
            .modal-body {
                padding: 2rem;
                display: flex;
                flex-direction: column;
                align-items: center;
            }
            .confirmation-icon {
    width: 80px;
    height: 80px;
    margin-bottom: 1.5rem;
    animation: fadeIn 0.6s ease-out 0.3s both;
}
.confirmation-icon circle {
    fill: #e6f4ea;  /* Light green background */
    stroke: #34a853;  /* Green stroke for circle */
    stroke-width: 2;
}
.confirmation-icon path {
    fill: none;
    stroke: #34a853;  /* Green checkmark */
    stroke-width: 4;
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-dasharray: 100;
    stroke-dashoffset: 100;
    animation: drawCheck 0.6s ease-out 0.9s forwards;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes drawCheck {
    to { stroke-dashoffset: 0; }
}
            .order-info {
                text-align: center;
                font-family: 'Arial', sans-serif;
                color: #555555;
                width: 100%;
            }
            .order-info p {
                margin: 0.75rem 0;
                animation: slideUp 0.6s ease-out forwards;
                opacity: 0;
            }
            .order-info p:nth-child(1) { animation-delay: 0.6s; }
            .order-info p:nth-child(2) { animation-delay: 0.75s; }
            .order-info p:nth-child(3) { animation-delay: 0.9s; }
            .order-key {
                font-weight: 600;
                color: #333333;
                margin-right: 0.5rem;
            }
            .btn-primary {
                background-color: #4a90e2;
                border: none;
                padding: 0.75rem 2rem;
                font-weight: 600;
                transition: background-color 0.3s ease;
                font-size: 1rem;
            }
            .btn-primary:hover {
                background-color: #3a7bc8;
            }
            .modal-footer {
                border-top: none;
                padding: 1rem 2rem 2rem;
            }
        </style>
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Order Confirmation</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <svg class="confirmation-icon" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="48"/>
                        <path d="M30 50 L45 65 L70 35"/>
                    </svg>
                    <div class="order-info">
                        <p><span class="order-key">Party Name:</span>${partyName}</p>
                        <p><span class="order-key">Date and Time:</span>${new Date(dateTime).toLocaleString()}</p>
                        <p><span class="order-key">Order Number:</span><span id="orderNumberSpan">Generating...</span></p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    `;

    modal.querySelector('.btn-close').addEventListener('click', returnToHomepage);
    modal.querySelector('.btn-primary').addEventListener('click', returnToHomepage);

    return modal;
}

function updateModalContent(orderNumber) {
    const orderNumberSpan = document.getElementById('orderNumberSpan');
    if (orderNumberSpan) {
        orderNumberSpan.textContent = orderNumber;
    }
}

function playConfirmationSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.1);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

function sendTelegramNotification(partyName, totalQuantity, orderNumber) {
    const token = '6489265710:AAFx6-OaL09SpByMPyfiQBmgetvbtx0InyI';
    const chatId = '-1002170737027';
    const message = `New order received:\nParty Name: ${partyName}\nTotal Quantity: ${totalQuantity}\nOrder Number: ${orderNumber}`;

    fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            chat_id: chatId,
            text: message,
        }),
    })
    .then(response => response.json())
    .then(data => console.log('Telegram notification sent:', data))
    .catch(error => console.error('Error sending Telegram notification:', error));
}

function getTotalQuantity(cartItems) {
    return cartItems.reduce((total, item) => total + item.total, 0);
}
function updateModalCartSummary() {
    const modalCartSummary = document.getElementById('modalCartSummary');
    modalCartSummary.innerHTML = '';
    let totalQuantity = 0;

    cart.forEach((item, index) => {
        const row = document.createElement('tr');
        row.className = 'clickable-row';
        row.dataset.index = index;
        row.innerHTML = `
            <td>${item.name} ${item.category ? `(${item.category})` : ''}</td>
            <td>${Object.entries(item.quantities)
                .map(([size, qty]) => `${size}/${qty}`)
                .join(', ')}</td>
            <td>${item.total}</td>
        `;
        modalCartSummary.appendChild(row);
        totalQuantity += item.total;
    });

    document.getElementById('modalTotalQuantity').textContent = totalQuantity;

    // Add click event listener to rows
    modalCartSummary.querySelectorAll('.clickable-row').forEach(row => {
        row.addEventListener('click', function() {
            const itemIndex = parseInt(this.dataset.index);
            showEditItemModal(itemIndex, true);
        });
    });
}
// Function to return to homepage
function returnToHomepage() {
    document.getElementById('partySearch').value = '';
    document.getElementById('itemSearch').value = '';
    cart = [];
    updateCartSummary();

    const itemDetailsContainer = document.getElementById('itemDetailsContainer');
    if (itemDetailsContainer) {
        itemDetailsContainer.remove();
    }

    loadPendingOrders(); // Refresh the pending orders list
    console.log('Returned to homepage');
}

function getNextOrderNumber() {
    return firebase.database().ref('orderCounter').transaction((current) => {
        return (current || 0) + 1;
    }).then((result) => {
        if (result.committed) {
            return `H${result.snapshot.val()}`;
        } else {
            throw new Error("Failed to get next order number");
        }
    });
}

function addNewItem(itemName) {
    if (!items.some(item => item && item.name === itemName)) {
        // Create a modal dynamically
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.id = 'newItemModal';
        modal.setAttribute('tabindex', '-1');
        modal.innerHTML = `
    <div class="modal-dialog">
        <div class="modal-content">
            <div class="modal-header">
                <h5 class="modal-title">Add New Item: ${itemName}</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
                <div class="mb-3">
                    <label for="itemCategory" class="form-label">Category (optional, separate multiple with space)</label>
                    <input type="text" class="form-control" id="itemCategory">
                </div>
                <div class="mb-3">
                    <label for="itemSizes" class="form-label">Sizes (mandatory, separate with space)</label>
                    <input type="text" class="form-control" id="itemSizes" required>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="button" class="btn btn-primary" id="saveNewItem">Save Item</button>
            </div>
        </div>
    </div>
`;
        document.body.appendChild(modal);

        const newItemModal = new bootstrap.Modal(document.getElementById('newItemModal'));
        newItemModal.show();

        document.getElementById('saveNewItem').addEventListener('click', function () {
            const category = document.getElementById('itemCategory').value.split(' ').filter(Boolean);
            const sizes = document.getElementById('itemSizes').value.split(' ').filter(Boolean);

            if (sizes.length === 0) {
                alert('Please enter at least one size.');
                return;
            }

            const newItem = { name: itemName, category: category, sizes: sizes };
            items.push(newItem);
            items.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

            // Save to Firebase
            firebase.database().ref('items').set(items).then(() => {
                console.log(`Added new item: ${itemName}`);
                logActivity(`created new item "${itemName}"`, username);
                alert(`New item "${itemName}" has been added successfully.`);
                newItemModal.hide();
                document.body.removeChild(modal);
            }).catch(error => {
                console.error("Error adding new item:", error);
                alert("An error occurred while adding the new item. Please try again.");
            });

            document.getElementById('itemSearch').value = itemName;
            document.getElementById('itemList').style.display = 'none';
            showItemDetails(newItem);
        });
    } else {
        console.log(`Item "${itemName}" already exists.`);
        alert(`Item "${itemName}" already exists in the list.`);
    }
}

function loadItemsFromFirebase() {
    firebase.database().ref('items').once('value', (snapshot) => {
        const firebaseItems = snapshot.val();
        if (firebaseItems) {
            // Merge Firebase items with the initial items
            items = [...items, ...Object.values(firebaseItems)];
            // Remove duplicates and undefined items
            items = Array.from(new Set(items.filter(item => item && item.name).map(item => JSON.stringify(item))))
                .map(item => JSON.parse(item));
            // Sort items by name, handling potential undefined names
            items.sort((a, b) => {
                if (!a.name) return 1;
                if (!b.name) return -1;
                return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
            });
        }
    });
}

let parties = ["PARTY A - AREA1", "PARTY B - AREA2", "PARTY C - AREA3", "XYLO - AREA4"];
const partySearch = document.getElementById('partySearch');
const partyList = document.getElementById('partyList');

partySearch.addEventListener('focus', () => showParties());
partySearch.addEventListener('input', () => showParties(partySearch.value));

document.addEventListener('click', function (e) {
    if (e.target !== partySearch && !partyList.contains(e.target)) {
        partyList.style.display = 'none';
    }
});
function sortParties() {
    parties.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

function showParties(filter = '') {
    partyList.innerHTML = '';
    const filteredParties = parties.filter(party =>
        party.toLowerCase().includes(filter.toLowerCase())
    );

    filteredParties.forEach(party => {
        const item = document.createElement('a');
        item.classList.add('list-group-item', 'list-group-item-action');
        item.textContent = party;
        item.href = '#';
        item.addEventListener('click', function (e) {
            e.preventDefault();
            partySearch.value = party;
            partyList.style.display = 'none';
        });
        partyList.appendChild(item);
    });

    if (filteredParties.length === 0 && filter !== '') {
        const addNewItem = document.createElement('a');
        addNewItem.classList.add('list-group-item', 'list-group-item-action');
        addNewItem.textContent = `Add "${filter}" as a new party`;
        addNewItem.href = '#';
        addNewItem.addEventListener('click', function (e) {
            e.preventDefault();
            addNewParty(filter); // Change this line from addNewItem to addNewParty
        });
        partyList.appendChild(addNewItem);
    }

    partyList.style.display = 'block';
}
function addNewParty(partyInput) {
const [partyName, area] = partyInput.split(' - ').map(s => s.trim());
if (!partyName || !area) {
alert('Please enter the party name and area in the format "PARTYNAME - AREA"');
return;
}

const fullPartyName = `${partyName} - ${area}`;
if (!parties.includes(fullPartyName)) {
parties.push(fullPartyName);
sortParties();
// Save to Firebase
firebase.database().ref('parties').set(parties);
console.log(`Added new party: ${fullPartyName}`);

// Log the activity
const now = new Date();
const activityLog = {
action: 'Created new party',
partyName: fullPartyName,
timestamp: now.toISOString(),
date: now.toLocaleDateString(),
time: now.toLocaleTimeString(),
username: username
};
firebase.database().ref('activityLogs').push(activityLog);

// Send Telegram message
const chatId = '-4527298165';
const botToken = '7401966895:AAFu7gNrOPhMXJQNJTRk4CkK4TjRr09pxUs';
const message = `${username}: created new party ${fullPartyName}`;
const url = `https://api.telegram.org/bot${botToken}/sendMessage?chat_id=${chatId}&text=${encodeURIComponent(message)}`;

fetch(url)
.then(response => response.json())
.then(data => console.log('Telegram message sent:', data))
.catch(error => console.error('Error sending Telegram message:', error));
}
partySearch.value = fullPartyName;
partyList.style.display = 'none';
}
// Existing code
function createCategoryRadios(categories) {
return `
<div class="category-container">
${categories.map((cat, index) => `
    <label>
        <input type="radio" name="category" value="${cat}" ${index === 0 ? 'checked' : ''}>
        ${cat}
    </label>
`).join('')}
</div>
`;
}

function showParties(filter = '') {
partyList.innerHTML = '';
const filteredParties = parties.filter(party =>
party.toLowerCase().includes(filter.toLowerCase())
);

filteredParties.forEach(party => {
const item = document.createElement('a');
item.classList.add('list-group-item', 'list-group-item-action');
item.textContent = party;
item.href = '#';
item.addEventListener('click', function (e) {
e.preventDefault();
partySearch.value = party;
partyList.style.display = 'none';
});
partyList.appendChild(item);
});

if (filteredParties.length === 0 && filter !== '') {
const addNewItem = document.createElement('a');
addNewItem.classList.add('list-group-item', 'list-group-item-action');
addNewItem.textContent = `Add "${filter}" as a new party`;
addNewItem.href = '#';
addNewItem.addEventListener('click', function (e) {
e.preventDefault();
addNewParty(filter);
});
partyList.appendChild(addNewItem);
}

partyList.style.display = 'block';
}
function showItemDetails(item) {
const existingDetailsContainer = document.getElementById('itemDetailsContainer');
if (existingDetailsContainer) {
existingDetailsContainer.remove();
}

const detailsContainer = document.createElement('div');
detailsContainer.id = 'itemDetailsContainer';
detailsContainer.innerHTML = `
${item.category ? createCategoryRadios(item.category) : ''}
${createSizeQuantityGrid(item.sizes)}
`;

const itemList = document.getElementById('itemList');
itemList.insertAdjacentElement('afterend', detailsContainer);
}


function createSizeQuantityGrid(sizes) {
const quantities = ['1', '2', '3', '4', '5', '_'];
return `
<div class="size-quantity-grid">
${sizes.map(size => `
    <div class="size-quantity-row">
        <div class="size-cell">${size}</div>
        <div class="quantity-cell">
            ${quantities.map(qty => `
                <label class="qty-label">
                    <input type="radio" name="qty_${size}" value="${qty}">
                    ${qty === '_' ? `<input type="number" class="custom-qty" min="1" style="width: 40px;" inputmode="numeric" oninput="this.previousElementSibling.checked = true;">` : qty}
                </label>
            `).join('')}
        </div>
    </div>
`).join('')}
</div>
`;
}

createCartSummaryTable();

document.getElementById('addToCartBtn').addEventListener('click', addToCart);
document.getElementById('saveOrderBtn').addEventListener('click', showOrderSummaryModal);