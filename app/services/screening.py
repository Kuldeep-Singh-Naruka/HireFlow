from __future__ import annotations

from typing import Literal, Optional
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from app.services.llm import get_llm_client


# ---------------------------------------------------------------------------
# Pydantic Schemas for Screening & Match Output
# ---------------------------------------------------------------------------

class SkillBreakdown(BaseModel):
    matched_skills: list[str] = Field(
        default_factory=list, description="Skills present in both candidate profile and JD requirements"
    )
    missing_required_skills: list[str] = Field(
        default_factory=list, description="Must-have required skills missing from candidate profile"
    )
    bonus_skills: list[str] = Field(
        default_factory=list, description="Candidate skills that add value beyond core JD requirements"
    )


class CandidateScreeningResult(BaseModel):
    overall_match_score: int = Field(
        ..., description="Match score integer between 0 and 100"
    )
    match_category: Literal["Strong Fit", "Moderate Fit", "Low Fit"] = Field(
        ..., description="Categorization of candidate fit"
    )
    recommendation: Literal["Shortlist for Interview", "Consider with Reservations", "Reject"] = Field(
        ..., description="Actionable recommendation for hiring manager"
    )
    summary_reasoning: str = Field(
        ..., description="2-3 sentence summary of why this score was assigned"
    )
    skill_breakdown: SkillBreakdown = Field(
        ..., description="Detailed breakdown of matching and missing skills"
    )
    experience_fit_analysis: str = Field(
        ..., description="Evaluation of candidate's prior work experience vs required experience"
    )
    key_strengths: list[str] = Field(
        default_factory=list, description="Top 3-4 candidate strengths for this role"
    )
    potential_risks: list[str] = Field(
        default_factory=list, description="Top 2-3 risks or skill gaps to investigate during interview"
    )


# ---------------------------------------------------------------------------
# Pydantic Schemas for Interview Intelligence Output
# ---------------------------------------------------------------------------

class TechnicalQuestion(BaseModel):
    question: str = Field(..., description="Technical interview question tailored to role and profile")
    target_skill: str = Field(..., description="The specific skill or technical concept being evaluated")
    difficulty: Literal["Easy", "Medium", "Hard"] = Field(..., description="Question difficulty rating")
    expected_answer_points: list[str] = Field(
        default_factory=list, description="Key points a strong answer should cover"
    )


class BehavioralQuestion(BaseModel):
    question: str = Field(..., description="Behavioral or STAR-method scenario question")
    competency: str = Field(..., description="Core competency (e.g., leadership, problem solving, teamwork)")
    evaluation_criteria: str = Field(..., description="What the interviewer should look out for in the candidate's response")


class SkillGapProbe(BaseModel):
    missing_skill: str = Field(..., description="The skill identified as missing or weak in candidate resume")
    probe_question: str = Field(..., description="Question to determine if candidate actually has unlisted experience in this skill")
    goal: str = Field(..., description="Objective of this question")


class InterviewKit(BaseModel):
    technical_questions: list[TechnicalQuestion] = Field(
        default_factory=list, description="List of 3-5 technical questions"
    )
    behavioral_questions: list[BehavioralQuestion] = Field(
        default_factory=list, description="List of 2-3 behavioral questions"
    )
    skill_gap_probes: list[SkillGapProbe] = Field(
        default_factory=list, description="Targeted probes for missing required skills"
    )
    interviewer_cheat_sheet: list[str] = Field(
        default_factory=list, description="Key advice for the interviewer during the session"
    )


# ---------------------------------------------------------------------------
# LLM Prompts
# ---------------------------------------------------------------------------

SCREENING_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are an expert AI Talent Acquisition & Resume Screening Agent. "
            "Your goal is to perform an objective, evidence-based match evaluation between a candidate profile "
            "and job requirements.\n\n"
            "STRICT RULES:\n"
            "1. Base your match score strictly on the provided Job Requirements and Candidate Profile.\n"
            "2. Score from 0 to 100 based on skill overlap, experience level, and qualifications.\n"
            "3. Identify missing required skills accurately.\n"
            "4. Provide constructive, hiring-manager focused feedback.",
        ),
        (
            "human",
            "Job Title: {job_title}\n"
            "Job Requirements JSON:\n{requirements_json}\n\n"
            "Candidate Profile JSON:\n{profile_json}\n",
        ),
    ]
)


INTERVIEW_KIT_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "You are an expert Interview Intelligence Agent. "
            "Generate a highly custom, rigorous interview guide for a candidate applying for a specific role.\n\n"
            "STRICT RULES:\n"
            "1. Tailor technical questions directly to the candidate's claimed experience and job requirements.\n"
            "2. Generate targeted probe questions for skills required by the job but missing/weak on the candidate's resume.\n"
            "3. Include clear evaluation points for each question to guide the interviewer.",
        ),
        (
            "human",
            "Job Title: {job_title}\n"
            "Job Requirements JSON:\n{requirements_json}\n\n"
            "Candidate Profile JSON:\n{profile_json}\n\n"
            "Screening Summary:\n{screening_summary}\n",
        ),
    ]
)


# ---------------------------------------------------------------------------
# Service Functions
# ---------------------------------------------------------------------------

def screen_candidate(
    job_title: str, requirements_json: dict, profile_json: dict
) -> CandidateScreeningResult:
    """Evaluate candidate profile against job requirements using LLM."""
    llm = get_llm_client()
    structured_llm = llm.with_structured_output(CandidateScreeningResult)
    chain = SCREENING_PROMPT | structured_llm

    result = chain.invoke(
        {
            "job_title": job_title,
            "requirements_json": str(requirements_json),
            "profile_json": str(profile_json),
        }
    )
    if not isinstance(result, CandidateScreeningResult):
        result = CandidateScreeningResult.model_validate(result)
    return result


def generate_interview_kit(
    job_title: str, requirements_json: dict, profile_json: dict, screening_summary: str = ""
) -> InterviewKit:
    """Generate structured interview question kit tailored to candidate profile."""
    llm = get_llm_client()
    structured_llm = llm.with_structured_output(InterviewKit)
    chain = INTERVIEW_KIT_PROMPT | structured_llm

    result = chain.invoke(
        {
            "job_title": job_title,
            "requirements_json": str(requirements_json),
            "profile_json": str(profile_json),
            "screening_summary": screening_summary,
        }
    )
    if not isinstance(result, InterviewKit):
        result = InterviewKit.model_validate(result)
    return result
