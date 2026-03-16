from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models import Alumno, Interaccion
from ..schemas import InteraccionCreate, MensajeRequest, FinalizarRequest
from ..prompts import PROMPTS
from ..utils.ai_router import call_ai
from ..utils.cost_tracker import calculate_cost
from .deps import get_db, get_current_alumno

router = APIRouter()


# ── POST /experimento/iniciar ─────────────────────────────────────────────────
@router.post("/iniciar")
def iniciar_interaccion(
    payload: InteraccionCreate,
    alumno: Alumno = Depends(get_current_alumno),
    db: Session = Depends(get_db),
):
    if payload.personaje not in PROMPTS:
        raise HTTPException(status_code=400, detail=f"Personaje '{payload.personaje}' no existe.")

    interaccion = Interaccion(
        alumno_id   = alumno.id,
        correo      = alumno.correo,
        ia_asignada = alumno.ia_asignada,
        personaje   = payload.personaje,
    )
    db.add(interaccion)
    db.commit()
    db.refresh(interaccion)

    return {
        "interaccion_id":       interaccion.id,
        "personajes_disponibles": list(k for k in PROMPTS if k != "Evaluator"),
    }


# ── POST /experimento/mensaje ─────────────────────────────────────────────────
@router.post("/mensaje")
async def enviar_mensaje(
    payload: MensajeRequest,
    alumno: Alumno = Depends(get_current_alumno),
    db: Session = Depends(get_db),
):
    interaccion = db.query(Interaccion).filter(
        Interaccion.id        == payload.interaccion_id,
        Interaccion.alumno_id == alumno.id,
        Interaccion.fin_datetime == None,  # noqa: E711
    ).first()

    if not interaccion:
        raise HTTPException(status_code=404, detail="Interacción no encontrada o ya finalizada.")

    prompt_base = PROMPTS.get(payload.personaje)
    if not prompt_base:
        raise HTTPException(status_code=400, detail=f"Personaje '{payload.personaje}' no existe.")

    # Llamada al modelo asignado al alumno (ciego: él no sabe cuál es)
    try:
        result = await call_ai(
            messages      = payload.history,
            user_message  = payload.mensaje,
            ia_asignada   = alumno.ia_asignada,
            system_prompt = prompt_base,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error del modelo de IA: {str(e)}")

    # Acumular tokens en la fila de interacción
    interaccion.tokens_input  += result["tokens_input"]
    interaccion.tokens_output += result["tokens_output"]
    interaccion.tokens_cache  += result["tokens_cache"]
    interaccion.costo_total_usd = calculate_cost(
        ia_asignada   = alumno.ia_asignada,
        tokens_input  = interaccion.tokens_input,
        tokens_output = interaccion.tokens_output,
        tokens_cache  = interaccion.tokens_cache,
    )
    db.commit()

    # Nunca exponer ia_asignada en la respuesta
    return {
        "respuesta":  result["content"],
        "personaje":  payload.personaje,
    }


# ── POST /experimento/finalizar ───────────────────────────────────────────────
@router.post("/finalizar")
def finalizar_interaccion(
    payload: FinalizarRequest,
    alumno: Alumno = Depends(get_current_alumno),
    db: Session = Depends(get_db),
):
    interaccion = db.query(Interaccion).filter(
        Interaccion.id        == payload.interaccion_id,
        Interaccion.alumno_id == alumno.id,
    ).first()

    if not interaccion:
        raise HTTPException(status_code=404, detail="Interacción no encontrada.")

    interaccion.fin_datetime      = datetime.utcnow()
    interaccion.puntaje_evaluador = payload.puntaje_evaluador
    interaccion.pdf_url           = payload.pdf_url
    db.commit()

    # Resumen sin revelar el modelo
    return {
        "interaccion_id":  interaccion.id,
        "personaje":       interaccion.personaje,
        "tokens_totales":  interaccion.tokens_input + interaccion.tokens_output,
        "puntaje":         interaccion.puntaje_evaluador,
        "duracion_min":    round(
            (interaccion.fin_datetime - interaccion.inicio_datetime).total_seconds() / 60, 1
        ),
    }
