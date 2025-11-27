# **Facility Report System – Three-Tier Web Application (GCP)**

Proyek ini merupakan **Proof of Concept (PoC)** untuk sistem pelaporan fasilitas berbasis web yang dibangun menggunakan arsitektur **three-tier** di Google Cloud Platform (GCP). Aplikasi menunjukkan integrasi end-to-end antara frontend, backend API, dan database pada Cloud SQL.

---
## **Anggota Kelompok 06:**

| Nama | NIM |
|:------|-----|
| Jhoel Robert Hutagalung | 122140174 |
| Muhammad Zada Rizki | 120140156
| TBA |
| TBA |
| TBA |
---

## **Arsitektur Sistem**

Aplikasi terdiri dari tiga layer utama:

### **1. Frontend (Presentation Tier)**
- Static website menggunakan **HTML + JavaScript**
- Served melalui **Nginx container**
- Dideploy di **Cloud Run**
- Melakukan request ke backend API untuk mengambil data laporan

### **2. Backend API (Application Tier)**
- Dibangun menggunakan **FastAPI (Python)**
- Menyediakan endpoint REST: `/reports`
- Menangani CORS dan komunikasi dengan database
- Dideploy sebagai container di **Cloud Run**

### **3. Database (Data Tier)**
- **PostgreSQL (Cloud SQL)**
- Tabel utama: `reports`
- Backend mengakses database menggunakan environment variables

---

## **Fitur MVP / PoC**
- Menampilkan daftar laporan fasilitas dari database Cloud SQL  
- Integrasi frontend → backend → database berjalan real-time  
- CORS telah dikonfigurasi agar frontend dapat melakukan fetch API  
- Pipeline build dan deploy menggunakan Cloud Build + Cloud Run  

---

## **Struktur Repository**
```
project/
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── index.html
│   ├── script.js
│   ├── nginx.conf.template
│   └── Dockerfile
│
└── README.md
```

---

## **Cara Deploy**

### **1. Build & Deploy Backend**
```
gcloud builds submit --tag gcr.io/[PROJECT-ID]/backend
```
```
gcloud run deploy backend-service   --image gcr.io/[PROJECT-ID]/backend   --region asia-southeast2   --allow-unauthenticated   --set-env-vars DB_HOST=...,DB_NAME=...,DB_USER=...,DB_PASS=...
```

---

### **2. Build & Deploy Frontend**
```
gcloud builds submit --tag gcr.io/[PROJECT-ID]/frontend
```
```
gcloud run deploy frontend-service   --image gcr.io/[PROJECT-ID]/frontend   --region asia-southeast2   --allow-unauthenticated
```

---

## **Environment Variables Backend**
| Variable | Deskripsi |
|---------|-----------|
| `DB_HOST` | Public IP / connection host Cloud SQL |
| `DB_NAME` | Nama database (mis: `facility_db`) |
| `DB_USER` | Username PostgreSQL |
| `DB_PASS` | Password PostgreSQL |

---

## **Endpoint**
| Method | Endpoint | Deskripsi |
|-------|----------|-----------|
| GET | `/reports` | Mengambil semua laporan |

---

## **Database Schema**
### **Table: reports**
| Field | Type |
|-------|------|
| id | SERIAL PRIMARY KEY |
| title | VARCHAR |
| description | TEXT |
| facility | VARCHAR |
| status | VARCHAR |
| created_at | TIMESTAMP |

---

## **Hasil PoC (Untuk Sementara)**
- Backend berhasil mengambil data dari Cloud SQL  
- Frontend berhasil menampilkan data menggunakan fetch API  
- Seluruh komponen berjalan stabil di Cloud Run  
- Arsitektur three-tier tervalidasi dan siap dikembangkan lebih lanjut  

---

## **Next Steps (Iterasi 2)**
- Menambahkan form input laporan  
- Menambahkan autentikasi  
- Peningkatan tampilan UI/UX  
- Monitoring & logging  
- Optimasi konfigurasi dan security best practices  
