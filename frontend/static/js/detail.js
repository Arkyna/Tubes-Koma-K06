document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (!id) {
        window.location.href = "index.html";
        return;
    }

    try {
        const res = await fetch(`${CONFIG.API_URL}/reports/${id}`);
        if (!res.ok) throw new Error("Gagal mengambil data");
        
        const data = await res.json();
        renderDetail(data);

    } catch (error) {
        console.error(error);
        document.querySelector('.container').innerHTML = 
            `<div class="alert alert-danger text-center mt-5">Data tidak ditemukan atau terhapus. <br><a href="index.html">Kembali</a></div>`;
    }
});

function renderDetail(data) {
    // 1. Text Info
    document.getElementById('d-title').innerText = data.title;
    document.getElementById('d-facility').innerText = data.facility;
    document.getElementById('d-desc').innerText = data.description;
    
    // Format Waktu yang Cantik
    const dateOpts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    document.getElementById('d-time').innerText = new Date(data.created_at).toLocaleString('id-ID', dateOpts);

    // 2. Gambar
    if (data.image_url) {
        const imgContainer = document.getElementById('image-container');
        document.getElementById('d-image').src = data.image_url;
        imgContainer.classList.remove('d-none');
    }

    // 3. PRIORITAS (Fitur Baru)
    const prioContainer = document.getElementById('d-priority');
    if (prioContainer) {
        prioContainer.innerHTML = getPriorityBadge(data.priority);
    }

    // 4. CATATAN ADMIN (Fitur Baru)
    if (data.admin_note) {
        const noteBox = document.getElementById('d-admin-note');
        document.getElementById('note-text').innerText = data.admin_note;
        noteBox.classList.remove('d-none'); // Munculkan kotaknya
        
        // Ubah warna jadi merah kalau statusnya 'Ditolak'
        if (data.status === 'Ditolak') {
            noteBox.classList.replace('alert-warning', 'alert-danger');
            noteBox.classList.replace('border-warning', 'border-danger');
        }
    }

    // 5. Timeline Logic
    updateTimeline(data.status);
}

// Helper Badge Prioritas
function getPriorityBadge(prio) {
    const p = prio || 'Medium';
    let color = 'bg-info text-dark';
    if(p === 'Low') color = 'bg-success';
    if(p === 'High') color = 'bg-warning text-dark';
    if(p === 'Critical') color = 'bg-danger';
    
    // Return HTML string (Badge kecil di sebelah status)
    return `<span class="badge ${color} rounded-pill ms-1">${p}</span>`;
}

// Helper Timeline (Support 'Ditolak')
function updateTimeline(status) {
    const badge = document.getElementById('badge-status');
    const bar = document.getElementById('progress-bar');
    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');

    const s = (status || 'Pending').toLowerCase();
    
    badge.innerText = status || 'Pending';
    badge.className = 'badge rounded-pill px-3 py-2';

    // Reset Steps ke default (abu-abu)
    step2.className = 'position-absolute top-0 start-50 translate-middle btn btn-sm btn-secondary rounded-pill';
    step3.className = 'position-absolute top-0 start-100 translate-middle btn btn-sm btn-secondary rounded-pill';

    if (s.includes('selesai')) {
        badge.classList.add('bg-success');
        bar.style.width = '100%';
        bar.className = 'progress-bar bg-success';
        step2.classList.replace('btn-secondary', 'btn-success');
        step3.classList.replace('btn-secondary', 'btn-success');

    } else if (s.includes('proses')) {
        badge.classList.add('bg-warning', 'text-dark');
        bar.style.width = '50%';
        bar.className = 'progress-bar bg-warning';
        step2.classList.replace('btn-secondary', 'btn-warning');

    } else if (s.includes('ditolak')) {
        // Kasus Khusus: Ditolak (Semua Merah)
        badge.classList.add('bg-danger');
        bar.style.width = '100%'; 
        bar.className = 'progress-bar bg-danger'; 
        step2.classList.replace('btn-secondary', 'btn-danger'); 
        step3.classList.replace('btn-secondary', 'btn-danger');
        step2.innerText = 'X'; // Ganti angka jadi X
        step3.innerText = 'X';

    } else {
        // Pending
        badge.classList.add('bg-secondary');
        bar.style.width = '5%';
        bar.className = 'progress-bar bg-secondary';
    }
}