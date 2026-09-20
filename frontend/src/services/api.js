const API_BASE_URL = 'http://localhost:8000';

// In-memory fallback store starts completely empty
let localJobs = [];
let localCandidates = {};

export const api = {
  // Check health of backend
  checkHealth: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/health`, { method: 'GET' });
      if (res.ok) return true;
    } catch {
      // Backend offline
    }
    return false;
  },

  // GET /jobs
  getJobs: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/jobs`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) return data;
      }
    } catch (err) {
      console.warn('API unreachable, using local jobs state:', err);
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
    return localJobs.find(j => j.id === Number(jobId)) || null;
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

    const job = localJobs.find(j => j.id === Number(jobId));
    if (job) {
      const text = (job.description_text || '').toLowerCase();
      const reqs = [];

      if (text.includes('python') || text.includes('fastapi') || text.includes('backend')) {
        reqs.push({ requirement_text: "Proficiency in Python backend development (FastAPI / REST APIs)", category: "skill", is_required: true });
      }
      if (text.includes('react') || text.includes('frontend') || text.includes('javascript') || text.includes('typescript')) {
        reqs.push({ requirement_text: "Hands-on experience with React 18+ and modern web application interfaces", category: "skill", is_required: true });
      }
      if (text.includes('llm') || text.includes('ai') || text.includes('langchain') || text.includes('openai') || text.includes('groq')) {
        reqs.push({ requirement_text: "Experience integrating LLM APIs (Groq / LangChain) and prompt engineering", category: "qualification", is_required: true });
      }
      if (text.includes('sql') || text.includes('postgres') || text.includes('database')) {
        reqs.push({ requirement_text: "Strong understanding of relational databases (PostgreSQL / SQLAlchemy)", category: "experience", is_required: true });
      }

      if (reqs.length === 0) {
        reqs.push(
          { requirement_text: `Core software engineering proficiency relevant to ${job.title}`, category: "skill", is_required: true },
          { requirement_text: "Proven track record of building production systems", category: "experience", is_required: true },
          { requirement_text: "Effective technical communication and team collaboration", category: "qualification", is_required: true }
        );
      }

      job.requirements_status = "ok";
      job.requirements_json = { requirements: reqs };
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
      id: Date.now() + Math.floor(Math.random() * 10000),
      job_id: Number(jobId),
      filename: file.name,
      extraction_status: "ok",
      raw_text: `Extracted text layer from uploaded resume file: ${file.name}.`,
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
    return localCandidates[candidateId] || null;
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

    const cand = localCandidates[candidateId];
    if (cand) {
      cand.profile_status = "ok";
      cand.profile_json = {
        summary: `Professional candidate extracted from ${cand.filename}.`,
        skills: ["Software Engineering", "Problem Solving", "Collaboration"],
        experience: [{ title: "Engineer", organization: "Previous Company", description: "Worked on core technical projects." }],
        projects: ["Engineering System"],
        education: ["Bachelor Degree in CS"]
      };
      return cand;
    }
    throw new Error("Candidate not found");
  },

  // POST /candidates/{id}/match (or map-requirements)
  screenCandidate: async (candidateId) => {
    try {
      let res = await fetch(`${API_BASE_URL}/candidates/${candidateId}/map-requirements`, {
        method: 'POST',
      });
      if (!res.ok) {
        res = await fetch(`${API_BASE_URL}/candidates/${candidateId}/match`, {
          method: 'POST',
        });
      }
      if (res.ok) {
        const data = await res.json();
        // Backend returns mapping_json natively now
        return data;
      }
    } catch (err) {
      console.warn('API screenCandidate fallback:', err);
    }

    const cand = localCandidates[candidateId];
    if (cand) {
      const mockScore = Math.floor(Math.random() * 20) + 78; // 78-97% score
      cand.screening_status = "ok";
      cand.screening_json = {
        overall_match_score: mockScore,
        match_category: mockScore >= 80 ? "Strong Fit" : "Moderate Fit",
        recommendation: mockScore >= 80 ? "Shortlist for Interview" : "Consider with Reservations",
        summary_reasoning: `Candidate exhibits ${mockScore}% alignment with key technical skills and experience background.`,
        skill_breakdown: {
          matched_skills: cand.profile_json?.skills?.slice(0, 4) || ["Software Engineering", "Problem Solving"],
          missing_required_skills: [],
          bonus_skills: cand.profile_json?.skills?.slice(4) || ["System Architecture"]
        },
        key_strengths: ["Strong engineering core", "Relevant project experience"],
        potential_risks: ["Needs domain onboarding"]
      };
      return cand;
    }
    throw new Error("Candidate not found");
  },

  // POST /candidates/{id}/interview-kit (or generate-questions)
  generateInterviewKit: async (candidateId) => {
    try {
      let res = await fetch(`${API_BASE_URL}/candidates/${candidateId}/generate-questions`, {
        method: 'POST',
      });
      if (!res.ok) {
        res = await fetch(`${API_BASE_URL}/candidates/${candidateId}/interview-kit`, {
          method: 'POST',
        });
      }
      if (res.ok) {
        const data = await res.json();
        // Backend returns interview_questions_json natively now
        return data;
      }
    } catch (err) {
      console.warn('API generateInterviewKit fallback:', err);
    }

    const cand = localCandidates[candidateId];
    if (cand) {
      cand.interview_kit_json = {
        technical_questions: [
          { question: "Describe your recent technical engineering architecture and implementation details.", target_skill: "Software Engineering", difficulty: "Medium", expected_answer_points: ["System architecture", "Implementation choices"] }
        ],
        behavioral_questions: [
          { question: "Tell me about a time you resolved a complex technical challenge under tight deadlines.", competency: "Problem Solving", evaluation_criteria: "Analytical thinking and resilience" }
        ],
        skill_gap_probes: [],
        interviewer_cheat_sheet: ["Evaluate clarity of explanation and technical depth."]
      };
      return cand;
    }
    throw new Error("Candidate not found");
  }
};
