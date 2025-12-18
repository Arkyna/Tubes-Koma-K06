const CONFIG = {
    // Otomatis deteksi localhost atau production
    API_URL: (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") 
        ? "http://127.0.0.1:8000" 
        : "https://backend-service-255243454378.asia-southeast2.run.app"
};

// --- LOGIKA THUMBNAIL GLOBAL ---
function getThumbnailURL(originalUrl) {
    if (!originalUrl) return 'https://placehold.co/600x400?text=No+Image';

    // Logika: Ganti ekstensi file asli menjadi '_thumb.jpg'
    // Regex ini membuang ekstensi lama (.png, .jpeg, dll) dan menggantinya
    return originalUrl.replace(/\.[^/.]+$/, "") + "_thumb.jpg";
}