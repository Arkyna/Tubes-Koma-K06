PRODUCTION_FRONTEND_URL = "https://frontend-service-255243454378.asia-southeast2.run.app"


# Daftar Whitelist
ALLOWED_ORIGINS = [
    "http://localhost:5500",      # Local Development
    "http://127.0.0.1:5500",      # Local IP
    "http://localhost:8000",      # Swagger UI Local
    PRODUCTION_FRONTEND_URL       # Production Cloud Run
]