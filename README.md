# HireFlow — AI-Powered Hiring Pipeline

> **Hackathon project.**  
> Four milestones complete: resume ingestion → structured extraction → requirement mapping → interview question generation.

---

## Milestones

| # | Milestone | Status |
|---|---|---|
| 1 | Job & resume ingestion (PDF/DOCX parsing) | ✅ Done |
| 2 | LLM-powered structured extraction (job requirements + candidate profile) | ✅ Done |
| 3 | Requirement-to-evidence mapping (per-requirement verdict grounded in raw resume text) | ✅ Done |
| 4 | Interview question generation (prioritised, resume-specific questions) | ✅ Done |

---

## Tech Stack

- **Python 3.12**, **FastAPI**, **Uvicorn**
- **SQLAlchemy 2.0** — sync ORM, `create_all()` on startup (no Alembic)
- **PostgreSQL** via [Neon](https://neon.tech) — connection string from `DATABASE_URL`
- **PyMuPDF** (`fitz`) — PDF text extraction
- **python-docx** — DOCX text extraction
- **LangChain + Groq** (`langchain-groq`) — structured LLM output for all AI steps

---

## Folder Structure

```
HireFlow/
├── app/
│   ├── core/config.py          ← Settings (DATABASE_URL, GROQ_API_KEY, GROQ_MODEL)
│   ├── database.py             ← engine, SessionLocal, Base, get_db
│   ├── models/
│   │   ├── job.py              ← Job ORM model
│   │   └── candidate.py        ← Candidate ORM model (all milestone columns)
│   ├── schemas/
│   │   ├── job_schema.py       ← JobCreate, JobResponse, JobDetailResponse
│   │   └── candidate_schema.py ← CandidateUploadResponse, CandidateDetailResponse
│   ├── services/
│   │   ├── extraction.py       ← PDF + DOCX text extraction (no DB/FastAPI)
│   │   └── llm.py              ← All LLM schemas + functions (M2, M3, M4)
│   └── routers/
│       ├── jobs.py             ← POST /jobs · GET /jobs/{id} · POST /jobs/{id}/extract-requirements
│       └── candidates.py       ← All candidate endpoints (upload, profile, mapping, questions)
├── main.py                     ← FastAPI app + lifespan (create_all) + router registration
├── smoke_test.py               ← End-to-end smoke test (Milestones 1–4)
├── reset_db.py                 ← Drop + recreate all tables (run when models gain new columns)
├── requirements.txt
├── .env.example
└── .gitignore
```

---

## Quick Start

### 1. Clone & create a virtual environment

```powershell
cd HireFlow
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Configure environment

```powershell
Copy-Item .env.example .env
# Edit .env:
# DATABASE_URL=postgresql+psycopg2://user:pass@host/dbname?sslmode=require
# GROQ_API_KEY=your_groq_api_key_here
# GROQ_MODEL=llama3-70b-8192   # or any Groq-hosted model
```

### 3. Run the server

```powershell
python main.py
```

> Tables are **auto-created on first startup** via `Base.metadata.create_all()`.  
> After adding new model columns (e.g. between milestones), run `python reset_db.py` to drop and recreate all tables.

Interactive API docs: **http://127.0.0.1:8000/docs**  
Health check: **http://127.0.0.1:8000/health**

---

## API Reference

### Jobs

#### `POST /jobs`
Create a job posting.
```json
// Request
{ "title": "Senior Python Engineer", "description_text": "We need..." }
// 201 Response
{ "id": 1, "title": "...", "description_text": "...", "created_at": "..." }
```

#### `POST /jobs/{job_id}/extract-requirements`
Extract structured requirements from the job description using LLM.
```json
// 200 Response — requirements_status="ok"
{
  "requirements_json": {
    "requirements": [
      { "requirement_text": "Python", "category": "skill", "is_required": true },
      ...
    ]
  },
  "requirements_status": "ok"
}
```

#### `GET /jobs/{job_id}`
Returns the job + a lightweight list of its candidates (no `raw_text`).

---

### Candidates

#### `POST /jobs/{job_id}/candidates`
Upload a resume (multipart, field name `file`). Supports `.pdf` and `.docx`.

| Scenario | HTTP | `extraction_status` |
|---|---|---|
| Valid file with text | 201 | `ok` |
| Valid file, no text layer (scanned / table-layout DOCX) | 201 | `empty` |
| Valid file, extraction crashes | 201 | `error` |
| Unsupported extension | 400 | — |
| File > 10 MB | 400 | — |
| Job not found | 404 | — |

#### `POST /candidates/{id}/extract-profile`
Extract structured profile (summary, skills, experience, projects, education) from `raw_text` using LLM.  
Prerequisite: `extraction_status == "ok"`

#### `POST /candidates/{id}/map-requirements`
Map every job requirement to evidence grounded in the candidate's raw resume text.  
Returns per-requirement: `status` (met/partial/gap), `evidence_snippet`, `needs_validation`, `validation_note`.  
Prerequisites: `extraction_status == "ok"` · `profile_status == "ok"` · `job.requirements_status == "ok"`

#### `POST /candidates/{id}/generate-questions`
Generate 5–8 prioritised interview questions from the mapping output.  
Priority order: **validation** (gaps + needs_validation=True) → **probe** (partial matches) → **general** (met matches).  
Prerequisite: `mapping_status == "ok"`

#### `GET /candidates/{id}`
Returns the **full** candidate record including `raw_text`, `profile_json`, `mapping_json`, and `interview_questions_json`.

---

## Candidate Data Model (all milestones)

```
Candidate
├── id, job_id, filename, created_at
│
├── [M1] raw_text                    ← extracted resume text
├── [M1] extraction_status           ← ok | empty | error
├── [M1] extraction_error
│
├── [M2] profile_json                ← { summary, skills, experience, projects, education }
├── [M2] profile_status              ← not_extracted | ok | error
├── [M2] profile_error
│
├── [M3] mapping_json                ← { mappings: [{ requirement_text, status, evidence_snippet, needs_validation, validation_note }] }
├── [M3] mapping_status              ← not_mapped | ok | error
├── [M3] mapping_error
│
├── [M4] interview_questions_json    ← { questions: [{ question_text, target_requirement, question_type }] }
├── [M4] interview_questions_status  ← not_generated | ok | error
└── [M4] interview_questions_error
```

---

## Running the Smoke Test

### Prerequisites

1. Drop real resume files into `tests/fixtures/`:
   - `sample_resume.pdf`
   - `sample_resume.docx`
2. Server is running (`python main.py`)
3. `.env` has `DATABASE_URL` and `GROQ_API_KEY` set

```powershell
python smoke_test.py
```

Expected output:
```
[1]  Job created
[2]  PDF uploaded         — extraction_status=ok
[3]  DOCX uploaded        — extraction_status=ok (or empty for table-layout templates)
[4]  .txt rejected        — HTTP 400 ✓
[5]  Job detail           — candidates list ✓
[6]  PDF candidate detail — raw_text non-empty ✓
[7]  Job requirements extracted ✓
[8]  Candidate profile extracted ✓
[9]  map-requirements 400 guard ✓
[10] map-requirements — mapping_status=ok ✓
[11] Mapping count — N/N requirements covered ✓
[12] Evidence snippets — all met/partial have evidence ✓
[13] Idempotent re-run ✓
     MANUAL EYEBALL — Requirement Mapping Results
[14] generate-questions 400 guard ✓
[15] generate-questions — interview_questions_status=ok ✓
[16] Question count — 5-8 ✓
[17] target_requirement validity ✓
[18] Idempotent re-run ✓
     MANUAL EYEBALL — Interview Questions

✅  All smoke tests passed (Milestones 1–4)!
```

### Resetting the database

Run whenever model columns change between milestone iterations:
```powershell
python reset_db.py
```

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| `create_all()` in lifespan, not Alembic | Spec requirement; fast enough at hackathon scale |
| `expire_on_commit=False` | ORM objects stay readable after `commit()` without an extra DB round-trip |
| `pool_pre_ping=True` | Neon suspends idle branches; prevents stale-connection errors |
| `raw_text` omitted from upload/list responses | Full text only via `GET /candidates/{id}` — keeps list payloads small |
| All AI steps always return 200 (never 500) | Frontend gets a per-resource error status (`mapping_status="error"`) rather than a generic crash |
| `ValueError` for bad extension → 400, no row | Avoids orphan `Candidate` rows for fundamentally invalid input |
| Evidence grounded in `raw_text`, not `profile_json` | M3 prompt explicitly forbids quoting the profile summary — evidence must be traceable to the actual resume |
| `needs_validation=True` as default | False positives cost a recruiter seconds; false negatives cost recruiter trust |
| `target_requirement` uses `COPY THIS:` label in prompt | Prevents LLM from copying the decorated `[SKILL] (REQUIRED) Python` string instead of the raw `"Python"` value |
| `temperature=0.0` for extraction/mapping, `0.3` for questions | Deterministic for structured facts; slight warmth for natural question phrasing |

---

## What's Next (Milestone 5)

- Minimal frontend (React or plain HTML) to walk through the pipeline visually
- Side-by-side candidate comparison view
- Export interview pack as PDF
