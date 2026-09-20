import { MOCK_CANDIDATE_DATA, SAMPLE_JOBS } from './SampleData';

const API_BASE_URL = 'http://localhost:8000';

// In-memory fallback cache for smooth demoing if backend is offline
let localJobs = [
  {
    id: 1,
    title: SAMPLE_JOBS[0].title,
    description_text: SAMPLE_JOBS[0].description_text,
    requirements_status: "ok",
    requirements_json: {
      requirements: [
        { requirement_text: "4+ years software engineering experience", category: "experience", is_required: true },
        { requirement_text: "Proficiency in Python, FastAPI, SQLAlchemy", category: "skill", is_required: true },
        { requirement_text: "Proficiency in React 18+ and Tailwind CSS", category: "skill", is_required: true },
        { requirement_text: "Hands-on experience with LLMs, prompt engineering, LangChain", category: "skill", is_required: true },
        { requirement_text: "Experience with vector databases (Pinecone, Chroma)", category: "skill", is_required: false }
      ]
    },
    requirements_error: null,
    created_at: new Date().toISOString(),
    candidates: [
      { id: 101, filename: "Alex_Rivera_Senior_AI_Engineer_Resume.pdf", extraction_status: "ok", created_at: new Date().toISOString() },
      { id: 102, filename: "Jordan_Lee_Junior_Developer_Resume.pdf", extraction_status: "ok", created_at: new Date().toISOString() }
    ]
  }
];

let localCandidates = { ...MOCK_CANDIDATE_DATA.reduce((acc, c) => ({ ...acc, [c.id]: c }), {}) };

export const api = {
  // Check health of backend
  checkHealth: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { method: 'GET' });
      if (res.ok) return true;
    } catch {
      // Backend offline, fallback to mock mode
    }
    return false;
  },

  // GET /jobs
  getJobs: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/jobs`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (err) {
      console.warn('API unreachable, using local fallback jobs:', err);
    }
    return localJobs;
  },

  // POST /jobs
  createJob: async (title, description_text) => {
    try {
      const res = await fetch(`${API_BASE_URL}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description_text }),
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('API createJob fallback:', err);
    }

    const newJob = {
      id: Date.now(),
      title,
      description_text,
      requirements_status: "not_extracted",
      requirements_json: null,
      requirements_error: null,
      created_at: new Date().toISOString(),
      candidates: []
    };
    localJobs.unshift(newJob);
    return newJob;
  },

  // GET /jobs/{id}
  getJobDetail: async (jobId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/jobs/${jobId}`);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('API getJobDetail fallback:', err);
    }
    return localJobs.find(j => j.id === Number(jobId)) || localJobs[0];
  },

  // POST /jobs/{id}/extract-requirements
  extractJobRequirements: async (jobId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/jobs/${jobId}/extract-requirements`, {
        method: 'POST',
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('API extractJobRequirements fallback:', err);
    }

    // Fallback simulation
    const job = localJobs.find(j => j.id === Number(jobId));
    if (job) {
      job.requirements_status = "ok";
      job.requirements_json = {
        requirements: [
          { requirement_text: "4+ years software engineering experience", category: "experience", is_required: true },
          { requirement_text: "Proficiency in Python, FastAPI, SQLAlchemy", category: "skill", is_required: true },
          { requirement_text: "Proficiency in React 18+ and Tailwind CSS", category: "skill", is_required: true },
          { requirement_text: "Hands-on experience with LLMs, prompt engineering, LangChain", category: "skill", is_required: true },
          { requirement_text: "Experience with vector databases", category: "skill", is_required: false }
        ]
      };
      return job;
    }
    throw new Error('Job not found');
  },

  // POST /jobs/{jobId}/candidates (Resume Upload)
  uploadCandidateResume: async (jobId, file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE_URL}/jobs/${jobId}/candidates`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('API uploadCandidateResume fallback:', err);
    }

    const newCandidate = {
      id: Date.now(),
      job_id: Number(jobId),
      filename: file.name,
      extraction_status: "ok",
      raw_text: `Extracted content from ${file.name}: Experienced software developer with proficiency in JavaScript, React, Python, and SQL databases. Worked on scalable cloud solutions.`,
      profile_status: "not_extracted",
      profile_json: null,
      created_at: new Date().toISOString()
    };
    localCandidates[newCandidate.id] = newCandidate;

    const job = localJobs.find(j => j.id === Number(jobId));
    if (job) {
      job.candidates.push({
        id: newCandidate.id,
        filename: newCandidate.filename,
        extraction_status: "ok",
        created_at: newCandidate.created_at
      });
    }

    return newCandidate;
  },

  // GET /candidates/{id}
  getCandidateDetail: async (candidateId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/candidates/${candidateId}`);
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('API getCandidateDetail fallback:', err);
    }
    return localCandidates[candidateId] || MOCK_CANDIDATE_DATA[0];
  },

  // POST /candidates/{id}/extract-profile
  extractCandidateProfile: async (candidateId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/candidates/${candidateId}/extract-profile`, {
        method: 'POST',
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('API extractCandidateProfile fallback:', err);
    }

    const cand = localCandidates[candidateId] || MOCK_CANDIDATE_DATA[0];
    cand.profile_status = "ok";
    cand.profile_json = cand.profile_json || MOCK_CANDIDATE_DATA[0].profile_json;
    return cand;
  },

  // POST /candidates/{id}/match
  screenCandidate: async (candidateId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/candidates/${candidateId}/match`, {
        method: 'POST',
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('API screenCandidate fallback:', err);
    }

    const cand = localCandidates[candidateId] || MOCK_CANDIDATE_DATA[0];
    cand.screening_status = "ok";
    cand.screening_json = cand.screening_json || MOCK_CANDIDATE_DATA[0].screening_json;
    return cand;
  },

  // POST /candidates/{id}/interview-kit
  generateInterviewKit: async (candidateId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/candidates/${candidateId}/interview-kit`, {
        method: 'POST',
      });
      if (res.ok) return await res.json();
    } catch (err) {
      console.warn('API generateInterviewKit fallback:', err);
    }

    const cand = localCandidates[candidateId] || MOCK_CANDIDATE_DATA[0];
    cand.interview_kit_json = cand.interview_kit_json || MOCK_CANDIDATE_DATA[0].interview_kit_json;
    return cand;
  }
};
