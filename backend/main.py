from fastapi import FastAPI, Depends, HTTPException, status, Header 
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from fastapi.encoders import jsonable_encoder
import redis
import json
import os

# Import modules
from database import engine, get_db, Base
from models import ReportModel, UserModel
from schemas import ReportCreate, LoginRequest, RegisterRequest
from auth import get_password_hash, verify_password, create_access_token, SECRET_KEY, ALGORITHM

# Init App
app = FastAPI()

# Bikin Tabel Otomatis
Base.metadata.create_all(bind=engine)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup Redis Connection
redis_host = os.getenv("REDIS_HOST", "localhost")
redis_port = os.getenv("REDIS_PORT", "6379")

try:
    cache = redis.Redis(host=redis_host, port=int(redis_port), db=0, decode_responses=True)
except Exception as e:
    print(f"⚠️ Warning: Redis connection failed: {e}")
    cache = None
# === UTILS ===

def create_default_admin():
    from database import SessionLocal
    db = SessionLocal()
    try:
        user = db.query(UserModel).filter(UserModel.username == "admin").first()
        if not user:
            print("👤 Creating default admin user...")
            admin_user = UserModel(
                username="admin",
                password_hash=get_password_hash("admin123"),
                role="admin"
            )
            db.add(admin_user)
            db.commit()
            print("✅ Admin created!")
    finally:
        db.close()

create_default_admin()

# Fungsi Cek Token (Dependency Satpam)
def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Token tidak ditemukan")
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        if username is None:
            raise HTTPException(status_code=401, detail="Token tidak valid")
        return {"username": username, "role": role}
    except JWTError:
        raise HTTPException(status_code=401, detail="Token kadaluarsa atau rusak")

# === ENDPOINTS ===

@app.get("/")
def root():
    return {"message": "Modular Backend Ready!", "mode": "Cloud" if os.getenv("DB_USER") else "Local"}

# GET ALL REPORTS (Public)
@app.get("/reports")
def get_reports(sort_by: str = "newest", db: Session = Depends(get_db)):
    # 1. Cek Redis dulu (Key unik berdasarkan sort)
    cache_key = f"reports:{sort_by}"
    
    if cache: # Kalau Redis hidup
        cached_data = cache.get(cache_key)
        if cached_data:
            print("🚀 HIT: Data from Redis Cache")
            return json.loads(cached_data)
    
    # 2. Kalau gak ada di Redis, ambil dari SQL (Lambat)
    print("🐌 MISS: Fetching from SQL")
    query = db.query(ReportModel)
    
    if sort_by == "likes":
        reports = query.order_by(ReportModel.likes.desc()).all()
    else:
        reports = query.order_by(ReportModel.id.desc()).all()
        
    # 3. Simpan ke Redis (Expire dalam 60 detik biar data update)
    if cache:
        # jsonable_encoder mengubah objek SQLAlchemy jadi JSON murni
        cache.set(cache_key, json.dumps(jsonable_encoder(reports)), ex=60)
        
    return reports

# CREATE REPORT (Wajib Login)
@app.post("/reports")
def create_report(
    report: ReportCreate, 
    db: Session = Depends(get_db), 
    user: dict = Depends(get_current_user) # <-- WAJIB LOGIN
):
    new_report = ReportModel(
        title=report.title,
        description=report.description,
        facility=report.facility,
        status="Pending",
        username=user['username'], # Simpan siapa yang lapor
        likes=0
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    if cache:
        # Hapus semua cache laporan biar di-refresh
        cache.delete("reports:newest")
        cache.delete("reports:likes")
    return {"message": "Success", "data": new_report}

# LOGIN
@app.post("/login")
def login(creds: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.username == creds.username).first()
    
    if not user or not verify_password(creds.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau Password salah",
        )
    
    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "role": user.role,
        "username": user.username # Return username biar bisa disimpen frontend
    }

# REGISTER
@app.post("/register")
def register_user(creds: RegisterRequest, db: Session = Depends(get_db)):
    valid_code = os.getenv("REG_CODE", "admin_gokil_betul")
    if creds.secret_code != valid_code: 
        raise HTTPException(status_code=403, detail="Kode akses salah! Tanya admin.")
    existing_user = db.query(UserModel).filter(UserModel.username == creds.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="NIM sudah terdaftar!")
    
    new_user = UserModel(
        username=creds.username,
        password_hash=get_password_hash(creds.password),
        role="user"
    )
    db.add(new_user)
    db.commit()
    return {"message": "Registrasi Berhasil! Silakan Login."}

# GET SINGLE REPORT
@app.get("/reports/{report_id}")
def get_report_detail(report_id: int, db: Session = Depends(get_db)):
    report = db.query(ReportModel).filter(ReportModel.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Laporan tidak ditemukan")
    return report

# GET MY REPORTS
@app.get("/my-reports")
def get_my_reports(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    return db.query(ReportModel).filter(ReportModel.username == user['username']).order_by(ReportModel.id.desc()).all()

# UPVOTE REPORT
@app.post("/reports/{report_id}/upvote")
def upvote_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(ReportModel).filter(ReportModel.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Laporan tidak ditemukan")
    
    report.likes += 1
    db.commit()
    if cache:
        # Hapus semua cache laporan biar di-refresh
        cache.delete("reports:newest")
        cache.delete("reports:likes")
    return {"message": "Upvoted!", "likes": report.likes}

# ADMIN: UPDATE STATUS
@app.put("/reports/{report_id}")
def update_status(report_id: int, new_status: str, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Hanya admin yang boleh update!")

    report = db.query(ReportModel).filter(ReportModel.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Laporan tidak ditemukan")
    
    report.status = new_status
    db.commit()
    return {"message": "Status berhasil diupdate", "data": report}

# ADMIN: DELETE REPORT
@app.delete("/reports/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Hanya admin yang boleh hapus!")

    report = db.query(ReportModel).filter(ReportModel.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Laporan tidak ditemukan")
    
    db.delete(report)
    db.commit()
    return {"message": "Laporan berhasil dihapus"}