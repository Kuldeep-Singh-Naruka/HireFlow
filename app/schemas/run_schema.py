from __future__ import annotations

from datetime import datetime
from pathlib import PurePath
from typing import Optional

from pydantic import BaseModel


class CandidateSummary(BaseModel):
    id: int
    run_id: int
    filename: str
    name: str
    extract_status: str
    profile_status: str
    mapping_status: str
    questions_status: str
    extract_error: Optional[str] = None
    profile_error: Optional[str] = None
    mapping_error: Optional[str] = None
    questions_error: Optional[str] = None
    score: Optional[int] = None
    badge: Optional[str] = None
    created_at: datetime


def summarize_candidate(c) -> CandidateSummary:
    """Build a CandidateSummary from a Candidate row (name = filename stem)."""
    data = {f: getattr(c, f) for f in CandidateSummary.model_fields if f != "name"}
    return CandidateSummary(name=PurePath(c.filename).stem, **data)


class RejectedFile(BaseModel):
    filename: str
    reason: str


class RunCreated(BaseModel):
    run_id: int
    candidates: list[CandidateSummary]
    rejected: list[RejectedFile]


class RunState(BaseModel):
    id: int
    profile_id: int
    status: str
    review_status: str
    review_error: Optional[str] = None
    review_json: Optional[dict] = None
    created_at: datetime
    finished_at: Optional[datetime] = None
    candidates: list[CandidateSummary]
    events: list[dict]


class CandidateDetail(CandidateSummary):
    raw_text: Optional[str] = None
    profile_json: Optional[dict] = None
    mapping_json: Optional[dict] = None
    interview_questions_json: Optional[dict] = None
    requirements: list[dict]
