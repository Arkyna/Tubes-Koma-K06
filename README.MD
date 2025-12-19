# Facility Report System – Enterprise Three-Tier Infrastructure

**Project Status:** Production
**Deployment Region:** asia-southeast2 (Jakarta)
**Endpoint:** [https://www.facilitywatch-174.my.id](https://www.facilitywatch-174.my.id)

Sistem manajemen pelaporan kerusakan fasilitas kampus berbasis **Google Cloud Platform**. Ini bukan sekadar CRUD murahan. Ini implementasi arsitektur **high-availability**, **scalable**, dan **security-first**, dibangun dengan prinsip **Infrastructure as Code (IaC)**.

---

## 👥 Tim Pengembang (Kelompok 06)

| Nama                    | NIM       |
| ----------------------- | --------- |
| Jhoel Robert Hutagalung | 122140174 |
| Muhammad Zada Rizki     | 120140156 |
| [Nama Anggota 3]        | [NIM]     |

---

## 🏗️ Arsitektur Infrastruktur

Sistem menerapkan **isolasi jaringan total** untuk mencegah eksploitasi pada lapisan data.

### Layer 1: Presentation (Frontend)

* **Service:** Cloud Run (Nginx Container)
* **Entry Point:** Google Global External HTTP(S) Load Balancer
* **Security:** Managed SSL Certificate (end-to-end encryption)
* **Optimization:** Cloud CDN untuk static content delivery

### Layer 2: Application (Backend API)

* **Service:** Cloud Run (FastAPI)
* **Runtime:** Python 3.9+ (Containerized)
* **Networking:** Serverless VPC Access Connector
* **Caching:** Cache-Aside Pattern dengan Memorystore (Redis)

### Layer 3: Data & Storage (Private Tier)

* **Database:** Cloud SQL (PostgreSQL 14, Private IP Only)
* **Object Storage:** Google Cloud Storage (foto bukti)
* **Secrets:** GCP Secret Manager (tidak ada kredensial hardcoded)

---

## 🧰 Tech Stack & Ecosystem

* **IaC:** Terraform v1.5+
* **Backend:** FastAPI, SQLAlchemy, Pydantic
* **Frontend:** Vanilla JS, Tailwind CSS
* **Database:** PostgreSQL, Redis
* **CI/CD:** Cloud Build, Artifact Registry
* **Monitoring:** Cloud Logging & Error Reporting

---

## ⭐ Fitur Unggulan

1. **Event-Driven Image Resizer**
   Otomatis mengompresi gambar saat upload (cost optimization).

2. **Zero Trust Networking**
   Database dan cache sepenuhnya terisolasi dari internet publik.

3. **Custom Domain Infrastructure**
   Load Balancer global + IP statis + DNS eksternal.

---

## 🗄️ Skema Database (Logical Model)

### Table: `users`

| Attribute     | Data Type  | Constraint        |
| ------------- | ---------- | ----------------- |
| id            | Integer    | PK, Serial        |
| username      | String(50) | Unique, Not Null  |
| password_hash | Text       | Not Null (bcrypt) |
| role          | String(20) | Default: `user`   |

### Table: `reports`

| Attribute  | Data Type   | Constraint                   |
| ---------- | ----------- | ---------------------------- |
| id         | Integer     | PK, Serial                   |
| title      | String(100) | Not Null                     |
| facility   | String(50)  | Not Null                     |
| status     | String(20)  | Pending / In Progress / Done |
| image_url  | Text        | Nullable                     |
| created_at | Timestamp   | Default: CURRENT_TIMESTAMP   |

---

## 🔌 API Reference (Overview)

| Endpoint          | Method | Security   | Description                          |
| ----------------- | ------ | ---------- | ------------------------------------ |
| /api/login        | POST   | Public     | Generate JWT token                   |
| /api/reports      | GET    | Public     | Get report feed (Redis optimized)    |
| /api/reports      | POST   | JWT        | Submit report + trigger image resize |
| /api/admin/update | PUT    | Admin Only | Update report status                 |

---

## 🚀 Deployment Guide

### Prerequisites

1. GCP SDK installed
2. Active GCP project with billing enabled
3. Terraform installed

### Execution Steps

```bash
cd terraform
terraform init
terraform apply \
  -var="project_id=YOUR_PROJECT" \
  -var="db_pass=YOUR_PASS"
```

```bash
git add .
git commit -m "Final production push"
git push origin main
```

Cloud Build akan otomatis melakukan build dan redeploy ke Cloud Run.

---

## 💸 Cost Awareness

* VM tier ringan
* Auto-scaling ke **0** saat idle
* Budget alert di $10

---

© 2025 Kelompok 06 – Komputasi Awan ITERA
Dosen Pengampu: M. Habib Algifari, S.Kom., M.T.I
