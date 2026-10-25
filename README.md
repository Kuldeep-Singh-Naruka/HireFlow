# HireFlow — AI-Powered Hiring Intelligence Platform

> **Built for a hackathon.** HireFlow transforms a raw job description and a pile of resumes into a structured, evidence-backed hiring decision — no spreadsheets, no guesswork.

---

## What It Does

HireFlow is a backend screening **agent**. You describe a role (a short form, a pasted job description, or both), upload a batch of resumes, and the agent works through them on its own while you watch progress live.

1. **Hiring profile** - `POST /profiles` merges the form fields (must-have / nice-to-have / seniority / years) with an optional JD into one requirement checklist. Form entries always win on required-ness; duplicates are merged.
2. **Run** - `POST /profiles/{id}/runs` uploads 1-50 PDF/DOCX files and starts a run. Each candidate goes through four steps with bounded concurrency (`AGENT_CONCURRENCY`, default 3): **extract text, extract profile, map requirements to resume evidence, generate interview questions**. Rate limits and transient failures are retried (3 attempts, 2 s / 4 s backoff); a failed step stops only that candidate.
3. **Batch review** - when every candidate has finished, a final LLM pass produces a ranked **shortlist**, a pool **summary** and **flags**. A ranking guard re-sorts the shortlist by score if the LLM contradicts it by more than 5 points.
4. **Live progress** - `GET /runs/{id}/events` streams Server-Sent Events (with replay via `Last-Event-ID`). Interrupted runs can be resumed, failed candidates retried.

Scores and badges are computed in code from the mapping, never invented by the LLM.

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

---

## Project Structure

```
HireFlow/
├── app/
│   ├── core/config.py          <- Settings (DATABASE_URL, GROQ_*, AGENT_CONCURRENCY)
│   ├── database.py             <- Engine, SessionLocal, Base, get_db
│   ├── models/                 <- HiringProfile, Run, Candidate, RunEvent
│   ├── schemas/                <- Request/response schemas
│   ├── agent/                  <- Runner, per-candidate pipeline, reviewer, requirement merge, events/SSE, retry
│   ├── scoring.py              <- Deterministic score + badge
│   ├── services/
│   │   ├── extraction.py       <- PDF + DOCX text extraction
│   │   └── llm.py              <- LLM schemas, prompts, AI functions
│   └── routers/                <- profiles.py, runs.py
├── frontend/                   <- React UI
├── main.py                     <- FastAPI entry point
├── smoke_test.py               <- Live end-to-end smoke test
├── test_resumes/               <- 10 test resumes (PDF + DOCX mix)
├── tests/                      <- pytest suite
├── requirements.txt
└── .env.example
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
# AGENT_CONCURRENCY=3
```

> **Important:** Use `qwen/qwen3.8-27b`. Models routed through `openai/*` on Groq do **not** support tool calling and will fail with structured output.

### 3. Start the backend

```powershell
python main.py
```

> If your database still has the old `jobs`/`candidates` tables, drop them once (all data is lost): `DROP TABLE IF EXISTS candidates, jobs CASCADE;` — tables are recreated on startup.
> `create_all()` never alters existing tables. If you have a local `reset_db.py`, running it does the same (drop + recreate all tables).

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

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/profiles` | Create a hiring profile and build its requirement checklist |
| `GET` | `/profiles` | List profiles (counts, latest run status) |
| `GET` | `/profiles/{id}` | Profile + runs + candidates + latest batch review |
| `PUT` | `/profiles/{id}` | Edit form fields (does not rebuild requirements) |
| `PUT` | `/profiles/{id}/requirements` | Replace the requirement checklist |
| `POST` | `/profiles/{id}/runs` | Upload resumes (multipart field `files`) and start the agent |
| `GET` | `/runs/{id}` | Run state: status, candidates (step statuses, score, badge), review, events |
| `GET` | `/runs/{id}/events` | SSE stream (heartbeat 15 s, closes on `run_done` / `run_interrupted`) |
| `POST` | `/runs/{id}/resume` | Resume an interrupted run |
| `POST` | `/runs/{id}/review` | Re-run the batch review |
| `GET` | `/candidates/{id}` | Full candidate: profile, mapping, questions, raw text |
| `POST` | `/candidates/{id}/retry` | Retry a candidate's failed steps |
| `GET` | `/health` | Health check |

Errors: `404` missing resource, `400` validation, `409` state conflict. AI step failures are never HTTP errors - they are persisted step statuses (`pending / running / ok / error / skipped`). Run statuses: `queued / running / reviewing / done / interrupted / failed`.

**Uploads:** `.pdf` / `.docx` only (case-insensitive), max 10 MB each, 1-50 files per run. Rejected files are listed in `rejected: [{filename, reason}]`; if all are rejected the response is `400`.

### Batch review (`review_json`)
```json
{
  "shortlist": [{"candidate_id": 1, "rank": 1, "reason": "..."}],
  "summary": {"pool_strength": "strong | mixed | weak", "overview": "..."},
  "flags": [{"candidate_id": 4, "reason": "..."}]
}
```

---

## How the Score and Badge Are Calculated

Computed in `app/scoring.py` from the requirement mapping:

- weight = 2 for a required requirement, 1 for a preferred one
- credit: `met` = 1, `partial` = 0.5, `gap` = 0
- `score = round(100 * sum(weight * credit) / sum(weight))` (no clamping)

Badge:
- `significant_gaps` - any **required** requirement is a `gap`
- `review_required` - otherwise, any required requirement is `partial` or flagged `needs_validation`
- `strong_match` - otherwise (nice-to-have partials/gaps lower the score but never the badge)

---

## Running the Smoke Test

Needs a running backend with real Groq credentials (it makes paid LLM calls). In a second terminal:

```powershell
python smoke_test.py
```

It creates the "Lead Frontend Engineer" and "Senior AI Engineer" profiles, uploads `test_resumes/1_`-`5_` and `6_`-`10_` respectively, polls each run every 3 s (10 min timeout), then prints a `file | expected | actual | score` table plus each run's shortlist and flags. It exits 1 if fewer than 8 of 10 badges match the table below. Set `HIREFLOW_API` to target a non-default URL. Unit tests: `python -m pytest`.

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
| `7_AI_Fullstack_Partial_FrontendHeavy_James_Wilson.docx` | Senior AI Engineer | Significant Gaps (no LLM experience) |
| `8_AI_Fullstack_Partial_DataSci_Lisa_Gupta.pdf` | Senior AI Engineer | Significant Gaps (no frontend) |
| `9_AI_Fullstack_Fail_Junior_Tom_Baker.docx` | Senior AI Engineer | Significant Gaps (junior) |
| `10_AI_Fullstack_Strong_No_AI_Kevin_White.pdf` | Senior AI Engineer | Significant Gaps (no LLM experience) |

Expected badges follow the scoring rule: a missing must-have → Significant Gaps.

---

## Key Design Decisions

| Decision | Why |
|----------|-----|
| `create_all()` on startup, no Alembic | Fast iteration - drop the tables for schema changes |
| Evidence grounded in `raw_text`, not `profile_json` | Every verdict is traceable to the actual resume text |
| AI failures are persisted statuses, not HTTP errors | One bad step never kills a batch; it can be retried |
| Score and badge computed in code | Transparent, auditable, reproducible |
| Bounded concurrency + single retry layer | Respects Groq rate limits; LangChain `max_retries=0` so retries are counted once |
| Ranking guard on the batch review | LLM ordering cannot contradict computed scores by more than 5 points |
| `pool_pre_ping=True` on DB engine | Neon suspends idle branches - prevents stale-connection errors |
