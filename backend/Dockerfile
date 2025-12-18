FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# --- HYBRID ---
# Gunakan ${PORT:-8080}.
# Artinya: Kalau ada env var PORT (di Cloud Run), pakai itu.
# Kalau gak ada (di Local), pakai 8080.
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}