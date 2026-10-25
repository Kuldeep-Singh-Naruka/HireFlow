from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

RUN_QUEUED = "queued"
RUN_RUNNING = "running"
RUN_REVIEWING = "reviewing"
RUN_DONE = "done"
RUN_INTERRUPTED = "interrupted"
RUN_FAILED = "failed"

REVIEW_PENDING = "pending"
REVIEW_RUNNING = "running"
REVIEW_OK = "ok"
REVIEW_ERROR = "error"


class Run(Base):
    """One screening run of a batch of resumes against a hiring profile."""

    __tablename__ = "runs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    profile_id: Mapped[int] = mapped_column(
        ForeignKey("hiring_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(String(16), nullable=False, default=RUN_QUEUED)
    # Requirements copied at run creation so later profile edits don't change this run.
    requirements_snapshot: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    review_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    review_status: Mapped[str] = mapped_column(
        String(16), nullable=False, default=REVIEW_PENDING
    )
    review_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    finished_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    profile: Mapped["HiringProfile"] = relationship(back_populates="runs")  # noqa: F821
    candidates: Mapped[list["Candidate"]] = relationship(  # noqa: F821
        back_populates="run", cascade="all, delete-orphan"
    )
    events: Mapped[list["RunEvent"]] = relationship(  # noqa: F821
        back_populates="run",
        cascade="all, delete-orphan",
        order_by="RunEvent.id",
    )
