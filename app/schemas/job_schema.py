from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class JobCreate(BaseModel):
    """Payload for POST /jobs."""

    title: str = Field(..., min_length=1, description="Job title (non-empty)")
    description_text: str = Field(
        ..., min_length=1, description="Plain-text job description (non-empty)"
    )

    @field_validator("title", "description_text", mode="before")
    @classmethod
    def strip_and_require(cls, v: str) -> str:
        """Strip surrounding whitespace and reject blank strings."""
        if isinstance(v, str):
            v = v.strip()
        if not v:
            raise ValueError("Field must be a non-empty string")
        return v


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class CandidateSummary(BaseModel):
    """Lightweight candidate info embedded in the Job detail response."""

    id: int
    filename: str
    extraction_status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class JobResponse(BaseModel):
    """Full Job record returned after creation or GET."""

    id: int
    title: str
    description_text: str
    created_at: datetime

    model_config = {"from_attributes": True}


class JobDetailResponse(JobResponse):
    """Job detail including a summary list of uploaded candidates."""

    candidates: list[CandidateSummary] = []
