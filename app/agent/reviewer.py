"""Batch reviewer (spec 6.5): rank + summarise scored candidates, guard the order in code."""
from __future__ import annotations

import time
from pathlib import Path
from typing import Callable

from sqlalchemy import select

from app.agent import events
from app.agent.llm_port import AgentLLM
from app.agent.retry import call_with_retry
from app.database import SessionLocal
from app.models.candidate import STEP_OK, Candidate
from app.models.run import REVIEW_ERROR, REVIEW_OK, REVIEW_RUNNING, Run

NO_TEXT_REASON = "No text layer"

EMPTY_SUMMARY = {
    "pool_strength": "weak",
    "overview": "No candidates could be scored.",
    "top_picks": [],
    "common_gaps": [],
    "next_steps": ["Check the flagged resumes and retry."],
}


def apply_ranking_guard(
    shortlist: list[dict], scores: dict[int, int], tolerance: int = 5
) -> tuple[list[dict], bool]:
    """Validate and, if needed, override the agent's order. Returns (ranked, overridden)."""
    ids = [e["candidate_id"] for e in shortlist]
    if len(ids) != len(set(ids)) or set(ids) != set(scores):
        raise ValueError(
            f"shortlist ids {sorted(ids)} must match scored candidate ids "
            f"{sorted(scores)} exactly once each"
        )
    overridden = any(
        scores[ids[j]] - scores[ids[i]] > tolerance
        for i in range(len(ids))
        for j in range(i + 1, len(ids))
    )
    ordered = (
        sorted(shortlist, key=lambda e: (-scores[e["candidate_id"]], e["candidate_id"]))
        if overridden
        else list(shortlist)
    )
    ranked = [{**e, "rank": i + 1} for i, e in enumerate(ordered)]
    return ranked, overridden


def _name(c: Candidate) -> str:
    return Path(c.filename).stem


def _unscored_reason(c: Candidate) -> str:
    if c.extract_status == STEP_OK and c.raw_text == "":
        return NO_TEXT_REASON
    for step in Candidate.STEPS:
        if getattr(c, f"{step}_status") == "error":
            return f"{step} failed: {getattr(c, f'{step}_error')}"
    return "Not processed"


def _build_payload(run: Run, scored: list[Candidate], unscored: list[Candidate]) -> dict:
    reqs = (run.requirements_snapshot or {}).get("requirements", [])
    payload_cands = []
    for c in scored:
        mappings = (c.mapping_json or {}).get("mappings", [])
        statuses = [
            {"requirement_text": m["requirement_text"], "status": m["status"]} for m in mappings
        ]
        payload_cands.append(
            {
                "id": c.id,
                "name": _name(c),
                "score": c.score,
                "badge": c.badge,
                "summary": (c.profile_json or {}).get("summary", ""),
                "requirements": statuses,
                "gaps": [s["requirement_text"] for s in statuses if s["status"] == "gap"],
            }
        )
    return {
        "profile": {
            "title": run.profile.title,
            "seniority": run.profile.seniority,
            "requirements": reqs,
        },
        "candidates": payload_cands,
        "unscored": [
            {"id": c.id, "name": _name(c), "reason": _unscored_reason(c)} for c in unscored
        ],
    }


def review_run(
    run_id: int, llm: AgentLLM, *, sleep: Callable[[float], None] = time.sleep
) -> None:
    with SessionLocal() as db:
        run = db.get(Run, run_id)
        if run is None:
            return
        run.review_status = REVIEW_RUNNING
        run.review_error = None
        db.commit()
        events.publish(run_id, "review_started", "Reviewing candidate pool")

        try:
            cands = db.scalars(
                select(Candidate)
                .where(Candidate.profile_id == run.profile_id)
                .order_by(Candidate.id)
            ).all()
            scored = [c for c in cands if c.mapping_status == STEP_OK and c.score is not None]
            unscored = [c for c in cands if c not in scored]
            flags_extra = [
                {"candidate_id": c.id, "reason": _unscored_reason(c)} for c in unscored
            ]

            if not scored:
                review = {
                    "shortlist": [],
                    "summary": dict(EMPTY_SUMMARY),
                    "flags": flags_extra,
                    "ranking_overridden": False,
                }
            else:
                payload = _build_payload(run, scored, unscored)
                scores = {c.id: c.score for c in scored}

                def attempt() -> tuple[dict, list[dict], bool]:
                    out = llm.review(payload)
                    ranked, overridden = apply_ranking_guard(out["shortlist"], scores)
                    return out, ranked, overridden

                def on_retry(n: int, exc: Exception) -> None:
                    events.publish(
                        run_id,
                        "step_retry",
                        f"Retrying review (attempt {n} failed): {exc}",
                        data={"step": "review", "attempt": n, "error": str(exc)},
                    )

                out, ranked, overridden = call_with_retry(
                    attempt, on_retry=on_retry, sleep=sleep
                )
                known = {c.id for c in cands}
                flags: list[dict] = []
                flagged: set[int] = set()
                for f in list(out.get("flags") or []) + flags_extra:
                    cid = f.get("candidate_id")
                    if cid in known and cid not in flagged:
                        flagged.add(cid)
                        flags.append(f)
                summary = dict(out["summary"])
                summary["top_picks"] = [
                    cid for cid in dict.fromkeys(summary.get("top_picks") or []) if cid in known
                ]
                review = {
                    "shortlist": ranked,
                    "summary": summary,
                    "flags": flags,
                    "ranking_overridden": overridden,
                }
        except Exception as exc:  # noqa: BLE001
            db.rollback()
            run = db.get(Run, run_id)
            run.review_status = REVIEW_ERROR
            run.review_error = str(exc) or type(exc).__name__
            db.commit()
            events.publish(run_id, "review_failed", f"Review failed: {run.review_error}")
            return

        run.review_json = review
        run.review_status = REVIEW_OK
        db.commit()
        events.publish(
            run_id,
            "review_done",
            f"Review complete: {len(review['shortlist'])} shortlisted, "
            f"{len(review['flags'])} flagged",
        )
