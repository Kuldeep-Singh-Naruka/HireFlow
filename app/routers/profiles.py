from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.agent.llm_port import AgentLLM, get_llm
from app.agent.requirements import build_requirements
from app.database import get_db
from app.models.candidate import Candidate
from app.models.profile import REQ_ERROR, REQ_OK, HiringProfile
from app.models.run import RUN_DONE, Run
from app.schemas.profile_schema import (
    LatestReview,
    ProfileCreate,
    ProfileDetail,
    ProfileListItem,
    RequirementsUpdate,
    RunBrief,
)
from app.schemas.run_schema import summarize_candidate

router = APIRouter(prefix="/profiles", tags=["Profiles"])


def _get_or_404(db: Session, profile_id: int) -> HiringProfile:
    profile = db.get(HiringProfile, profile_id)
    if profile is None:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile



def _detail(db: Session, profile: HiringProfile) -> ProfileDetail:
    runs = db.scalars(
        select(Run).where(Run.profile_id == profile.id).order_by(Run.id.desc())
    ).all()
    candidates = db.scalars(
        select(Candidate).where(Candidate.profile_id == profile.id).order_by(Candidate.id)
    ).all()
    latest_done = next((r for r in runs if r.status == RUN_DONE), None)
    review = (
        LatestReview(
            run_id=latest_done.id,
            review_status=latest_done.review_status,
            review_error=latest_done.review_error,
            review_json=latest_done.review_json,
        )
        if latest_done
        else None
    )
    base = {
        f: getattr(profile, f)
        for f in ProfileDetail.model_fields
        if f not in ("runs", "candidates", "latest_review")
    }
    return ProfileDetail(
        **base,
        runs=[RunBrief.model_validate(r, from_attributes=True) for r in runs],
        candidates=[summarize_candidate(c) for c in candidates],
        latest_review=review,
    )


@router.post("", response_model=ProfileDetail, status_code=201)
def create_profile(
    body: ProfileCreate,
    db: Session = Depends(get_db),
    llm: AgentLLM = Depends(get_llm),
) -> ProfileDetail:
    profile = HiringProfile(**body.model_dump())
    reqs, status, error = build_requirements(body.model_dump(), body.jd_text, llm)
    profile.requirements_json = {"requirements": reqs}
    profile.requirements_status = REQ_OK if status == "ok" else REQ_ERROR
    profile.requirements_error = error
    db.add(profile)
    db.commit()
    return _detail(db, profile)


@router.get("", response_model=list[ProfileListItem])
def list_profiles(db: Session = Depends(get_db)) -> list[ProfileListItem]:
    counts = dict(
        db.execute(
            select(Candidate.profile_id, func.count(Candidate.id)).group_by(
                Candidate.profile_id
            )
        ).all()
    )
    out = []
    for p in db.scalars(select(HiringProfile).order_by(HiringProfile.id.desc())).all():
        latest = db.scalars(
            select(Run).where(Run.profile_id == p.id).order_by(Run.id.desc()).limit(1)
        ).first()
        out.append(
            ProfileListItem(
                id=p.id,
                title=p.title,
                seniority=p.seniority,
                candidate_count=counts.get(p.id, 0),
                latest_run_status=latest.status if latest else None,
                created_at=p.created_at,
            )
        )
    return out


@router.get("/{profile_id}", response_model=ProfileDetail)
def get_profile(profile_id: int, db: Session = Depends(get_db)) -> ProfileDetail:
    return _detail(db, _get_or_404(db, profile_id))


@router.put("/{profile_id}", response_model=ProfileDetail)
def update_profile(
    profile_id: int, body: ProfileCreate, db: Session = Depends(get_db)
) -> ProfileDetail:
    profile = _get_or_404(db, profile_id)
    for key, value in body.model_dump().items():
        setattr(profile, key, value)
    db.commit()
    return _detail(db, profile)


@router.put("/{profile_id}/requirements", response_model=ProfileDetail)
def replace_requirements(
    profile_id: int, body: RequirementsUpdate, db: Session = Depends(get_db)
) -> ProfileDetail:
    profile = _get_or_404(db, profile_id)
    profile.requirements_json = {"requirements": [r.model_dump() for r in body.requirements]}
    profile.requirements_status = REQ_OK
    profile.requirements_error = None
    db.commit()
    return _detail(db, profile)
