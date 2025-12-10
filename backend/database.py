from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# LOGIKA HYBRID
if os.getenv("DB_USER"):
    print("🌍 Running on Cloud Run - Using PostgreSQL")
    db_user = os.environ["DB_USER"]
    db_pass = os.environ["DB_PASS"]
    db_name = os.environ["DB_NAME"]
    db_host = os.environ["DB_HOST"]
    SQLALCHEMY_DATABASE_URL = f"postgresql://{db_user}:{db_pass}@{db_host}/{db_name}"
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
else:
    print("💻 Running Locally - Using SQLite")
    SQLALCHEMY_DATABASE_URL = "sqlite:///./local_test.db"
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency buat dipanggil di main.py
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()