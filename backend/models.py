from sqlalchemy import Column, Integer, String, Text, DateTime, func, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

# Tabel Asosiasi (Many-to-Many) untuk Like
class ReportLike(Base):
    __tablename__ = "report_likes"
    user_username = Column(String(50), ForeignKey("users.username"), primary_key=True) # Pakai Username sebagai FK
    report_id = Column(Integer, ForeignKey("reports.id"), primary_key=True)

# Update di models.py
class ReportModel(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True, index=True)
    
    # --- Info Dasar ---
    title = Column(String(100))
    description = Column(String(500))
    facility = Column(String(50))
    image_url = Column(String(500), nullable=True) # Foto Masalah
    
    # --- Status & Tracking ---
    status = Column(String(20), default="Pending")
    priority = Column(String(20), default="Medium") # [Low, Medium, High, Critical] <--- BARU
    
    # --- Jejak Waktu ---
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now()) # <--- BARU (Auto update tiap diedit)
    
    # --- Interaksi ---
    username = Column(String(50), ForeignKey("users.username"), nullable=True)
    likes = Column(Integer, default=0)
    
    # --- Penyelesaian (Admin Side) ---
    admin_note = Column(Text, nullable=True) # <--- BARU (Alasan tolak / Catatan teknisi)
    proof_image_url = Column(String(500), nullable=True) # <--- BARU (Foto sesudah diperbaiki)

class UserModel(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True) # Primary identifier kita
    password_hash = Column(String(255))
    role = Column(String(20), default="user")