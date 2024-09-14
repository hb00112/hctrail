function checkUserStatus() {
    return new Promise((resolve, reject) => {
        const storedUsername = localStorage.getItem('hcUsername');
        if (storedUsername) {
            firebase.database().ref('users').once('value', (snapshot) => {
                const users = snapshot.val();
                if (users && Object.values(users).includes(storedUsername)) {
                    username = storedUsername;
                    document.getElementById('userNameDisplay').textContent = username;
                    console.log('Welcome back, ' + username);
                    resolve('active');
                } else {
                    firebase.database().ref('approvalRequests').once('value', (snapshot) => {
                        const requests = snapshot.val();
                        if (requests && Object.values(requests).includes(storedUsername)) {
                            resolve('pending');
                        } else {
                            localStorage.removeItem('hcUsername');
                            resolve('new');
                        }
                    });
                }
            });
        } else {
            resolve('new');
        }
    });
}

function registerUser() {
    let usernameModal = new bootstrap.Modal(document.getElementById('usernameModal'), {
        backdrop: 'static',
        keyboard: false
    });
    usernameModal.show();

    document.getElementById('saveUsername').addEventListener('click', function () {
        let inputUsername = document.getElementById('usernameInput').value.trim();
        if (inputUsername) {
            // Show loading animation
            usernameModal.hide();
            document.body.innerHTML += '<div class="fullscreen-overlay" id="loadingOverlay"><div class="approval-content"><h1>Submitting Request</h1><div class="loading-animation"><div class="circle"></div><div class="circle"></div><div class="circle"></div></div></div></div>';

            firebase.database().ref('approvalRequests').push(inputUsername).then(() => {
                localStorage.setItem('hcUsername', inputUsername);
                logActivity('New user registration request', inputUsername);

                // Remove loading overlay and show pending approval screen
                document.getElementById('loadingOverlay').remove();
                document.getElementById('pendingApprovalScreen').style.display = 'flex';
            });
        } else {
            alert('Please enter a valid username.');
        }
    });
}
