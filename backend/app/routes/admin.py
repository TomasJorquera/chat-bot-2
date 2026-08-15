from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from ..database import SessionLocal
from ..models import Alumno, Interaccion, Entrega, MensajeEntrega, Simulacion
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


# ── GET /admin/costos ──────────────────────────────────────────────────────────
@router.get("/costos")
def resumen_costos(
    _: dict = Depends(get_admin_token),
    db: Session = Depends(get_db),
):
    """
    Resumen de gasto en IA (chat + evaluación + tts) para la experimentación.
    Se calcula sobre `entregas`/`mensajes_entrega` (flujo real de simulación).
    """
    entregas = (
        db.query(Entrega)
        .filter(Entrega.total_cost_usd > 0)
        .all()
    )

    total_cost = sum(float(e.total_cost_usd) for e in entregas)
    num_sesiones = len(entregas)
    total_input = sum(e.total_input_tokens for e in entregas)
    total_output = sum(e.total_output_tokens for e in entregas)
    total_cached = sum(e.total_cached_tokens for e in entregas)

    alumnos_distintos = {e.alumno_id for e in entregas}

    resumen = {
        "total_cost_usd":          round(total_cost, 6),
        "num_sesiones":            num_sesiones,
        "num_alumnos":             len(alumnos_distintos),
        "costo_promedio_sesion":   round(total_cost / num_sesiones, 6) if num_sesiones else 0,
        "costo_promedio_alumno":   round(total_cost / len(alumnos_distintos), 6) if alumnos_distintos else 0,
        "total_input_tokens":      total_input,
        "total_output_tokens":     total_output,
        "total_cached_tokens":     total_cached,
    }

    # ── Por ramo ──────────────────────────────────────────────────────────
    por_ramo_rows = (
        db.query(
            Simulacion.ramo_codigo,
            func.count(Entrega.id).label("num_sesiones"),
            func.coalesce(func.sum(Entrega.total_cost_usd), 0).label("total_cost_usd"),
        )
        .join(Entrega, Entrega.simulacion_id == Simulacion.id)
        .group_by(Simulacion.ramo_codigo)
        .all()
    )
    por_ramo = [
        {"ramo_codigo": r.ramo_codigo, "num_sesiones": r.num_sesiones, "total_cost_usd": round(float(r.total_cost_usd), 6)}
        for r in por_ramo_rows
    ]

    # ── Por modelo (desde mensajes_entrega, incluye chat + evaluación) ───
    por_modelo_rows = (
        db.query(
            MensajeEntrega.model_usado,
            func.count(MensajeEntrega.id).label("num_mensajes"),
            func.coalesce(func.sum(MensajeEntrega.cost_usd), 0).label("total_cost_usd"),
        )
        .filter(MensajeEntrega.model_usado.isnot(None))
        .group_by(MensajeEntrega.model_usado)
        .all()
    )
    por_modelo = [
        {"modelo": r.model_usado, "num_mensajes": r.num_mensajes, "total_cost_usd": round(float(r.total_cost_usd), 6)}
        for r in por_modelo_rows
    ]

    # ── Por día (para ver ritmo de gasto vs. presupuesto) ────────────────
    por_dia_rows = (
        db.query(
            func.date(MensajeEntrega.created_at).label("fecha"),
            func.coalesce(func.sum(MensajeEntrega.cost_usd), 0).label("total_cost_usd"),
        )
        .group_by(func.date(MensajeEntrega.created_at))
        .order_by(func.date(MensajeEntrega.created_at))
        .all()
    )
    por_dia = [{"fecha": str(r.fecha), "total_cost_usd": round(float(r.total_cost_usd), 6)} for r in por_dia_rows]

    # ── Drill-down por sesión (entrega) ───────────────────────────────────
    sesiones = []
    for e in sorted(entregas, key=lambda x: x.fecha_inicio, reverse=True):
        alumno = db.query(Alumno).filter(Alumno.id == e.alumno_id).first()
        sim = db.query(Simulacion).filter(Simulacion.id == e.simulacion_id).first()
        sesiones.append({
            "entrega_id":        e.id,
            "alumno_correo":     alumno.correo if alumno else "desconocido",
            "ramo_codigo":       sim.ramo_codigo if sim else None,
            "simulacion_nombre": sim.nombre if sim else None,
            "es_prueba":         bool(sim.es_prueba) if sim else False,
            "agente_usado":      e.agente_usado,
            "estado":            e.estado,
            "total_cost_usd":    round(float(e.total_cost_usd), 6),
            "total_input_tokens": e.total_input_tokens,
            "total_output_tokens": e.total_output_tokens,
            "total_cached_tokens": e.total_cached_tokens,
            "fecha_inicio":      str(e.fecha_inicio) if e.fecha_inicio else None,
            "fecha_fin":         str(e.fecha_fin) if e.fecha_fin else None,
        })

    return {
        "resumen":   resumen,
        "por_ramo":  por_ramo,
        "por_modelo": por_modelo,
        "por_dia":   por_dia,
        "sesiones":  sesiones,
        "generado_en": datetime.now(timezone.utc).isoformat(),
    }
