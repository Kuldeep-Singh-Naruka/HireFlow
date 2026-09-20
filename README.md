# HireFlow — AI-Powered Hiring Intelligence Platform

> **Built for a hackathon.** HireFlow transforms a raw job description and a pile of resumes into a structured, evidence-backed hiring decision — no spreadsheets, no guesswork.

---

## What It Does

HireFlow is a full-stack AI hiring assistant that automates the most time-consuming parts of the recruiting process:

1. **Parse resumes** — Upload PDF or DOCX files and extract clean text automatically.
2. **Understand the job** — Paste a job description and let the AI extract every structured requirement (required vs. nice-to-have, category, skill).
3. **Map candidates to requirements** — For every job requirement, the AI finds actual evidence from the candidate's resume text — or flags it as a gap. No hallucination: every verdict is grounded in the raw resume, not a summary.
4. **Generate interview questions** — Automatically produce prioritized, resume-specific interview questions. Validation questions target unknowns, probe questions dig into partial matches, general questions confirm strengths.
5. **Visual scoring dashboard** — See a computed Requirement Fit Score, a per-requirement audit trail, and the full interview kit — all in a modern React UI.

---

## Tech Stack

### Backend
- **Python 3.12** · **FastAPI** · **Uvicorn**
- **SQLAlchemy 2.0** — sync ORM, auto-created tables on startup
- **PostgreSQL** via [Neon](https://neon.tech) serverless
- **PyMuPDF** (`fitz`) — PDF text extraction
- **python-docx** — DOCX text extraction
- **LangChain + Groq** (`langchain-groq`) — structured LLM output for all AI steps
- **Model:** `qwen/qwen3.8-27b` — full tool/function-calling support, 128K context window

### Frontend
- **React 18** · **Vite** · **Tailwind CSS**
- Glassmorphic dark UI with micro-animations
- Fully functional offline demo mode (mock data fallback)

---

## Project Structure

```
HireFlow/
├── app/
│   ├── core/config.py          ← Settings (DATABASE_URL, GROQ_API_KEY, GROQ_MODEL)
│   ├── database.py             ← Engine, SessionLocal, Base, get_db
│   ├── models/
│   │   ├── job.py              ← Job ORM model
│   │   └── candidate.py        ← Candidate ORM model
│   ├── schemas/
│   │   ├── job_schema.py       ← Request/response schemas for jobs
│   │   └── candidate_schema.py ← Request/response schemas for candidates
│   ├── services/
│   │   ├── extraction.py       ← PDF + DOCX text extraction
│   │   └── llm.py              ← All LLM schemas + AI functions
│   └── routers/
│       ├── jobs.py             ← Job endpoints
│       └── candidates.py       ← Candidate endpoints
├── frontend/
│   └── src/
│       ├── components/         ← React UI components
│       └── services/           ← API client + mock data
├── main.py                     ← FastAPI app entry point
├── smoke_test.py               ← End-to-end API test
├── reset_db.py                 ← Drop + recreate all tables
├── test_resumes/               ← 10 test resumes (PDF + DOCX mix)
├── requirements.txt
├── .env.example
└── .gitignore
```

---

## Quick Start

### 1. Clone & set up the virtual environment

```powershell
cd HireFlow
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Configure environment variables

```powershell
Copy-Item .env.example .env
# Fill in your values:
# DATABASE_URL=postgresql+psycopg2://user:pass@host/dbname?sslmode=require
# GROQ_API_KEY=your_groq_api_key_here
# GROQ_MODEL=qwen/qwen3.8-27b
```

> **Important:** Use `qwen/qwen3.8-27b`. Models routed through `openai/*` on Groq do **not** support tool calling and will fail with structured output.

### 3. Start the backend

```powershell
python main.py
```

> Tables are **auto-created on first startup** via `Base.metadata.create_all()`.  
> If you ever need a clean slate, run `python reset_db.py`.

- Interactive API docs: **http://127.0.0.1:8000/docs**
- Health check: **http://127.0.0.1:8000/health**

### 4. Start the frontend

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:5173**

---

## API Reference

### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/jobs` | Create a job posting |
| `GET` | `/jobs` | List all jobs |
| `GET` | `/jobs/{id}` | Get job detail with candidate list |
| `POST` | `/jobs/{id}/extract-requirements` | AI-extract structured requirements from description |

### Candidates

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/jobs/{job_id}/candidates` | Upload a resume (PDF or DOCX) |
| `GET` | `/candidates/{id}` | Get full candidate record |
| `POST` | `/candidates/{id}/extract-profile` | AI-extract structured profile from resume |
| `POST` | `/candidates/{id}/map-requirements` | Map each job requirement to resume evidence |
| `POST` | `/candidates/{id}/generate-questions` | Generate prioritized interview questions |

#### Resume upload behavior

| Scenario | HTTP | `extraction_status` |
|----------|------|---------------------|
| Valid file with text | 201 | `ok` |
| Valid file, no text layer (scanned or table-layout DOCX) | 201 | `empty` |
| Unsupported extension | 400 | — |
| File > 10 MB | 400 | — |
| Job not found | 404 | — |

---

## AI Pipeline Response Shapes

### Requirement Mapping (`mapping_json`)
```json
{
  "mappings": [
    {
      "requirement_text": "5+ years Python experience",
      "status": "met | partial | gap",
      "evidence_snippet": "Direct quote from resume, or null",
      "needs_validation": true,
      "validation_note": "Why this was flagged for follow-up, or null"
    }
  ]
}
```

### Interview Questions (`interview_questions_json`)
```json
{
  "questions": [
    {
      "question_text": "Walk me through...",
      "target_requirement": "5+ years Python experience",
      "question_type": "validation | probe | general"
    }
  ]
}
```

---

## How the Match Score Is Calculated

The **Requirement Fit Score** shown in the UI is computed transparently from the mapping output — not invented by the LLM:

```
score = round(((met_count + 0.5 * partial_count) / total_count) * 100)
```

- **met** → full credit
- **partial** → half credit
- **gap** → no credit

The recommendation badge is also derived from counts:
- **Strong Match** — zero gaps and zero validation flags
- **Significant Gaps** — any requirement with `status: gap`
- **Review Required** — partial matches or validation flags, but no outright gaps

---

## Running the Smoke Test

Make sure the server is running, then in a second terminal:

```powershell
python smoke_test.py
```

The test creates a job, uploads resumes, and exercises every API endpoint end-to-end, printing a pass/fail for each step.

---

## Test Resumes

The `test_resumes/` folder contains 10 synthetic resumes designed to exercise every evaluation scenario:

| File | Role | Expected Result |
|------|------|-----------------|
| `1_Frontend_Perfect_Sarah_Jenkins.docx` | Lead Frontend | Strong Match |
| `2_Frontend_Partial_Mark_Robinson.pdf` | Lead Frontend | Review Required (under-experienced) |
| `3_Frontend_Fail_Backend_David_Chen.docx` | Lead Frontend | Significant Gaps (backend dev) |
| `4_Frontend_Fail_Junior_Emma_Watson.pdf` | Lead Frontend | Significant Gaps (junior) |
| `5_Frontend_Strong_No_Bonus_Michael_Chang.docx` | Lead Frontend | Strong Match (no TypeScript/WebSockets) |
| `6_AI_Fullstack_Perfect_Elena_Rodriguez.pdf` | Senior AI Engineer | Strong Match |
| `7_AI_Fullstack_Partial_FrontendHeavy_James_Wilson.docx` | Senior AI Engineer | Review Required (no LLM experience) |
| `8_AI_Fullstack_Partial_DataSci_Lisa_Gupta.pdf` | Senior AI Engineer | Review Required (no frontend) |
| `9_AI_Fullstack_Fail_Junior_Tom_Baker.docx` | Senior AI Engineer | Significant Gaps (junior) |
| `10_AI_Fullstack_Strong_No_AI_Kevin_White.pdf` | Senior AI Engineer | Review Required (no LLM experience) |

---

## Key Design Decisions

| Decision | Why |
|----------|-----|
| `create_all()` on startup, no Alembic | Fast iteration — no migration overhead for a hackathon |
| Evidence grounded in `raw_text`, not `profile_json` | Every verdict is traceable to the actual resume text |
| All AI endpoints return `200` even on failure | Frontend gets a structured error status, not a generic 500 crash |
| `needs_validation` defaults to `True` on ambiguity | False positives cost a recruiter seconds; false negatives cost recruiter trust |
| Match score computed in frontend, not LLM | Transparent, auditable, and consistent — no hallucinated numbers |
| `temperature=0.0` for extraction/mapping, `0.3` for questions | Deterministic for structured data; slight warmth for natural question phrasing |
| `pool_pre_ping=True` on DB engine | Neon suspends idle branches — prevents stale-connection errors |