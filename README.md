# HireFlow — Milestone 2: LLM Requirement & Profile Extraction

> **Hackathon project — solo, 24-48 hr build.**  
> Milestone 2 adds structured JSON extraction from job descriptions and candidate resumes using Groq LLM (`langchain-groq`).

---

## Folder structure

```
HireFlow/
├── app/
│   ├── core/
│   │   └── config.py          # Pydantic-settings (DATABASE_URL, GROQ_API_KEY, GROQ_MODEL)
│   ├── models/
│   │   ├── job.py             # Job SQLAlchemy model + requirements fields
│   │   └── candidate.py       # Candidate SQLAlchemy model + profile fields
│   ├── schemas/
│   │   ├── job_schema.py      # JobCreate / JobResponse / JobDetailResponse
│   │   └── candidate_schema.py# CandidateUploadResponse / CandidateDetailResponse
│   ├── services/
│   │   ├── extraction.py      # PDF + DOCX text extraction
│   │   └── llm.py             # ChatGroq client + structured requirement & profile extraction
│   ├── routers/
│   │   ├── jobs.py            # POST /jobs · GET /jobs/{id} · POST /jobs/{id}/extract-requirements
│   │   └── candidates.py      # POST /jobs/{id}/candidates · GET /candidates/{id} · POST /candidates/{id}/extract-profile
│   └── database.py            # engine, SessionLocal, Base, get_db
├── main.py                    # FastAPI app + lifespan (create_all) + router registration
├── smoke_test.py              # Milestone 1 smoke test
├── smoke_test_2.py            # Milestone 2 smoke test (LLM extraction end-to-end)
├── requirements.txt
├── .env.example
└── .gitignore
```

---

## Quick start

### 1. Set up virtual environment & install dependencies

```powershell
cd HireFlow
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Set up environment variables

Copy `.env.example` to `.env`:

```powershell
Copy-Item .env.example .env
```

Edit `.env` and set:
- `DATABASE_URL`: PostgreSQL connection string (e.g. Neon.tech).
- `GROQ_API_KEY`: Your Groq API key from [console.groq.com](https://console.groq.com).

> **Database Schema Note**: Tables are created automatically on startup via `Base.metadata.create_all()`. If you encounter SQL errors regarding missing columns on an existing database, drop the tables in your database so `create_all()` re-creates them with the new columns.

### 3. Run the server

```powershell
uvicorn main:app --reload
```

Interactive API docs: http://127.0.0.1:8000/docs

---

## API Reference

### `POST /jobs/{job_id}/extract-requirements`
Extract structured requirements from a job posting's `description_text` using LLM.

- **200 OK**: Updates `requirements_status` (`ok` / `error`), `requirements_json`, and `requirements_error`.
- **404 Not Found**: If job ID does not exist.

### `POST /candidates/{candidate_id}/extract-profile`
Extract structured candidate profile (`summary`, `skills`, `experience`, `projects`, `education`) from candidate `raw_text` using LLM.

- **200 OK**: Updates `profile_status` (`ok` / `error`), `profile_json`, and `profile_error`.
- **400 Bad Request**: If candidate `extraction_status != "ok"` (no usable text layer).
- **404 Not Found**: If candidate ID does not exist.

---

## Running Smoke Tests

### Milestone 1 Smoke Test
```powershell
python smoke_test.py
```

### Milestone 2 Smoke Test (LLM Extraction)
```powershell
python smoke_test_2.py
```