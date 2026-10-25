"""Hiring-profile requirement building and de-duplication (spec section 5)."""
from __future__ import annotations

import re
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.agent.llm_port import AgentLLM


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower()).strip().rstrip(".,;:!?)").strip()


def dedupe_requirements(items: list[dict]) -> list[dict]:
    """Drop normalized duplicates; required wins; first-occurrence order kept."""
    seen: dict[str, dict] = {}
    for item in items:
        key = _norm(item["requirement_text"])
        if not key:
            continue
        if key in seen:
            if item.get("is_required"):
                seen[key]["is_required"] = True
        else:
            seen[key] = dict(item)
    return list(seen.values())


def _experience_text(min_years: int | None, seniority: str | None) -> str | None:
    if min_years is not None and seniority:
        return f"{min_years}+ years of experience at {seniority} level"
    if min_years is not None:
        return f"{min_years}+ years of relevant experience"
    if seniority:
        return f"{seniority.capitalize()}-level experience"
    return None


def form_requirements(form: dict) -> list[dict]:
    """Deterministic requirement list derived from the form alone."""
    items: list[dict] = []
    for text in form.get("must_have") or []:
        items.append({"requirement_text": text, "category": "skill", "is_required": True})
    for text in form.get("nice_to_have") or []:
        items.append({"requirement_text": text, "category": "skill", "is_required": False})
    exp = _experience_text(form.get("min_years"), form.get("seniority"))
    if exp:
        items.append({"requirement_text": exp, "category": "experience", "is_required": True})
    return dedupe_requirements(items)


def build_requirements(
    form: dict, jd_text: str | None, llm: "AgentLLM"
) -> tuple[list[dict], str, str | None]:
    """Return (requirements, status, error). LLM failure falls back to the form list."""
    fallback = form_requirements(form)
    if not jd_text or not jd_text.strip():
        return fallback, "ok", None
    try:
        merged = llm.merge_requirements(form, jd_text)
        return dedupe_requirements(merged), "ok", None
    except Exception as exc:  # noqa: BLE001 - any LLM failure degrades to the form list
        return fallback, "error", str(exc) or exc.__class__.__name__
