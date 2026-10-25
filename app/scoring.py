from __future__ import annotations

_CREDIT = {"met": 1.0, "partial": 0.5, "gap": 0.0}


def score_and_badge(requirements: list[dict], mappings: list[dict]) -> tuple[int, str]:
    """Return (score 0-100, badge) for index-aligned requirements and mappings."""
    if len(requirements) != len(mappings):
        raise ValueError(
            f"requirements ({len(requirements)}) and mappings ({len(mappings)}) length mismatch"
        )
    total = earned = 0.0
    has_gap = has_review = False
    for req, m in zip(requirements, mappings):
        required = bool(req["is_required"])
        status = m["status"]
        weight = 2 if required else 1
        total += weight
        earned += weight * _CREDIT[status]
        if required:
            if status == "gap":
                has_gap = True
            elif status == "partial" or m.get("needs_validation"):
                has_review = True
    score = round(100 * earned / total) if total else 0
    if has_gap:
        badge = "significant_gaps"
    elif has_review:
        badge = "review_required"
    else:
        badge = "strong_match"
    return score, badge
