// State Management
const token = localStorage.getItem('token');
const username = localStorage.getItem('username');
let currentTab = 'all';

// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    loadReports();
    setupEventListeners();
});

// === 1. UI HANDLERS ===
function initNavbar() {
    if (token) {
        document.getElementById('guest-nav').classList.add('d-none');
        document.getElementById('user-nav').classList.remove('d-none');
        document.getElementById('filter-tabs').classList.remove('d-none');
        
        if(username && username !== 'undefined') {
            document.getElementById('username-display').innerText = username;
        }

        // 👇 LOGIKA BARU: Cek Role Admin 👇
        const role = localStorage.getItem('role'); // Pastikan saat login, role disimpan ya!
        if (role === 'admin') {
            const adminBtn = document.getElementById('btn-admin-panel');
            if(adminBtn) adminBtn.classList.remove('d-none');
        }
    }
}

function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
}

function switchTab(tab) {
    currentTab = tab;
    const btns = document.getElementById('filter-tabs').children;
    btns[0].classList.toggle('active', tab === 'all');
    btns[1].classList.toggle('active', tab === 'mine');
    loadReports(); 
}

function getBadge(status) {
    const s = status.toLowerCase();
    if (s.includes('selesai')) return 'bg-success';
    if (s.includes('pending')) return 'bg-danger';
    return 'bg-warning text-dark';
}

// === 2. DATA FETCHING ===
async function loadReports() {
    const container = document.getElementById("reports");
    container.innerHTML = `<div class="col-12 text-center mt-5"><div class="spinner-border text-primary"></div><p class="mt-2 text-muted">Mengambil data terbaru...</p></div>`;

    try {
        let endpoint = '/reports'; 
        let headers = {};

        if (currentTab === 'mine') {
            if (!token) { alert("Sesi habis, login ulang yuk!"); logout(); return; }
            endpoint = '/my-reports';
            headers = { 'Authorization': `Bearer ${token}` };
        }

        const res = await fetch(`${CONFIG.API_URL}${endpoint}`, { headers: headers });
        const data = await res.json();

        if (!res.ok) throw new Error("Gagal load data");
        if (data.length === 0) {
            container.innerHTML = `<div class="col-12 text-center text-muted py-5"><i class="fas fa-box-open fa-3x mb-3"></i><p>Belum ada laporan.</p></div>`;
            return;
        }

        renderReports(data, container);

    } catch (error) {
        console.error(error);
        container.innerHTML = `<div class="col-12 text-center"><div class="alert alert-danger d-inline-block">Gagal memuat data. Periksa koneksi internet.</div></div>`;
    }
}

function renderReports(data, container) {
    container.innerHTML = data.map(r => {
        const isLiked = localStorage.getItem(`liked_${r.id}`);
        const btnClass = isLiked ? 'btn-primary text-white' : 'btn-light text-primary';
        const disabledAttr = isLiked ? 'disabled' : '';
        
        // Cek apakah ada gambar (Nanti diimplementasi di backend)
        const imageBadge = r.image_url ? `<span class="badge bg-info text-dark ms-1"><i class="fas fa-camera"></i> Bukti</span>` : '';

        return `
        <div class="col-md-6 col-lg-4">
            <div class="card h-100 shadow-sm p-3 position-relative">
                <div class="d-flex justify-content-between mb-2">
                    <div>
                        <span class="badge bg-secondary opacity-75"><i class="fas fa-map-marker-alt me-1"></i>${r.facility}</span>
                        ${imageBadge}
                    </div>
                    <span class="badge ${getBadge(r.status)} rounded-pill">${r.status}</span>
                </div>
                
                <h5 class="fw-bold mb-1 text-truncate">${r.title}</h5>
                <small class="text-muted d-block mb-3" style="font-size: 0.8rem">
                    <i class="fas fa-user-circle me-1"></i>${r.username || 'Anonim'} &bull; <span class="ms-1">${new Date(r.created_at || Date.now()).toLocaleDateString('id-ID')}</span>
                </small>

                <p class="text-secondary small text-truncate-2">${r.description}</p>
                
                <div class="mt-auto pt-3 border-top d-flex justify-content-between align-items-center">
                    <button id="btn-like-${r.id}" onclick="upvote(${r.id})" class="btn btn-sm ${btnClass} border" ${disabledAttr}>
                        <i class="fas fa-thumbs-up me-1"></i> <span id="likes-${r.id}">${r.likes || 0}</span>
                    </button>
                    <a href="detail.html?id=${r.id}" class="btn btn-sm btn-outline-primary rounded-pill px-3">Lihat Detail <i class="fas fa-arrow-right ms-1"></i></a>
                </div>
            </div>
        </div>
        `;
    }).join("");
}

// === 3. ACTIONS (UPVOTE & SUBMIT) ===
async function upvote(id) {
    if (!token) {
        if(confirm("Login dulu biar bisa kasih jempol!")) window.location.href = "login.html";
        return;
    }
    if (localStorage.getItem(`liked_${id}`)) return;

    // Optimistic UI Update
    const likeCount = document.getElementById(`likes-${id}`);
    const btn = document.getElementById(`btn-like-${id}`);
    likeCount.innerText = parseInt(likeCount.innerText) + 1;
    btn.className = 'btn btn-sm btn-primary text-white border disabled';
    localStorage.setItem(`liked_${id}`, "sudah");

    try {
        await fetch(`${CONFIG.API_URL}/reports/${id}/upvote`, { 
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
    } catch (e) {
        console.error("Gagal upvote server", e);
    }
}

function setupEventListeners() {
    // Buka Modal
    window.checkAuthAndOpenModal = () => {
        if (!token) {
            if(confirm("Anda harus login untuk melapor. Masuk sekarang?")) window.location.href = "login.html";
        } else {
            new bootstrap.Modal(document.getElementById('addReportModal')).show();
        }
    };

    // Submit Form
    document.getElementById('reportForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = this.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Mengirim...';

        // === KUNCI SUKSES UPLOAD ===
        // Selalu pakai FormData agar Backend FastAPI (Form) bisa baca.
        const formData = new FormData();
        formData.append('title', document.getElementById('inputTitle').value);
        formData.append('facility', document.getElementById('inputFacility').value);
        formData.append('description', document.getElementById('inputDesc').value);
        
        // Ambil file (Kalau user gak pilih file, backend tetep terima FormData kok)
        const fileInput = document.getElementById('inputImage');
        if(fileInput && fileInput.files[0]) {
            formData.append('file', fileInput.files[0]);
        }

        try {
            // Fetch tanpa Content-Type header manual!
            // Browser otomatis set 'multipart/form-data; boundary=...'
            const res = await fetch(`${CONFIG.API_URL}/reports`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }, 
                body: formData 
            });
            
            if (res.ok) {
                alert("Laporan berhasil dikirim!");
                bootstrap.Modal.getInstance(document.getElementById('addReportModal')).hide();
                document.getElementById('reportForm').reset();
                loadReports(); // Refresh Feed
            } else {
                const err = await res.json();
                alert("Gagal: " + (err.detail || "Terjadi kesalahan"));
            }
        } catch (error) { 
            console.error(error);
            alert("Error koneksi!"); 
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Kirim Laporan';
        }
    });
}