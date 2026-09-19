from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.candidate import Candidate
from app.models.job import (
    Job,
    REQUIREMENTS_STATUS_ERROR,
    REQUIREMENTS_STATUS_OK,
)
from app.schemas.job_schema import JobCreate, JobDetailResponse, JobResponse
from app.services.llm import extract_job_requirements

router = APIRouter(prefix="/jobs", tags=["Jobs"])


# ---------------------------------------------------------------------------
# GET /jobs — list all job postings
# ---------------------------------------------------------------------------

@router.get(
    "",
    response_model=list[JobDetailResponse],
    summary="List all job postings",
)
def list_jobs(db: Session = Depends(get_db)) -> list[JobDetailResponse]:
    """Return all job postings with candidate summaries."""
    jobs = db.query(Job).order_by(Job.created_at.desc()).all()
    results = []
    for job in jobs:
        candidates = (
            db.query(Candidate)
            .filter(Candidate.job_id == job.id)
            .order_by(Candidate.created_at)
            .all()
        )
        results.append(
            JobDetailResponse(
                id=job.id,
                title=job.title,
                description_text=job.description_text,
                requirements_json=job.requirements_json,
                requirements_status=job.requirements_status,
                requirements_error=job.requirements_error,
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
        )
    return results


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
        requirements_json=job.requirements_json,
        requirements_status=job.requirements_status,
        requirements_error=job.requirements_error,
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


# ---------------------------------------------------------------------------
# POST /jobs/{job_id}/extract-requirements — extract structured requirements via LLM
# ---------------------------------------------------------------------------

@router.post(
    "/{job_id}/extract-requirements",
    response_model=JobResponse,
    summary="Extract structured requirements from a job description using LLM",
)
def extract_requirements_endpoint(
    job_id: int, db: Session = Depends(get_db)
) -> Job:
    """Extract structured requirements (skills, experience, qualifications) from the job description.

    Steps:
    1. Return 404 if job doesn't exist.
    2. Call extract_job_requirements(job.description_text).
    3. On success: requirements_status="ok", requirements_json=<result as dict>, requirements_error=None.
    4. On error: requirements_status="error", requirements_error=str(exception).
    5. Always return 200 with the updated Job object.
    """
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    try:
        extraction_result = extract_job_requirements(job.description_text)
        job.requirements_json = extraction_result.model_dump()
        job.requirements_status = REQUIREMENTS_STATUS_OK
        job.requirements_error = None
    except Exception as exc:
        job.requirements_status = REQUIREMENTS_STATUS_ERROR
        job.requirements_error = str(exc)

    db.add(job)
    db.commit()
    db.refresh(job)
    return job

