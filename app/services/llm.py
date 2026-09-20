from __future__ import annotations

from typing import Literal, Optional

from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from pydantic import BaseModel, Field

from app.core.config import settings


# ---------------------------------------------------------------------------
# Pydantic Schemas for Structured Output
# ---------------------------------------------------------------------------

class RequirementItem(BaseModel):
    requirement_text: str = Field(
        ..., description="The requirement, close to the JD's own wording"
    )
    category: Literal["skill", "experience", "qualification", "other"] = Field(
        ..., description="Category of the requirement"
    )
    is_required: bool = Field(
        ..., description="True if must-have, False if nice-to-have/preferred"
    )


class JobRequirementsExtraction(BaseModel):
    requirements: list[RequirementItem] = Field(
        default_factory=list, description="List of extracted job requirements"
    )


class ExperienceEntry(BaseModel):
    title: str = Field(..., description="Job title or role name")
    organization: Optional[str] = Field(
        default=None, description="Company or organization name if mentioned"
    )
    description: str = Field(
        ..., description="Summary of work performed, close to resume wording"
    )


class CandidateProfileExtraction(BaseModel):
    summary: str = Field(
        ..., description="2-3 sentence professional overview of the candidate"
    )
    skills: list[str] = Field(
        default_factory=list, description="List of explicit skills mentioned"
    )
    experience: list[ExperienceEntry] = Field(
        default_factory=list, description="List of work experience entries"
    )
    projects: list[str] = Field(
        default_factory=list, description="Key projects mentioned"
    )
    education: list[str] = Field(
        default_factory=list, description="Education, degrees, or certifications"
    )


# ---------------------------------------------------------------------------
# LLM Client Factory
# ---------------------------------------------------------------------------

def get_llm_client() -> ChatGroq:
    """Return a configured ChatGroq client.

    Uses temperature=0 for deterministic extraction and sets max_tokens=1500
    explicitly to prevent OTPM rate limit issues.
    """
    if not settings.GROQ_API_KEY:
        raise ValueError(
            "GROQ_API_KEY is not set. Please add GROQ_API_KEY to your .env file."
        )

    return ChatGroq(
        model_name=settings.GROQ_MODEL,
        groq_api_key=settings.GROQ_API_KEY,
        temperature=0.0,
        max_tokens=1000,
        max_retries=5,
    )


# ---------------------------------------------------------------------------
# Extraction Functions
# ---------------------------------------------------------------------------

JOB_REQUIREMENTS_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are an expert HR data extractor. Your task is to extract structured job requirements "
            "from the provided Job Description text.\n\n"
            "STRICT RULES:\n"
            "1. Extract ONLY requirements actually stated or clearly implied in the text.\n"
            "2. DO NOT invent or assume requirements that are not in the text.\n"
            "3. Categorize each requirement accurately into 'skill', 'experience', 'qualification', or 'other'.\n"
            "4. Set is_required to True for must-have/required items, and False for nice-to-have/preferred/plus items.",
        ),
        (
            "human",
            "Job Description:\n---\n{description_text}\n---",
        ),
    ]
)


CANDIDATE_PROFILE_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are an expert resume parser. Your task is to extract a structured profile "
            "from the provided raw resume text.\n\n"
            "STRICT RULES:\n"
            "1. Stay strictly grounded in what is written in the resume text.\n"
            "2. DO NOT infer skills, projects, or work experience that are not stated or clearly demonstrated.\n"
            "3. Provide a concise 2-3 sentence summary capturing the candidate's core background.\n"
            "4. Extract clean, individual skill names into the skills array.",
        ),
        (
            "human",
            "Resume Text:\n---\n{raw_text}\n---",
        ),
    ]
)


def extract_job_requirements(description_text: str) -> JobRequirementsExtraction:
    """Call ChatGroq with structured output to extract job requirements.

    Raises an exception on failure (network, API, validation). The caller
    is responsible for catching exceptions and setting error status.
    """
    llm = get_llm_client()
    structured_llm = llm.with_structured_output(JobRequirementsExtraction)
    chain = JOB_REQUIREMENTS_PROMPT | structured_llm
    result = chain.invoke({"description_text": description_text})
    if not isinstance(result, JobRequirementsExtraction):
        # Fallback if with_structured_output returned dict or invalid type
        result = JobRequirementsExtraction.model_validate(result)
    return result


def extract_candidate_profile(raw_text: str) -> CandidateProfileExtraction:
    """Call ChatGroq with structured output to extract candidate profile.

    Raises an exception on failure (network, API, validation). The caller
    is responsible for catching exceptions and setting error status.
    """
    llm = get_llm_client()
    structured_llm = llm.with_structured_output(CandidateProfileExtraction)
    chain = CANDIDATE_PROFILE_PROMPT | structured_llm
    result = chain.invoke({"raw_text": raw_text})
    if not isinstance(result, CandidateProfileExtraction):
        result = CandidateProfileExtraction.model_validate(result)
    return result


# ---------------------------------------------------------------------------
# Milestone 3 — Requirement Mapping Schemas
# ---------------------------------------------------------------------------

class RequirementMapping(BaseModel):
    """Verdict for a single job requirement mapped against a candidate's resume."""

    requirement_text: str = Field(
        ..., description="The requirement text, copied verbatim from the job's requirement list"
    )
    status: Literal["met", "partial", "gap"] = Field(
        ...,
        description=(
            "met — clear, unambiguous evidence the candidate satisfies this requirement; "
            "partial — suggestive evidence exists but it is incomplete or not explicit; "
            "gap — no relevant evidence found in the resume text"
        ),
    )
    evidence_snippet: Optional[str] = Field(
        default=None,
        description=(
            "A short phrase or sentence copied CLOSELY from the candidate's raw resume text "
            "that directly supports this verdict. Must be traceable to the actual resume text. "
            "Leave null ONLY when status is 'gap' and there is genuinely nothing relevant."
        ),
    )
    needs_validation: bool = Field(
        ...,
        description=(
            "True when the evidence is implicit, ambiguous, paraphrased, or requires a human "
            "to confirm. False ONLY when the evidence is explicit and unambiguous in the resume text. "
            "Default to True whenever there is any doubt — a conservative flag costs seconds; "
            "an overconfident 'met' verdict costs recruiter trust."
        ),
    )
    validation_note: Optional[str] = Field(
        default=None,
        description=(
            "A one-sentence explanation of WHY human validation is needed. "
            "Populated only when needs_validation is True; null otherwise."
        ),
    )


class MappingResult(BaseModel):
    """Container for all per-requirement mappings for one candidate."""

    mappings: list[RequirementMapping] = Field(
        ...,
        description="One RequirementMapping per job requirement, in the same order as the input list",
    )


# ---------------------------------------------------------------------------
# Milestone 3 — Mapping Prompt
# ---------------------------------------------------------------------------

REQUIREMENT_MAPPING_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are an expert technical recruiter evaluating a candidate's resume against "
            "a list of job requirements.\n\n"
            "You will be given:\n"
            "  1. A structured candidate profile (quick overview — for context only).\n"
            "  2. The candidate's full raw resume text (the GROUND TRUTH — all evidence "
            "must be traceable here).\n"
            "  3. A numbered list of job requirements.\n\n"
            "YOUR TASK: Produce exactly ONE RequirementMapping for EVERY requirement, "
            "in the SAME ORDER as the input list. Missing or reordering any requirement "
            "is a critical failure.\n\n"
            "STRICT EVIDENCE RULES:\n"
            "1. evidence_snippet MUST be a short phrase or sentence that appears in "
            "(or very closely paraphrases a specific line of) the raw resume text. "
            "NEVER fabricate, infer, or synthesise an evidence_snippet from the profile "
            "summary — quote the raw text directly.\n"
            "2. For status='gap', set evidence_snippet to null — do not invent placeholder text.\n"
            "3. For status='met' or 'partial', evidence_snippet is REQUIRED. "
            "A met/partial verdict with no evidence_snippet is invalid output.\n\n"
            "VERDICT CALIBRATION:\n"
            "- Use 'met' only when the resume text explicitly and unambiguously satisfies "
            "the requirement (e.g. 'PostgreSQL' is mentioned and the requirement is "
            "'experience with PostgreSQL').\n"
            "- Use 'partial' when the resume is suggestive but not fully explicit "
            "(e.g. resume says 'relational databases' but requirement is 'PostgreSQL'). "
            "Prefer 'partial' over forcing a binary met/gap when evidence is mixed.\n"
            "- Use 'gap' only when there is genuinely no relevant evidence in the resume text.\n\n"
            "VALIDATION FLAG RULES:\n"
            "- Set needs_validation=True whenever: evidence is implicit, paraphrased, "
            "requires counting (years of experience), involves a version/level match, "
            "or you have ANY doubt. A false positive flag costs a recruiter seconds; "
            "a false negative ('met' when it shouldn't be) costs them trust in the tool.\n"
            "- Set needs_validation=False ONLY when evidence is direct, verbatim, and "
            "leaves zero ambiguity (e.g. requirement='Python', resume says 'Python').\n"
            "- Populate validation_note with one sentence explaining why, only when "
            "needs_validation=True.",
        ),
        (
            "human",
            "CANDIDATE PROFILE (context only — do not quote this as evidence):\n"
            "---\n{profile_json}\n---\n\n"
            "CANDIDATE RAW RESUME TEXT (ground truth — quote evidence from here):\n"
            "---\n{raw_text}\n---\n\n"
            "JOB REQUIREMENTS (produce one mapping per item, same order):\n"
            "---\n{requirements_text}\n---",
        ),
    ]
)


# ---------------------------------------------------------------------------
# Milestone 3 — Mapping Function
# ---------------------------------------------------------------------------

def map_requirements_to_evidence(
    requirements: list[dict],
    raw_text: str,
    profile: dict,
) -> MappingResult:
    """Call the LLM with structured output against MappingResult.

    Passes the LLM both `profile` (the Milestone 2 structured summary,
    for a quick overview) AND the full `raw_text` (the ground truth to
    quote evidence from). evidence_snippet must be traceable to raw_text,
    not invented from the profile summary alone.

    Args:
        requirements: List of requirement dicts from job.requirements_json["requirements"].
                      Each dict has at minimum "requirement_text", "category", "is_required".
        raw_text:     The candidate's full extracted resume text (ground truth).
        profile:      The candidate's profile_json dict (Milestone 2 output — context only).

    Returns:
        MappingResult with one RequirementMapping per requirement, in order.

    Raises:
        ValueError: If the returned mapping count doesn't match len(requirements).
        Any LLM / network / validation exception is propagated to the caller,
        which converts it to mapping_status="error". This function never swallows errors.
    """
    import json as _json

    # Format requirements as a numbered list so the model can easily stay in order
    req_lines = [
        f"{i + 1}. [{r.get('category', 'other').upper()}] "
        f"{'(REQUIRED) ' if r.get('is_required', True) else '(PREFERRED) '}"
        f"{r['requirement_text']}"
        for i, r in enumerate(requirements)
    ]
    requirements_text = "\n".join(req_lines)

    llm = get_llm_client()
    # Bump max_tokens for mapping — each requirement can produce a verbose snippet
    llm_mapping = ChatGroq(
        model_name=settings.GROQ_MODEL,
        groq_api_key=settings.GROQ_API_KEY,
        temperature=0.0,
        max_tokens=4000,
    )
    structured_llm = llm_mapping.with_structured_output(MappingResult)
    chain = REQUIREMENT_MAPPING_PROMPT | structured_llm

    result = chain.invoke(
        {
            "profile_json": _json.dumps(profile, indent=2),
            "raw_text": raw_text,
            "requirements_text": requirements_text,
        }
    )

    if not isinstance(result, MappingResult):
        result = MappingResult.model_validate(result)

    # Validate count — a mismatch means requirements were silently dropped
    if len(result.mappings) != len(requirements):
        raise ValueError(
            f"LLM returned {len(result.mappings)} mappings for {len(requirements)} requirements. "
            "Count mismatch — treating as a validation failure."
        )

    return result


# ---------------------------------------------------------------------------
# Milestone 4 — Interview Question Schemas
# ---------------------------------------------------------------------------

class InterviewQuestion(BaseModel):
    """A single interview question tied to one job requirement."""

    question_text: str = Field(
        ...,
        description=(
            "A natural, conversational question a human interviewer would ask out loud. "
            "Must reference specific details from the evidence or the requirement — "
            "not a generic restatement of the requirement as a question."
        ),
    )
    target_requirement: str = Field(
        ...,
        description=(
            "The requirement_text this question probes, copied EXACTLY from the "
            "input requirements list. Must match verbatim so the UI can group by requirement."
        ),
    )
    question_type: Literal["validation", "probe", "general"] = Field(
        ...,
        description=(
            "validation — targets a 'gap' or a needs_validation=True mapping; "
            "highest priority, confirm or rule out unverified claims. "
            "probe — targets a 'partial' match to dig for stronger evidence. "
            "general — targets a confirmed 'met' match; asks candidate to demonstrate "
            "depth or elaborate beyond what the resume states."
        ),
    )


class InterviewQuestionSet(BaseModel):
    """The full set of interview questions generated for one candidate."""

    questions: list[InterviewQuestion] = Field(
        ...,
        description="5-8 interview questions, ordered by priority (validation first, then probe, then general)",
    )


# ---------------------------------------------------------------------------
# Milestone 4 — Question Generation Prompt
# ---------------------------------------------------------------------------

INTERVIEW_QUESTION_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are an expert technical interviewer preparing questions for a structured "
            "candidate interview. You will be given:\n"
            "  1. A list of job requirements with categories and priority flags.\n"
            "  2. A requirement mapping — the LLM's per-requirement verdict "
            "(met/partial/gap) with evidence snippets quoted from the candidate's resume "
            "and validation flags.\n\n"
            "YOUR TASK: Generate 5-8 interview questions total. Follow these priority rules:\n\n"
            "PRIORITY ORDER (strict):\n"
            "1. VALIDATION questions (highest priority) — write one for EVERY requirement "
            "that has status='gap' OR needs_validation=True. Do NOT skip any. These expose "
            "the biggest unknowns and are the most valuable questions in the interview.\n"
            "2. PROBE questions — write questions for 'partial' matches where you need "
            "the candidate to fill in missing detail. Reference the specific evidence "
            "snippet to make the question feel informed, not generic.\n"
            "3. GENERAL questions (at most 2-3) — for strong 'met' matches, ask the "
            "candidate to go beyond what's on the resume: a specific challenge, a tradeoff "
            "decision, or a depth-demonstrating scenario.\n\n"
            "QUESTION QUALITY RULES:\n"
            "- Write questions a human interviewer would actually ask out loud — natural, "
            "conversational phrasing. NOT 'Do you have experience with X?' but rather "
            "'Walk me through a time you had to...', 'How did you handle...', "
            "'What was your approach when...', etc.\n"
            "- Each question MUST reference something specific — either a detail from the "
            "evidence_snippet, the exact requirement, or an explicit gap. Generic questions "
            "that could apply to any candidate are unacceptable.\n"
            "- target_requirement MUST be set to the exact string shown after "
            "'COPY THIS into target_requirement:' in the requirements list — "
            "copy the quoted value only, with NO [CATEGORY], [REQUIRED], or numbering prefix. "
            "If target_requirement does not exactly match one of those quoted strings, it is wrong.\n"
            "- Total questions: minimum 5, maximum 8. Do not exceed 8 even if there are "
            "many gaps — pick the highest-value ones.\n\n"
            "ORDER: Return validation questions first, then probe, then general.",
        ),
        (
            "human",
            "JOB REQUIREMENTS:\n"
            "---\n{requirements_text}\n---\n\n"
            "REQUIREMENT MAPPING (evidence grounded in resume):\n"
            "---\n{mapping_text}\n---\n\n"
            "Generate 5-8 interview questions following the priority rules above.",
        ),
    ]
)


# ---------------------------------------------------------------------------
# Milestone 4 — Question Generation Function
# ---------------------------------------------------------------------------

def generate_interview_questions(
    mapping_result: dict,
    requirements: list[dict],
) -> InterviewQuestionSet:
    """Call the LLM with structured output against InterviewQuestionSet.

    Prioritises gaps and needs_validation=True mappings (validation questions),
    then partial matches (probe questions), then met matches (general questions).
    Produces 5-8 questions total — not one per requirement.

    Args:
        mapping_result: The candidate's mapping_json dict (MappingResult structure).
                        Must have a "mappings" key with a list of RequirementMapping dicts.
        requirements:   The job's requirements list from requirements_json["requirements"].
                        Each dict has "requirement_text", "category", "is_required".

    Returns:
        InterviewQuestionSet with 5-8 questions ordered by priority.

    Raises:
        ValueError: If the question count is outside [5, 8].
        Any LLM / network / validation exception is propagated to the caller.
        This function never swallows errors.
    """
    import json as _json

    # Format requirements so the LLM can see both the context labels AND the
    # exact string it must copy verbatim into target_requirement.
    # The "COPY THIS:" label makes it unambiguous which string to use.
    req_lines = []
    for i, r in enumerate(requirements):
        category = r.get("category", "other").upper()
        priority = "REQUIRED" if r.get("is_required", True) else "PREFERRED"
        req_text = r["requirement_text"]
        req_lines.append(
            f"{i + 1}. [{category}] [{priority}]\n"
            f"   COPY THIS into target_requirement: \"{req_text}\""
        )
    requirements_text = "\n".join(req_lines)

    # Format mapping result as a readable block, highlighting key signals
    mappings = mapping_result.get("mappings", [])
    mapping_lines: list[str] = []
    for m in mappings:
        status = m.get("status", "?")
        needs_val = m.get("needs_validation", False)
        snippet = m.get("evidence_snippet") or "(no evidence found)"
        val_note = m.get("validation_note") or ""
        flags = []
        if status == "gap":
            flags.append("⚠ GAP — no resume evidence")
        if needs_val:
            flags.append("⚠ NEEDS VALIDATION")
        flag_str = "  " + " | ".join(flags) if flags else ""

        mapping_lines.append(
            f"Requirement : {m.get('requirement_text', '')}\n"
            f"Status      : {status.upper()}{flag_str}\n"
            f"Evidence    : {snippet}\n"
            + (f"Val. note   : {val_note}\n" if val_note else "")
            + "---"
        )
    mapping_text = "\n".join(mapping_lines)

    llm_iq = ChatGroq(
        model_name=settings.GROQ_MODEL,
        groq_api_key=settings.GROQ_API_KEY,
        temperature=0.3,   # slight creativity for natural question phrasing
        max_tokens=3000,
    )
    structured_llm = llm_iq.with_structured_output(InterviewQuestionSet)
    chain = INTERVIEW_QUESTION_PROMPT | structured_llm

    result = chain.invoke(
        {
            "requirements_text": requirements_text,
            "mapping_text": mapping_text,
        }
    )

    if not isinstance(result, InterviewQuestionSet):
        result = InterviewQuestionSet.model_validate(result)

    # Validate count — too few or too many is a prompt failure
    count = len(result.questions)
    if not (5 <= count <= 8):
        raise ValueError(
            f"LLM returned {count} questions; expected between 5 and 8. "
            "Treating as a generation failure."
        )

    return result
