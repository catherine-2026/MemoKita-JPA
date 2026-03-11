const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzdSUwU_MXUMNsLYQvaLfPQUOpwmgDcGuIQthRBb7eQy-g_qtqryu52duFSp5xJvjO-Ww/exec";
const ADMIN_PASS = "cath794613";
const TEMPLATE_ID = "1ywg3x0rd047iGfC9A870MXZKG_hqS6FbIWQpNifxMRQ"; // ID Template anda

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
                        (isAdmin ? 
                            `<a href="${log.link}" target="_blank" style="text-decoration:none;">🔗</a>` : 
                            `<span style="color:green; font-size:0.8rem;">✔️ Sedia</span>`
                        )
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
    const btn = document.getElementById('gen-btn'); // Pastikan ID butang di HTML anda ialah "gen-btn"

    if (!nameInput.value || !agendaInput.value) return alert("Sila isi Nama dan Agenda.");

    btn.disabled = true;
    btn.innerText = "Sila tunggu...";

    try {
        const response = await fetch(SCRIPT_URL);
        const latestData = await response.json();
        currentLogs = Array.isArray(latestData) ? latestData : [];

        // Smart Sequence: Cari nombor tertinggi dalam rekod sedia ada
        let highestNo = systemConfig.sequence;
        currentLogs.forEach(log => {
            const match = log.ref.match(/\( (\d+) \)/);
            if (match) {
                const num = parseInt(match[1]);
                if (num > highestNo) highestNo = num;
            }
