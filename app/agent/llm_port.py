"""LLM port: the agent depends on this Protocol, never on Groq directly."""
from __future__ import annotations

from typing import Protocol

from app.core.config import settings

_MISSING_KEY = (
    "GROQ_API_KEY is not set. Add GROQ_API_KEY to your .env file to enable AI steps."
)


class AgentLLM(Protocol):
    def extract_profile(self, raw_text: str) -> dict: ...

    def map_requirements(self, requirements: list[dict], raw_text: str, profile: dict) -> dict: ...

    def generate_questions(self, mapping: dict, requirements: list[dict]) -> dict: ...

    def merge_requirements(self, form: dict, jd_text: str) -> list[dict]: ...

    def review(self, payload: dict) -> dict: ...


def _require_key() -> None:
    if not settings.GROQ_API_KEY:
        raise RuntimeError(_MISSING_KEY)


class GroqAgentLLM:
    """AgentLLM backed by app/services/llm.py (Groq via LangChain)."""

    def extract_profile(self, raw_text: str) -> dict:
        _require_key()
        from app.services import llm

        return llm.extract_candidate_profile(raw_text).model_dump()

    def map_requirements(self, requirements: list[dict], raw_text: str, profile: dict) -> dict:
        _require_key()
        from app.services import llm

        return llm.map_requirements_to_evidence(requirements, raw_text, profile).model_dump()

    def generate_questions(self, mapping: dict, requirements: list[dict]) -> dict:
        _require_key()
        from app.services import llm

        return llm.generate_interview_questions(mapping, requirements).model_dump()

    def merge_requirements(self, form: dict, jd_text: str) -> list[dict]:
        _require_key()
        from app.services import llm

        return [r.model_dump() for r in llm.merge_requirements(form, jd_text).requirements]

    def review(self, payload: dict) -> dict:
        _require_key()
        from app.services import llm

        return llm.review_candidates(payload).model_dump()


_llm: AgentLLM = GroqAgentLLM()


def get_llm() -> AgentLLM:
    return _llm


def set_llm(llm: AgentLLM) -> None:
    global _llm
    _llm = llm
