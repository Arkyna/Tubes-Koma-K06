// === SECURITY CHECK ===
const authToken = localStorage.getItem("token");
const authRole = localStorage.getItem("role");

if (!authToken || authRole !== "admin") {
    alert("⛔ Akses Ditolak: Area Terlarang!");
    window.location.href = "login.html";
}

// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
    loadAdminData();
    setupModalListener();
});

// === 1. LOAD DATA ===
async function loadAdminData(sortBy = 'newest') {
    const tbody = document.getElementById('tableBody');
    
    try {
        const res = await fetch(`${CONFIG.API_URL}/reports?sort_by=${sortBy}`);
        const data = await res.json();

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-5 text-muted">Belum ada data.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(r => `
            <tr>
                <td class="px-4 fw-bold text-secondary">#${r.id}</td>
                <td>
                    <div class="fw-bold text-dark text-truncate" style="max-width: 200px;">${r.title}</div>
                    <small class="text-muted"><i class="fas fa-map-marker-alt me-1"></i>${r.facility}</small>
                    <div class="small text-primary fst-italic mt-1">${r.admin_note || '-'}</div>
                </td>
                <td>
                    ${r.image_url ? 
                        `<a href="${r.image_url}" target="_blank" class="btn btn-sm btn-outline-info"><i class="fas fa-image"></i> Lihat</a>` : 
                        `<span class="text-muted small">-</span>`}
                </td>
                <td>${getPriorityBadge(r.priority)}</td>
                <td>${getStatusBadge(r.status)}</td>
                <td><i class="fas fa-thumbs-up text-primary"></i> ${r.likes || 0}</td>
                <td class="text-end px-4">
                    <button class="btn btn-sm btn-light border me-1" onclick="openEditModal(${r.id}, '${r.status}', '${r.priority}', '${r.admin_note || ''}')">
                        <i class="fas fa-edit text-primary"></i>
                    </button>
                    <button class="btn btn-sm btn-light border" onclick="deleteReport(${r.id})">
                        <i class="fas fa-trash text-danger"></i>
                    </button>
                </td>
            </tr>
        `).join("");

    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Gagal memuat data.</td></tr>`;
    }
}

// === 2. HELPER BADGES ===
function getStatusBadge(status) {
    const s = status || 'Pending';
    let color = 'bg-secondary';
    if(s === 'Selesai') color = 'bg-success';
    if(s === 'Proses') color = 'bg-warning text-dark';
    if(s === 'Ditolak') color = 'bg-danger';
    return `<span class="badge ${color} rounded-pill">${s}</span>`;
}

function getPriorityBadge(prio) {
    const p = prio || 'Medium';
    let color = 'bg-info text-dark'; // Medium
    if(p === 'Low') color = 'bg-success';
    if(p === 'High') color = 'bg-warning text-dark';
    if(p === 'Critical') color = 'bg-danger animate-pulse'; // Efek kedip dikit (opsional di css)
    return `<span class="badge ${color} fw-bold">${p}</span>`;
}

// === 3. MODAL & EDIT LOGIC ===
let editModalInstance = null;

function openEditModal(id, status, priority, note) {
    // Isi form dengan data yang ada
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-status').value = status;
    document.getElementById('edit-priority').value = priority || 'Medium';
    document.getElementById('edit-note').value = note;
    
    document.getElementById('modal-id').innerText = id;

    // Show Modal
    const modalEl = document.getElementById('editModal');
    editModalInstance = new bootstrap.Modal(modalEl);
    editModalInstance.show();
}

function setupModalListener() {
    document.getElementById('editForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('edit-id').value;
        const payload = {
            status: document.getElementById('edit-status').value,
            priority: document.getElementById('edit-priority').value,
            admin_note: document.getElementById('edit-note').value
        };

        try {
            const res = await fetch(`${CONFIG.API_URL}/reports/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(payload) // Kirim JSON Body (Sesuai backend baru)
            });

            if (res.ok) {
                alert("Data berhasil diupdate!");
                editModalInstance.hide();
                loadAdminData(); // Refresh tabel
            } else {
                const err = await res.json();
                alert("Gagal: " + (err.detail || 'Error server'));
            }
        } catch (error) {
            alert("Error koneksi!");
        }
    });
}

// === 4. DELETE LOGIC ===
async function deleteReport(id) {
    if (!confirm("⚠️ Yakin hapus permanen?")) return;
    try {
        const res = await fetch(`${CONFIG.API_URL}/reports/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) loadAdminData();
    } catch (e) { alert("Error koneksi"); }
}

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}