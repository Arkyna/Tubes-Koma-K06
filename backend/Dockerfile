FROM python:3.11-slim

WORKDIR /app

# 1. Install dependencies
# (Kita copy requirements dulu biar caching layer Docker optimal)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2. Copy semua kodingan (termasuk alembic folder & .ini)
COPY . .

# 3. Copy Script Entrypoint & Kasih Izin Eksekusi
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# 4. Command Eksekusi
# Kita ganti CMD jadi ENTRYPOINT biar script ini yang pegang kendali
ENTRYPOINT ["./entrypoint.sh"]