"""
main.py — HireFlow API entry-point
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI

from app.database import Base, engine

# Import models so their table metadata is registered on Base before
# create_all() runs.  These imports must come BEFORE the lifespan handler.
import app.models.job       # noqa: F401
import app.models.candidate  # noqa: F401

from app.routers import candidates, jobs


# ---------------------------------------------------------------------------
# Lifespan handler — runs once on startup / shutdown
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Create all DB tables on startup (idempotent — safe to re-run)."""
    # Assumption: create_all() is fast enough at hackathon scale and Neon
    # connections are stable.  checkfirst=True is the default; existing tables
    # are not dropped or altered, so this is safe across restarts.
    Base.metadata.create_all(bind=engine)
    yield
    # Nothing to tear down — connection pool is managed by SQLAlchemy.


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="HireFlow API",
    description=(
        "Milestone 1 — job posting creation and resume ingestion (PDF / DOCX). "
        "No auth, no LLM, no background workers."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Router registration
# ---------------------------------------------------------------------------

app.include_router(jobs.router)
app.include_router(candidates.router)


# ---------------------------------------------------------------------------
# Health check — useful for quick connectivity verification
# ---------------------------------------------------------------------------

@app.get("/health", tags=["Health"])
def health_check() -> dict[str, str]:
    """Returns 200 OK when the server is up."""
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Dev entry-point — allows `python main.py` in addition to `uvicorn main:app`
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
