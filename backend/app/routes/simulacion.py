import json
import os
import shutil
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from ..database import SessionLocal
from ..models import Alumno, Simulacion, Entrega, MensajeEntrega
from ..schemas import SimulacionCreate, IniciarEntregaRequest, FinalizarEntregaRequest
from ..utils.ai_engine import generate_gemini_response, chat_gemini_message, chat_deepseek_message
from ..utils.cost_tracker import calculate_cost
from ..prompts import PROMPTS
from .deps import get_db

router = APIRouter()

UPLOAD_DIR = "uploads/planificaciones"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── POST /simulacion/crear ────────────────────────────────────────────────────
@router.post("/crear")
def crear_simulacion(payload: SimulacionCreate, db: Session = Depends(get_db)):
    docente = db.query(Alumno).filter(Alumno.correo == payload.correo_docente).first()
    if not docente:
        raise HTTPException(status_code=404, detail="Docente no encontrado.")

    sim = Simulacion(
        creado_por       = docente.id,
        ramo_codigo      = payload.ramo_codigo,
        nombre           = payload.nombre,
        instrucciones    = payload.instrucciones,
        objetivos        = payload.objetivos,
        agente           = payload.agente,
        num_interacciones= payload.num_interacciones,
        fecha_inicio     = payload.fecha_inicio,
        fecha_termino    = payload.fecha_termino,
        pauta_tipo       = payload.pauta_tipo,
        pauta_criterios  = payload.pauta_criterios,
    )
    db.add(sim)
    db.commit()
    db.refresh(sim)
    return {"simulacion_id": sim.id, "nombre": sim.nombre}


# ── GET /simulacion/ramo/{codigo} ─────────────────────────────────────────────
@router.get("/ramo/{codigo}")
def listar_simulaciones_ramo(codigo: str, db: Session = Depends(get_db)):
    # es_prueba excluye la "Sesión de prueba" interna (chat-prueba de
    # docente/admin) — no es una simulación real asignada a alumnos.
    sims = db.query(Simulacion).filter(
        Simulacion.ramo_codigo == codigo,
        Simulacion.activo == True,
        Simulacion.es_prueba.is_(False),
    ).all()
    return [
        {
            "id": s.id,
            "nombre": s.nombre,
            "agente": s.agente,
            "num_interacciones": s.num_interacciones,
            "fecha_inicio": str(s.fecha_inicio),
            "fecha_termino": str(s.fecha_termino),
            "pauta_tipo": s.pauta_tipo,
        }
        for s in sims
    ]


# ── GET /simulacion/{id} ──────────────────────────────────────────────────────
@router.get("/{sim_id}")
def obtener_simulacion(sim_id: int, db: Session = Depends(get_db)):
    sim = db.query(Simulacion).filter(Simulacion.id == sim_id).first()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulación no encontrada.")
    return {
        "id": sim.id,
        "nombre": sim.nombre,
        "instrucciones": sim.instrucciones,
        "objetivos": sim.objetivos,
        "agente": sim.agente,
        "num_interacciones": sim.num_interacciones,
        "fecha_inicio": str(sim.fecha_inicio),
        "fecha_termino": str(sim.fecha_termino),
        "pauta_tipo": sim.pauta_tipo,
        "pauta_criterios": sim.pauta_criterios,
    }


# ── POST /simulacion/{id}/entrega ─────────────────────────────────────────────
# El alumno inicia una nueva entrega (interacción N)
@router.post("/{sim_id}/entrega")
def iniciar_entrega(sim_id: int, payload: IniciarEntregaRequest, db: Session = Depends(get_db)):
    sim = db.query(Simulacion).filter(Simulacion.id == sim_id).first()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulación no encontrada.")

    alumno = db.query(Alumno).filter(Alumno.correo == payload.correo_alumno).first()
    if not alumno:
        raise HTTPException(status_code=404, detail="Alumno no encontrado.")

    # Contar entregas ya realizadas por este alumno en esta simulación
    num_existing = db.query(Entrega).filter(
        Entrega.simulacion_id == sim_id,
        Entrega.alumno_id     == alumno.id,
    ).count()

    if num_existing >= sim.num_interacciones:
        raise HTTPException(status_code=400, detail="Ya completaste todas las interacciones de esta simulación.")

    entrega = Entrega(
        simulacion_id   = sim_id,
        alumno_id       = alumno.id,
        num_interaccion = num_existing + 1,
        agente_usado    = payload.agente_usado,
        estado          = "en_progreso",
    )
    db.add(entrega)
    db.commit()
    db.refresh(entrega)
    return {"entrega_id": entrega.id, "num_interaccion": entrega.num_interaccion}


# ── POST /entrega/{id}/planificacion ──────────────────────────────────────────
# Recibe texto libre + archivo opcional (Word/PDF)
@router.post("/entrega/{entrega_id}/planificacion")
async def guardar_planificacion(
    entrega_id: int,
    texto: Optional[str] = Form(None),
    archivo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    entrega = db.query(Entrega).filter(Entrega.id == entrega_id).first()
    if not entrega:
        raise HTTPException(status_code=404, detail="Entrega no encontrada.")

    entrega.planificacion = texto or ""

    if archivo and archivo.filename:
        ext = os.path.splitext(archivo.filename)[1].lower()
        if ext not in (".pdf", ".doc", ".docx"):
            raise HTTPException(status_code=400, detail="Solo se aceptan archivos .pdf, .doc o .docx")
        unique_name = f"{entrega_id}_{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(UPLOAD_DIR, unique_name)
        with open(file_path, "wb") as f:
            shutil.copyfileobj(archivo.file, f)
        entrega.planificacion_archivo_url = f"/uploads/planificaciones/{unique_name}"

    db.commit()
    return {
        "entrega_id": entrega_id,
        "planificacion_guardada": True,
        "archivo_url": entrega.planificacion_archivo_url,
    }


# ── POST /entrega/{id}/mensaje ────────────────────────────────────────────────
@router.post("/entrega/{entrega_id}/mensaje")
async def enviar_mensaje_entrega(
    entrega_id: int,
    payload: dict,
    db: Session = Depends(get_db),
):
    entrega = db.query(Entrega).filter(Entrega.id == entrega_id).first()
    if not entrega:
        raise HTTPException(status_code=404, detail="Entrega no encontrada.")

    personaje    = payload.get("personaje", entrega.agente_usado)
    mensaje      = payload.get("mensaje", "")
    history      = payload.get("history", [])
    image_base64 = payload.get("image_base64", None)
    image_mime   = payload.get("image_mime", None)

    if personaje not in PROMPTS:
        raise HTTPException(status_code=400, detail=f"Personaje '{personaje}' no existe.")

    # Guardar mensaje del alumno (indicar si tiene imagen adjunta) — sin costo IA propio
    content_user = mensaje if not image_base64 else f"{mensaje} [imagen adjunta]"
    db.add(MensajeEntrega(entrega_id=entrega_id, role="user", content=content_user))
    db.commit()

    # Generar respuesta via Gemini 2.5 Flash Lite (soporta imagen), registrando tokens reales
    usage: dict = {}
    try:
        respuesta = await chat_gemini_message(
            system_prompt=PROMPTS[personaje],
            history=history,
            message=mensaje,
            image_base64=image_base64,
            image_mime=image_mime,
            usage_holder=usage,
            personaje=personaje,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error del modelo: {str(e)}")

    turn_cost = calculate_cost(
        usage.get("model", "gemini-2.5-flash-lite"),
        usage.get("input_tokens", 0),
        usage.get("output_tokens", 0),
        usage.get("cached_tokens", 0),
    )

    # Guardar respuesta del agente con su costo
    mensaje_asistente = MensajeEntrega(
        entrega_id=entrega_id, role="assistant", content=respuesta,
        model_usado=usage.get("model"),
        input_tokens=usage.get("input_tokens", 0),
        output_tokens=usage.get("output_tokens", 0),
        cached_tokens=usage.get("cached_tokens", 0),
        cost_usd=turn_cost,
    )
    db.add(mensaje_asistente)

    entrega.total_input_tokens  += usage.get("input_tokens", 0)
    entrega.total_output_tokens += usage.get("output_tokens", 0)
    entrega.total_cached_tokens += usage.get("cached_tokens", 0)
    entrega.total_cost_usd      += Decimal(str(turn_cost))
    db.commit()
    db.refresh(mensaje_asistente)

    # mensaje_id se lo pasa el frontend a /tts para enlazar la generación de
    # voz con el turno exacto que la originó (ver GeneracionVoz).
    return {"respuesta": respuesta, "personaje": personaje, "mensaje_id": mensaje_asistente.id}


# ── POST /entrega/{id}/finalizar ──────────────────────────────────────────────
@router.post("/entrega/{entrega_id}/finalizar")
async def finalizar_entrega(
    entrega_id: int,
    payload: FinalizarEntregaRequest,
    db: Session = Depends(get_db),
):
    entrega = db.query(Entrega).filter(Entrega.id == entrega_id).first()
    if not entrega:
        raise HTTPException(status_code=404, detail="Entrega no encontrada.")

    personaje = entrega.agente_usado
    formatted = {
        "conversation": [
            {
                "role": "teacher" if m["sender"] == "user" else "character",
                "text": m["content"],
            }
            for m in payload.messages
        ],
        "student_profile": {
            "name": personaje,
            "age": 9 if personaje == "Teo" else 15,
            "grade": "3º Básico" if personaje == "Teo" else "1º Medio",
        },
    }

    eval_usage: dict = {}
    try:
        evaluacion = await generate_gemini_response(PROMPTS["Evaluator"], formatted, usage_holder=eval_usage)
    except Exception as e:
        evaluacion = {"total_score": 0, "performance_range": "Error", "conclusion": str(e), "criteria": []}

    score = evaluacion.get("total_score", 0) if isinstance(evaluacion, dict) else 0

    eval_cost = calculate_cost(
        eval_usage.get("model", "gemini-2.5-flash-lite"),
        eval_usage.get("input_tokens", 0),
        eval_usage.get("output_tokens", 0),
        eval_usage.get("cached_tokens", 0),
    )

    entrega.estado       = "completada"
    entrega.puntaje      = score
    entrega.evaluacion_json = json.dumps(evaluacion, ensure_ascii=False)
    entrega.fecha_fin    = datetime.utcnow()

    entrega.total_input_tokens  += eval_usage.get("input_tokens", 0)
    entrega.total_output_tokens += eval_usage.get("output_tokens", 0)
    entrega.total_cached_tokens += eval_usage.get("cached_tokens", 0)
    entrega.total_cost_usd      += Decimal(str(eval_cost))
    db.commit()

    return {
        "entrega_id": entrega_id,
        "puntaje": score,
        "evaluacion": evaluacion,
    }


# ── GET /entrega/{id}/mensajes ────────────────────────────────────────────────
@router.get("/entrega/{entrega_id}/mensajes")
def get_mensajes_entrega(entrega_id: int, db: Session = Depends(get_db)):
    entrega = db.query(Entrega).filter(Entrega.id == entrega_id).first()
    if not entrega:
        raise HTTPException(status_code=404, detail="Entrega no encontrada.")
    mensajes = db.query(MensajeEntrega).filter(
        MensajeEntrega.entrega_id == entrega_id
    ).order_by(MensajeEntrega.created_at).all()
    return [{"id": m.id, "role": m.role, "content": m.content} for m in mensajes]


# ── GET /simulacion/{id}/resultados ──────────────────────────────────────────
# Para el docente: ver todas las entregas de una simulación
@router.get("/{sim_id}/resultados")
def resultados_simulacion(sim_id: int, db: Session = Depends(get_db)):
    sim = db.query(Simulacion).filter(Simulacion.id == sim_id).first()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulación no encontrada.")

    entregas = db.query(Entrega).filter(Entrega.simulacion_id == sim_id).all()

    # Agrupar por alumno
    por_alumno: dict = {}
    for e in entregas:
        alumno = db.query(Alumno).filter(Alumno.id == e.alumno_id).first()
        correo = alumno.correo if alumno else "desconocido"
        if correo not in por_alumno:
            por_alumno[correo] = []
        por_alumno[correo].append({
            "entrega_id":      e.id,
            "num_interaccion": e.num_interaccion,
            "agente_usado":    e.agente_usado,
            "estado":          e.estado,
            "puntaje":         e.puntaje,
            "planificacion":   e.planificacion,
            "planificacion_archivo_url": e.planificacion_archivo_url,
            "evaluacion_json": e.evaluacion_json,
            "fecha_inicio":    str(e.fecha_inicio) if e.fecha_inicio else None,
            "fecha_fin":       str(e.fecha_fin) if e.fecha_fin else None,
        })

    return {
        "simulacion_id":    sim_id,
        "nombre":           sim.nombre,
        "num_interacciones":sim.num_interacciones,
        "alumnos":          [
            {"correo": correo, "interacciones": ints}
            for correo, ints in por_alumno.items()
        ],
    }
