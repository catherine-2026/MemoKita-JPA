const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzdSUwU_MXUMNsLYQvaLfPQUOpwmgDcGuIQthRBb7eQy-g_qtqryu52duFSp5xJvjO-Ww/exec";
const ADMIN_PASS = "cath794613";

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
        const displayLogs = [...currentLogs].reverse();
        renderLogs(displayLogs);
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
            <td><strong>${log.ref || ''}</strong>${lockIcon}</td>
            <td>${canEdit ? `<input type="text" value="${log.name}" onchange="updateCell('${log.ref}', 'name', this.value)">` : (log.name || '')}</td>
            <td>${canEdit ? `<input type="text" value="${log.agenda}" onchange="updateCell('${log.ref}', 'agenda', this.value)">` : (log.agenda || '')}</td>
            <td><span class="status-pill ${(log.status || 'Pending').toLowerCase()}">${log.status || 'Pending'}</span></td>
            <td>
                <div style="display:flex; gap:8px; align-items:center;">
                    ${log.status === 'Pending' ? `<button onclick="submitLink('${log.ref}')" style="font-size:0.7rem;">Link</button>` : `<a href="${log.link}" target="_blank" style="text-decoration:none;">🔗</a>`}
                    ${isAdmin ? `<button onclick="deleteEntry('${log.ref}')" style="background:none; border:none; color:red; cursor:pointer;">🗑️</button>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
}

async function generateReference() {
    const nameInput = document.getElementById('staff-name');
    const agendaInput = document.getElementById('agenda-title');
    if (!nameInput.value || !agendaInput.value) return alert("Sila isi Nama dan Agenda.");

    const finalSequence = systemConfig.sequence + currentLogs.length + 1;
    lastRefGenerated = `${systemConfig.prefix}/${systemConfig.jilid} ( ${finalSequence} )`;
    
    navigator.clipboard.writeText(lastRefGenerated);
    document.getElementById('new-ref-display').innerText = lastRefGenerated;
    document.getElementById('result-display').classList.remove('hidden');

    await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({ action: 'add', ref: lastRefGenerated, name: nameInput.value.toUpperCase(), agenda: agendaInput.value.toUpperCase() })
    });

    nameInput.value = ""; agendaInput.value = "";
    setTimeout(refreshData, 1500);
}

// SUBMIT LINK WITHOUT ALERT
async function submitLink(ref) {
    const url = prompt("Masukkan pautan Google Drive:");
    if (!url) return;
    
    // UI Feedback: temporary loading text
    document.getElementById('log-body').innerHTML = "<tr><td colspan='5' style='text-align:center;'>Mengemaskini pautan...</td></tr>";

    await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({ action: 'updateStatus', ref: ref, link: url })
    });
    
    setTimeout(refreshData, 1500);
}

async function updateCell(ref, field, newValue) {
    // Updates immediately on change without prompt
    await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({ action: 'editEntry', ref: ref, field: field, value: newValue.toUpperCase() })
    });
}

function openSmartTemplate() {
    const templateID = "1CliH8U7xUWdz6crJcDKJAhdOQ7ExT4lQHcNeBqLzhmY";
    const title = encodeURIComponent(`MEMO - ${lastRefGenerated}`);
    window.open(`https://docs.google.com/document/d/${templateID}/copy?title=${title}`, '_blank');
}

async function deleteEntry(ref) {
    if (!confirm("Padam rujukan ini secara kekal?")) return;
    await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        body: JSON.stringify({ action: 'deleteEntry', ref: ref })
    });
    setTimeout(refreshData, 1500);
}

function sendWhatsappReminder() {
    const pending = currentLogs.filter(l => (l.status || '').toLowerCase() === 'pending');
    if (pending.length === 0) return alert("Semua selesai!");
    let msg = "📢 *REMINDER MEMO PENDING*\n";
    pending.forEach((l, i) => msg += `\n${i+1}. *${l.name}* - ${l.ref}`);
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
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
    const input = document.getElementById('admin-password-input');
    if (input.value === ADMIN_PASS) {
        isAdmin = true;
        document.getElementById('admin-btn').innerText = "🔓 Mod Admin";
        document.getElementById('admin-settings-panel').classList.remove('hidden');
        document.getElementById('admin-controls').classList.remove('hidden');
        document.getElementById('pref-prefix').value = systemConfig.prefix;
        document.getElementById('pref-jilid').value = systemConfig.jilid;
        document.getElementById('pref-seq').value = systemConfig.sequence;
        closeLogin();
        refreshData(); 
    } else { alert("Kata laluan salah."); input.value = ""; }
}

function closeLogin() {
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('admin-password-input').value = "";
}

function updateSystemSettings() {
    systemConfig.prefix = document.getElementById('pref-prefix').value;
    systemConfig.jilid = document.getElementById('pref-jilid').value;
    systemConfig.sequence = parseInt(document.getElementById('pref-seq').value);
    localStorage.setItem('memo_config', JSON.stringify(systemConfig));
    updateLabel();
    alert("Tetapan Admin dikemaskini!");
    refreshData();
}

function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'mm', 'a4');
    doc.text("REKOD PENJEJAK MEMO JPA", 14, 15);
    const data = currentLogs.map(l => [l.ref, l.name, l.agenda, l.status, l.link || '-']);
    doc.autoTable({ head: [['Rujukan', 'Staf', 'Agenda', 'Status', 'Pautan']], body: data, startY: 25 });
    doc.save("Memo_Report.pdf");
}