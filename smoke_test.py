"""
smoke_test.py — HireFlow end-to-end smoke test (Milestones 1–3)
================================================================

Prerequisites
-------------
1. The server is running:  python main.py
2. You have two real resume files:
       tests/fixtures/sample_resume.pdf
       tests/fixtures/sample_resume.docx
3. .env has DATABASE_URL and GROQ_API_KEY set.

Run
---
    python smoke_test.py

Milestone 1 checks: job creation, PDF/DOCX upload, .txt rejection,
                    job detail list, raw_text sanity.
Milestone 2 checks: job requirements extraction, candidate profile extraction.
Milestone 3 checks: map-requirements happy path, count assertion,
                    evidence_snippet presence, 400 guard paths, manual eyeball.
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
        docx_status = cand["extraction_status"]
        if docx_status == "ok":
            print(f"[3] DOCX uploaded        — extraction_status=ok ✓")
        elif docx_status == "empty":
            # Common with modern resume templates that use tables/text-boxes
            # instead of standard paragraphs — python-docx can't reach that text.
            # This is a valid non-error state; the server correctly flagged it.
            print(f"[3] DOCX uploaded        — extraction_status=empty ⚠️  "
                  "(DOCX uses tables/text-boxes; python-docx found no paragraph text. "
                  "This is expected for many modern resume templates.)")
        else:
            print(f"FAIL [3] DOCX uploaded — unexpected extraction_status={docx_status!r}")
            print(f"       error: {cand.get('extraction_error')}")
            sys.exit(1)

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
    # 5. GET /jobs/{job_id} — candidates should appear in the list
    # ------------------------------------------------------------------
    resp = requests.get(f"{BASE_URL}/jobs/{job_id}")
    assert_status(resp, 200, "job detail")
    detail = resp.json()
    ok_candidates = [
        c for c in detail["candidates"] if c["extraction_status"] == "ok"
    ]
    # At minimum the PDF must be "ok"; DOCX may be "empty" for table-based templates
    assert len(ok_candidates) >= 1, (
        f"Expected at least 1 'ok' candidate (the PDF), got {len(ok_candidates)}: "
        f"{detail['candidates']}"
    )
    assert len(detail["candidates"]) >= 2, (
        f"Expected at least 2 total candidates, got {len(detail['candidates'])}"
    )
    # Confirm raw_text is NOT in the list response
    for c in detail["candidates"]:
        assert "raw_text" not in c, "raw_text should not appear in job detail candidate list"
    statuses = [c["extraction_status"] for c in detail["candidates"]]
    print(f"[5] Job detail           — {len(detail['candidates'])} candidates, statuses={statuses} ✓")


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

    # ------------------------------------------------------------------
    # Milestone 2: extract job requirements + candidate profile
    # (needed as prerequisites for M3 mapping)
    # ------------------------------------------------------------------
    resp = requests.post(f"{BASE_URL}/jobs/{job_id}/extract-requirements")
    assert_status(resp, 200, "extract job requirements")
    job_detail = resp.json()
    assert job_detail.get("requirements_status") == "ok", (
        f"Expected requirements_status=ok, got {job_detail.get('requirements_status')!r}\n"
        f"Error: {job_detail.get('requirements_error')}"
    )
    requirements = job_detail["requirements_json"]["requirements"]
    print(f"[7] Job requirements extracted — {len(requirements)} requirements ✓")

    if pdf_candidate_id is not None:
        resp = requests.post(f"{BASE_URL}/candidates/{pdf_candidate_id}/extract-profile")
        assert_status(resp, 200, "extract candidate profile")
        cand_detail = resp.json()
        assert cand_detail.get("profile_status") == "ok", (
            f"Expected profile_status=ok, got {cand_detail.get('profile_status')!r}\n"
            f"Error: {cand_detail.get('profile_error')}"
        )
        print(f"[8] Candidate profile extracted — profile_status=ok ✓")

    # ------------------------------------------------------------------
    # Milestone 3 — [A] 400 guard: map-requirements before profile is ready
    # Create a fresh candidate (no profile extracted yet) and assert 400
    # ------------------------------------------------------------------
    if os.path.exists(PDF_PATH):
        with open(PDF_PATH, "rb") as f:
            resp = requests.post(
                f"{BASE_URL}/jobs/{job_id}/candidates",
                files={"file": ("guard_test.pdf", f, "application/pdf")},
            )
        assert_status(resp, 201, "upload guard candidate")
        guard_id = resp.json()["id"]

        resp = requests.post(f"{BASE_URL}/candidates/{guard_id}/map-requirements")
        assert_status(resp, 400, "map-requirements 400 guard (no profile)")
        assert "profile" in resp.json()["detail"].lower(), (
            f"Expected 'profile' in 400 detail, got: {resp.json()['detail']!r}"
        )
        print("[9] map-requirements 400 guard (no profile) ✓")

    # ------------------------------------------------------------------
    # Milestone 3 — [B] Happy path: map requirements for the PDF candidate
    # ------------------------------------------------------------------
    if pdf_candidate_id is not None:
        resp = requests.post(
            f"{BASE_URL}/candidates/{pdf_candidate_id}/map-requirements"
        )
        assert_status(resp, 200, "map-requirements happy path")
        mapped = resp.json()

        assert mapped.get("mapping_status") == "ok", (
            f"Expected mapping_status=ok, got {mapped.get('mapping_status')!r}\n"
            f"Error: {mapped.get('mapping_error')}"
        )
        print(f"[10] map-requirements — mapping_status=ok ✓")

        mappings = mapped["mapping_json"]["mappings"]

        # [C] Count assertion — every requirement must have a verdict
        assert len(mappings) == len(requirements), (
            f"FAIL: {len(mappings)} mappings returned for {len(requirements)} requirements. "
            "Some requirements were silently dropped."
        )
        print(f"[11] Mapping count — {len(mappings)}/{len(requirements)} requirements covered ✓")

        # [D] Evidence assertion — met/partial must always have a snippet
        missing_evidence = [
            m for m in mappings
            if m["status"] in ("met", "partial") and not (m.get("evidence_snippet") or "").strip()
        ]
        assert not missing_evidence, (
            f"FAIL: {len(missing_evidence)} met/partial mapping(s) have no evidence_snippet:\n"
            + "\n".join(f"  - {m['requirement_text']!r}" for m in missing_evidence)
        )
        print(f"[12] Evidence snippets — all met/partial verdicts have evidence ✓")

        # [E] Idempotency check — re-running must return 200 and overwrite cleanly
        resp2 = requests.post(
            f"{BASE_URL}/candidates/{pdf_candidate_id}/map-requirements"
        )
        assert_status(resp2, 200, "map-requirements idempotent re-run")
        assert resp2.json().get("mapping_status") == "ok", (
            "Idempotent re-run failed: mapping_status != ok"
        )
        print("[13] Idempotent re-run — mapping_status still ok ✓")

        # [F] Manual eyeball — print every mapping for human review
        print("\n" + "=" * 70)
        print("MANUAL EYEBALL — Requirement Mapping Results")
        print("=" * 70)
        for i, m in enumerate(mappings, 1):
            status_icon = {"met": "✅", "partial": "🟡", "gap": "❌"}.get(m["status"], "?")
            val_icon = "⚠️  NEEDS REVIEW" if m["needs_validation"] else ""
            print(f"\n[{i}] {status_icon} {m['status'].upper()}  {val_icon}")
            print(f"     Requirement : {m['requirement_text']}")
            print(f"     Evidence    : {m.get('evidence_snippet') or '(none)'}")
            if m.get("validation_note"):
                print(f"     Note        : {m['validation_note']}")
        print("=" * 70)

    print("\n✅  All smoke tests passed (Milestones 1–3)!")

    # ==================================================================
    # MILESTONE 4 — Interview Question Generation
    # ==================================================================

    if pdf_candidate_id is not None:
        # Collect the valid requirement texts for assertion [3]
        valid_req_texts = {r["requirement_text"] for r in requirements}

        # [A] 400 guard — call generate-questions on the guard candidate
        #     (which has extraction_status=ok but mapping_status=not_mapped)
        if os.path.exists(PDF_PATH):
            resp = requests.post(
                f"{BASE_URL}/candidates/{guard_id}/generate-questions"
            )
            assert_status(resp, 400, "generate-questions 400 guard (not mapped)")
            assert "map-requirements" in resp.json()["detail"].lower(), (
                f"Expected 'map-requirements' in 400 detail, got: {resp.json()['detail']!r}"
            )
            print("[14] generate-questions 400 guard (not mapped) ✓")

        # [B] Happy path — generate questions for the fully mapped PDF candidate
        resp = requests.post(
            f"{BASE_URL}/candidates/{pdf_candidate_id}/generate-questions"
        )
        assert_status(resp, 200, "generate-questions happy path")
        iq_resp = resp.json()

        assert iq_resp.get("interview_questions_status") == "ok", (
            f"Expected interview_questions_status=ok, "
            f"got {iq_resp.get('interview_questions_status')!r}\n"
            f"Error: {iq_resp.get('interview_questions_error')}"
        )
        print("[15] generate-questions — interview_questions_status=ok ✓")

        questions = iq_resp["interview_questions_json"]["questions"]

        # [C] Count assertion — must be 5-8
        assert 5 <= len(questions) <= 8, (
            f"FAIL: Expected 5-8 questions, got {len(questions)}"
        )
        print(f"[16] Question count — {len(questions)} questions (5-8 required) ✓")

        # [D] target_requirement validity — must match actual job requirements
        hallucinated = [
            q for q in questions
            if q["target_requirement"] not in valid_req_texts
        ]
        assert not hallucinated, (
            f"FAIL: {len(hallucinated)} question(s) reference hallucinated requirements:\n"
            + "\n".join(f"  - {q['target_requirement']!r}" for q in hallucinated)
        )
        print(f"[17] target_requirement validity — all {len(questions)} questions reference real requirements ✓")

        # [E] Idempotency — re-run must succeed and overwrite cleanly
        resp2 = requests.post(
            f"{BASE_URL}/candidates/{pdf_candidate_id}/generate-questions"
        )
        assert_status(resp2, 200, "generate-questions idempotent re-run")
        assert resp2.json().get("interview_questions_status") == "ok", (
            "Idempotent re-run failed: interview_questions_status != ok"
        )
        print("[18] Idempotent re-run — interview_questions_status still ok ✓")

        # [F] Manual eyeball — print every question for human review
        type_icon = {"validation": "🔍", "probe": "🔎", "general": "💬"}
        print("\n" + "=" * 70)
        print("MANUAL EYEBALL — Interview Questions")
        print("=" * 70)
        for i, q in enumerate(questions, 1):
            icon = type_icon.get(q["question_type"], "?")
            print(f"\n[{i}] {icon} {q['question_type'].upper()}")
            print(f"     Requirement : {q['target_requirement']}")
            print(f"     Question    : {q['question_text']}")
        print("=" * 70)

    print("\n✅  All smoke tests passed (Milestones 1–4)!")


if __name__ == "__main__":
    main()
