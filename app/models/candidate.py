from __future__ import annotations

from datetime import datetime
from typing import ClassVar, Optional

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, LargeBinary, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

# Per-step statuses (plain varchar, not a DB enum, for portability).
STEP_PENDING = "pending"
STEP_RUNNING = "running"
STEP_OK = "ok"
STEP_ERROR = "error"
STEP_SKIPPED = "skipped"

BADGE_STRONG_MATCH = "strong_match"
BADGE_REVIEW_REQUIRED = "review_required"
BADGE_SIGNIFICANT_GAPS = "significant_gaps"


def _step_status() -> Mapped[str]:
    return mapped_column(String(16), nullable=False, default=STEP_PENDING)


class Candidate(Base):
    """A resume uploaded as part of a run, with per-step pipeline state.

    `file_bytes` is kept so the extract step can be retried/resumed.
    `raw_text` is nullable: a scanned PDF with no text layer is a valid case.
    """

    __tablename__ = "candidates"

    STEPS: ClassVar[tuple[str, ...]] = ("extract", "profile", "mapping", "questions")

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Denormalized for profile-wide review.
    profile_id: Mapped[int] = mapped_column(
        ForeignKey("hiring_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    file_bytes: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    raw_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    extract_status: Mapped[str] = _step_status()
    profile_status: Mapped[str] = _step_status()
    mapping_status: Mapped[str] = _step_status()
    questions_status: Mapped[str] = _step_status()

    extract_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    profile_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    mapping_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    questions_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    profile_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    mapping_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    interview_questions_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    badge: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    run: Mapped["Run"] = relationship(back_populates="candidates")  # noqa: F821
