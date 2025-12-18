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

        tbody.innerHTML = data.map(r => {
            // Panggil fungsi global
            const thumbUrl = getThumbnailURL(r.image_url);
            const safeTitle = r.title.replace(/'/g, "\\'");

            return `
        <tr>
            <td class="px-4 fw-bold text-secondary">#${r.id}</td>
            <td>
                <div class="fw-bold text-dark text-truncate" style="max-width: 200px;">${r.title}</div>
                <small class="text-muted">${r.facility}</small>
            </td>
            
            <td class="text-center">
                ${r.image_url ? `
                    <img src="${thumbUrl}" 
                         class="rounded border shadow-sm"
                         style="width: 50px; height: 50px; object-fit: cover; cursor: pointer;"
                         onclick="showImagePreview('${r.image_url}', '${safeTitle}')"
                         onerror="this.onerror=null; this.src='${r.image_url}'">
                ` : '<span class="text-muted small">-</span>'}
            </td>

            </tr>
    `;
        }).join("");

    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Gagal memuat data.</td></tr>`;
    }
}

// === 2. HELPER BADGES ===
function getStatusBadge(status) {
    const s = status || 'Pending';
    let color = 'bg-secondary';
    if (s === 'Selesai') color = 'bg-success';
    if (s === 'Proses') color = 'bg-warning text-dark';
    if (s === 'Ditolak') color = 'bg-danger';
    return `<span class="badge ${color} rounded-pill">${s}</span>`;
}

function getPriorityBadge(prio) {
    const p = prio || 'Medium';
    let color = 'bg-info text-dark'; // Medium
    if (p === 'Low') color = 'bg-success';
    if (p === 'High') color = 'bg-warning text-dark';
    if (p === 'Critical') color = 'bg-danger animate-pulse';
    return `<span class="badge ${color} fw-bold">${p}</span>`;
}

// === 3. MODAL EDIT LOGIC ===
let editModalInstance = null;

function openEditModal(id, status, priority, note) {
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-status').value = status;
    document.getElementById('edit-priority').value = priority || 'Medium';
    document.getElementById('edit-note').value = note;

    document.getElementById('modal-id').innerText = id;

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
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert("Data berhasil diupdate!");
                editModalInstance.hide();
                loadAdminData();
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

// === 5. NEW: IMAGE LIGHTBOX LOGIC (POP UP) ===
let imageModalInstance = null;

function showImagePreview(url, title) {
    // 1. Masukkan URL HD dan Judul ke elemen Modal HTML
    const imgTarget = document.getElementById('img-preview-target');
    const captionTarget = document.getElementById('img-preview-caption');

    // Trik UX: Set src kosong dulu biar gak kelihatan gambar lama sekilas
    imgTarget.src = "";

    // Set baru
    imgTarget.src = url;
    captionTarget.innerText = title;

    // 2. Panggil Modal Bootstrap
    const modalEl = document.getElementById('imagePreviewModal');
    if (!imageModalInstance) {
        imageModalInstance = new bootstrap.Modal(modalEl);
    }
    imageModalInstance.show();
}