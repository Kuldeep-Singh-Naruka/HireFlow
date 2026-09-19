"""
smoke_test.py — HireFlow Milestone 1 end-to-end smoke test
============================================================

Prerequisites
-------------
1. The server is running:
       uvicorn main:app --reload
2. You have two real resume files:
       tests/fixtures/sample_resume.pdf
       tests/fixtures/sample_resume.docx
   (see README for how to create minimal fixtures if you don't have real ones)
3. `requests` is installed:  pip install requests

Run
---
    python smoke_test.py

Expected output (all assertions pass):
    [1] Job created          — id=<n>
    [2] PDF uploaded         — extraction_status=ok
    [3] DOCX uploaded        — extraction_status=ok
    [4] .txt rejected        — HTTP 400 ✓
    [5] Job detail           — 2 candidates, both ok
    [6] PDF candidate detail — raw_text non-empty, looks like real text ✓
"""
from __future__ import annotations

import sys
import os
import requests

BASE_URL = os.getenv("HIREFLOW_URL", "http://127.0.0.1:8000")

# Paths to fixture files — adjust if your files live elsewhere
FIXTURES_DIR = os.path.join(os.path.dirname(__file__), "tests", "fixtures")
PDF_PATH  = os.path.join(FIXTURES_DIR, "sample_resume.pdf")
DOCX_PATH = os.path.join(FIXTURES_DIR, "sample_resume.docx")


def assert_status(resp: requests.Response, expected: int, label: str) -> None:
    if resp.status_code != expected:
        print(f"FAIL [{label}]: expected HTTP {expected}, got {resp.status_code}")
        print("Body:", resp.text[:400])
        sys.exit(1)


def main() -> None:
    # ------------------------------------------------------------------
    # 1. Create a job
    # ------------------------------------------------------------------
    resp = requests.post(
        f"{BASE_URL}/jobs",
        json={
            "title": "Senior Python Engineer",
            "description_text": (
                "We are looking for a Python engineer with 5+ years of "
                "experience in FastAPI and PostgreSQL."
            ),
        },
    )
    assert_status(resp, 201, "create job")
    job = resp.json()
    job_id = job["id"]
    print(f"[1] Job created          — id={job_id}")

    # ------------------------------------------------------------------
    # 2. Upload a PDF resume
    # ------------------------------------------------------------------
    if not os.path.exists(PDF_PATH):
        print(f"SKIP [2] PDF upload — fixture not found at {PDF_PATH}")
        pdf_candidate_id = None
    else:
        with open(PDF_PATH, "rb") as f:
            resp = requests.post(
                f"{BASE_URL}/jobs/{job_id}/candidates",
                files={"file": ("sample_resume.pdf", f, "application/pdf")},
            )
        assert_status(resp, 201, "upload PDF")
        cand = resp.json()
        assert cand["extraction_status"] == "ok", (
            f"Expected extraction_status=ok, got {cand['extraction_status']!r}"
        )
        pdf_candidate_id = cand["id"]
        print(f"[2] PDF uploaded         — extraction_status={cand['extraction_status']}")

    # ------------------------------------------------------------------
    # 3. Upload a DOCX resume
    # ------------------------------------------------------------------
    if not os.path.exists(DOCX_PATH):
        print(f"SKIP [3] DOCX upload — fixture not found at {DOCX_PATH}")
    else:
        with open(DOCX_PATH, "rb") as f:
            resp = requests.post(
                f"{BASE_URL}/jobs/{job_id}/candidates",
                files={
                    "file": (
                        "sample_resume.docx",
                        f,
                        "application/vnd.openxmlformats-officedocument"
                        ".wordprocessingml.document",
                    )
                },
            )
        assert_status(resp, 201, "upload DOCX")
        cand = resp.json()
        assert cand["extraction_status"] == "ok", (
            f"Expected extraction_status=ok, got {cand['extraction_status']!r}"
        )
        print(f"[3] DOCX uploaded        — extraction_status={cand['extraction_status']}")

    # ------------------------------------------------------------------
    # 4. Upload a .txt file — must be rejected with 400
    # ------------------------------------------------------------------
    resp = requests.post(
        f"{BASE_URL}/jobs/{job_id}/candidates",
        files={"file": ("resume.txt", b"John Doe\nSoftware Engineer", "text/plain")},
    )
    assert_status(resp, 400, "txt rejection")
    print(f"[4] .txt rejected        — HTTP 400 ✓")

    # ------------------------------------------------------------------
    # 5. GET /jobs/{job_id} — both candidates should appear with status ok
    # ------------------------------------------------------------------
    resp = requests.get(f"{BASE_URL}/jobs/{job_id}")
    assert_status(resp, 200, "job detail")
    detail = resp.json()
    ok_candidates = [
        c for c in detail["candidates"] if c["extraction_status"] == "ok"
    ]
    assert len(ok_candidates) >= 2, (
        f"Expected at least 2 'ok' candidates, got {len(ok_candidates)}: "
        f"{detail['candidates']}"
    )
    # Confirm raw_text is NOT in the list response
    for c in detail["candidates"]:
        assert "raw_text" not in c, "raw_text should not appear in job detail candidate list"
    print(f"[5] Job detail           — {len(detail['candidates'])} candidates, both ok ✓")

    # ------------------------------------------------------------------
    # 6. GET /candidates/{id} — full text for the PDF candidate
    # ------------------------------------------------------------------
    if pdf_candidate_id is not None:
        resp = requests.get(f"{BASE_URL}/candidates/{pdf_candidate_id}")
        assert_status(resp, 200, "candidate detail")
        full = resp.json()
        raw_text = full.get("raw_text") or ""
        assert len(raw_text) > 50, (
            f"raw_text looks too short ({len(raw_text)} chars) — "
            "expected real resume content"
        )
        # Sanity check: must be readable text, not garbled binary
        printable_ratio = sum(1 for ch in raw_text if ch.isprintable()) / max(len(raw_text), 1)
        assert printable_ratio > 0.90, (
            f"raw_text appears garbled — printable ratio {printable_ratio:.2%}"
        )
        preview = raw_text[:120].replace("\n", " ")
        print(f"[6] PDF candidate detail — raw_text non-empty, {len(raw_text)} chars ✓")
        print(f"    Preview: {preview!r}")

    print("\n✅  All smoke tests passed!")


if __name__ == "__main__":
    main()
