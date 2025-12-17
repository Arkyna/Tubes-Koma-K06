# **Facility Report System – Three-Tier Web Application (Iterasi 2)**

> **Status:** Deployed

> **Live Demo:** [https://www.facilitywatch-174.my.id](https://www.facilitywatch-174.my.id)

Sistem pelaporan fasilitas kampus berbasis web yang dibangun dengan arsitektur **Secure Three-Tier** di Google Cloud Platform (GCP). Sistem ini dirancang untuk menangani trafik tinggi (High Availability) dan menerapkan standar keamanan Enterprise (Zero Trust Network).

---

## **Tim Pengembang (Kelompok 06)**

| Nama | NIM |
|:------|-----|
| Jhoel Robert Hutagalung | 122140174 |
| Muhammad Zada Rizki | 120140156 |
| [Nama Anggota 3] | [NIM] | [Role] |

---

## **Arsitektur Sistem**



Aplikasi menggunakan pendekatan **Hybrid Serverless** dengan isolasi jaringan untuk keamanan maksimal:

### **1. Presentation Layer (Frontend)**
- **Service:** Cloud Run (Container Nginx serving Static HTML/JS).
- **Access:** Diakses via **Global HTTP(S) Load Balancer** (Managed SSL).
- **Security:** Port 80 (HTTP) ditutup total; hanya menerima trafik HTTPS (Port 443).

### **2. Application Layer (Backend)**
- **Service:** Cloud Run (FastAPI Python).
- **Performance:** Menggunakan **Redis Caching** (Cache-Aside Pattern) untuk mempercepat load data.
- **Resiliency:** Fitur **Fail-Safe**; jika Redis down, sistem otomatis fallback ke Database.
- **Connectivity:** Menggunakan **Serverless VPC Access Connector** untuk komunikasi privat ke Data Layer.

### **3. Data Layer (Private Network)**
- **Database:** Cloud SQL (PostgreSQL 14) - *Private IP Only*.
- **Cache:** Memorystore for Redis - *Private IP Only*.
- **Security:** Kredensial database dienkripsi dan dikelola via **GCP Secret Manager**.

---
## **Topologi Arsitektur**
![Architecture Diagram](https://github.com/user-attachments/assets/c8e592db-4ff6-4063-adb1-3f13659d2ef8)
*(Gambar arsitektur yang menunjukkan Global Load Balancer, Cloud Run, dan VPC Connection ke Private SQL/Redis)*

---

## **Fitur Unggulan**

* **⚡ High Performance:** Response time API dioptimalkan dengan in-memory caching (Redis).
* **🔒 Enhanced Security:**
    * **Network Isolation:** Database tidak memiliki IP Publik, mencegah serangan brute-force dari internet.
    * **Secret Management:** Tidak ada kredensial sensitif (password DB) yang di-hardcode dalam source code.
* **🤖 CI/CD Automation:** Pipeline deployment otomatis menggunakan Google Cloud Build setiap kali ada push ke repository.

---
## **Configuration & Environment Variables**

Aplikasi menggunakan kombinasi Environment Variables (Config) dan Google Secret Manager (Sensitive Data).

| Variable | Tipe | Deskripsi | Default / Value |
| :--- | :--- | :--- | :--- |
| `DB_HOST` | Config | Private IP Cloud SQL (via VPC) | `10.x.x.x` |
| `DB_NAME` | Config | Nama Database | `facility_db` |
| `REDIS_HOST`| Config | Private IP Redis (via VPC) | `10.x.x.x` |
| `DB_USER` | **Secret** | Username Database | Managed by Secret Manager |
| `DB_PASS` | **Secret** | Password Database | Managed by Secret Manager |
| `JWT_SECRET`| **Secret** | Kunci enkripsi token JWT | Managed by Secret Manager |
| `SECRET_CODE` | **Secret** | Kode validasi registrasi User | Managed by Secret Manager |
| `ADMIN_USER`| **Secret** | (Optional) Default Admin Username | Managed by Secret Manager |
| `ADMIN_PASS`| **Secret** | (Optional) Default Admin Password | Managed by Secret Manager |
---
## **API Reference**

Backend REST API menggunakan **JWT Authentication**. Beberapa endpoint memerlukan header `Authorization: Bearer <token>`.

| Method | Endpoint | Akses | Deskripsi |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | **Public** | Health Check & Mode Info (Cloud/Local). |
| `POST` | `/register` | **Public** | Daftar akun baru (Wajib input `secret_code`). |
| `POST` | `/login` | **Public** | Login user untuk mendapatkan **Access Token**. |
| `GET` | `/reports` | **Public** | Mengambil feed laporan (Cached by Redis). |
| `POST` | `/reports` | **Auth (User)** | Membuat laporan baru (Cache Invalidation). |
| `GET` | `/my-reports`| **Auth (User)** | Melihat riwayat laporan milik user sendiri. |
| `POST` | `/reports/{id}/upvote`| **Auth (User)** | Upvote laporan (Login Required). |
| `GET` | `/reports/{id}`| **Auth (User)** | Melihat detail satu laporan. |
| `PUT` | `/reports/{id}` | **Admin Only** | Update status laporan (Pending -> Done). |
| `DELETE` | `/reports/{id}` | **Admin Only** | Menghapus laporan permanen. |
---
## **Database Schema**

Menggunakan **PostgreSQL 14** dengan ORM SQLAlchemy.

### **Table: `users`**
| Column | Type | Constraints | Deskripsi |
| :--- | :--- | :--- | :--- |
| `id` | Integer | PK, Auto Inc | ID Unik User |
| `username` | String(50) | Unique, Index | Username (NIM/Nama) |
| `password_hash`| String(255)| Not Null | Hash password (bcrypt) |
| `role` | String(20) | Default: 'admin'| Peran user (`user` atau `admin`) |

### **Table: `reports`**
| Column | Type | Constraints | Deskripsi |
| :--- | :--- | :--- | :--- |
| `id` | Integer | PK, Auto Inc | ID Laporan |
| `title` | String(100) | Not Null | Judul Laporan |
| `description`| String(500) | Nullable | Detail Kerusakan |
| `facility` | String(50) | Not Null | Lokasi/Jenis Fasilitas |
| `status` | String(20) | Default: 'Pending' | Status Pengerjaan |
| `username` | String(50) | Nullable | Pemilik Laporan |
| `likes` | Integer | Default: 0 | Jumlah Upvote |
| `created_at` | DateTime | Server Default | Waktu dibuat |
---

## **Struktur Repository**

```text
project/
│
├── backend/
│   ├── auth.py             # Logika Autentikasi (JWT Handler)
│   ├── database.py         # Konfigurasi Koneksi Database & Redis
│   ├── main.py             # Entry Point API & Routing
│   ├── models.py           # Definisi Tabel Database (SQLAlchemy ORM)
│   ├── schemas.py          # Validasi Data Input/Output (Pydantic)
│   ├── requirements.txt    # Daftar Dependensi Python
│   └── Dockerfile          # Konfigurasi Container Backend
│
├── frontend/
│   ├── index.html          # Halaman Utama (Public Feed)
│   ├── admin.html          # Dashboard Admin (Protected)
│   ├── login.html          # Halaman Login
│   ├── register.html       # Halaman Registrasi
│   ├── detail.html         # Halaman Detail Laporan
│   ├── script.js           # Logika Frontend (Fetch API)
│   ├── nginx.conf.template # Konfigurasi Server Nginx
│   └── Dockerfile          # Konfigurasi Container Frontend
│
├── .gitignore              # Daftar file yang diabaikan git
└── README.md               # Dokumentasi Proyek
```

---

## **Deployment Workflow (CI/CD)**

Project ini menerapkan **Automated Deployment** menggunakan Google Cloud Build yang terintegrasi dengan **Artifact Registry**.

### **Mekanisme Otomatisasi**
Deployment dikonfigurasi menggunakan **Cloud Build Triggers**:

1.  **Dual-Trigger Setup:**
    * **Trigger Backend:** Memantau perubahan di direktori `/backend`.
    * **Trigger Frontend:** Memantau perubahan di direktori `/frontend`.

2.  **Continuous Delivery Flow:**
    * Setiap `push` ke branch `main` memicu build Docker Image.
    * Image disimpan di **Google Artifact Registry** (Modern Replacement untuk GCR).
    * Format Image: `asia-southeast2-docker.pkg.dev/[PROJECT-ID]/[REPO-NAME]/[IMAGE]:tag`
    * Layanan Cloud Run diperbarui secara *rolling update* (Zero Downtime).

### **Cara Melakukan Update**
Developer cukup melakukan push code ke repository:
```bash
git add .
git commit -m "feat: tambah validasi login"
git push origin main
```

## **Panduan Penggunaan & Demo**

Berikut adalah skenario untuk menguji fitur-fitur utama aplikasi:

### **1. Public Access (Guest)**
- Buka URL: `https://www.facilitywatch-174.my.id`
- User dapat melihat feed laporan kerusakan secara *read-only*.
- Coba akses endpoint `/reports` di browser, data JSON akan tampil (Public Read).

### **2. Admin Registration (Secure)**
- Buka halaman Register.
- Masukkan data diri dan **Secret Access Code**.
- *Note:* Kode rahasia ini divalidasi oleh Backend via Environment Variable (`SECRET_CODE`) untuk mencegah bot/user tidak sah mendaftar sebagai user sembarangan.

### **3. Admin Dashboard**
- Login menggunakan akun yang baru dibuat.
- Admin dapat mengubah status laporan (Pending -> Done) atau menghapus laporan yang tidak valid.
- Akses ke fitur ini dilindungi oleh **JWT Authentication**.