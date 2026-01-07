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
    if(!user || !pass || !shop) return alert("Fill details");
    users[user] = { pass, shop };
    data[user] = {};
    localStorage.setItem('bk_users', JSON.stringify(users));
    localStorage.setItem('bk_data', JSON.stringify(data));
    alert("Success! Login now.");
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
    } else alert("Invalid Login");
}

function showSection(id) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-links button').forEach(b => b.classList.remove('active'));
    document.getElementById('section-' + id).classList.add('active');
    document.getElementById('nav-' + id).classList.add('active');
}

// --- Autocomplete ---
function showSuggestions(val) {
    const list = document.getElementById('suggestions');
    const customers = Object.keys(data[currentUser]);
    list.innerHTML = '';
    if (!val) { list.style.display = 'none'; return; }
    const filtered = customers.filter(c => c.toLowerCase().startsWith(val.toLowerCase()));
    if (filtered.length > 0) {
        list.style.display = 'block';
        filtered.forEach(name => {
            const li = document.createElement('li');
            li.innerText = name;
            li.onclick = () => { document.getElementById('c-name').value = name; 
                                 document.getElementById('c-phone').value = data[currentUser][name].phone || '';
                                 list.style.display = 'none'; };
            list.appendChild(li);
        });
    } else { list.style.display = 'none'; }
}

function setEntryType(t) {
    currentType = t;
    document.getElementById('type-debit').classList.toggle('active', t==='debit');
    document.getElementById('type-credit').classList.toggle('active', t==='get');
}

// --- Core Transaction ---
function saveTransaction() {
    const name = document.getElementById('c-name').value.trim();
    const phone = document.getElementById('c-phone').value.trim();
    const amt = parseFloat(document.getElementById('t-amount').value);
    const detail = document.getElementById('i-detail').value || '---';

    if(!name || isNaN(amt) || !phone) return alert("Enter Name, Phone & Amount");

    if(!data[currentUser][name]) data[currentUser][name] = { phone: phone, entries: [] };
    else data[currentUser][name].phone = phone;

    const now = new Date();
    data[currentUser][name].entries.push({
        detail, amt, type: currentType, 
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    localStorage.setItem('bk_data', JSON.stringify(data));
    document.getElementById('c-name').value = '';
    document.getElementById('c-phone').value = '';
    document.getElementById('t-amount').value = '';
    document.activeElement.blur();
    refreshUI();
}

function refreshUI() {
    let net = 0;
    const histBody = document.getElementById('history-body');
    histBody.innerHTML = '';
    let allLogs = [];
    for(let name in data[currentUser]) {
        data[currentUser][name].entries.forEach(log => {
            net += (log.type === 'credit' ? log.amt : -log.amt);
            allLogs.push({name, ...log});
        });
    }
    const balEl = document.getElementById('net-balance');
    balEl.innerText = (net >= 0 ? '+' : '-') + '$' + Math.abs(net);
    balEl.style.color = net >= 0 ? 'var(--credit-color)' : 'var(--debit-color)';
    
    allLogs.reverse().slice(0, 10).forEach(log => {
        histBody.innerHTML += `<tr>
            <td>${log.date}<span class="time-text">${log.time}</span></td>
            <td><b>${log.name}</b></td><td>${log.detail}</td>
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
    for(let name in data[currentUser]) {
        if(!name.toLowerCase().includes(search)) continue;
        const cust = data[currentUser][name];
        let bal = cust.entries.reduce((acc, log) => log.type === 'credit' ? acc + log.amt : acc - log.amt, 0);
        let statusClass = bal === 0 ? 'status-null' : (bal > 0 ? 'status-advance' : 'status-due');
        let statusText = bal === 0 ? 'Settled' : (bal > 0 ? 'Advance' : 'Due');

        tbody.innerHTML += `<tr>
            <td><b>${name}</b><br><small>${cust.phone}</small></td>
            <td class="${statusClass}">${statusText}</td>
            <td><b>$${Math.abs(bal)}</b></td>
            <td>
                <a href="javascript:void(0)" class="whatsapp-btn" onclick="sendWhatsApp('${name}')">🟢</a>
                <button class="dots-btn" onclick="openStatement('${name}')">&#8942;</button>
            </td>
        </tr>`;
    }
}

function sendWhatsApp(name) {
    const cust = data[currentUser][name];
    let bal = cust.entries.reduce((acc, log) => log.type === 'credit' ? acc + log.amt : acc - log.amt, 0);
    const msg = `Hello ${name}, your balance at ${users[currentUser].shop} is ₹${Math.abs(bal)} (${bal >= 0 ? 'Advance' : 'Pending'}). Please clear it.`;
    window.open(`https://wa.me/${cust.phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

function openStatement(name) {
    const mBody = document.getElementById('modal-body');
    document.getElementById('modal-cust-name').innerText = name;
    mBody.innerHTML = '';
    const logs = data[currentUser][name].entries;
    logs.slice().reverse().forEach(log => {
        mBody.innerHTML += `<tr>
            <td>${log.date}<br><small>${log.time}</small></td>
            <td>${log.detail}</td>
            <td style="color:${log.type==='credit'?'var(--credit-color)':'var(--debit-color)'}; font-weight:bold;">${log.type.toUpperCase()}</td>
            <td>$${log.amt}</td>
        </tr>`;
    });
    document.getElementById('statement-modal').style.display = 'flex';
}

function closeModal() { document.getElementById('statement-modal').style.display = 'none'; }
window.onclick = function(e) { if(e.target.className === 'modal') closeModal(); }