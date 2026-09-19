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
    """Full candidate record including raw_text, profile, screening, and interview kit."""

    id: int
    job_id: int
    filename: str
    raw_text: Optional[str] = None
    extraction_status: str
    extraction_error: Optional[str] = None
    profile_json: Optional[dict] = None
    profile_status: str
    profile_error: Optional[str] = None
    screening_json: Optional[dict] = None
    screening_status: str = "not_screened"
    screening_error: Optional[str] = None
    interview_kit_json: Optional[dict] = None
    created_at: datetime

    model_config = {"from_attributes": True}

