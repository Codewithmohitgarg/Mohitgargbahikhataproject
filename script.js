// Local Storage Initialization
let users = JSON.parse(localStorage.getItem('bk_users')) || {};
let data = JSON.parse(localStorage.getItem('bk_data')) || {};
let currentUser = null;
let currentType = 'debit';

// --- Auth Functions ---
function toggleAuth(isSignup) {
    document.getElementById('login-form').style.display = isSignup ? 'none' : 'block';
    document.getElementById('signup-form').style.display = isSignup ? 'block' : 'none';
}

function handleSignup() {
    const shop = document.getElementById('s-name').value;
    const user = document.getElementById('s-user').value.trim();
    const pass = document.getElementById('s-pass').value;
    if(!user || !pass || !shop) return alert("Please fill all details");
    
    if(users[user]) return alert("Username already exists");

    users[user] = { pass, shop };
    data[user] = {};
    localStorage.setItem('bk_users', JSON.stringify(users));
    localStorage.setItem('bk_data', JSON.stringify(data));
    alert("Shop Registered Successfully!");
    toggleAuth(false);
}

function handleLogin() {
    const u = document.getElementById('l-user').value.trim();
    const p = document.getElementById('l-pass').value;
    if(users[u] && users[u].pass === p) {
        currentUser = u;
        document.getElementById('auth-view').style.display = 'none';
        document.getElementById('app-view').style.display = 'block';
        document.getElementById('shop-display-name').innerText = users[u].shop;
        refreshUI();
    } else {
        alert("Invalid Username or Password");
    }
}

// --- Navigation ---
function showSection(id) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));
    document.getElementById('section-' + id).classList.add('active');
    document.getElementById('nav-' + id).classList.add('active');
}

// --- Autocomplete Suggestions ---
function showSuggestions(val) {
    const list = document.getElementById('suggestions');
    if (!currentUser || !data[currentUser]) return;
    
    const customers = Object.keys(data[currentUser]);
    list.innerHTML = '';
    
    if (!val) { list.style.display = 'none'; return; }

    const filtered = customers.filter(c => c.toLowerCase().startsWith(val.toLowerCase()));
    
    if (filtered.length > 0) {
        list.style.display = 'block';
        filtered.forEach(name => {
            const li = document.createElement('li');
            li.innerText = name;
            li.onclick = () => { 
                document.getElementById('c-name').value = name; 
                list.style.display = 'none'; 
            };
            list.appendChild(li);
        });
    } else { 
        list.style.display = 'none'; 
    }
}

// --- Entry Logic ---
function setEntryType(type) {
    currentType = type;
    document.getElementById('type-debit').classList.toggle('active', type === 'debit');
    document.getElementById('type-credit').classList.toggle('active', type === 'credit');
}

function saveTransaction() {
    const name = document.getElementById('c-name').value.trim();
    const amt = parseFloat(document.getElementById('t-amount').value);
    const detail = document.getElementById('i-detail').value || 'No detail';
    
    if(!name || isNaN(amt)) return alert("Please enter Customer Name and Amount");

    if(!data[currentUser][name]) data[currentUser][name] = [];
    
    const now = new Date();
    data[currentUser][name].push({
        detail, 
        amt, 
        type: currentType, 
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    localStorage.setItem('bk_data', JSON.stringify(data));
    
    // Clear inputs
    document.getElementById('c-name').value = '';
    document.getElementById('t-amount').value = '';
    document.getElementById('i-detail').value = '';
    
    refreshUI();
}

// --- UI Rendering ---
function refreshUI() {
    let net = 0;
    const histBody = document.getElementById('history-body');
    histBody.innerHTML = '';
    let allLogs = [];

    const userStore = data[currentUser];
    for(let name in userStore) {
        userStore[name].forEach(log => {
            net += (log.type === 'credit' ? log.amt : -log.amt);
            allLogs.push({name, ...log});
        });
    }

    const balEl = document.getElementById('net-balance');
    balEl.innerText = (net >= 0 ? '+' : '-') + '$' + Math.abs(net);
    balEl.style.color = net >= 0 ? 'var(--credit-color)' : 'var(--debit-color)';
    
    // Show 8 most recent transactions globally
    allLogs.reverse().slice(0, 8).forEach(log => {
        histBody.innerHTML += `<tr>
            <td>${log.date}<span class="time-text">${log.time}</span></td>
            <td><b>${log.name}</b></td>
            <td>${log.detail}</td>
            <td style="color:${log.type==='credit'?'var(--credit-color)':'var(--debit-color)'}; font-weight:bold;">${log.type.toUpperCase()}</td>
            <td>$${log.amt}</td>
        </tr>`;
    });
    
    renderLedger();
}

function renderLedger() {
    const tbody = document.getElementById('ledger-body');
    const search = document.getElementById('search-box').value.toLowerCase();
    tbody.innerHTML = '';
    
    const userStore = data[currentUser];
    for(let name in userStore) {
        if(!name.toLowerCase().includes(search)) continue;
        
        let bal = userStore[name].reduce((acc, log) => log.type === 'credit' ? acc + log.amt : acc - log.amt, 0);
        
        let statusClass, statusText;
        if(bal === 0) {
            statusClass = 'status-null';
            statusText = 'NULL (Settled)';
        } else if(bal > 0) {
            statusClass = 'status-advance';
            statusText = 'Advance Received';
        } else {
            statusClass = 'status-due';
            statusText = 'Payment Due';
        }

        tbody.innerHTML += `<tr>
            <td><b>${name}</b></td>
            <td class="${statusClass}">${statusText}</td>
            <td><b>$${Math.abs(bal)}</b></td>
            <td><button class="dots-btn" onclick="openStatement('${name}')">&#8942;</button></td>
        </tr>`;
    }
}

// --- Modal Functions ---
function openStatement(name) {
    const mBody = document.getElementById('modal-body');
    document.getElementById('modal-cust-name').innerText = name;
    mBody.innerHTML = '';
    
    const entries = data[currentUser][name];
    let bal = entries.reduce((acc, log) => log.type === 'credit' ? acc + log.amt : acc - log.amt, 0);
    
    const mStatus = document.getElementById('modal-cust-status');
    mStatus.innerText = (bal === 0 ? "Account Settled" : (bal > 0 ? "Advance: " : "Balance Due: ") + "$" + Math.abs(bal));
    mStatus.className = (bal === 0 ? 'status-null' : (bal > 0 ? 'status-advance' : 'status-due'));

    entries.slice().reverse().forEach(log => {
        mBody.innerHTML += `<tr>
            <td>${log.date}<br><small>${log.time}</small></td>
            <td>${log.detail}</td>
            <td style="color:${log.type==='credit'?'var(--credit-color)':'var(--debit-color)'}; font-weight:bold;">${log.type.toUpperCase()}</td>
            <td>$${log.amt}</td>
        </tr>`;
    });
    
    document.getElementById('statement-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('statement-modal').style.display = 'none';
}

// Click outside to close
window.onclick = function(e) { 
    if(e.target.className === 'modal') closeModal();
    if(e.target.id !== 'c-name') document.getElementById('suggestions').style.display = 'none';
}