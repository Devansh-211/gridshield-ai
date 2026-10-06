"""
GridShield AI — Database Connection & Session Manager.

Supports:
- Local development & testing: SQLite with WAL mode (file:///./data/gridshield.db)
- Production on Vercel: Supabase Postgres via Supavisor Transaction Pooler (port 6543) using NullPool
- Unit of work context manager and session dependency.
"""

import os
import sys
from typing import Generator
from contextlib import contextmanager
from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool, StaticPool
from backend.app.persistence.models import Base

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./data/gridshield.db")
DB_SCHEMA = os.environ.get("DB_SCHEMA", "gridshield")
IS_SQLITE = DATABASE_URL.startswith("sqlite")
IS_VERCEL = bool(os.environ.get("VERCEL"))
ALLOW_EPHEMERAL_DB = os.environ.get("ALLOW_EPHEMERAL_DB", "false").lower() == "true"

# Guard check: Vercel serverless requires Postgres unless explicitly overridden
if IS_VERCEL and IS_SQLITE and not ALLOW_EPHEMERAL_DB:
    print("[WARNING] Running with SQLite on Vercel without ALLOW_EPHEMERAL_DB=true. Ephemeral storage only.")

# Configure Engine Options
engine_kwargs = {}
if IS_SQLITE:
    # Ensure local directory exists
    if ":memory:" not in DATABASE_URL:
        db_path = DATABASE_URL.replace("sqlite:///", "")
        os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    if ":memory:" in DATABASE_URL:
        engine_kwargs["poolclass"] = StaticPool
else:
    # Postgres / Supavisor configuration
    engine_kwargs["poolclass"] = NullPool
    # Schema translation map for PostgreSQL
    engine_kwargs["execution_options"] = {
        "schema_translate_map": {None: DB_SCHEMA}
    }

engine = create_engine(DATABASE_URL, **engine_kwargs)

# Enable SQLite foreign keys & WAL mode
if IS_SQLITE:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)

def init_db():
    """Initializes the database schema (used for testing and local dev)."""
    if not IS_SQLITE:
        with engine.connect() as conn:
            conn.execute(text(f"CREATE SCHEMA IF NOT EXISTS {DB_SCHEMA};"))
            conn.commit()
    Base.metadata.create_all(bind=engine)

def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency for yielding database sessions."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@contextmanager
def get_db_session() -> Generator[Session, None, None]:
    """Context manager for service/repository database sessions."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

def get_db_size_mb() -> float:
    """Returns the current database size in megabytes."""
    try:
        if IS_SQLITE:
            if ":memory:" in DATABASE_URL:
                return 0.0
            db_path = DATABASE_URL.replace("sqlite:///", "")
            if os.path.exists(db_path):
                return os.path.getsize(db_path) / (1024 * 1024)
            return 0.0
        else:
            with engine.connect() as conn:
                res = conn.execute(text("SELECT pg_database_size(current_database());")).scalar()
                return float(res) / (1024 * 1024) if res else 0.0
    except Exception as e:
        print(f"[WARN] Error reading DB size: {e}")
        return 0.0
