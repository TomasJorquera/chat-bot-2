from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ... import models_v2 as m
from ...schemas_v2 import (
    SimulationSessionCreate, SimulationSessionOut,
    SimulationMessageCreate, SimulationMessageOut,
)
from .deps import get_db

router = APIRouter()


@router.post("", response_model=SimulationSessionOut)
def create_session(payload: SimulationSessionCreate, db: Session = Depends(get_db)):
    session = m.SimulationSession(**payload.model_dump())
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.get("", response_model=list[SimulationSessionOut])
def list_sessions(db: Session = Depends(get_db)):
    return db.query(m.SimulationSession).order_by(m.SimulationSession.started_at.desc()).all()


@router.get("/{session_id}", response_model=SimulationSessionOut)
def get_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(m.SimulationSession).filter(m.SimulationSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada.")
    return session


@router.post("/{session_id}/messages", response_model=SimulationMessageOut)
def add_message(session_id: str, payload: SimulationMessageCreate, db: Session = Depends(get_db)):
    session = db.query(m.SimulationSession).filter(m.SimulationSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Sesión no encontrada.")

    data = payload.model_dump(exclude={"session_id"})
    message = m.SimulationMessage(session_id=session_id, **data)
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


@router.get("/{session_id}/messages", response_model=list[SimulationMessageOut])
def list_messages(session_id: str, db: Session = Depends(get_db)):
    return (
        db.query(m.SimulationMessage)
        .filter(m.SimulationMessage.session_id == session_id)
        .order_by(m.SimulationMessage.created_at)
        .all()
    )
