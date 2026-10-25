from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RunEvent(Base):
    """Append-only agent log entry; `id` doubles as the SSE event id."""

    __tablename__ = "run_events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    candidate_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE"), nullable=True
    )
    type: Mapped[str] = mapped_column(String(64), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    run: Mapped["Run"] = relationship(back_populates="events")  # noqa: F821
