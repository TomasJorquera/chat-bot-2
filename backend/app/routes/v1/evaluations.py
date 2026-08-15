from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ... import models_v2 as m
from ...schemas_v2 import EvaluationCreate, EvaluationOut
from .deps import get_db

router = APIRouter()


@router.post("", response_model=EvaluationOut)
def create_evaluation(payload: EvaluationCreate, db: Session = Depends(get_db)):
    if payload.scope not in ("session", "process"):
        raise HTTPException(status_code=400, detail="scope debe ser 'session' o 'process'.")
    if payload.scope == "session" and not payload.session_id:
        raise HTTPException(status_code=400, detail="session_id es requerido cuando scope='session'.")
    if payload.scope == "process" and not payload.process_id:
        raise HTTPException(status_code=400, detail="process_id es requerido cuando scope='process'.")

    evaluation = m.Evaluation(**payload.model_dump())
    db.add(evaluation)
    db.commit()
    db.refresh(evaluation)
    return evaluation


@router.get("", response_model=list[EvaluationOut])
def list_evaluations(db: Session = Depends(get_db)):
    return db.query(m.Evaluation).order_by(m.Evaluation.created_at.desc()).all()


@router.get("/{evaluation_id}", response_model=EvaluationOut)
def get_evaluation(evaluation_id: str, db: Session = Depends(get_db)):
    evaluation = db.query(m.Evaluation).filter(m.Evaluation.id == evaluation_id).first()
    if not evaluation:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada.")
    return evaluation
