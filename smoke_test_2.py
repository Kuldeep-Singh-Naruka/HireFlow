"""
smoke_test_2.py — HireFlow Milestone 2 end-to-end smoke test
============================================================

Prerequisites
-------------
1. The server is running:
       uvicorn main:app --reload
2. GROQ_API_KEY is set in .env
3. `requests` is installed:  pip install requests

Run
---
    python smoke_test_2.py
"""
from __future__ import annotations

import json
import os
import sys
import tempfile

import fitz  # PyMuPDF
import requests

BASE_URL = os.getenv("HIREFLOW_URL", "http://127.0.0.1:8000")


def assert_status(resp: requests.Response, expected: int, label: str) -> None:
    if resp.status_code != expected:
        print(f"FAIL [{label}]: expected HTTP {expected}, got {resp.status_code}")
        print("Body:", resp.text[:400])
        sys.exit(1)


def generate_sample_pdf(filepath: str, text: str) -> None:
    """Generate a valid minimal PDF with text content using PyMuPDF."""
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 50), text)
    doc.save(filepath)
    doc.close()


def generate_empty_pdf(filepath: str) -> None:
    """Generate a valid PDF page with no text layer (scanned simulation)."""
    doc = fitz.open()
    doc.new_page()  # Blank page
    doc.save(filepath)
    doc.close()


def main() -> None:
    print("--- Starting Milestone 2 Smoke Tests ---")

    # ------------------------------------------------------------------
    # 1. Create a job with multi-requirement description_text
    # ------------------------------------------------------------------
    job_payload = {
        "title": "Senior Lead Python & Backend Engineer",
        "description_text": (
            "We are seeking a Lead Backend Engineer with 5+ years of experience in Python and FastAPI. "
            "Must have strong experience with PostgreSQL and Docker. "
            "AWS cloud deployment and Kubernetes experience is highly preferred. "
            "Requires a Bachelor's degree in Computer Science or equivalent field."
        ),
    }
    resp = requests.post(f"{BASE_URL}/jobs", json=job_payload)
    assert_status(resp, 201, "create job")
    job = resp.json()
    job_id = job["id"]
    print(f"[1] Job created — id={job_id}")

    # ------------------------------------------------------------------
    # 2. Call POST /jobs/{job_id}/extract-requirements
    # ------------------------------------------------------------------
    resp = requests.post(f"{BASE_URL}/jobs/{job_id}/extract-requirements")
    assert_status(resp, 200, "extract job requirements")
    job_extracted = resp.json()

    req_status = job_extracted.get("requirements_status")
    req_json = job_extracted.get("requirements_json") or {}
    req_error = job_extracted.get("requirements_error")

    if req_status == "error":
        print(f"WARNING: LLM call returned error status: {req_error}")
        print("Ensure GROQ_API_KEY is set properly in .env!")
        sys.exit(1)

    assert req_status == "ok", f"Expected requirements_status='ok', got {req_status!r}"
    requirements = req_json.get("requirements", [])
    assert len(requirements) >= 2, (
        f"Expected at least 2 requirements, got {len(requirements)}"
    )
    print(f"[2] Job requirements extracted - status={req_status}, count={len(requirements)} [OK]")
    print("    Extracted Requirements Preview:")
    print(json.dumps(requirements, indent=6))

    # ------------------------------------------------------------------
    # 3. Create temp PDF candidate and extract profile
    # ------------------------------------------------------------------
    with tempfile.TemporaryDirectory() as tmpdir:
        sample_pdf_path = os.path.join(tmpdir, "resume.pdf")
        resume_content = (
            "Jane Doe\n"
            "Email: jane.doe@example.com | Phone: 555-0199\n\n"
            "PROFESSIONAL SUMMARY:\n"
            "Senior Backend Engineer with 6 years of experience building scalable microservices in Python, FastAPI, and PostgreSQL.\n\n"
            "SKILLS:\n"
            "Python, FastAPI, PostgreSQL, Docker, AWS, Redis, Git, CI/CD\n\n"
            "EXPERIENCE:\n"
            "Senior Python Developer at TechCorp (2021 - Present)\n"
            "- Architected high-throughput REST APIs using FastAPI and SQLAlchemy.\n"
            "- Managed PostgreSQL databases and optimized slow queries.\n\n"
            "EDUCATION:\n"
            "B.S. in Computer Science, Stanford University\n"
        )
        generate_sample_pdf(sample_pdf_path, resume_content)

        # Upload candidate PDF
        with open(sample_pdf_path, "rb") as f:
            resp = requests.post(
                f"{BASE_URL}/jobs/{job_id}/candidates",
                files={"file": ("resume.pdf", f, "application/pdf")},
            )
        assert_status(resp, 201, "upload candidate PDF")
        cand = resp.json()
        cand_id = cand["id"]
        assert cand["extraction_status"] == "ok"
        print(f"[3a] Resume uploaded — candidate_id={cand_id}, status={cand['extraction_status']}")

        # Call POST /candidates/{id}/extract-profile
        resp = requests.post(f"{BASE_URL}/candidates/{cand_id}/extract-profile")
        assert_status(resp, 200, "extract candidate profile")
        cand_extracted = resp.json()

        prof_status = cand_extracted.get("profile_status")
        prof_json = cand_extracted.get("profile_json") or {}
        prof_error = cand_extracted.get("profile_error")

        if prof_status == "error":
            print(f"WARNING: LLM profile extraction error: {prof_error}")
            sys.exit(1)

        assert prof_status == "ok", f"Expected profile_status='ok', got {prof_status!r}"
        skills = prof_json.get("skills", [])
        assert len(skills) > 0, "Expected non-empty skills list"
        print(f"[3b] Candidate profile extracted - status={prof_status}, skills count={len(skills)} [OK]")
        print("     Extracted Profile Preview:")
        print(json.dumps(prof_json, indent=6))

        # ------------------------------------------------------------------
        # 4. Test 400 error path: extract-profile on non-ok candidate
        # ------------------------------------------------------------------
        empty_pdf_path = os.path.join(tmpdir, "blank.pdf")
        generate_empty_pdf(empty_pdf_path)

        with open(empty_pdf_path, "rb") as f:
            resp = requests.post(
                f"{BASE_URL}/jobs/{job_id}/candidates",
                files={"file": ("blank.pdf", f, "application/pdf")},
            )
        assert_status(resp, 201, "upload blank PDF")
        blank_cand = resp.json()
        blank_cand_id = blank_cand["id"]
        assert blank_cand["extraction_status"] == "empty"

        # Attempting profile extraction on an 'empty' status candidate must fail with 400
        resp = requests.post(f"{BASE_URL}/candidates/{blank_cand_id}/extract-profile")
        assert_status(resp, 400, "reject extract-profile for empty candidate")
        print("[4] Candidate profile extraction on empty text rejected - HTTP 400 [OK]")

    print("\n[SUCCESS] All Milestone 2 smoke tests passed successfully!")



if __name__ == "__main__":
    main()
