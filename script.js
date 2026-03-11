const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzdSUwU_MXUMNsLYQvaLfPQUOpwmgDcGuIQthRBb7eQy-g_qtqryu52duFSp5xJvjO-Ww/exec";
const ADMIN_PASS = "cath794613";
const TEMPLATE_ID = "1ywg3x0rd047iGfC9A870MXZKG_hqS6FbIWQpNifxMRQ"; 

let isAdmin = false;
let currentLogs = [];
let lastRefGenerated = ""; 

let systemConfig = {
    prefix: "PIS/JPA/08/03/01",
    jilid: "Jld 12",
    sequence: 90 
};

window.onload = function() {
    const savedConfig = JSON.parse(localStorage.getItem('memo_config'));
    if (savedConfig) systemConfig = savedConfig;
    updateLabel();
    refreshData();
};

function updateLabel() {
    document.getElementById('system-ref-label').innerText = `${systemConfig.prefix}/${systemConfig.jilid}`;
}

async function refreshData() {
    try {
        const response = await fetch(SCRIPT_URL);
        const data = await response.json();
        currentLogs = Array.isArray(data) ? data : [];
        renderLogs([...currentLogs].reverse());
    } catch (e) {
        document.getElementById('log-body').innerHTML = "<tr><td colspan='5' style='text-align:center; color:red;'>Ralat sambungan Cloud.</td></tr>";
    }
}

function renderLogs(logs) {
    const tbody = document.getElementById('log-body');
    if (!logs || logs.length === 0) {
        tbody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Tiada rekod.</td></tr>";
        return;
    }
    const now = new Date();
    tbody.innerHTML = logs.map((log) => {
        let canStaffEdit = false;
        if (log.timestamp) {
            const createdTime = new Date(log.timestamp);
            const diffInMinutes = (now - createdTime) / 1000 / 60;
            if (diffInMinutes <= 5) canStaffEdit = true;
        }
        const canEdit = isAdmin || (log.status === 'Pending' && canStaffEdit);
        const lockIcon = (!isAdmin && log.status === 'Pending' && !canStaffEdit) ? " 🔒" : "";

        return `
        <tr>
            <td><strong>${log.ref}</strong>${lockIcon}</td>
            <td>${canEdit ? `<input type="text" value="${log.name}" onchange="updateCell('${log.ref}', 'name', this.value)">` : log.name}</td>
            <td>${canEdit ? `<input type="text" value="${log.agenda}" onchange="updateCell('${log.ref}', 'agenda', this.value)">` : log.agenda}</td>
            <td><span class="status-pill ${(log.status || 'Pending').toLowerCase()}">${log.status}</span></td>
            <td>
                <div style="display:flex; gap:8px; align-items:center;">
                    ${log.status === 'Pending' ? 
                        `<button onclick="submitLink('${log.ref}')" style="font-size:0.7rem;">Link</button>` : 
                        (isAdmin ? `<a href="${log.link}" target="_blank" style="text-decoration:none;">🔗</a>` : `<span style="color:green; font-size:0.8rem;">✔️ Sedia</span>`)
                    }
                    ${isAdmin ? `<button onclick="deleteEntry('${log.ref}')" style="background:none; border:none; color:red; cursor:pointer; font-size:1.1rem;">🗑️</button>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
}

async function generateReference() {
    const nameInput = document.getElementById('staff-name');
    const agendaInput = document.getElementById('agenda-title');
    const btn = document.getElementById('gen-btn');

    if (!nameInput.value || !agendaInput.value) return alert("Sila isi Nama dan Agenda.");

    btn.disabled = true;
    btn.innerText = "Sila tunggu...";

    try {
        const response = await fetch(SCRIPT_URL);
        const latestData = await response.json();
        currentLogs = Array.isArray(latestData) ? latestData : [];

        let highestNo = systemConfig.sequence;
        currentLogs.forEach(log => {
            const match = log.ref.match(/\( (\d+) \)/);
            if (match) {
                const num = parseInt(match[1]);
                if (num > highestNo) highestNo = num;
            }
        });

        const nextNo = highestNo + 1;
        lastRefGenerated = `${systemConfig.prefix}/${systemConfig.jilid} ( ${nextNo} )`;
        
        navigator.clipboard.writeText(lastRefGenerated);
        document.getElementById('new-ref-display').innerText = lastRefGenerated;
        document.getElementById('result-display').classList.remove('hidden');

        await fetch(SCRIPT_URL, {
            method: "POST",
            mode: "no-cors",
            body: JSON.stringify({ action: 'add', ref: lastRefGenerated, name: nameInput.value.toUpperCase(), agenda: agendaInput.value.toUpperCase() })
        });

        nameInput.value = ""; 
        agendaInput.value = "";
        setTimeout(refreshData, 2000);

    } catch (e) {
        alert("Ralat sambungan.");
    } finally {
        btn.disabled = false;
        btn.innerText = "🚀 JANA NOMBOR RUJUKAN";
    }
}

function openTemplate() {
    const ref = document.getElementById('new-ref-display').innerText;
    if (!ref || ref === "-") return alert("Jana nombor dahulu!");

    const finalURL = `https://docs.google.com/document/d/${TEMPLATE_ID}/copy?title=${encodeURIComponent("MEMO - " + ref)}`;
    const win = window.open(finalURL, '_blank');
    if (!win) {
        if(confirm("Popup dihalang. Klik OK untuk buka di sini.")) {
            window.location.href = finalURL;
        }
    }
}

async function submitLink(ref) {
    const url = prompt("Masukkan pautan Google Drive:");
    if (!url) return;
    await fetch(SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ action: 'updateStatus', ref: ref, link: url }) });
    setTimeout(refreshData, 1500);
}

async function updateCell(ref, field, newValue) {
    await fetch(SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ action: 'editEntry', ref: ref, field: field, value: newValue.toUpperCase() }) });
}

async function deleteEntry(ref) {
    if (!confirm("Padam?")) return;
    await fetch(SCRIPT_URL, { method: "POST", mode: "no-cors", body: JSON.stringify({ action: 'deleteEntry', ref: ref }) });
    setTimeout(refreshData, 1500);
}

function adminLogin() {
    if (!isAdmin) {
        document.getElementById('login-modal').classList.remove('hidden');
        document.getElementById('admin-password-input').focus();
    } else {
        isAdmin = false;
        document.getElementById('admin-btn').innerText = "🔒 Mod Staf";
        document.getElementById('admin-settings-panel').classList.add('hidden');
        document.getElementById('admin-controls').classList.add('hidden');
        refreshData(); 
    }
}

function verifyAdmin() {
    const input = document.getElementById('admin-password-input
