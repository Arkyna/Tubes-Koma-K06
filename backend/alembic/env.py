from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
import os
import sys

# 1. Masukkan path root biar bisa import database.py
sys.path.insert(0, os.path.realpath(os.path.join(os.path.dirname(__file__), '..')))

# 2. Import Base (buat metadata) DAN URL DATABASE dari file database.py kamu
from database import Base, SQLALCHEMY_DATABASE_URL # <--- Kita ambil URL dari logic hybridmu
import models 

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline():
    """Run migrations in 'offline' mode."""
    # Langsung pakai URL dari database.py
    url = SQLALCHEMY_DATABASE_URL
    
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # PENTING BUAT SQLITE: Biar bisa alter table
        render_as_batch=True 
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online():
    """Run migrations in 'online' mode."""
    
    # Kita bypass config .ini dan inject URL dari database.py
    configuration = config.get_section(config.config_ini_section)
    configuration["sqlalchemy.url"] = SQLALCHEMY_DATABASE_URL
    
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            # PENTING BUAT SQLITE: Ini nyawa kedua buat migrasi di SQLite
            render_as_batch=True 
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()