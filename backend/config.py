CUSTOM_DOMAIN_URL = "https://www.facilitywatch-174.my.id"
CUSTOM_DOMAIN_ROOT = "https://facilitywatch-174.my.id"

# Daftar Whitelist
ALLOWED_ORIGINS = [
    "http://localhost:5500",      # Local Development
    "http://127.0.0.1:5500",      # Local IP
    "http://localhost:8000",      # Swagger UI Local
    CUSTOM_DOMAIN_URL,
    CUSTOM_DOMAIN_ROOT            # Production Cloud Run
]