from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, field_validator

from app.schemas.run_schema import CandidateSummary
from app.services.llm import RequirementItem

Seniority = Literal["junior", "mid", "senior", "lead", "principal"]


class ProfileCreate(BaseModel):
    title: str = Field(..., max_length=255)
    seniority: Optional[Seniority] = None
    min_years: Optional[int] = Field(default=None, ge=0)
    must_have: list[str] = Field(default_factory=list)
    nice_to_have: list[str] = Field(default_factory=list)
    location: Optional[str] = Field(default=None, max_length=255)
    notes: Optional[str] = None
    jd_text: Optional[str] = None

    @field_validator("title")
    @classmethod
    def _title_not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("title must not be blank")
        return v

    @field_validator("must_have", "nice_to_have")
    @classmethod
    def _clean(cls, v: list[str]) -> list[str]:
        return [x.strip() for x in v if x and x.strip()]


class RequirementsUpdate(BaseModel):
    requirements: list[RequirementItem] = Field(..., min_length=1)

    @field_validator("requirements")
    @classmethod
    def _text_not_blank(cls, v: list[RequirementItem]) -> list[RequirementItem]:
        for item in v:
            item.requirement_text = item.requirement_text.strip()
            if not item.requirement_text:
                raise ValueError("requirement_text must not be blank")
        return v


class ProfileListItem(BaseModel):
    id: int
    title: str
    seniority: Optional[str] = None
    candidate_count: int
    latest_run_status: Optional[str] = None
    created_at: datetime


class RunBrief(BaseModel):
    id: int
    status: str
    created_at: datetime
    finished_at: Optional[datetime] = None


class LatestReview(BaseModel):
    run_id: int
    review_status: str
    review_error: Optional[str] = None
    review_json: Optional[dict[str, Any]] = None


class ProfileDetail(BaseModel):
    id: int
    title: str
    seniority: Optional[str] = None
    min_years: Optional[int] = None
    must_have: list[str]
    nice_to_have: list[str]
    location: Optional[str] = None
    notes: Optional[str] = None
    jd_text: Optional[str] = None
    requirements_json: dict[str, Any]
    requirements_status: str
    requirements_error: Optional[str] = None
    created_at: datetime
    runs: list[RunBrief] = []
    candidates: list[CandidateSummary] = []
    latest_review: Optional[LatestReview] = None
