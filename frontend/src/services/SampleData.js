export const SAMPLE_JOBS = [
  {
    title: "Senior AI & Full-Stack Engineer",
    description_text: `We are looking for a Senior AI & Full-Stack Engineer to lead the architecture of our next-generation AI candidate intelligence platform. 

Key Responsibilities:
- Design and build high-performance REST APIs with FastAPI, Python, and PostgreSQL.
- Create responsive, modern web interfaces using React, Tailwind CSS, and Vite.
- Integrate LLM workflows (Groq, OpenAI, LangChain) for structured data extraction and real-time candidate screening.
- Optimize database queries and setup async background tasks.

Requirements:
- 4+ years of professional software engineering experience.
- Strong proficiency in Python, FastAPI, and SQLAlchemy.
- Proficiency in modern JavaScript/TypeScript, React 18+, and Tailwind CSS.
- Hands-on experience with LLMs, prompt engineering, and structured outputs (LangChain / Pydantic).
- Solid understanding of Git, Docker, and CI/CD pipelines.

Nice-to-Have:
- Experience with vector databases (Pinecone, ChromaDB, Qdrant).
- Experience building AI agents or multi-agent orchestration systems.`
  },
  {
    title: "Lead Frontend Engineer (React & UI/UX)",
    description_text: `Join HireFlow as a Lead Frontend Engineer to build world-class hiring & candidate screening user interfaces.

Requirements:
- 5+ years of experience with React, JavaScript (ES6+), HTML5, CSS3.
- Mastery of CSS frameworks like Tailwind CSS, glassmorphic UI design, and micro-animations.
- Experience integrating REST APIs and handling async application state.
- Deep focus on performance optimization and responsive layout math.

Nice-to-Have:
- Familiarity with TypeScript and WebSockets for real-time interview collaboration.`
  }
];

export const MOCK_CANDIDATE_DATA = [
  {
    id: 101,
    job_id: 1,
    filename: "Alex_Rivera_Senior_AI_Engineer_Resume.pdf",
    extraction_status: "ok",
    raw_text: "Alex Rivera | Senior Full Stack & AI Engineer. 5+ years experience building python FastAPI backends and React frontends. Proficient in LangChain, Groq, PostgreSQL, Docker, Tailwind CSS. Led AI agent development at TechFlow.",
    profile_status: "ok",
    profile_json: {
      summary: "Senior Full Stack & AI Engineer with 5+ years of experience building high-throughput Python backends and modern React applications. Proven track record in integrating LLM pipelines with LangChain and FastAPI.",
      skills: ["Python", "FastAPI", "React", "Tailwind CSS", "LangChain", "Groq LLM", "PostgreSQL", "Docker", "Git", "SQLAlchemy"],
      experience: [
        {
          title: "Senior AI Solutions Engineer",
          organization: "TechFlow Labs",
          description: "Architected structured JSON extraction pipelines using LangChain & Groq API, reducing candidate screening latency by 65%. Built React dashboard with real-time scorecards."
        },
        {
          title: "Full-Stack Developer",
          organization: "Nexus Cloud",
          description: "Engineered scalable REST microservices in FastAPI with SQLAlchemy and Postgres. Implemented responsive frontend UI with React and Tailwind CSS."
        }
      ],
      projects: ["HireFlow AI Interview Copilot", "LangChain Document Extractor CLI"],
      education: ["B.S. in Computer Science — University of California, Berkeley"]
    },
    screening_status: "ok",
    screening_json: {
      overall_match_score: 94,
      match_category: "Strong Fit",
      recommendation: "Shortlist for Interview",
      summary_reasoning: "Alex possesses exceptional alignment with both the AI integration requirements (LangChain, Groq, prompt engineering) and the core Full-Stack technologies (FastAPI, React, Tailwind CSS, Postgres). 5 years experience exceeds the 4 year requirement.",
      skill_breakdown: {
        matched_skills: ["Python", "FastAPI", "React", "Tailwind CSS", "LangChain", "Groq LLM", "PostgreSQL", "Docker", "Git", "SQLAlchemy"],
        missing_required_skills: [],
        bonus_skills: ["CI/CD", "WebSockets"]
      },
      experience_fit_analysis: "Over 5 years of relevant full-stack and AI development experience directly matching the senior role demands.",
      key_strengths: [
        "Hands-on experience with LangChain & Groq structured outputs",
        "Dual proficiency in FastAPI backend and React frontend",
        "Demonstrated leadership in building AI screening tools"
      ],
      potential_risks: [
        "Limited explicit mention of vector databases, but strong overall AI foundation"
      ]
    },
    interview_kit_json: {
      technical_questions: [
        {
          question: "How do you handle schema validation and rate-limiting when calling Groq LLM structured outputs via LangChain in FastAPI?",
          target_skill: "FastAPI & LLM Integration",
          difficulty: "Hard",
          expected_answer_points: [
            "Use Pydantic models with `with_structured_output`",
            "Set explicit max_tokens and temperature parameters",
            "Handle fallback parsing exceptions gracefully without crashing the endpoint"
          ]
        },
        {
          question: "Can you explain how you structure SQLAlchemy async sessions with FastAPI lifespan handlers?",
          target_skill: "SQLAlchemy & Async Python",
          difficulty: "Medium",
          expected_answer_points: [
            "Use asynccontextmanager lifespan handler in FastAPI app factory",
            "Use SessionLocal / get_db dependency generator pattern",
            "Handle engine create_all checkfirst safely"
          ]
        }
      ],
      behavioral_questions: [
        {
          question: "Describe a situation where an LLM output hallucinated structured data in production and how you mitigated it.",
          competency: "Problem Solving & AI Safety",
          evaluation_criteria: "Look for strict schema validation, retry logic, and zero-shot grounded system prompts."
        }
      ],
      skill_gap_probes: [
        {
          missing_skill: "Vector Databases",
          probe_question: "Have you worked with vector embeddings or retrieval-augmented generation (RAG) using Chroma or Pinecone?",
          goal: "Evaluate readiness to implement semantic candidate search in future milestones."
        }
      ],
      interviewer_cheat_sheet: [
        "Focus on Alex's experience scaling FastAPI APIs.",
        "Verify candidate's familiarity with React 18 state management."
      ]
    }
  },
  {
    id: 102,
    job_id: 1,
    filename: "Jordan_Lee_Junior_Developer_Resume.pdf",
    extraction_status: "ok",
    raw_text: "Jordan Lee | Fullstack Developer. 1.5 years experience with HTML, CSS, JavaScript, React, and Python basics.",
    profile_status: "ok",
    profile_json: {
      summary: "Junior Fullstack developer with 1.5 years experience building landing pages and basic React applications.",
      skills: ["JavaScript", "React", "HTML5", "CSS3", "Python"],
      experience: [
        {
          title: "Junior Web Developer",
          organization: "Digital Crafts Agency",
          description: "Created client websites using HTML/CSS and basic React components."
        }
      ],
      projects: ["Personal Portfolio Website"],
      education: ["Coding Bootcamp Certificate — Tech Academy"]
    },
    screening_status: "ok",
    screening_json: {
      overall_match_score: 58,
      match_category: "Low Fit",
      recommendation: "Consider with Reservations",
      summary_reasoning: "Jordan lacks required senior level experience (1.5 years vs 4+ required) and has no documented hands-on experience with LLM frameworks like LangChain or Groq.",
      skill_breakdown: {
        matched_skills: ["JavaScript", "React", "Python"],
        missing_required_skills: ["FastAPI", "SQLAlchemy", "LangChain", "Groq LLM", "Tailwind CSS", "Docker"],
        bonus_skills: []
      },
      experience_fit_analysis: "Under-qualified for a Senior role; suitable for Junior/Associate level openings.",
      key_strengths: [
        "Familiar with React fundamentals",
        "Eager to learn backend technologies"
      ],
      potential_risks: [
        "Significant experience gap for senior architectural responsibilities",
        "No prior LLM or production backend exposure"
      ]
    },
    interview_kit_json: {
      technical_questions: [
        {
          question: "How do you manage component state in React when fetching data from an API?",
          target_skill: "React State Management",
          difficulty: "Easy",
          expected_answer_points: ["useState, useEffect", "handling loading and error states"]
        }
      ],
      behavioral_questions: [
        {
          question: "How do you approach learning complex new frameworks like FastAPI or LangChain?",
          competency: "Adaptability & Growth Mindset",
          evaluation_criteria: "Evaluates self-directed learning and motivation."
        }
      ],
      skill_gap_probes: [
        {
          missing_skill: "FastAPI",
          probe_question: "Have you built any Python backend APIs using Flask, Django, or FastAPI?",
          goal: "Gauge Python backend knowledge depth."
        }
      ],
      interviewer_cheat_sheet: [
        "Assess potential for junior position backfill if applicable."
      ]
    }
  }
];
