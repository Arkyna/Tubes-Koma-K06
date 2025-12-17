document.addEventListener('DOMContentLoaded', async () => {
    // 1. Ambil ID dari URL (?id=123)
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    if (!id) {
        alert("ID Laporan tidak ditemukan!");
        window.location.href = "index.html";
        return;
    }

    try {
        // 2. Fetch Data
        const res = await fetch(`${CONFIG.API_URL}/reports/${id}`, {
            headers: {
                // Kirim token kalau ada (opsional, jaga-jaga kalau endpoint diprotect nanti)
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!res.ok) throw new Error("Gagal mengambil data laporan");
        
        const data = await res.json();
        renderDetail(data);

    } catch (error) {
        console.error(error);
        document.querySelector('.card-body').innerHTML = 
            `<div class="alert alert-danger text-center">Gagal memuat laporan. ID mungkin salah atau terhapus.</div>`;
    }
});

function renderDetail(data) {
    // === A. Render Text Info ===
    document.getElementById('d-title').innerText = data.title;
    document.getElementById('d-facility').innerText = data.facility;
    document.getElementById('d-desc').innerText = data.description;
    document.getElementById('d-time').innerText = new Date(data.created_at || Date.now()).toLocaleString('id-ID', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    // === B. Render Image (Future Proofing) ===
    // Kalau backend nanti kirim 'image_url', otomatis tampil!
    if (data.image_url) {
        const imgContainer = document.getElementById('image-container');
        const imgEl = document.getElementById('d-image');
        imgEl.src = data.image_url; // Bisa URL GCS atau Base64
        imgContainer.classList.remove('d-none');
    }

    // === C. Render Status Timeline ===
    updateTimeline(data.status);
}

function updateTimeline(status) {
    const badge = document.getElementById('badge-status');
    const bar = document.getElementById('progress-bar');
    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');

    // Normalisasi status (biar case insensitive)
    const s = status.toLowerCase();
    
    badge.innerText = status;

    // Reset Class
    badge.className = 'badge rounded-pill px-3 py-2';
    
    // Logic Warna & Progress
    if (s.includes('selesai') || s.includes('completed') || s.includes('done')) {
        // Tahap 3: Selesai
        badge.classList.add('bg-success');
        bar.style.width = '100%';
        bar.className = 'progress-bar bg-success';
        
        step2.classList.replace('btn-secondary', 'btn-success'); // Aktifkan step 2
        step3.classList.replace('btn-secondary', 'btn-success'); // Aktifkan step 3
        
    } else if (s.includes('proses') || s.includes('dikerjakan') || s.includes('progress')) {
        // Tahap 2: Proses
        badge.classList.add('bg-warning', 'text-dark');
        bar.style.width = '50%';
        bar.className = 'progress-bar bg-warning';
        
        step2.classList.replace('btn-secondary', 'btn-warning'); // Aktifkan step 2
        
    } else {
        // Tahap 1: Pending (Default)
        badge.classList.add('bg-danger');
        bar.style.width = '5%'; // Dikit aja biar keliatan mulai
        bar.className = 'progress-bar bg-danger';
    }
}