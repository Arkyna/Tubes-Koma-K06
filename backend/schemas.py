from pydantic import BaseModel, Field

# Schema Input Laporan
class ReportCreate(BaseModel):
    title: str = Field(..., min_length=5, max_length=100)
    facility: str = Field(..., min_length=3, max_length=50)
    description: str = Field(..., min_length=10, max_length=500)

# Schema Login
class LoginRequest(BaseModel):
    username: str
    password: str