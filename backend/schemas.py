from pydantic import BaseModel, Field
class ReportCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=100)
    facility: str = Field(..., min_length=3, max_length=50)
    description: str = Field(..., min_length=10, max_length=500)

# Schema Login
class LoginRequest(BaseModel):
    username: str
    password: str

# Schema Register (Yang Benar)
class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=5, pattern="^[0-9]+$") # Hanya Angka (NIM)
    password: str = Field(..., min_length=6)
    secret_code: str = Field(...) # Wajib ada

# 👇 TAMBAHAN BARU: Schema untuk Admin Update
class ReportUpdate(BaseModel):
    status: str = Field(..., pattern="^(Pending|Proses|Selesai|Ditolak)$") # Validasi status
    priority: str = Field("Medium", pattern="^(Low|Medium|High|Critical)$")
    admin_note: str = Field(None, max_length=500)