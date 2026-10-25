"""Per-candidate pipeline (spec 6.2): extract -> profile -> mapping -> questions."""
from __future__ import annotations

import time
from pathlib import Path
from typing import Callable

from app.agent import events
from app.agent.llm_port import AgentLLM
from app.agent.retry import call_with_retry
from app.database import SessionLocal
from app.models.candidate import (
    STEP_ERROR,
    STEP_OK,
    STEP_RUNNING,
    STEP_SKIPPED,
    Candidate,
)
from app.scoring import score_and_badge
from app.services.extraction import extract_text

NO_TEXT_MESSAGE = "No text layer — scanned or image resume"


def _set(c: Candidate, step: str, status: str, error: str | None = None) -> None:
    setattr(c, f"{step}_status", status)
    setattr(c, f"{step}_error", error)


def run_candidate(
    candidate_id: int, llm: AgentLLM, *, sleep: Callable[[float], None] = time.sleep
) -> None:
    with SessionLocal() as db:
        c = db.get(Candidate, candidate_id)
        if c is None:
            return
        run_id = c.run_id
        name = Path(c.filename).stem
        requirements = (c.run.requirements_snapshot or {}).get("requirements", [])

        def transition(step: str, status: str, message: str, error: str | None = None) -> None:
            _set(c, step, status, error)
            db.commit()
            events.publish(
                run_id,
                "candidate_step",
                message,
                candidate_id=candidate_id,
                data={"step": step, "status": status},
            )

        def finish_error(step: str, exc: Exception) -> None:
            transition(step, STEP_ERROR, f"{step} failed for {name}: {exc}", str(exc))
            events.publish(
                run_id,
                "candidate_done",
                f"{name} stopped at {step}",
                candidate_id=candidate_id,
                data={"error_step": step},
            )

        def attempt(step: str, fn: Callable[[], dict]) -> dict:
            def on_retry(n: int, exc: Exception) -> None:
                events.publish(
                    run_id,
                    "step_retry",
                    f"Retrying {step} for {name} (attempt {n} failed): {exc}",
                    candidate_id=candidate_id,
                    data={"step": step, "attempt": n, "error": str(exc)},
                )

            return call_with_retry(fn, on_retry=on_retry, sleep=sleep)

        def done() -> None:
            events.publish(
                run_id,
                "candidate_done",
                f"Finished {name}",
                candidate_id=candidate_id,
                data={"score": c.score, "badge": c.badge},
            )

        # 1. extract
        if c.extract_status not in (STEP_OK, STEP_SKIPPED):
            transition("extract", STEP_RUNNING, f"Extracting text from {name}")
            try:
                text = extract_text(c.filename, c.file_bytes)
            except Exception as exc:  # noqa: BLE001
                finish_error("extract", exc)
                return
            c.raw_text = text
            transition("extract", STEP_OK, f"Extracted {len(text)} characters from {name}")
        if not (c.raw_text or "").strip():
            c.raw_text = c.raw_text or ""
            for step in ("profile", "mapping", "questions"):
                if getattr(c, f"{step}_status") not in (STEP_OK, STEP_SKIPPED):
                    transition(step, STEP_SKIPPED, f"Skipped {step} for {name}: no text")
            events.publish(
                run_id,
                "candidate_flagged",
                f"{name}: {NO_TEXT_MESSAGE}",
                candidate_id=candidate_id,
                data={"reason": NO_TEXT_MESSAGE},
            )
            done()
            return
        raw_text = c.raw_text

        # 2. profile
        if c.profile_status not in (STEP_OK, STEP_SKIPPED):
            transition("profile", STEP_RUNNING, f"Extracting profile for {name}")
            try:
                profile = attempt("profile", lambda: llm.extract_profile(raw_text))
            except Exception as exc:  # noqa: BLE001
                finish_error("profile", exc)
                return
            c.profile_json = profile
            transition("profile", STEP_OK, f"Extracted profile for {name}")

        # 3. mapping
        if c.mapping_status not in (STEP_OK, STEP_SKIPPED):
            transition("mapping", STEP_RUNNING, f"Mapping requirements for {name}")
            try:
                profile = c.profile_json or {}
                mapping = attempt(
                    "mapping", lambda: llm.map_requirements(requirements, raw_text, profile)
                )
                score, badge = score_and_badge(requirements, mapping["mappings"])
            except Exception as exc:  # noqa: BLE001
                finish_error("mapping", exc)
                return
            c.mapping_json = mapping
            c.score, c.badge = score, badge
            counts = {"met": 0, "partial": 0, "gap": 0}
            for m in mapping["mappings"]:
                counts[m["status"]] += 1
            transition(
                "mapping",
                STEP_OK,
                f"Mapped {len(requirements)} requirements for {name}: "
                f"{counts['met']} met, {counts['partial']} partial, {counts['gap']} gap",
            )

        # 4. questions
        if c.questions_status not in (STEP_OK, STEP_SKIPPED):
            transition("questions", STEP_RUNNING, f"Generating interview questions for {name}")
            try:
                mapping = c.mapping_json or {}
                questions = attempt(
                    "questions", lambda: llm.generate_questions(mapping, requirements)
                )
            except Exception as exc:  # noqa: BLE001
                finish_error("questions", exc)
                return
            c.interview_questions_json = questions
            transition("questions", STEP_OK, f"Generated interview questions for {name}")

        done()

