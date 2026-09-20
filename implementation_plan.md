# Frontend & API Architecture Review Plan

## The Core Issue: Disconnected Modern UI Components

I've reviewed the frontend and API layers and found a major architectural mismatch. The backend API is successfully generating rich, granular data (`mapping_json` and `interview_questions_json`), and we have beautiful React components (`ScreeningMatrix.jsx` and `InterviewIntelligence.jsx`) built to display this data. 

**However, they are not wired together.**

### Finding 1: Unused React Components
`ScreeningMatrix.jsx` and `InterviewIntelligence.jsx` are completely orphaned. They are not imported or used anywhere in `App.jsx` or `CandidateHub.jsx`.

### Finding 2: `CandidateHub.jsx` Still Relies on Mock/Old Schemas
Instead of using the new components, `CandidateHub.jsx` (the main candidate view) contains hundreds of lines of hardcoded JSX (lines 450–598) that expect the old, deprecated data shapes (`screening_json` and `interview_kit_json`).

### Finding 3: `api.js` Has a Hacky Translation Layer
Because `CandidateHub.jsx` expects the old schema, `api.js` has a hacky fallback. When the backend returns the new `mapping_json`, `api.js` (around line 210) manually translates it back into the old `screening_json` format (calculating a fake score and mapping "met/partial/gap" to "key_strengths" and "potential_risks") just so `CandidateHub.jsx` doesn't crash. This throws away all the rich audit trails, evidence snippets, and validation flags we worked so hard to extract from the LLM!

---

## The Implementation Plan

To fully finalize the web app, we need to wire the modern components into the main UI and strip out the old mock logic.

### Step 1: Wire Up `CandidateHub.jsx`
- [MODIFY] `CandidateHub.jsx`
  - Import `ScreeningMatrix` and `InterviewIntelligence`.
  - Replace the huge hardcoded HTML blocks for "SECTION 2: MATCH SCORECARD" and "SECTION 3: TAILORED INTERVIEW INTELLIGENCE QUESTIONS" with simply `<ScreeningMatrix candidate={cand} />` and `<InterviewIntelligence candidate={cand} />`.
  - Pass the raw candidate object down so the components can read the real `mapping_json` and `interview_questions_json`.

### Step 2: Clean Up `api.js`
- [MODIFY] `api.js`
  - Remove the translation logic that forces `data.screening_json` and `data.interview_kit_json` into existence.
  - Let the API return exactly what the backend sends (`mapping_json` and `interview_questions_json`).
  - Keep the offline mock fallbacks for testing, but ensure they use the new data structures.

### Step 3: Visual Verification
- Use the `/browser` tool (if you grant me access) to open `http://localhost:5173`, upload a test resume, and visually verify that the new components render the evidence snippets and interview questions correctly.

---
**Do you approve this plan to wire up the UI correctly?** (Also, if you'd like me to visually test the site by clicking around myself, you can trigger the `/browser` slash command so I can launch a headless browser session!)
