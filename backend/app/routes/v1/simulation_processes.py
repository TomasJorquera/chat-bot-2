from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from ... import models_v2 as m
from ...schemas_v2 import SimulationProcessCreate, SimulationProcessOut
from .deps import get_db

router = APIRouter()


@router.post("", response_model=SimulationProcessOut)
def create_process(payload: SimulationProcessCreate, db: Session = Depends(get_db)):
    process = m.SimulationProcess(**payload.model_dump())
    db.add(process)
    db.commit()
    db.refresh(process)
    return process


@router.get("", response_model=list[SimulationProcessOut])
def list_processes(db: Session = Depends(get_db)):
    return db.query(m.SimulationProcess).order_by(m.SimulationProcess.started_at.desc()).all()


@router.get("/{process_id}", response_model=SimulationProcessOut)
def get_process(process_id: str, db: Session = Depends(get_db)):
    process = db.query(m.SimulationProcess).filter(m.SimulationProcess.id == process_id).first()
    if not process:
        raise HTTPException(status_code=404, detail="Proceso no encontrado.")
    return process


class ProcessCloseRequest(BaseModel):
    resumen_evaluador: Optional[str] = None
    retroalimentacion_docente: Optional[str] = None
    observacion_docente: Optional[str] = None
    observacion_cliente: Optional[str] = None
    nota_final: Optional[float] = None


@router.patch("/{process_id}/finalizar", response_model=SimulationProcessOut)
def finalizar_process(process_id: str, db: Session = Depends(get_db)):
    """El estudiante terminó todas sus sesiones; queda pendiente de revisión docente."""
    process = db.query(m.SimulationProcess).filter(m.SimulationProcess.id == process_id).first()
    if not process:
        raise HTTPException(status_code=404, detail="Proceso no encontrado.")
    process.estado = "finalizado"
    process.finished_at = datetime.utcnow()
    db.commit()
    db.refresh(process)
    return process


@router.patch("/{process_id}/cerrar", response_model=SimulationProcessOut)
def cerrar_process(process_id: str, payload: ProcessCloseRequest, db: Session = Depends(get_db)):
    """Cierre definitivo: guarda evaluación final, feedback docente y nota."""
    process = db.query(m.SimulationProcess).filter(m.SimulationProcess.id == process_id).first()
    if not process:
        raise HTTPException(status_code=404, detail="Proceso no encontrado.")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(process, field, value)

    process.estado = "cerrado"
    process.closed_at = datetime.utcnow()
    db.commit()
    db.refresh(process)
    return process
