"""
smoke_test.py - HireFlow live end-to-end smoke test (real Groq calls).

Prerequisites: the backend is running (python main.py) with a valid .env.

    python smoke_test.py

Creates two hiring profiles, uploads test_resumes/1_..5_ to the first and
6_..10_ to the second, waits for each run to finish, prints a
file | expected | actual | score table plus each run's shortlist and flags,
and exits 1 if fewer than 8/10 badges match expectations.
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

import requests

BASE_URL = os.getenv("HIREFLOW_API", "http://127.0.0.1:8000").rstrip("/")
RESUME_DIR = Path(__file__).parent / "test_resumes"
POLL_SECONDS = 3
TIMEOUT_SECONDS = 600
MIN_MATCHES = 8

LEAD_FRONTEND_JD = """\
Lead Frontend Engineer

We are looking for a Lead Frontend Engineer to own the architecture of our
customer-facing web application and mentor a team of frontend developers.

Requirements:
- 6+ years of professional frontend development experience
- Deep expertise in React, including hooks, state management and performance tuning
- Strong JavaScript, HTML and CSS fundamentals
- Experience leading or mentoring frontend engineers and driving technical decisions
- Experience with REST APIs and shipping production web applications

Nice to have:
- TypeScript
- Real-time features with WebSockets
"""

AI_ENGINEER_JD = """\
Senior AI Engineer

We are hiring a Senior AI Engineer to build LLM-powered features end to end,
from backend services to the React interface our users see.

Requirements:
- 5+ years of professional software engineering experience
- Strong Python, including building production APIs
- Hands-on experience building LLM applications (prompting, LangChain or similar frameworks)
- Frontend experience with React
- Experience with databases and deploying services

Nice to have:
- Retrieval-augmented generation / vector search
- Cloud deployment experience
"""

PROFILES = [
    {
        "payload": {
            "title": "Lead Frontend Engineer",
            "seniority": "lead",
            "min_years": 6,
            "must_have": ["React", "JavaScript", "Team leadership or mentoring"],
            "nice_to_have": ["TypeScript", "WebSockets"],
            "jd_text": LEAD_FRONTEND_JD,
        },
        "prefixes": ["1_", "2_", "3_", "4_", "5_"],
    },
    {
        "payload": {
            "title": "Senior AI Engineer",
            "seniority": "senior",
            "min_years": 5,
            "must_have": ["Python", "LLM application development", "React"],
            "nice_to_have": ["RAG / vector search", "Cloud deployment"],
            "jd_text": AI_ENGINEER_JD,
        },
        "prefixes": ["6_", "7_", "8_", "9_", "10_"],
    },
]

# Expected badges from the README test-resume table.
EXPECTED = {
    "1_": "strong_match",
    "2_": "review_required",
    "3_": "significant_gaps",
    "4_": "significant_gaps",
    "5_": "strong_match",
    "6_": "strong_match",
    "7_": "significant_gaps",
    "8_": "significant_gaps",
    "9_": "significant_gaps",
    "10_": "significant_gaps",
}


def expected_for(filename: str) -> str:
    prefix = filename.split("_", 1)[0] + "_"
    return EXPECTED.get(prefix, "?")


def find_files(prefixes: list[str]) -> list[Path]:
    files = []
    for p in prefixes:
        found = sorted(RESUME_DIR.glob(f"{p}*"))
        if len(found) != 1:
            raise RuntimeError(f"expected exactly one file for prefix {p!r}, found {found}")
        files.append(found[0])
    return files


def _check(r: requests.Response) -> None:
    if not r.ok:
        print(f"HTTP {r.status_code} from {r.request.method} {r.url}: {r.text[:300]}")
    r.raise_for_status()


def create_profile(payload: dict) -> dict:
    r = requests.post(f"{BASE_URL}/profiles", json=payload, timeout=120)
    _check(r)
    return r.json()


def start_run(profile_id: int, files: list[Path]) -> dict:
    handles = [open(f, "rb") for f in files]
    try:
        multipart = [("files", (f.name, h)) for f, h in zip(files, handles)]
        r = requests.post(f"{BASE_URL}/profiles/{profile_id}/runs", files=multipart, timeout=120)
    finally:
        for h in handles:
            h.close()
    _check(r)
    return r.json()


def wait_for_run(run_id: int) -> dict:
    deadline = time.monotonic() + TIMEOUT_SECONDS
    while True:
        r = requests.get(f"{BASE_URL}/runs/{run_id}", timeout=30)
        _check(r)
        state = r.json()
        done = sum(
            1 for c in state["candidates"]
            if c["mapping_status"] in ("ok", "error", "skipped")
        )
        print(f"  run {run_id}: {state['status']} ({done}/{len(state['candidates'])} mapped)")
        if state["status"] == "done":
            return state
        if state["status"] in ("failed", "interrupted"):
            raise RuntimeError(f"run {run_id} ended with status {state['status']}")
        if time.monotonic() > deadline:
            raise TimeoutError(f"run {run_id} did not finish within {TIMEOUT_SECONDS}s")
        time.sleep(POLL_SECONDS)


def main() -> int:
    rows: list[tuple[str, str, str, str]] = []
    reviews: list[tuple[str, dict, dict]] = []

    try:
        for spec in PROFILES:
            title = spec["payload"]["title"]
            print(f"\n== {title} ==")
            profile = create_profile(spec["payload"])
            print(
                f"  profile {profile['id']}: requirements_status="
                f"{profile['requirements_status']}, "
                f"{len(profile['requirements_json']['requirements'])} requirements"
            )
            created = start_run(profile["id"], find_files(spec["prefixes"]))
            if created["rejected"]:
                print(f"  rejected files: {created['rejected']}")
            state = wait_for_run(created["run_id"])
            names = {c["id"]: c["filename"] for c in state["candidates"]}
            for c in sorted(state["candidates"], key=lambda c: int(c["filename"].split("_", 1)[0])):
                rows.append((
                    c["filename"],
                    expected_for(c["filename"]),
                    c["badge"] or "-",
                    "-" if c["score"] is None else str(c["score"]),
                ))
            reviews.append((title, state.get("review_json") or {}, names))
    except (requests.RequestException, RuntimeError, TimeoutError) as exc:
        print(f"\nERROR: {exc}")
        return 1

    width = max(len(r[0]) for r in rows)
    print("\n" + f"{'file':<{width}} | {'expected':<16} | {'actual':<16} | score")
    print("-" * (width + 46))
    matches = 0
    for f, exp, act, score in rows:
        ok = exp == act
        matches += ok
        print(f"{f:<{width}} | {exp:<16} | {act:<16} | {score:>5} {'' if ok else '  <-- MISMATCH'}")

    for title, review, names in reviews:
        print(f"\n--- {title}: shortlist ---")
        for e in review.get("shortlist", []):
            print(f"  #{e.get('rank')} {names.get(e['candidate_id'], e['candidate_id'])}: {e.get('reason')}")
        flags = review.get("flags", [])
        print(f"--- {title}: flags ---" if flags else f"--- {title}: no flags ---")
        for fl in flags:
            print(f"  {names.get(fl['candidate_id'], fl['candidate_id'])}: {fl.get('reason')}")

    print(f"\n{matches}/{len(rows)} badges match (need >= {MIN_MATCHES})")
    return 0 if matches >= MIN_MATCHES else 1


if __name__ == "__main__":
    sys.exit(main())
