// Cek Otoritas (Admin Only)
const authToken = localStorage.getItem("token");
const authRole = localStorage.getItem("role");

if (!authToken || authRole !== "admin") {
    alert("⛔ Akses Ditolak: Halaman ini khusus Admin!");
    window.location.href = "index.html";
}

document.addEventListener('DOMContentLoaded', () => {
    loadAdminData();
    // Auto refresh setiap 30 detik (Realtime-ish)
    setInterval(loadAdminData, 30000);
});

async function loadAdminData(sortBy = 'newest') {
    const tbody = document.getElementById('tableBody');
    // Show spinner
    // tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>`;

    try {
        const res = await fetch(`${CONFIG.API_URL}/reports?sort_by=${sortBy}`);
        const data = await res.json();

        // 1. UPDATE STATISTIK (Simple Counter)
        updateStats(data);

        // 2. RENDER TABEL
        renderTable(data, tbody);

    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger"><i class="fas fa-exclamation-triangle"></i> Gagal memuat data.</td></tr>`;
    }
}

function updateStats(data) {
    const total = data.length;
    const pending = data.filter(r => r.status.toLowerCase().includes('pending')).length;
    const done = data.filter(r => r.status.toLowerCase().includes('selesai')).length;

    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-pending').innerText = pending;
    document.getElementById('stat-done').innerText = done;
}

function renderTable(data, tbody) {
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-5 text-muted">Belum ada laporan masuk.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(r => `
        <tr>
            <td class="fw-bold text-secondary">#${r.id}</td>
            <td>
                <div class="fw-bold text-dark">${r.title}</div>
                <small class="text-muted"><i class="fas fa-user-circle"></i> ${r.username || 'Anonim'}</small>
            </td>
            <td>
                <span class="badge bg-light text-dark border"><i class="fas fa-map-marker-alt text-primary"></i> ${r.facility}</span>
            </td>
            <td>
                <span class="badge ${getBadgeColor(r.status)} rounded-pill">${r.status}</span>
            </td>
            <td><i class="fas fa-thumbs-up text-primary"></i> ${r.likes || 0}</td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-sm btn-outline-success table-action-btn" onclick="updateStatus(${r.id})" title="Tandai Selesai">
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger table-action-btn" onclick="deleteReport(${r.id})" title="Hapus Laporan">
                        <i class="fas fa-trash"></i>
                    </button>
                     <a href="detail.html?id=${r.id}" class="btn btn-sm btn-outline-primary table-action-btn" title="Lihat Detail">
                        <i class="fas fa-eye"></i>
                    </a>
                </div>
            </td>
        </tr>
    `).join("");
}

function getBadgeColor(status) {
    const s = status.toLowerCase();
    if (s.includes('selesai')) return 'bg-success';
    if (s.includes('pending')) return 'bg-danger';
    return 'bg-warning text-dark';
}

// === ACTIONS ===
async function updateStatus(id) {
    if (!confirm("Tandai laporan ini sebagai SELESAI?")) return;
    try {
        const res = await fetch(`${CONFIG.API_URL}/reports/${id}?new_status=Selesai`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) loadAdminData();
        else alert("Gagal update status");
    } catch (e) { alert("Error koneksi"); }
}

async function deleteReport(id) {
    if (!confirm("⚠️ PERINGATAN: Laporan akan dihapus permanen!")) return;
    try {
        const res = await fetch(`${CONFIG.API_URL}/reports/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) loadAdminData();
        else alert("Gagal menghapus laporan");
    } catch (e) { alert("Error koneksi"); }
}

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}