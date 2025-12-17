const CONFIG = {
    // Otomatis deteksi localhost atau production
    API_URL: (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") 
        ? "http://127.0.0.1:8000" 
        : "https://backend-service-255243454378.asia-southeast2.run.app"
};