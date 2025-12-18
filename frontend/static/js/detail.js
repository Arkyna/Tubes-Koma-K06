document.addEventListener('DOMContentLoaded', async () => {
    // 1. Instan ID Display
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (!id) {
        window.location.href = "index.html";
        return;
    }

    document.getElementById('report-id-display').innerText = id;

    // 2. Fetch Data
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
    // Text Data
    document.getElementById('d-title').innerText = data.title;
    document.getElementById('d-facility').innerText = data.facility;
    document.getElementById('d-desc').innerText = data.description;
    
    // Username Handling
    const pelapor = data.username ? data.username : "Anonim";
    document.getElementById('d-username').innerText = pelapor;

    // Time Format
    const dateOpts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    document.getElementById('d-time').innerText = new Date(data.created_at).toLocaleString('id-ID', dateOpts);

    // Image Handling
    if (data.image_url) {
        const imgContainer = document.getElementById('image-container');
        document.getElementById('d-image').src = data.image_url;
        imgContainer.classList.remove('d-none');
    }

    // Priority Handling
    const prioContainer = document.getElementById('d-priority');
    if (prioContainer) {
        prioContainer.innerHTML = getPriorityBadge(data.priority);
    }

    // Admin Note
    if (data.admin_note) {
        const noteBox = document.getElementById('d-admin-note');
        document.getElementById('note-text').innerText = data.admin_note;
        noteBox.classList.remove('d-none');
        
        if (data.status === 'Ditolak') {
            noteBox.classList.replace('alert-warning', 'alert-danger');
            noteBox.classList.replace('border-warning', 'border-danger');
        }
    }

    // Timeline Update
    updateTimeline(data.status);
}

function getPriorityBadge(prio) {
    const p = prio || 'Medium';
    let color = 'bg-info text-dark';
    if(p === 'Low') color = 'bg-success';
    if(p === 'High') color = 'bg-warning text-dark';
    if(p === 'Critical') color = 'bg-danger';
    return `<span class="badge ${color} rounded-pill ms-2">${p}</span>`;
}

// FUNGSI INI YANG PENTING
function updateTimeline(status) {
    // Ambil dua elemen berbeda
    const badgeHeader = document.getElementById('badge-header');
    const badgeBody = document.getElementById('badge-body');
    
    const bar = document.getElementById('progress-bar');
    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');

    const s = (status || 'Pending').toLowerCase();
    const textStatus = status || 'Pending';

    // Helper function biar gak nulis ulang
    const setBadges = (colorClass) => {
        if(badgeHeader) {
            badgeHeader.innerText = textStatus;
            badgeHeader.className = `badge rounded-pill px-3 py-2 ${colorClass}`;
        }
        if(badgeBody) {
            badgeBody.innerText = textStatus;
            badgeBody.className = `badge rounded-pill px-3 py-2 ${colorClass}`;
        }
    };

    // Reset Timeline Steps
    step2.className = 'position-absolute top-0 start-50 translate-middle btn btn-sm btn-secondary rounded-pill';
    step3.className = 'position-absolute top-0 start-100 translate-middle btn btn-sm btn-secondary rounded-pill';
    step2.innerText = '2';
    step3.innerText = '3';

    if (s.includes('selesai')) {
        setBadges('bg-success');
        bar.style.width = '100%';
        bar.className = 'progress-bar bg-success';
        step2.classList.replace('btn-secondary', 'btn-success');
        step3.classList.replace('btn-secondary', 'btn-success');

    } else if (s.includes('proses')) {
        setBadges('bg-warning text-dark');
        bar.style.width = '50%';
        bar.className = 'progress-bar bg-warning';
        step2.classList.replace('btn-secondary', 'btn-warning');

    } else if (s.includes('ditolak')) {
        setBadges('bg-danger');
        bar.style.width = '100%'; 
        bar.className = 'progress-bar bg-danger'; 
        step2.classList.replace('btn-secondary', 'btn-danger'); 
        step3.classList.replace('btn-secondary', 'btn-danger');
        step2.innerText = 'X';
        step3.innerText = 'X';

    } else {
        setBadges('bg-secondary');
        bar.style.width = '5%';
        bar.className = 'progress-bar bg-secondary';
    }
}