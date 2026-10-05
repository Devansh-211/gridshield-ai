"""
Database Connection and Session Manager (SQLite Async with aiosqlite).
"""
import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from backend.app.persistence.models import Base

DB_PATH = os.environ.get("GRIDSHIELD_DB_PATH", "gridshield.db")
DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

async def init_db():
    """Create all tables in the database."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    """Dependency for obtaining async DB sessions."""
    async with AsyncSessionLocal() as session:
        yield session
