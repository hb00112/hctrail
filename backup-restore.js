const backupModal = document.getElementById('backupModal');
const restoreModal = document.getElementById('restoreModal');
const dataSelectionModal = new bootstrap.Modal(document.getElementById('dataSelectionModal'));
const uploadButton = document.getElementById('uploadRestoreFile');
const selectAllCheckbox = document.getElementById('selectAllCheckbox');
const restoreSelectedButton = document.getElementById('restoreSelectedData');
let uploadedData = [];

function downloadBackup(dataType) {
    firebase.database().ref('parties').once('value')
        .then((snapshot) => {
            const data = snapshot.val();
            const jsonData = JSON.stringify(data);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            const date = new Date().toISOString().replace(/[:.]/g, '-');
            a.href = url;
            a.download = `${dataType}_${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            console.log('Backup downloaded successfully');
        })
        .catch((error) => {
            console.error('Error creating backup:', error);
        });
}

function sendBackup(dataType) {
    firebase.database().ref('parties').once('value')
        .then((snapshot) => {
            const data = snapshot.val();
            const jsonData = JSON.stringify(data);

            const chatId = '-4527298165';
            const botToken = '7401966895:AAFu7gNrOPhMXJQNJTRk4CkK4TjRr09pxUs';
            const date = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `${dataType}_${date}.json`;

            const formData = new FormData();
            formData.append('document', new Blob([jsonData], { type: 'application/json' }), fileName);

            fetch(`https://api.telegram.org/bot${botToken}/sendDocument?chat_id=${chatId}`, {
                method: 'POST',
                body: formData
            })
                .then(response => response.json())
                .then(result => {
                    console.log('Backup sent successfully:', result);
                })
                .catch(error => {
                    console.error('Error sending backup:', error);
                });
        })
        .catch((error) => {
            console.error('Error creating backup:', error);
        });
}

function sendItemsToTelegram() {
    firebase.database().ref('items').once('value')
        .then((snapshot) => {
            const items = snapshot.val();
            const jsonData = JSON.stringify(items);

            // Create a blob from the JSON data
            const blob = new Blob([jsonData], { type: 'application/json' });

            // Get the current date and time
            const date = new Date();
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hour = String(date.getHours()).padStart(2, '0');
            const minute = String(date.getMinutes()).padStart(2, '0');
            const second = String(date.getSeconds()).padStart(2, '0');

            // Create a file name
            const fileName = `itemdata_${year}${month}${day}.json`;

            // Create a file from the blob
            const file = new File([blob], fileName, { type: 'application/json' });

            // Create a form data object
            const formData = new FormData();
            formData.append('document', file);

            // Send the file to Telegram
            const url = `https://api.telegram.org/bot7401966895:AAFu7gNrOPhMXJQNJTRk4CkK4TjRr09pxUs/sendDocument?chat_id=-4527298165`;
            fetch(url, {
                method: 'POST',
                body: formData,
            })
                .then(response => response.json())
                .then(data => {
                    console.log('Item data sent to Telegram:', data);

                    // Create a backup details object
                    const backupDetails = {
                        type: 'Item Data',
                        date: `${year}-${month}-${day}`,
                        time: `${hour}:${minute}:${second}`,
                        timestamp: firebase.database.ServerValue.TIMESTAMP
                    };

                    // Add the backup details to Firebase
                    firebase.database().ref('backupDetails').push(backupDetails);

                    // Refresh the backup details table
                    loadBackupDetails();

                    // Log the activity
                    logActivity('Sent item backup to Telegram', username);

                    alert('Item data has been sent to Telegram successfully!');
                })
                .catch(error => {
                    console.error('Error sending item data to Telegram:', error);
                    alert('Error sending item data to Telegram. Please try again.');
                });
        })
        .catch((error) => {
            console.error('Error creating item backup:', error);
            alert('Error creating item backup. Please try again.');
        });
}

// Function to download Item data
function downloadItemBackup() {
    firebase.database().ref('items').once('value')
        .then((snapshot) => {
            const data = snapshot.val();
            const jsonData = JSON.stringify(data);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            const date = new Date().toISOString().replace(/[:.]/g, '-');
            a.href = url;
            a.download = `itemdata_${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            console.log('Item backup downloaded successfully');
            logActivity('Downloaded item backup', username);
            alert('Item backup has been downloaded successfully!');
        })
        .catch((error) => {
            console.error('Error creating item backup:', error);
            alert('Error creating item backup. Please try again.');
        });
}

function handleFileUpload() {
    const fileInput = document.getElementById('restoreFile');
    const file = fileInput.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const jsonData = JSON.parse(e.target.result);
                processUploadedData(jsonData);
            } catch (error) {
                console.error('Error parsing JSON:', error);
                alert('Invalid JSON file. Please try again.');
            }
        };
        reader.readAsText(file);
    } else {
        alert('Please select a file to upload.');
    }
}

function processUploadedData(data) {
    // Check if the data is an array (party names) or an object (item data)
    if (Array.isArray(data)) {
        // Handle party data
        firebase.database().ref('parties').once('value', (snapshot) => {
            const existingData = snapshot.val() || [];
            uploadedData = data.filter(item => !existingData.includes(item));

            if (uploadedData.length > 0) {
                populateDataSelectionModal(uploadedData, 'party');
                bootstrap.Modal.getInstance(restoreModal).hide();
                dataSelectionModal.show();
            } else {
                alert('No new party data to restore.');
            }
        });
    } else if (typeof data === 'object') {
        // Handle item data
        firebase.database().ref('items').once('value', (snapshot) => {
            const existingData = snapshot.val() || {};
            uploadedData = Object.entries(data).filter(([key, item]) => {
                return !existingData[key] || JSON.stringify(existingData[key]) !== JSON.stringify(item);
            });

            if (uploadedData.length > 0) {
                populateDataSelectionModal(uploadedData, 'item');
                bootstrap.Modal.getInstance(restoreModal).hide();
                dataSelectionModal.show();
            } else {
                alert('No new item data to restore.');
            }
        });
    } else {
        alert('Invalid data format in the uploaded file.');
    }
}
function populateDataSelectionModal(data, dataType) {
    const tbody = document.getElementById('dataSelectionBody');
    tbody.innerHTML = '';
    data.forEach((item, index) => {
        const row = document.createElement('tr');
        if (dataType === 'party') {
            row.innerHTML = `
    <td><input type="checkbox" class="row-checkbox" data-index="${index}"></td>
    <td>${item}</td>
`;
        } else if (dataType === 'item') {
            const [key, itemData] = item;
            row.innerHTML = `
    <td><input type="checkbox" class="row-checkbox" data-index="${index}"></td>
    <td>${itemData.name}</td>
    <td>${itemData.category ? itemData.category.join(', ') : 'N/A'}</td>
    <td>${itemData.sizes ? itemData.sizes.join(', ') : 'N/A'}</td>
`;
        }
        tbody.appendChild(row);
    });

    // Update modal title
    document.querySelector('#dataSelectionModal .modal-title').textContent =
        `Select ${dataType === 'party' ? 'Parties' : 'Items'} to Restore`;

    // Store the data type for use in restoreSelectedData
    document.getElementById('dataSelectionModal').setAttribute('data-type', dataType);
}

function handleSelectAll() {
    const isChecked = selectAllCheckbox.checked;
    document.querySelectorAll('.row-checkbox').forEach(checkbox => {
        checkbox.checked = isChecked;
    });
}

function restoreSelectedData() {
    const selectedIndices = Array.from(document.querySelectorAll('.row-checkbox:checked'))
        .map(checkbox => parseInt(checkbox.getAttribute('data-index')));

    const dataType = document.getElementById('dataSelectionModal').getAttribute('data-type');
    const dataToRestore = selectedIndices.map(index => uploadedData[index]);

    if (dataToRestore.length > 0) {
        if (dataType === 'party') {
            firebase.database().ref('parties').once('value', (snapshot) => {
                const existingData = snapshot.val() || [];
                const updatedData = [...new Set([...existingData, ...dataToRestore])];

                firebase.database().ref('parties').set(updatedData)
                    .then(() => {
                        alert('Selected parties restored successfully!');
                        dataSelectionModal.hide();
                        loadPartyMaster(); // Refresh the party master view
                        logActivity('Restored parties', username);
                    })
                    .catch(error => {
                        console.error('Error restoring parties:', error);
                        alert('Error restoring parties. Please try again.');
                    });
            });
        } else if (dataType === 'item') {
            firebase.database().ref('items').once('value', (snapshot) => {
                const existingData = snapshot.val() || {};
                const updatedData = { ...existingData };

                dataToRestore.forEach(([key, item]) => {
                    updatedData[key] = item;
                });

                firebase.database().ref('items').set(updatedData)
                    .then(() => {
                        alert('Selected items restored successfully!');
                        dataSelectionModal.hide();
                        loadItemMaster(); // Refresh the item master view
                        logActivity('Restored items', username);
                    })
                    .catch(error => {
                        console.error('Error restoring items:', error);
                        alert('Error restoring items. Please try again.');
                    });
            });
        }
    } else {
        alert('No data selected for restoration.');
    }
}

backupModal.addEventListener('click', function (event) {
    if (event.target.classList.contains('download-btn')) {
        if (event.target.dataset.type === 'party') {
            downloadBackup('party');
        } else if (event.target.dataset.type === 'item') {
            downloadItemBackup();
        }
    } else if (event.target.classList.contains('send-btn')) {
        if (event.target.dataset.type === 'party') {
            sendPartyNamesToTelegram();
        } else if (event.target.dataset.type === 'item') {
            sendItemsToTelegram();
        }
    }
});

backupModal.addEventListener('click', function (event) {
    if (event.target.classList.contains('download-btn')) {
        downloadBackup(event.target.dataset.type);
    } else if (event.target.classList.contains('send-btn')) {
        sendBackup(event.target.dataset.type);
    }
});

uploadButton.addEventListener('click', handleFileUpload);
selectAllCheckbox.addEventListener('change', handleSelectAll);
restoreSelectedButton.addEventListener('click', restoreSelectedData);

