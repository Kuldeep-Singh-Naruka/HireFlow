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
        max_tokens=1500,
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
