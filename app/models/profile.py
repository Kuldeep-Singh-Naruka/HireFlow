from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

# requirements_status values (plain varchar, not a DB enum, for portability).
REQ_PENDING = "pending"
REQ_OK = "ok"
REQ_ERROR = "error"


class HiringProfile(Base):
    """A hiring profile: the role form plus an editable requirements checklist."""

    __tablename__ = "hiring_profiles"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    seniority: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    min_years: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    must_have: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    nice_to_have: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    jd_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    requirements_json: Mapped[dict] = mapped_column(
        JSON, nullable=False, default=lambda: {"requirements": []}
    )
    requirements_status: Mapped[str] = mapped_column(
        String(16), nullable=False, default=REQ_PENDING
    )
    requirements_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    runs: Mapped[list["Run"]] = relationship(  # noqa: F821
        back_populates="profile", cascade="all, delete-orphan"
    )
