const sendTime = '09:19'; // 1:34 PM

async function sendPartyNamesToTelegram() {
    // Retrieve the parties from Firebase
    const partiesRef = firebase.database().ref('parties');
    const partiesSnapshot = await partiesRef.once('value');
    const parties = partiesSnapshot.val();

    // Create a simple array of party names
    const partyNames = parties || [];

    // Create a JSON string from the party names array
    const jsonData = JSON.stringify(partyNames);

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
    const fileName = `partydata_${year}${month}${day}.json`;

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
            console.log('Telegram message sent:', data);

            // Create a backup details object
            const backupDetails = {
                type: 'Party Data',
                date: `${year}-${month}-${day}`,
                time: `${hour}:${minute}:${second}`,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            };

            // Add the backup details to Firebase
            firebase.database().ref('backupDetails').push(backupDetails);

            // Update the last backup date in Firebase
            firebase.database().ref('lastBackup').set({
                date: date.toDateString(),
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });

            // Refresh the backup details table
            loadBackupDetails();
        })
        .catch(error => console.error('Error sending Telegram message:', error));
}

// Function to load and display backup details
function loadBackupDetails() {
    const backupDetailsTable = document.getElementById('backup-details-table');
    const tableBody = backupDetailsTable.getElementsByTagName('tbody')[0];
    tableBody.innerHTML = ''; // Clear existing rows

    firebase.database().ref('backupDetails').orderByChild('timestamp').limitToLast(10).once('value', (snapshot) => {
        const backups = [];
        snapshot.forEach((childSnapshot) => {
            backups.push(childSnapshot.val());
        });

        backups.reverse().forEach((backup) => {
            const newRow = tableBody.insertRow();
            const typeCell = newRow.insertCell();
            const dateCell = newRow.insertCell();
            const timeCell = newRow.insertCell();
            typeCell.textContent = backup.type;
            dateCell.textContent = backup.date;
            timeCell.textContent = backup.time;
        });
    });
}

// Function to check if it's time to send the data
function checkSendTime() {
    const currentTime = new Date();
    const currentTimeString = `${currentTime.getHours()}:${currentTime.getMinutes()}`;

    // Check if it's past the specified time and if the backup hasn't been sent today
    if (currentTimeString >= sendTime || currentTime.getHours() >= parseInt(sendTime.split(':')[0])) {
        checkAndSendBackup();
    }
}

// Function to check if backup should be sent
function checkAndSendBackup() {
    firebase.database().ref('lastBackup').once('value', (snapshot) => {
        const lastBackup = snapshot.val();
        const today = new Date().toDateString();

        if (!lastBackup || lastBackup.date !== today) {
            sendPartyNamesToTelegram();
        }
    });
}

function resetDailyBackupFlag() {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
        firebase.database().ref('lastBackup').remove();
    }
}
function resetDailyBackupFlag() {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
        firebase.database().ref('lastBackup').remove();
    }
}

