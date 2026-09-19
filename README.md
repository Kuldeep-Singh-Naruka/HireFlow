# HireFlow — Milestone 1: Job & Resume Ingestion

> **Hackathon project — solo, 24-48 hr build.**  
> This milestone ships the complete ingestion pipeline: job creation + PDF/DOCX resume parsing — no auth, no LLM, no queues.

---

## Folder structure

```
HireFlow/
├── app/
│   ├── core/
│   │   └── config.py          # Pydantic-settings (DATABASE_URL)
│   ├── models/
│   │   ├── job.py             # Job SQLAlchemy model
│   │   └── candidate.py       # Candidate SQLAlchemy model
│   ├── schemas/
│   │   ├── job_schema.py      # JobCreate / JobResponse / JobDetailResponse
│   │   └── candidate_schema.py# CandidateUploadResponse / CandidateDetailResponse
│   ├── services/
│   │   └── extraction.py      # PDF + DOCX text extraction (no DB/FastAPI)
│   ├── routers/
│   │   ├── jobs.py            # POST /jobs · GET /jobs/{id}
│   │   └── candidates.py      # POST /jobs/{id}/candidates · GET /candidates/{id}
│   └── database.py            # engine, SessionLocal, Base, get_db
├── main.py                    # FastAPI app + lifespan (create_all) + router registration
├── smoke_test.py              # End-to-end smoke test (uses `requests`)
├── requirements.txt
├── .env.example
└── .gitignore
```

---

## Quick start

### 1. Clone & create a virtual environment

```powershell
cd HireFlow
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Set up the database

Create a free [Neon](https://neon.tech) project (PostgreSQL).  Copy the connection string.

```powershell
Copy-Item .env.example .env
# Edit .env and paste your connection string:
# DATABASE_URL=postgresql+psycopg2://user:pass@host/dbname?sslmode=require
```

> **Tables are created automatically on first startup** via `Base.metadata.create_all()`.  
> No Alembic, no manual DDL needed.

### 3. Run the server

```powershell
uvicorn main:app --reload
```

Interactive API docs: http://127.0.0.1:8000/docs

---

## API reference

### `POST /jobs`
Create a job posting.

```json
// Request body
{ "title": "Senior Python Engineer", "description_text": "We need..." }

// 201 response
{ "id": 1, "title": "Senior Python Engineer", "description_text": "...", "created_at": "..." }
```

---

### `POST /jobs/{job_id}/candidates`
Upload a resume (multipart, field name `file`).

| Scenario | HTTP | `extraction_status` |
|---|---|---|
| `.pdf` or `.docx`, text found | 201 | `ok` |
| Valid file but no text layer (scanned PDF) | 201 | `empty` |
| Valid file but extraction crashes | 201 | `error` |
| Unsupported extension (`.txt`, `.jpg`, …) | 400 | — (no row created) |
| File > 10 MB | 400 | — (no row created) |
| Job not found | 404 | — |

Response **never includes `raw_text`** — use `GET /candidates/{id}` for that.

```json
// 201 response
{
  "id": 7, "job_id": 1, "filename": "resume.pdf",
  "extraction_status": "ok", "extraction_error": null, "created_at": "..."
}
```

---

### `GET /jobs/{job_id}`
Returns the job + a summary list of candidates (no `raw_text`).

```json
{
  "id": 1, "title": "...", "description_text": "...", "created_at": "...",
  "candidates": [
    { "id": 7, "filename": "resume.pdf", "extraction_status": "ok", "created_at": "..." }
  ]
}
```

---

### `GET /candidates/{candidate_id}`
Returns the **full** candidate record **including `raw_text`**.

```json
{
  "id": 7, "job_id": 1, "filename": "resume.pdf",
  "raw_text": "John Doe\nSoftware Engineer\n...",
  "extraction_status": "ok", "extraction_error": null, "created_at": "..."
}
```

---

## Running the smoke test

### Option A — Python script (recommended)

1. Drop two real resume files into `tests/fixtures/`:
   - `sample_resume.pdf`
   - `sample_resume.docx`

   > **Don't have real resumes handy?** Minimal fixtures work fine:
   > - For PDF: open any `.docx` and export as PDF from Word/LibreOffice.
   > - For DOCX: create a one-page Word document, save as `.docx`.

2. Start the server (`uvicorn main:app --reload`), then:

```powershell
python smoke_test.py
```

Expected output:
```
[1] Job created          — id=1
[2] PDF uploaded         — extraction_status=ok
[3] DOCX uploaded        — extraction_status=ok
[4] .txt rejected        — HTTP 400 ✓
[5] Job detail           — 2 candidates, both ok ✓
[6] PDF candidate detail — raw_text non-empty, 3821 chars ✓
    Preview: 'John Doe  Senior Software Engineer ...'

✅  All smoke tests passed!
```

### Option B — curl

```bash
# 1. Create job
curl -s -X POST http://localhost:8000/jobs \
  -H "Content-Type: application/json" \
  -d '{"title":"Backend Engineer","description_text":"Python FastAPI role"}' | python -m json.tool

# 2. Upload PDF (replace <JOB_ID> and path)
curl -s -X POST http://localhost:8000/jobs/<JOB_ID>/candidates \
  -F "file=@path/to/resume.pdf" | python -m json.tool

# 3. Upload DOCX
curl -s -X POST http://localhost:8000/jobs/<JOB_ID>/candidates \
  -F "file=@path/to/resume.docx" | python -m json.tool

# 4. Reject a .txt (expect 400)
curl -s -X POST http://localhost:8000/jobs/<JOB_ID>/candidates \
  -F "file=@path/to/resume.txt"

# 5. Job detail
curl -s http://localhost:8000/jobs/<JOB_ID> | python -m json.tool

# 6. Full candidate text (replace <CANDIDATE_ID>)
curl -s http://localhost:8000/candidates/<CANDIDATE_ID> | python -m json.tool
```

---

## Key design decisions & assumptions

| Decision | Rationale |
|---|---|
| `create_all()` in lifespan, not Alembic | Spec requirement; fine at hackathon scale |
| `expire_on_commit=False` on SessionLocal | Avoids detached-instance errors when returning ORM objects from endpoints |
| `pool_pre_ping=True` | Neon suspends idle branches; ping prevents stale-connection errors |
| `raw_text` omitted from upload/list responses | Keeps payloads small; full text available via dedicated GET endpoint |
| `extraction_status="error"` rows still return 201 | Frontend can display per-file failure state without a generic 500 |
| `ValueError` for bad extension → 400, no row | Rejecting before DB write avoids orphan rows for fundamentally bad input |
| `psycopg2-binary` | Zero-build-dependency driver; fine for local dev and Neon |
| `from __future__ import annotations` in all model files | Defers evaluation of `Mapped[...]` type hints, avoiding forward-reference `NameError` on Python 3.12 |

---

## What's next (Milestone 2)

- Embed `raw_text` with an LLM embedding model and store in pgvector
- Semantic similarity search across candidates for a job
- Groq / LangChain for structured JD parsing and candidate scoring