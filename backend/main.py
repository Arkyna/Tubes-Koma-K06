from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
import os

app = FastAPI()

# ===== CORS =====
origins = [
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# =================

def get_db():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        database=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASS")
    )

@app.get("/reports")
def get_reports():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, title, description, facility, status, created_at FROM reports ORDER BY id DESC")
    result = cur.fetchall()
    cur.close()
    conn.close()
    return [
        {
            "id": r[0],
            "title": r[1],
            "description": r[2],
            "facility": r[3],
            "status": r[4],
            "created_at": str(r[5])
        }
        for r in result
    ]

@app.post("/reports")
def create_report(data: dict):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO reports (title, description, facility) VALUES (%s, %s, %s)",
        (data["title"], data["description"], data["facility"])
    )
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "report created"}
