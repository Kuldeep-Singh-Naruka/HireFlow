from __future__ import annotations

import asyncio
import json
from pathlib import PurePath

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.agent import events, runner
from app.database import SessionLocal, get_db
from app.models.candidate import STEP_ERROR, Candidate
from app.models.profile import HiringProfile
from app.models.run_event import RunEvent
from app.models.run import (
    RUN_DONE,
    RUN_FAILED,
    RUN_INTERRUPTED,
    RUN_QUEUED,
    RUN_REVIEWING,
    RUN_RUNNING,
    Run,
)
from app.schemas.run_schema import (
    CandidateDetail,
    RejectedFile,
    RunCreated,
    RunState,
    summarize_candidate,
)

router = APIRouter(tags=["Runs"])

ALLOWED_EXTENSIONS = {".pdf", ".docx"}
MAX_FILE_BYTES = 10 * 1024 * 1024
MAX_FILES = 50


def _run_or_404(db: Session, run_id: int) -> Run:
    run = db.get(Run, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


def _candidate_or_404(db: Session, candidate_id: int) -> Candidate:
    cand = db.get(Candidate, candidate_id)
    if cand is None:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return cand


def _claim(db: Session, run_id: int, from_status: str, to_status: str) -> bool:
    """Atomically move a run from `from_status` to `to_status`; False if another request won."""
    result = db.execute(
        update(Run)
        .where(Run.id == run_id, Run.status == from_status)
        .values(status=to_status)
    )
    db.commit()
    return result.rowcount == 1


def _snapshot_requirements(run: Run) -> list[dict]:
    return (run.requirements_snapshot or {}).get("requirements", [])


@router.post("/profiles/{profile_id}/runs", response_model=RunCreated, status_code=201)
async def create_run(
    profile_id: int,
    files: list[UploadFile],
    background: BackgroundTasks,
    db: Session = Depends(get_db),
) -> RunCreated:
    profile = db.get(HiringProfile, profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    requirements = (profile.requirements_json or {}).get("requirements") or []
    if not requirements:
        raise HTTPException(
            status_code=400, detail="Profile has no requirements; add requirements first"
        )
    if len(files) > MAX_FILES:
        raise HTTPException(status_code=400, detail=f"Too many files (max {MAX_FILES})")

    accepted: list[tuple[str, bytes]] = []
    rejected: list[RejectedFile] = []
    for f in files:
        name = f.filename or "unnamed"
        if PurePath(name).suffix.lower() not in ALLOWED_EXTENSIONS:
            rejected.append(RejectedFile(filename=name, reason="Unsupported file type"))
            continue
        data = await f.read()
        if len(data) > MAX_FILE_BYTES:
            rejected.append(RejectedFile(filename=name, reason="File too large (max 10 MB)"))
            continue
        accepted.append((name, data))
    if not accepted:
        raise HTTPException(
            status_code=400,
            detail={
                "message": "No valid files uploaded",
                "rejected": [r.model_dump() for r in rejected],
            },
        )

    run = Run(
        profile_id=profile.id,
        status=RUN_QUEUED,
        requirements_snapshot={"requirements": [dict(r) for r in requirements]},
    )
    db.add(run)
    db.flush()
    candidates = [
        Candidate(run_id=run.id, profile_id=profile.id, filename=name, file_bytes=data)
        for name, data in accepted
    ]
    db.add_all(candidates)
    db.commit()
    background.add_task(runner.run, run.id)
    return RunCreated(
        run_id=run.id,
        candidates=[summarize_candidate(c) for c in candidates],
        rejected=rejected,
    )


@router.get("/runs/{run_id}", response_model=RunState)
def get_run(run_id: int, db: Session = Depends(get_db)) -> RunState:
    run = _run_or_404(db, run_id)
    return RunState(
        id=run.id,
        profile_id=run.profile_id,
        status=run.status,
        review_status=run.review_status,
        review_error=run.review_error,
        review_json=run.review_json,
        created_at=run.created_at,
        finished_at=run.finished_at,
        candidates=[
            summarize_candidate(c) for c in sorted(run.candidates, key=lambda c: c.id)
        ],
        events=[events.serialize(e) for e in run.events],
    )


@router.post("/runs/{run_id}/resume", status_code=202)
def resume_run(
    run_id: int, background: BackgroundTasks, db: Session = Depends(get_db)
) -> dict:
    _run_or_404(db, run_id)
    if not _claim(db, run_id, RUN_INTERRUPTED, RUN_RUNNING):
        raise HTTPException(status_code=409, detail="Run is not interrupted")
    background.add_task(runner.resume, run_id)
    return {"run_id": run_id}


@router.post("/runs/{run_id}/review", status_code=202)
def rerun_review(
    run_id: int, background: BackgroundTasks, db: Session = Depends(get_db)
) -> dict:
    _run_or_404(db, run_id)
    if not _claim(db, run_id, RUN_DONE, RUN_REVIEWING):
        raise HTTPException(status_code=409, detail="Run is not finished")
    background.add_task(runner.rerun_review, run_id)
    return {"run_id": run_id}


@router.get("/candidates/{candidate_id}", response_model=CandidateDetail)
def get_candidate(candidate_id: int, db: Session = Depends(get_db)) -> CandidateDetail:
    cand = _candidate_or_404(db, candidate_id)
    base = summarize_candidate(cand).model_dump()
    return CandidateDetail(
        **base,
        raw_text=cand.raw_text,
        profile_json=cand.profile_json,
        mapping_json=cand.mapping_json,
        interview_questions_json=cand.interview_questions_json,
        requirements=_snapshot_requirements(cand.run),
    )


@router.post("/candidates/{candidate_id}/retry", status_code=202)
def retry_candidate(
    candidate_id: int, background: BackgroundTasks, db: Session = Depends(get_db)
) -> dict:
    cand = _candidate_or_404(db, candidate_id)
    if cand.run.status != RUN_DONE:
        raise HTTPException(
            status_code=409, detail="Run is not finished; resume it instead of retrying"
        )
    if not any(getattr(cand, f"{s}_status") == STEP_ERROR for s in Candidate.STEPS):
        raise HTTPException(status_code=409, detail="Candidate has no failed step")
    if not _claim(db, cand.run_id, RUN_DONE, RUN_RUNNING):
        raise HTTPException(status_code=409, detail="Run is not finished")
    background.add_task(runner.retry_candidate, candidate_id)
    return {"candidate_id": candidate_id}


_TERMINAL_EVENTS = ("run_done", "run_interrupted")
_TERMINAL_STATUSES = (RUN_DONE, RUN_INTERRUPTED, RUN_FAILED)
HEARTBEAT_SECONDS = 15


def _frame(event: dict) -> str:
    return f"id: {event['id']}\nevent: {event['type']}\ndata: {json.dumps(event)}\n\n"


def _run_status(run_id: int) -> str | None:
    with SessionLocal() as db:
        run = db.get(Run, run_id)
        return run.status if run else None


def _replay(run_id: int, after: int) -> tuple[list[dict], str | None]:
    with SessionLocal() as db:
        rows = db.scalars(
            select(RunEvent)
            .where(RunEvent.run_id == run_id, RunEvent.id > after)
            .order_by(RunEvent.id)
        ).all()
        run = db.get(Run, run_id)
        return [events.serialize(r) for r in rows], (run.status if run else None)


@router.get("/runs/{run_id}/events")
async def stream_events(
    run_id: int,
    after: int = Query(0),
    last_event_id: str | None = Header(None),
) -> StreamingResponse:
    if await asyncio.to_thread(_run_status, run_id) is None:
        raise HTTPException(status_code=404, detail="Run not found")
    start = after
    if last_event_id is not None:
        try:
            start = int(last_event_id)
        except ValueError:
            pass

    async def gen():
        events.bind_loop(asyncio.get_running_loop())
        q = events.subscribe(run_id)
        try:
            replayed, status = await asyncio.to_thread(_replay, run_id, start)
            max_sent = start  # replay watermark; live ids above it may arrive out of order
            seen: set[int] = set()
            for ev in replayed:
                max_sent = max(max_sent, ev["id"])
                yield _frame(ev)
                if ev["type"] in _TERMINAL_EVENTS:
                    return
            if status in _TERMINAL_STATUSES:
                return
            while True:
                try:
                    ev = await asyncio.wait_for(q.get(), HEARTBEAT_SECONDS)
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
                    continue
                if ev["id"] <= max_sent or ev["id"] in seen:
                    continue
                seen.add(ev["id"])
                yield _frame(ev)
                if ev["type"] in _TERMINAL_EVENTS:
                    return
        finally:
            events.unsubscribe(run_id, q)

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
