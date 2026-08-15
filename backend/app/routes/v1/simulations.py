from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ... import models_v2 as m
from ...schemas_v2 import SimulationCreate, SimulationOut
from .deps import get_db

router = APIRouter()


@router.post("", response_model=SimulationOut)
def create_simulation(payload: SimulationCreate, db: Session = Depends(get_db)):
    data = payload.model_dump(exclude={"agent_profile_ids"})
    sim = m.Simulation(**data)
    db.add(sim)
    db.flush()  # obtiene sim.id sin cerrar la transacción

    for idx, agent_profile_id in enumerate(payload.agent_profile_ids):
        db.add(m.SimulationAgentProfile(
            simulation_id=sim.id,
            agent_profile_id=agent_profile_id,
            es_principal=(idx == 0),
        ))

    db.commit()
    db.refresh(sim)
    return sim


@router.get("", response_model=list[SimulationOut])
def list_simulations(db: Session = Depends(get_db)):
    return db.query(m.Simulation).order_by(m.Simulation.created_at.desc()).all()


@router.get("/{simulation_id}", response_model=SimulationOut)
def get_simulation(simulation_id: str, db: Session = Depends(get_db)):
    sim = db.query(m.Simulation).filter(m.Simulation.id == simulation_id).first()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulación no encontrada.")
    return sim
