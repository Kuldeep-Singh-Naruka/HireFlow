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
    MAPPING_STATUS_OK,
    MAPPING_STATUS_ERROR,
    IQ_STATUS_OK,
    IQ_STATUS_ERROR,
)
from app.models.job import Job, REQUIREMENTS_STATUS_OK
from app.schemas.candidate_schema import CandidateDetailResponse, CandidateUploadResponse
from app.services.extraction import extract_text
from app.services.llm import (
    extract_candidate_profile,
    map_requirements_to_evidence,
    generate_interview_questions,
    extract_job_requirements,
)

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


# ---------------------------------------------------------------------------
# POST /candidates/{candidate_id}/map-requirements — Milestone 3
# ---------------------------------------------------------------------------

@router.post(
    "/candidates/{candidate_id}/map-requirements",
    response_model=CandidateDetailResponse,
    summary="Map job requirements against a candidate's resume evidence using LLM",
)
def map_requirements_endpoint(
    candidate_id: int, db: Session = Depends(get_db)
) -> Candidate:
    """Map every job requirement to evidence grounded in the candidate's raw resume text.

    Prerequisites (all return 400 if unmet):
    - candidate.extraction_status == "ok"  (has usable raw_text)
    - candidate.profile_status == "ok"     (Milestone 2 profile extracted)
    - job.requirements_status == "ok"      (Milestone 2 requirements extracted)

    On success:  mapping_status="ok",    mapping_json=<MappingResult dict>, mapping_error=None.
    On failure:  mapping_status="error", mapping_error=str(exception).
    Always returns 200. Re-running overwrites the previous mapping_json (idempotent).
    """
    # Step 1 — 404 if candidate not found
    candidate = db.get(Candidate, candidate_id)
    if candidate is None:
        raise HTTPException(
            status_code=404, detail=f"Candidate {candidate_id} not found"
        )

    # Step 2 — guard: must have extracted text
    if candidate.extraction_status != EXTRACTION_STATUS_OK or not candidate.raw_text:
        raise HTTPException(
            status_code=400,
            detail="Candidate has no extracted text",
        )

    # Step 3 — guard: must have profile
    if candidate.profile_status != PROFILE_STATUS_OK or not candidate.profile_json:
        raise HTTPException(
            status_code=400,
            detail="Candidate profile not yet extracted — call extract-profile first",
        )

    # Step 4 — guard: ensure job requirements are extracted (auto-extract on-the-fly if missing)
    job = db.get(Job, candidate.job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job {candidate.job_id} not found")

    if job.requirements_status != REQUIREMENTS_STATUS_OK or not job.requirements_json:
        try:
            extraction_result = extract_job_requirements(job.description_text)
            job.requirements_json = extraction_result.model_dump()
            job.requirements_status = REQUIREMENTS_STATUS_OK
            job.requirements_error = None
            db.add(job)
            db.commit()
            db.refresh(job)
        except Exception as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Job requirements not yet extracted — call extract-requirements first on the job (auto-extract error: {str(exc)})",
            )

    # Step 5 — call LLM mapping function
    try:
        result = map_requirements_to_evidence(
            requirements=job.requirements_json["requirements"],
            raw_text=candidate.raw_text,
            profile=candidate.profile_json,
        )
        # Step 6 — success
        candidate.mapping_json = result.model_dump()
        candidate.mapping_status = MAPPING_STATUS_OK
        candidate.mapping_error = None
    except Exception as exc:
        # Step 7 — error: persist error row, still return 200
        candidate.mapping_status = MAPPING_STATUS_ERROR
        candidate.mapping_error = str(exc)

    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate


# ---------------------------------------------------------------------------
# POST /candidates/{candidate_id}/generate-questions — Milestone 4
# ---------------------------------------------------------------------------

@router.post(
    "/candidates/{candidate_id}/generate-questions",
    response_model=CandidateDetailResponse,
    summary="Generate 5-8 interview questions from the requirement mapping using LLM",
)
def generate_questions_endpoint(
    candidate_id: int, db: Session = Depends(get_db)
) -> Candidate:
    """Generate prioritised interview questions for a mapped candidate.

    Prerequisite: candidate.mapping_status == "ok" (Milestone 3 must have run).

    Priority order (enforced by prompt):
      1. validation — every gap / needs_validation=True mapping
      2. probe      — partial matches needing more evidence
      3. general    — strong met matches, depth/scenario questions

    On success:  interview_questions_status="ok", interview_questions_json=<result>.
    On failure:  interview_questions_status="error", interview_questions_error=str(exc).
    Always returns 200. Re-running overwrites previous questions (idempotent).
    """
    # Step 1 — 404 if candidate not found
    candidate = db.get(Candidate, candidate_id)
    if candidate is None:
        raise HTTPException(
            status_code=404, detail=f"Candidate {candidate_id} not found"
        )

    # Step 2 — mapping must be complete
    if candidate.mapping_status != MAPPING_STATUS_OK or not candidate.mapping_json:
        raise HTTPException(
            status_code=400,
            detail="Candidate requirements not yet mapped — call map-requirements first",
        )

    # Step 3 — load job requirements (needed to verify target_requirement values)
    job = db.get(Job, candidate.job_id)
    if job is None or not job.requirements_json:
        raise HTTPException(
            status_code=400,
            detail="Job requirements not found — call extract-requirements on the job first",
        )

    # Steps 4/5 — call LLM, persist result
    try:
        result = generate_interview_questions(
            mapping_result=candidate.mapping_json,
            requirements=job.requirements_json["requirements"],
        )
        candidate.interview_questions_json = result.model_dump()
        candidate.interview_questions_status = IQ_STATUS_OK
        candidate.interview_questions_error = None
    except Exception as exc:
        candidate.interview_questions_status = IQ_STATUS_ERROR
        candidate.interview_questions_error = str(exc)

    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate


# ---------------------------------------------------------------------------
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
    """Return the full Candidate record, including raw_text.

    This is the only endpoint that exposes raw extracted text — all list
    views deliberately omit it to keep payloads small.
    """
    candidate = db.get(Candidate, candidate_id)
    if candidate is None:
        raise HTTPException(
            status_code=404, detail=f"Candidate {candidate_id} not found"
        )
    return candidate
