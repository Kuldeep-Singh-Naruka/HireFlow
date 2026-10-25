from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings

# ---------------------------------------------------------------------------
# Engine — synchronous, suitable for FastAPI with a threadpool worker
# ---------------------------------------------------------------------------
_engine_kwargs: dict = {"pool_pre_ping": True}  # detect stale connections from Neon's idle timeout
if settings.DATABASE_URL.startswith("sqlite"):
    _engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    _engine_kwargs.update(pool_size=5, max_overflow=10)

engine = create_engine(settings.DATABASE_URL, **_engine_kwargs)

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
