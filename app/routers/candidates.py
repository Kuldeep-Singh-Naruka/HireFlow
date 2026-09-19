from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.candidate import (
    Candidate,
    EXTRACTION_STATUS_EMPTY,
    EXTRACTION_STATUS_ERROR,
    EXTRACTION_STATUS_OK,
    PROFILE_STATUS_ERROR,
    PROFILE_STATUS_OK,
)
from app.models.job import Job
from app.schemas.candidate_schema import CandidateDetailResponse, CandidateUploadResponse
from app.services.extraction import extract_text
from app.services.llm import extract_candidate_profile
from app.services.screening import generate_interview_kit, screen_candidate

router = APIRouter(tags=["Candidates"])


# ---------------------------------------------------------------------------
# POST /candidates/{candidate_id}/extract-profile — extract candidate profile via LLM
# ---------------------------------------------------------------------------

@router.post(
    "/candidates/{candidate_id}/extract-profile",
    response_model=CandidateDetailResponse,
    summary="Extract structured profile from candidate resume text using LLM",
)
def extract_profile_endpoint(
    candidate_id: int, db: Session = Depends(get_db)
) -> Candidate:
    """Extract structured profile (summary, skills, experience, projects, education) from candidate text.

    Steps:
    1. Return 404 if candidate doesn't exist.
    2. Return 400 if candidate.extraction_status != "ok" (no usable raw_text).
    3. Call extract_candidate_profile(candidate.raw_text).
    4. On success: profile_status="ok", profile_json=<result as dict>, profile_error=None.
    5. On error: profile_status="error", profile_error=str(exception).
    6. Always return 200 with the updated Candidate object.
    """
    candidate = db.get(Candidate, candidate_id)
    if candidate is None:
        raise HTTPException(
            status_code=404, detail=f"Candidate {candidate_id} not found"
        )

    if candidate.extraction_status != EXTRACTION_STATUS_OK or not candidate.raw_text:
        raise HTTPException(
            status_code=400,
            detail=f"Candidate has no extracted text (status: {candidate.extraction_status})",
        )

    try:
        extraction_result = extract_candidate_profile(candidate.raw_text)
        candidate.profile_json = extraction_result.model_dump()
        candidate.profile_status = PROFILE_STATUS_OK
        candidate.profile_error = None
    except Exception as exc:
        candidate.profile_status = PROFILE_STATUS_ERROR
        candidate.profile_error = str(exc)

    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate


# 10 MB hard limit — checked on raw bytes so the limit is exact.
MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB


# ---------------------------------------------------------------------------
# POST /jobs/{job_id}/candidates — upload a resume
# ---------------------------------------------------------------------------

@router.post(
    "/jobs/{job_id}/candidates",
    response_model=CandidateUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a resume (PDF or DOCX) for a job",
)
async def upload_candidate(
    job_id: int,
    file: UploadFile = File(..., description="Resume file (.pdf or .docx, max 10 MB)"),
    db: Session = Depends(get_db),
) -> Candidate:
    """Process a resume upload for the given job.

    Steps (in order):
    1. 404 if the job doesn't exist.
    2. Read the file and reject if > 10 MB (400).
    3. Call extract_text(); ValueError → 400, no DB row created.
    4. Empty extraction → row with extraction_status="empty".
    5. Any other extraction exception → row with extraction_status="error".
    6. Success → row with extraction_status="ok".

    Always returns 201 with the Candidate record (steps 4–6) so the
    frontend can track per-file status without crashing on partial failures.
    """
    # Step 1 — verify job exists
    job = db.get(Job, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    # Step 2 — read bytes and check size
    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=400,
            detail="File too large, max 10MB",
        )

    original_filename = file.filename or "unknown"

    # Step 3 — unsupported extension → 400, no DB row
    try:
        raw_text = extract_text(original_filename, file_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        # Step 5 — unexpected extraction failure → persist error row, still 201
        candidate = Candidate(
            job_id=job_id,
            filename=original_filename,
            raw_text=None,
            extraction_status=EXTRACTION_STATUS_ERROR,
            extraction_error=str(exc),
        )
        db.add(candidate)
        db.commit()
        db.refresh(candidate)
        return candidate

    # Step 4 — empty result (scanned PDF etc.) → persist "empty" row
    if not raw_text.strip():
        candidate = Candidate(
            job_id=job_id,
            filename=original_filename,
            raw_text=None,
            extraction_status=EXTRACTION_STATUS_EMPTY,
        )
        db.add(candidate)
        db.commit()
        db.refresh(candidate)
        return candidate

    # Step 6 — happy path
    candidate = Candidate(
        job_id=job_id,
        filename=original_filename,
        raw_text=raw_text,
        extraction_status=EXTRACTION_STATUS_OK,
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate


# ---------------------------------------------------------------------------
# GET /candidates/{candidate_id} — full candidate record with raw_text
# ---------------------------------------------------------------------------

@router.get(
    "/candidates/{candidate_id}",
    response_model=CandidateDetailResponse,
    summary="Get full candidate record including extracted text",
)
def get_candidate(candidate_id: int, db: Session = Depends(get_db)) -> Candidate:
    """Return the full Candidate record, including raw_text."""
    candidate = db.get(Candidate, candidate_id)
    if candidate is None:
        raise HTTPException(
            status_code=404, detail=f"Candidate {candidate_id} not found"
        )
    return candidate


# ---------------------------------------------------------------------------
# POST /candidates/{candidate_id}/match — AI Candidate Match Screening
# ---------------------------------------------------------------------------

@router.post(
    "/candidates/{candidate_id}/match",
    response_model=CandidateDetailResponse,
    summary="Screen candidate profile against job requirements using AI",
)
def screen_candidate_endpoint(
    candidate_id: int, db: Session = Depends(get_db)
) -> Candidate:
    """Perform AI candidate screening & match scoring against job requirements."""
    candidate = db.get(Candidate, candidate_id)
    if candidate is None:
        raise HTTPException(status_code=404, detail=f"Candidate {candidate_id} not found")

    job = db.get(Job, candidate.job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Associated job {candidate.job_id} not found")

    if not candidate.profile_json:
        # Auto-extract profile if profile_json is not present yet
        if candidate.extraction_status == EXTRACTION_STATUS_OK and candidate.raw_text:
            try:
                extraction_result = extract_candidate_profile(candidate.raw_text)
                candidate.profile_json = extraction_result.model_dump()
                candidate.profile_status = PROFILE_STATUS_OK
            except Exception as exc:
                candidate.profile_status = PROFILE_STATUS_ERROR
                candidate.profile_error = str(exc)
        else:
            raise HTTPException(
                status_code=400,
                detail="Candidate profile not extracted yet and candidate has no usable text layer.",
            )

    req_json = job.requirements_json or {"requirements": []}
    prof_json = candidate.profile_json or {}

    try:
        screening_res = screen_candidate(job.title, req_json, prof_json)
        candidate.screening_json = screening_res.model_dump()
        candidate.screening_status = "ok"
        candidate.screening_error = None
    except Exception as exc:
        candidate.screening_status = "error"
        candidate.screening_error = str(exc)

    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate


# ---------------------------------------------------------------------------
# POST /candidates/{candidate_id}/interview-kit — Generate Interview Kit
# ---------------------------------------------------------------------------

@router.post(
    "/candidates/{candidate_id}/interview-kit",
    response_model=CandidateDetailResponse,
    summary="Generate tailored interview intelligence question kit for candidate",
)
def generate_interview_kit_endpoint(
    candidate_id: int, db: Session = Depends(get_db)
) -> Candidate:
    """Generate structured interview questions (technical, behavioral, skill gap probes)."""
    candidate = db.get(Candidate, candidate_id)
    if candidate is None:
        raise HTTPException(status_code=404, detail=f"Candidate {candidate_id} not found")

    job = db.get(Job, candidate.job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Associated job {candidate.job_id} not found")

    req_json = job.requirements_json or {"requirements": []}
    prof_json = candidate.profile_json or {}
    screening_summary = ""
    if candidate.screening_json:
        screening_summary = candidate.screening_json.get("summary_reasoning", "")

    try:
        kit_res = generate_interview_kit(job.title, req_json, prof_json, screening_summary)
        candidate.interview_kit_json = kit_res.model_dump()
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to generate interview kit: {exc}")

    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate
