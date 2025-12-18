from fastapi import FastAPI, Depends, HTTPException, status, Header, File, UploadFile, Form 
from fastapi.middleware.cors import CORSMiddleware
from fastapi.encoders import jsonable_encoder 
from sqlalchemy.orm import Session
from sqlalchemy import text 
from jose import jwt, JWTError
from google.cloud import storage 
import redis
import json  
import os
import uuid
import glob

# Import modules 
from config import ALLOWED_ORIGINS
from database import get_db, SessionLocal 
from models import UserModel, ReportModel, ReportLike 
from schemas import LoginRequest, RegisterRequest, ReportUpdate
from auth import (
    get_password_hash, 
    verify_password,     
    create_access_token, 
    SECRET_KEY, 
    ALGORITHM
)

# Init App
app = FastAPI()

# --- ADMIN CREATION LOGIC ---
def create_default_admin():
    db = SessionLocal()
    target_username = os.getenv("ADMIN_USER", "admin")
    target_password = os.getenv("ADMIN_PASS", "admin123") 
    
    try:
        try:
            db.execute(text("SELECT 1 FROM users LIMIT 1")) 
        except Exception:
            print("⏳ Tabel 'users' belum ada. Skip bikin admin. Jalankan 'alembic upgrade head' dulu!")
            return

        user = db.query(UserModel).filter(UserModel.username == target_username).first()
        if not user:
            print(f"👤 Creating super admin: {target_username}...")
            hashed_pw = get_password_hash(target_password)
            admin_user = UserModel(
                username=target_username,
                password_hash=hashed_pw,
                role="admin"
            )
            db.add(admin_user)
            db.commit()
            print("✅ Admin created!")
        else:
            print("✅ Admin exists.")
            
    except Exception as e:
        print(f"⚠️ Error creating admin: {e}")
    finally:
        db.close()

create_default_admin()

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- REDIS CONFIGURATION ---
redis_host = os.getenv("REDIS_HOST", "localhost")
redis_port = int(os.getenv("REDIS_PORT", 6379))

try:
    cache = redis.Redis(host=redis_host, port=redis_port, db=0, socket_connect_timeout=2)
    cache.ping()
    print(f"✅ Redis Connected: {redis_host}")
except Exception as e:
    print(f"⚠️ Redis Gagal: {e}")
    cache = None

# --- GCS CONFIGURATION (Untuk Upload User) ---
BUCKET_NAME = os.getenv("GCS_BUCKET_NAME", "freports-evidence-001") 
cred_files = glob.glob("cred/*.json")

if cred_files:
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = cred_files[0]
    print(f"🔑 Local Credentials Loaded: {cred_files[0]}")
else:
    print("⚠️ No local credentials found. Assuming Cloud Run mode.")

# Helper: Upload ke GCS
def upload_to_gcs(file: UploadFile) -> str:
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(BUCKET_NAME)
        
        file_extension = file.filename.split(".")[-1]
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        blob = bucket.blob(unique_filename)

        blob.upload_from_file(file.file, content_type=file.content_type)
        return blob.public_url
    except Exception as e:
        print(f"❌ GCS Upload Error: {e}")
        return None

# Fungsi Cek Token
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
        raise HTTPException(status_code=401, detail="Token kadaluarsa")

# === ENDPOINTS ===

@app.get("/")
def root():
    return {"message": "Facility Watch Backend v2 (With GCS)", "status": "Ready"}

@app.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Hanya admin!")
    
    total = db.query(ReportModel).count()
    pending = db.query(ReportModel).filter(ReportModel.status == 'Pending').count()
    done = db.query(ReportModel).filter(ReportModel.status == 'Selesai').count()
    
    return {"total": total, "pending": pending, "done": done}

@app.get("/reports")
def get_reports(sort_by: str = "newest", db: Session = Depends(get_db)):
    cache_key = f"reports:{sort_by}"
    if cache:
        cached = cache.get(cache_key)
        if cached:
            return json.loads(cached)

    query = db.query(ReportModel)
    if sort_by == "likes":
        reports = query.order_by(ReportModel.likes.desc()).all()
    else:
        reports = query.order_by(ReportModel.id.desc()).all()
    
    if cache:
        cache.set(cache_key, json.dumps(jsonable_encoder(reports)), ex=60)
            
    return reports

@app.post("/reports")
def create_report(
    title: str = Form(...),
    description: str = Form(...),
    facility: str = Form(...),
    file: UploadFile = File(None),
    db: Session = Depends(get_db), 
    user: dict = Depends(get_current_user)
):
    image_url = None
    if file:
        print(f"📸 Uploading image: {file.filename}")
        image_url = upload_to_gcs(file)

    new_report = ReportModel(
        title=title,
        description=description,
        facility=facility,
        status="Pending",
        username=user['username'],
        likes=0,
        image_url=image_url 
    )
    
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    
    if cache:
        cache.delete("reports:newest")
        cache.delete("reports:likes")
        
    return {"message": "Success", "data": new_report}

@app.post("/login")
def login(creds: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.username == creds.username).first()
    if not user or not verify_password(creds.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Login Gagal")
    
    token = create_access_token(data={"sub": user.username, "role": user.role})
    return {"access_token": token, "role": user.role, "username": user.username}

@app.post("/register")
def register(creds: RegisterRequest, db: Session = Depends(get_db)):
    valid_code = os.getenv("REG_CODE", "admin123")
    if creds.secret_code != valid_code: 
        raise HTTPException(status_code=403, detail="Kode akses salah!")
    
    if db.query(UserModel).filter(UserModel.username == creds.username).first():
        raise HTTPException(status_code=400, detail="Username sudah ada!")
    
    user = UserModel(username=creds.username, password_hash=get_password_hash(creds.password), role="user")
    db.add(user)
    db.commit()
    return {"message": "Registrasi Berhasil"}

@app.get("/reports/{report_id}")
def get_detail(report_id: int, db: Session = Depends(get_db)):
    report = db.query(ReportModel).filter(ReportModel.id == report_id).first()
    if not report: raise HTTPException(status_code=404)
    return report

@app.get("/my-reports")
def get_my(db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    return db.query(ReportModel).filter(ReportModel.username == user['username']).order_by(ReportModel.id.desc()).all()

@app.post("/reports/{report_id}/upvote")
def upvote_report(
    report_id: int, 
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user)
):
    report = db.query(ReportModel).filter(ReportModel.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Laporan hilang ditelan bumi")
    
    existing_like = db.query(ReportLike).filter(
        ReportLike.user_username == user['username'],
        ReportLike.report_id == report_id
    ).first()

    if existing_like:
        raise HTTPException(status_code=400, detail="Anda sudah vote laporan ini!")

    new_like = ReportLike(user_username=user['username'], report_id=report_id)
    db.add(new_like)
    report.likes += 1
    db.commit()
    
    if cache: 
        cache.delete("reports:newest")
        cache.delete("reports:likes")
        
    return {"message": "Upvoted!", "likes": report.likes}

@app.put("/reports/{report_id}")
def update_report(
    report_id: int, 
    update_data: ReportUpdate,
    db: Session = Depends(get_db), 
    user: dict = Depends(get_current_user)
):
    if user['role'] != 'admin':
        raise HTTPException(status_code=403, detail="Hanya admin yang boleh update!")

    report = db.query(ReportModel).filter(ReportModel.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Laporan tidak ditemukan")
    
    report.status = update_data.status
    report.priority = update_data.priority
    report.admin_note = update_data.admin_note
    
    db.commit()
    db.refresh(report)
    
    if cache: 
        cache.delete("reports:newest")
        cache.delete("reports:likes")
        
    return {"message": "Laporan berhasil diupdate", "data": report}

@app.delete("/reports/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db), user: dict = Depends(get_current_user)):
    if user['role'] != 'admin': raise HTTPException(status_code=403)
    report = db.query(ReportModel).filter(ReportModel.id == report_id).first()
    db.delete(report)
    db.commit()
    if cache: cache.delete("reports:newest")
    return {"message": "Deleted"}