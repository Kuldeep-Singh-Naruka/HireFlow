from __future__ import annotations

from datetime import datetime

from typing import Optional

from sqlalchemy import JSON, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

# Status constants for requirements extraction
REQUIREMENTS_STATUS_NOT_EXTRACTED = "not_extracted"
REQUIREMENTS_STATUS_OK = "ok"
REQUIREMENTS_STATUS_ERROR = "error"


class Job(Base):
    """Represents a job posting created by a recruiter.

    `description_text` stores plain-text pasted by the user — no file
    parsing is done on this field.
    """

    __tablename__ = "jobs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description_text: Mapped[str] = mapped_column(Text, nullable=False)

    requirements_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    requirements_status: Mapped[str] = mapped_column(
        String(32), nullable=False, default=REQUIREMENTS_STATUS_NOT_EXTRACTED
    )
    requirements_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

