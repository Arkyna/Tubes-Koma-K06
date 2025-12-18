#!/bin/sh

# Stop script kalau ada satu command yang error (PENTING!)
set -e

echo "🚀 Starting Deployment Process..."

# --- STEP 1: MIGRASI DATABASE (OTOMATIS) ---
# Ini inti dari P1. Dia akan paksa DB Cloud buat update struktur.
echo "🛠️ Running Database Migrations..."
alembic upgrade head

# --- STEP 2: START APLIKASI ---
# Ambil PORT dari Env Var Cloud Run, atau default ke 8080 kalau lokal
PORT=${PORT:-8080}

echo "✅ Migrations Done. Starting Server on port $PORT..."
exec uvicorn main:app --host 0.0.0.0 --port $PORT