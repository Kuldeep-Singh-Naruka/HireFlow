"""Agent runner: async orchestration of pipeline + review, resume/retry, startup recovery."""
from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone

from sqlalchemy import select

from app.agent import events, pipeline, reviewer
from app.agent.llm_port import get_llm
from app.core.config import settings
from app.database import SessionLocal
from app.models.candidate import STEP_ERROR, STEP_PENDING, STEP_RUNNING, Candidate
from app.models.run import (
    RUN_DONE,
    RUN_FAILED,
    RUN_INTERRUPTED,
    RUN_QUEUED,
    RUN_REVIEWING,
    RUN_RUNNING,
    Run,
)

logger = logging.getLogger(__name__)

SLEEP = time.sleep  # tests replace with a no-op

_semaphores: dict[int, asyncio.Semaphore] = {}

INTERRUPTED_MESSAGE = "Server restarted — run interrupted"


def mark_interrupted_runs() -> int:
    """Mark runs left queued/running/reviewing by a restart as interrupted.

    Publishes a run_interrupted event per run. Returns the number of runs marked.
    """
    with SessionLocal() as db:
        runs = db.scalars(
            select(Run).where(Run.status.in_([RUN_QUEUED, RUN_RUNNING, RUN_REVIEWING]))
        ).all()
        for run in runs:
            run.status = RUN_INTERRUPTED
        db.commit()
        run_ids = [run.id for run in runs]
    for run_id in run_ids:
        events.publish(run_id, "run_interrupted", INTERRUPTED_MESSAGE)
    return len(run_ids)


def _semaphore() -> asyncio.Semaphore:
    """One semaphore per running event loop, sized by settings.AGENT_CONCURRENCY."""
    loop_id = id(asyncio.get_running_loop())
    sem = _semaphores.get(loop_id)
    if sem is None:
        sem = _semaphores[loop_id] = asyncio.Semaphore(settings.AGENT_CONCURRENCY)
    return sem


def _set_run(run_id: int, status: str, *, finished: bool = False) -> None:
    with SessionLocal() as db:
        run = db.get(Run, run_id)
        run.status = status
        if finished:
            run.finished_at = datetime.now(timezone.utc)
        db.commit()


def _pending_candidate_ids(run_id: int) -> list[int]:
    """Candidates with a pending/running step and no error step."""
    with SessionLocal() as db:
        out = []
        for c in db.scalars(
            select(Candidate).where(Candidate.run_id == run_id).order_by(Candidate.id)
        ):
            statuses = [getattr(c, f"{s}_status") for s in Candidate.STEPS]
            if STEP_ERROR in statuses:
                continue
            if any(st in (STEP_PENDING, STEP_RUNNING) for st in statuses):
                out.append(c.id)
        return out


def _mark_candidate_error(candidate_id: int, message: str) -> None:
    """Best-effort: mark the running (else first non-ok) step as error."""
    with SessionLocal() as db:
        c = db.get(Candidate, candidate_id)
        if c is None:
            return
        steps = list(Candidate.STEPS)
        target = next((s for s in steps if getattr(c, f"{s}_status") == STEP_RUNNING), None)
        if target is None:
            target = next(
                (s for s in steps if getattr(c, f"{s}_status") not in ("ok", "skipped")), None
            )
        if target is None:
            return
        setattr(c, f"{target}_status", STEP_ERROR)
        setattr(c, f"{target}_error", message)
        db.commit()


async def _guarded(candidate_id: int) -> None:
    async with _semaphore():
        try:
            await asyncio.to_thread(
                pipeline.run_candidate, candidate_id, get_llm(), sleep=SLEEP
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("candidate %s failed unexpectedly", candidate_id)
            msg = str(exc) or type(exc).__name__
            try:
                await asyncio.to_thread(_mark_candidate_error, candidate_id, msg)
            except Exception:  # noqa: BLE001
                logger.exception("could not mark candidate %s as error", candidate_id)


def _count_candidates(run_id: int) -> int:
    with SessionLocal() as db:
        return len(db.scalars(select(Candidate.id).where(Candidate.run_id == run_id)).all())


async def _review_phase(run_id: int) -> None:
    await asyncio.to_thread(_set_run, run_id, RUN_REVIEWING)
    await asyncio.to_thread(reviewer.review_run, run_id, get_llm(), sleep=SLEEP)
    await asyncio.to_thread(_set_run, run_id, RUN_DONE, finished=True)
    n = await asyncio.to_thread(_count_candidates, run_id)
    await asyncio.to_thread(
        events.publish, run_id, "run_done", f"Run complete — {n} candidates screened"
    )


async def _fail(run_id: int, exc: Exception) -> None:
    msg = str(exc) or type(exc).__name__
    await asyncio.to_thread(_set_run, run_id, RUN_FAILED, finished=True)
    await asyncio.to_thread(
        events.publish, run_id, "run_done", f"Run failed: {msg}", data={"error": msg}
    )


async def run(run_id: int) -> None:
    events.bind_loop(asyncio.get_running_loop())
    try:
        await asyncio.to_thread(_set_run, run_id, RUN_RUNNING)
        await asyncio.to_thread(events.publish, run_id, "run_started", "Run started")
        ids = await asyncio.to_thread(_pending_candidate_ids, run_id)
        await asyncio.gather(*(_guarded(cid) for cid in ids))
        await _review_phase(run_id)
    except Exception as exc:  # noqa: BLE001
        await _fail(run_id, exc)


def _reset_running_steps(run_id: int) -> None:
    with SessionLocal() as db:
        for c in db.scalars(select(Candidate).where(Candidate.run_id == run_id)):
            for step in Candidate.STEPS:
                if getattr(c, f"{step}_status") == STEP_RUNNING:
                    setattr(c, f"{step}_status", STEP_PENDING)
        db.commit()


async def resume(run_id: int) -> None:
    await asyncio.to_thread(_reset_running_steps, run_id)
    await run(run_id)


def _reset_error_step(candidate_id: int) -> int:
    """Reset the error step and all later steps to pending. Returns run_id."""
    with SessionLocal() as db:
        c = db.get(Candidate, candidate_id)
        if c is None:
            raise ValueError(f"candidate {candidate_id} not found")
        steps = list(Candidate.STEPS)
        failed = [i for i, s in enumerate(steps) if getattr(c, f"{s}_status") == STEP_ERROR]
        if not failed:
            raise ValueError(f"candidate {candidate_id} has no failed step")
        for s in steps[failed[0]:]:
            setattr(c, f"{s}_status", STEP_PENDING)
            setattr(c, f"{s}_error", None)
        c.score = None
        c.badge = None
        run_id = c.run_id
        db.commit()
        return run_id


async def retry_candidate(candidate_id: int) -> None:
    run_id = await asyncio.to_thread(_reset_error_step, candidate_id)
    events.bind_loop(asyncio.get_running_loop())
    try:
        await asyncio.to_thread(_set_run, run_id, RUN_RUNNING)
        await _guarded(candidate_id)
        await _review_phase(run_id)
    except Exception as exc:  # noqa: BLE001
        await _fail(run_id, exc)


async def rerun_review(run_id: int) -> None:
    events.bind_loop(asyncio.get_running_loop())
    try:
        await _review_phase(run_id)
    except Exception as exc:  # noqa: BLE001
        await _fail(run_id, exc)
