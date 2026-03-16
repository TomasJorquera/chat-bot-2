from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from ..database import SessionLocal
from ..models import Alumno, Interaccion
from ..schemas import AlumnoCreate, AlumnoOut, InteraccionOut
from .deps import get_db, get_admin_token

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── POST /admin/alumnos/crear ─────────────────────────────────────────────────
@router.post("/alumnos/crear", response_model=AlumnoOut)
def crear_alumno(
    payload: AlumnoCreate,
    _: dict = Depends(get_admin_token),
    db: Session = Depends(get_db),
):
    modelos_validos = {"gemini-flash-lite", "gpt-nano", "deepseek-v3"}
    if payload.ia_asignada not in modelos_validos:
        raise HTTPException(status_code=400, detail=f"ia_asignada debe ser uno de: {modelos_validos}")

    grupos_validos = {"A", "B", "C"}
    if payload.grupo not in grupos_validos:
        raise HTTPException(status_code=400, detail="grupo debe ser A, B o C")

    if db.query(Alumno).filter(Alumno.correo == payload.correo).first():
        raise HTTPException(status_code=409, detail="Ya existe un alumno con ese correo.")

    alumno = Alumno(
        correo          = payload.correo,
        contrasena_hash = pwd_context.hash(payload.contrasena),
        ia_asignada     = payload.ia_asignada,
        grupo           = payload.grupo,
    )
    db.add(alumno)
    db.commit()
    db.refresh(alumno)
    return alumno


# ── GET /admin/alumnos ────────────────────────────────────────────────────────
@router.get("/alumnos", response_model=list[AlumnoOut])
def listar_alumnos(
    _: dict = Depends(get_admin_token),
    db: Session = Depends(get_db),
):
    return db.query(Alumno).order_by(Alumno.id).all()


# ── GET /admin/experimento/resultados ─────────────────────────────────────────
@router.get("/experimento/resultados", response_model=list[InteraccionOut])
def resultados_experimento(
    _: dict = Depends(get_admin_token),
    db: Session = Depends(get_db),
):
    """Dashboard de comparación: aquí sí se muestra ia_asignada."""
    return db.query(Interaccion).order_by(Interaccion.id).all()


# ── PATCH /admin/alumnos/{alumno_id}/toggle ───────────────────────────────────
@router.patch("/alumnos/{alumno_id}/toggle", response_model=AlumnoOut)
def toggle_alumno(
    alumno_id: int,
    _: dict = Depends(get_admin_token),
    db: Session = Depends(get_db),
):
    alumno = db.query(Alumno).filter(Alumno.id == alumno_id).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado.")
    alumno.activo = not alumno.activo
    db.commit()
    db.refresh(alumno)
    return alumno
