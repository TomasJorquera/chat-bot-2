from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models import Alumno, Interaccion
from ..schemas import InteraccionCreate, MensajeRequest, FinalizarRequest
from ..utils.ai_router import call_ai
from ..utils.cost_tracker import calculate_cost, cost_summary
from ..utils.prompt_builder import get_system_prompt
from .deps import get_db, get_current_alumno

router = APIRouter()


# ── POST /experimento/iniciar ─────────────────────────────────────────────────
@router.post("/iniciar")
def iniciar_interaccion(
    payload: InteraccionCreate,
    alumno: Alumno = Depends(get_current_alumno),
    db: Session = Depends(get_db),
):
    try:
        get_system_prompt(payload.personaje)
    except ValueError:
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
        "interaccion_id":        interaccion.id,
        "personajes_disponibles": ["Teo", "Jojo"],
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

    try:
        prompt_base = get_system_prompt(payload.personaje)
    except ValueError:
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

    # Costo de este request
    request_cost = calculate_cost(
        ia_asignada   = alumno.ia_asignada,
        tokens_input  = result["tokens_input"],
        tokens_output = result["tokens_output"],
        tokens_cache  = result["tokens_cache"],
    )

    # Nunca exponer ia_asignada en la respuesta → experimento ciego
    return {
        "respuesta": result["content"],
        "personaje": payload.personaje,
        "cost": {
            "request_cost":         round(request_cost, 8),
            "conversation_total":   float(interaccion.costo_total_usd),
            "tokens_input":         result["tokens_input"],
            "tokens_output":        result["tokens_output"],
            "tokens_cache":         result["tokens_cache"],
        },
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
