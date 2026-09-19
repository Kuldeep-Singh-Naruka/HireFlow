from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

# ---------------------------------------------------------------------------
# Engine — synchronous, suitable for FastAPI with a threadpool worker
# ---------------------------------------------------------------------------
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,   # detect stale connections from Neon's idle timeout
    pool_size=5,
    max_overflow=10,
)

# ---------------------------------------------------------------------------
# Session factory
# ---------------------------------------------------------------------------
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,   # keep attributes accessible after commit
)

# ---------------------------------------------------------------------------
# Declarative base — all models import this and subclass it
# ---------------------------------------------------------------------------
class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# FastAPI dependency — yields a DB session and always closes it
# ---------------------------------------------------------------------------
def get_db():
    """Yield a SQLAlchemy session; close it when the request is done."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
