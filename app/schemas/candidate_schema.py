from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class CandidateUploadResponse(BaseModel):
    """Returned after POST /jobs/{job_id}/candidates.

    NOTE: `raw_text` is intentionally omitted to keep upload responses
    light. Fetch GET /candidates/{id} to retrieve the full extracted text.
    """

    id: int
    job_id: int
    filename: str
    extraction_status: str
    extraction_error: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class CandidateDetailResponse(BaseModel):
    """Full candidate record including raw_text — only from GET /candidates/{id}."""

    id: int
    job_id: int
    filename: str
    raw_text: Optional[str] = None
    extraction_status: str
    extraction_error: Optional[str] = None
    profile_json: Optional[dict] = None
    profile_status: str
    profile_error: Optional[str] = None
    # Milestone 3 — requirement mapping results
    mapping_json: Optional[dict] = None
    mapping_status: str = "not_mapped"
    mapping_error: Optional[str] = None
    # Milestone 4 — interview question generation
    interview_questions_json: Optional[dict] = None
    interview_questions_status: str = "not_generated"
    interview_questions_error: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}

