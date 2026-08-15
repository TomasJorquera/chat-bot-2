from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ... import models_v2 as m
from ...schemas_v2 import TeacherReviewCreate, TeacherReviewOut
from .deps import get_db

router = APIRouter()


@router.post("", response_model=TeacherReviewOut)
def create_teacher_review(payload: TeacherReviewCreate, db: Session = Depends(get_db)):
    review = m.TeacherReview(**payload.model_dump())
    db.add(review)
    db.commit()
    db.refresh(review)
    return review


@router.get("", response_model=list[TeacherReviewOut])
def list_teacher_reviews(db: Session = Depends(get_db)):
    return db.query(m.TeacherReview).order_by(m.TeacherReview.created_at.desc()).all()


@router.get("/{review_id}", response_model=TeacherReviewOut)
def get_teacher_review(review_id: str, db: Session = Depends(get_db)):
    review = db.query(m.TeacherReview).filter(m.TeacherReview.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Revisión no encontrada.")
    return review
