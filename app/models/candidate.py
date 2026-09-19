from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

# Allowed values for extraction_status.
# Assumption: stored as a plain varchar rather than a DB enum to keep
# create_all() portable across PostgreSQL versions without extra DDL.
EXTRACTION_STATUS_OK = "ok"
EXTRACTION_STATUS_EMPTY = "empty"
EXTRACTION_STATUS_ERROR = "error"


class Candidate(Base):
    """Represents a resume uploaded by (or on behalf of) a candidate.

    The `raw_text` column is intentionally nullable: a scanned PDF that
    produces no extractable text layer is a valid, non-error case
    (extraction_status="empty"). Similarly, if extraction raises an
    unexpected exception the row is still persisted with
    extraction_status="error" so the frontend can surface per-file
    failure state rather than a generic 500.
    """

    __tablename__ = "candidates"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    job_id: Mapped[int] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    raw_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extraction_status: Mapped[str] = mapped_column(
        String(16), nullable=False, default=EXTRACTION_STATUS_OK
    )
    extraction_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
