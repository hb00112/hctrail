function logActivity(action, username) {
    const now = new Date();
    const activityLog = {
        action: action,
        username: username,
        timestamp: now.toISOString(),
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString()
    };
    firebase.database().ref('activityLogs').push(activityLog);
}

function loadActivityLogs() {
    const activityLogsSection = document.getElementById('activityLogs');
    const logList = document.createElement('ul');
    logList.className = 'list-group';

    firebase.database().ref('activityLogs').orderByChild('timestamp').limitToLast(50).on('value', (snapshot) => {
        logList.innerHTML = ''; // Clear existing logs
        const logs = [];
        snapshot.forEach((childSnapshot) => {
            logs.push(childSnapshot.val());
        });
        logs.reverse().forEach((log) => {
            const listItem = document.createElement('li');
            listItem.className = 'list-group-item';

            // Format date and time consistently
            const dateTime = new Date(log.timestamp);
            const formattedDateTime = dateTime.toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });

            let logMessage = `${formattedDateTime}: ${log.username}: ${log.action}`;
            if (log.action === 'Created new party' && log.partyName) {
                logMessage += ` "${log.partyName}"`;
            }

            listItem.textContent = logMessage;
            logList.appendChild(listItem);
        });
    });


    activityLogsSection.innerHTML = ''; // Clear previous content
    activityLogsSection.appendChild(logList);
}



