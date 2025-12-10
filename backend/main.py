from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from fastapi import FastAPI, Depends, HTTPException, status, Header 
from jose import jwt, JWTError
from auth import SECRET_KEY, ALGORITHM
import os

# Import dari file-file yang udah kita pecah
from database import engine, get_db, Base
from models import ReportModel, UserModel
from schemas import ReportCreate, LoginRequest, RegisterRequest
from auth import get_password_hash, verify_password, create_access_token

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

# === UTILS: AUTO CREATE ADMIN ===
def create_default_admin():
    # Kita panggil Session manual sebentar cuma buat init admin
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

# Fungsi Cek Token (Dependency)
def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Token tidak ditemukan")
    
    try:
        # Format header biasanya: "Bearer <token>"
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

@app.get("/reports")
def get_reports(db: Session = Depends(get_db)):
    return db.query(ReportModel).order_by(ReportModel.id.desc()).all()

@app.post("/reports")
def create_report(report: ReportCreate, db: Session = Depends(get_db)):
    new_report = ReportModel(
        title=report.title,
        description=report.description,
        facility=report.facility,
        status="Pending"
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    return {"message": "Success", "data": new_report}

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
        "role": user.role
    }

# UPDATE STATUS (Cuma Admin yang bisa)
# Tambahkan 'user: dict = Depends(get_current_user)' di parameter
@app.post("/reports")
def create_report(
    report: ReportCreate, 
    db: Session = Depends(get_db), 
    user: dict = Depends(get_current_user) # <-- WAJIB LOGIN BUAT LAPOR
):
    new_report = ReportModel(
        title=report.title,
        description=report.description,
        facility=report.facility,
        status="Pending",
        username=user['username'] # <-- SIMPAN USERNAME DARI TOKEN
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    return {"message": "Success", "data": new_report}

# DELETE LAPORAN  (Admin)
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

# 1. GET Single Report
@app.get("/reports/{report_id}")
def get_report_detail(report_id: int, db: Session = Depends(get_db)):
    report = db.query(ReportModel).filter(ReportModel.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Laporan tidak ditemukan")
    return report

# 2. GET My Reports ( Dashboard User Biasa)
@app.get("/my-reports")
def get_my_reports(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    
    return db.query(ReportModel).filter(ReportModel.username == user['username']).order_by(ReportModel.id.desc()).all()

# Jangan lupa import RegisterRequest (atau definisikan di atas)

@app.post("/register")
def register_user(creds: RegisterRequest, db: Session = Depends(get_db)):
    # 1. Cek apakah NIM sudah terdaftar?
    existing_user = db.query(UserModel).filter(UserModel.username == creds.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="NIM sudah terdaftar!")
    
    # 2. Bikin User Baru (Role otomatis 'user' biasa, bukan admin)
    new_user = UserModel(
        username=creds.username,
        password_hash=get_password_hash(creds.password),
        role="user"
    )
    
    db.add(new_user)
    db.commit()
    
    return {"message": "Registrasi Berhasil! Silakan Login."}