from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.candidate import Candidate
from app.models.job import Job
from app.schemas.job_schema import JobCreate, JobDetailResponse, JobResponse
from app.schemas.candidate_schema import CandidateUploadResponse

router = APIRouter(prefix="/jobs", tags=["Jobs"])


# ---------------------------------------------------------------------------
# POST /jobs — create a job posting
# ---------------------------------------------------------------------------

@router.post(
    "",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a job posting",
)
def create_job(payload: JobCreate, db: Session = Depends(get_db)) -> Job:
    """Accept a JSON body with `title` and `description_text`.

    Both fields are validated as non-empty by :class:`JobCreate`; Pydantic
    returns 422 automatically for missing/blank values, which the client can
    treat the same as a 400 for practical purposes.
    """
    job = Job(title=payload.title, description_text=payload.description_text)
    db.add(job)
    db.commit()
    db.refresh(job)
    return job


# ---------------------------------------------------------------------------
# GET /jobs/{job_id} — job detail + candidate summary list
# ---------------------------------------------------------------------------

@router.get(
    "/{job_id}",
    response_model=JobDetailResponse,
    summary="Get a job posting with its candidate list",
)
def get_job(job_id: int, db: Session = Depends(get_db)) -> JobDetailResponse:
    """Return the Job record plus a lightweight list of its candidates.

    Raw extracted text is NOT included in the candidate list items; use
    GET /candidates/{id} for full text.
    """
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    candidates = (
        db.query(Candidate)
        .filter(Candidate.job_id == job_id)
        .order_by(Candidate.created_at)
        .all()
    )

    return JobDetailResponse(
        id=job.id,
        title=job.title,
        description_text=job.description_text,
        created_at=job.created_at,
        candidates=[
            {
                "id": c.id,
                "filename": c.filename,
                "extraction_status": c.extraction_status,
                "created_at": c.created_at,
            }
            for c in candidates
        ],
    )
