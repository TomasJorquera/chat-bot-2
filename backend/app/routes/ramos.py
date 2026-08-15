"""
Panel admin: ramo -> profesor -> alumnos.

Flujo:
1. POST /admin/ramos                    -> crea el ramo (código + nombre)
2. POST /admin/ramos/{id}/profesor      -> asigna un docente (por correo)
3. POST /admin/ramos/{id}/alumnos       -> importa una lista de alumnos (por correo)

Los correos que no existan como `Alumno` se crean automáticamente (con
password por defecto) para no bloquear el flujo de carga masiva.
"""
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models import Alumno, Ramo, RamoDocente, RamoAlumno, Simulacion, Entrega, RamoContenido
from .deps import get_db, get_admin_token, get_current_alumno

router = APIRouter()
teacher_router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEFAULT_PASSWORD = "password123"


def _get_or_create_alumno(db: Session, correo: str) -> Alumno:
    alumno = db.query(Alumno).filter(Alumno.correo == correo).first()
    if alumno:
        return alumno
    alumno = Alumno(
        correo=correo,
        contrasena_hash=pwd_context.hash(DEFAULT_PASSWORD),
        ia_asignada="gemini-flash-lite",  # placeholder: no aplica fuera del experimento ciego legacy
        grupo="A",
        activo=True,
    )
    db.add(alumno)
    db.flush()
    return alumno


def _ramo_out(db: Session, ramo: Ramo) -> dict:
    docente = db.query(RamoDocente).filter(RamoDocente.ramo_id == ramo.id).first()
    docente_alumno = db.query(Alumno).filter(Alumno.id == docente.alumno_id).first() if docente else None
    num_alumnos = db.query(RamoAlumno).filter(RamoAlumno.ramo_id == ramo.id).count()
    return {
        "id": ramo.id,
        "codigo": ramo.codigo,
        "nombre": ramo.nombre,
        "profesor_correo": docente_alumno.correo if docente_alumno else None,
        "num_alumnos": num_alumnos,
    }


# ── Schemas ───────────────────────────────────────────────────────────────────
class RamoCreate(BaseModel):
    codigo: str
    nombre: str


class AsignarProfesorRequest(BaseModel):
    correo_docente: str


class ImportarAlumnosRequest(BaseModel):
    correos: list[str]  # uno por línea desde el frontend (textarea o CSV parseado)


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.post("")
def crear_ramo(payload: RamoCreate, _: dict = Depends(get_admin_token), db: Session = Depends(get_db)):
    if db.query(Ramo).filter(Ramo.codigo == payload.codigo).first():
        raise HTTPException(status_code=409, detail="Ya existe un ramo con ese código.")
    ramo = Ramo(codigo=payload.codigo, nombre=payload.nombre)
    db.add(ramo)
    db.commit()
    db.refresh(ramo)
    return _ramo_out(db, ramo)


@router.get("")
def listar_ramos(_: dict = Depends(get_admin_token), db: Session = Depends(get_db)):
    ramos = db.query(Ramo).order_by(Ramo.codigo).all()
    return [_ramo_out(db, r) for r in ramos]


@router.get("/{ramo_id}")
def detalle_ramo(ramo_id: int, _: dict = Depends(get_admin_token), db: Session = Depends(get_db)):
    ramo = db.query(Ramo).filter(Ramo.id == ramo_id).first()
    if not ramo:
        raise HTTPException(status_code=404, detail="Ramo no encontrado.")

    alumnos_links = db.query(RamoAlumno).filter(RamoAlumno.ramo_id == ramo_id).all()
    alumnos = []
    for link in alumnos_links:
        alumno = db.query(Alumno).filter(Alumno.id == link.alumno_id).first()
        if alumno:
            alumnos.append({"id": alumno.id, "correo": alumno.correo, "activo": alumno.activo})

    out = _ramo_out(db, ramo)
    out["alumnos"] = alumnos
    return out


@router.post("/{ramo_id}/profesor")
def asignar_profesor(ramo_id: int, payload: AsignarProfesorRequest,
                      _: dict = Depends(get_admin_token), db: Session = Depends(get_db)):
    ramo = db.query(Ramo).filter(Ramo.id == ramo_id).first()
    if not ramo:
        raise HTTPException(status_code=404, detail="Ramo no encontrado.")

    docente = _get_or_create_alumno(db, payload.correo_docente)

    # Un ramo tiene un único profesor: reemplaza la asignación anterior si existe.
    db.query(RamoDocente).filter(RamoDocente.ramo_id == ramo_id).delete()
    db.add(RamoDocente(ramo_id=ramo_id, alumno_id=docente.id))
    db.commit()

    return _ramo_out(db, ramo)


@router.post("/{ramo_id}/alumnos")
def importar_alumnos(ramo_id: int, payload: ImportarAlumnosRequest,
                      _: dict = Depends(get_admin_token), db: Session = Depends(get_db)):
    ramo = db.query(Ramo).filter(Ramo.id == ramo_id).first()
    if not ramo:
        raise HTTPException(status_code=404, detail="Ramo no encontrado.")

    creados, matriculados, omitidos = 0, 0, 0
    for raw in payload.correos:
        correo = raw.strip().lower()
        if not correo or "@" not in correo:
            continue

        existia = db.query(Alumno).filter(Alumno.correo == correo).first() is not None
        alumno = _get_or_create_alumno(db, correo)
        if not existia:
            creados += 1

        ya_matriculado = db.query(RamoAlumno).filter(
            RamoAlumno.ramo_id == ramo_id, RamoAlumno.alumno_id == alumno.id,
        ).first()
        if ya_matriculado:
            omitidos += 1
            continue

        db.add(RamoAlumno(ramo_id=ramo_id, alumno_id=alumno.id))
        matriculados += 1

    db.commit()
    return {
        "ramo_id": ramo_id,
        "cuentas_creadas": creados,
        "alumnos_matriculados": matriculados,
        "omitidos_ya_matriculados": omitidos,
    }


@router.delete("/{ramo_id}/alumnos/{alumno_id}")
def quitar_alumno(ramo_id: int, alumno_id: int,
                   _: dict = Depends(get_admin_token), db: Session = Depends(get_db)):
    link = db.query(RamoAlumno).filter(
        RamoAlumno.ramo_id == ramo_id, RamoAlumno.alumno_id == alumno_id,
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="El alumno no está matriculado en este ramo.")
    db.delete(link)
    db.commit()
    return {"ok": True}


# ── Endpoints docente (no admin-only) ───────────────────────────────────────
# Montado en main.py bajo /ramos (sin prefijo /admin). Usa get_current_alumno
# en vez de get_admin_token: cualquier cuenta autenticada puede consultar
# "sus" ramos, pero solo docente/admin puede iniciar una sesión de prueba
# (ver _asegurar_no_alumno).

def _asegurar_no_alumno(current: Alumno) -> None:
    """Bloquea el acceso a alumnos @correo.uss.cl: esto es una herramienta
    de exploración de docente/admin, no el flujo evaluado real."""
    if current.correo.endswith("@correo.uss.cl"):
        raise HTTPException(status_code=403, detail="Solo docentes o administradores pueden usar esta función.")


class ChatPruebaRequest(BaseModel):
    agente: str  # "Teo" | "Jojo"


@teacher_router.get("/mios")
def mis_ramos(current: Alumno = Depends(get_current_alumno), db: Session = Depends(get_db)):
    """
    Ramos del usuario autenticado. Alumnos (@correo.uss.cl) ven los ramos en
    los que están matriculados (RamoAlumno); docentes/admin ven los ramos
    donde están asignados como profesor (RamoDocente) — mismo endpoint para
    ambos roles, la fuente de verdad cambia según el dominio del correo.
    """
    if current.correo.endswith("@correo.uss.cl"):
        links = db.query(RamoAlumno).filter(RamoAlumno.alumno_id == current.id).all()
    else:
        links = db.query(RamoDocente).filter(RamoDocente.alumno_id == current.id).all()
    ramos = [db.query(Ramo).filter(Ramo.id == link.ramo_id).first() for link in links]
    return [_ramo_out(db, r) for r in ramos if r]


def _asegurar_docente_del_ramo(db: Session, current: Alumno, ramo_id: int) -> None:
    """Permite admin, o al docente efectivamente asignado a este ramo."""
    if current.correo.endswith("@admin.uss.cl"):
        return
    asignado = db.query(RamoDocente).filter(
        RamoDocente.ramo_id == ramo_id, RamoDocente.alumno_id == current.id,
    ).first()
    if not asignado:
        raise HTTPException(status_code=403, detail="No eres el docente asignado a este ramo.")


@teacher_router.get("/{ramo_id}/alumnos")
def alumnos_de_mi_ramo(ramo_id: int, current: Alumno = Depends(get_current_alumno), db: Session = Depends(get_db)):
    """Roster real del ramo para el docente asignado (o admin) — sin admin token."""
    _asegurar_docente_del_ramo(db, current, ramo_id)
    links = db.query(RamoAlumno).filter(RamoAlumno.ramo_id == ramo_id).all()
    alumnos = []
    for link in links:
        alumno = db.query(Alumno).filter(Alumno.id == link.alumno_id).first()
        if alumno:
            alumnos.append({"id": alumno.id, "correo": alumno.correo, "activo": alumno.activo})
    return alumnos


# ── Contenido del ramo (recursos, tareas, anuncios) ─────────────────────────
class ContenidoCreate(BaseModel):
    tipo: str  # "recurso" | "tarea" | "anuncio"
    titulo: str
    descripcion: Optional[str] = None
    fecha_entrega: Optional[date] = None


class ContenidoUpdate(BaseModel):
    titulo: Optional[str] = None
    descripcion: Optional[str] = None
    fecha_entrega: Optional[date] = None
    publicado: Optional[bool] = None


def _contenido_out(item: RamoContenido) -> dict:
    return {
        "id": item.id,
        "tipo": item.tipo,
        "titulo": item.titulo,
        "descripcion": item.descripcion,
        "fecha_entrega": item.fecha_entrega.isoformat() if item.fecha_entrega else None,
        "publicado": item.publicado,
        "creado_en": item.creado_en.isoformat() if item.creado_en else None,
    }


def _simulaciones_resumen(db: Session, ramo: Ramo) -> list[dict]:
    """Completions reales (no de prueba) por agente, para el módulo estático
    'Simulaciones con IA' — sin inventar números."""
    total_alumnos = db.query(RamoAlumno).filter(RamoAlumno.ramo_id == ramo.id).count()
    rows = (
        db.query(Entrega.agente_usado, func.count(Entrega.id).label("completions"))
        .join(Simulacion, Simulacion.id == Entrega.simulacion_id)
        .filter(
            Simulacion.ramo_codigo == ramo.codigo,
            Simulacion.es_prueba.is_(False),
            Entrega.estado == "completada",
        )
        .group_by(Entrega.agente_usado)
        .all()
    )
    completions_por_agente = {r.agente_usado: r.completions for r in rows}
    return [
        {"agente": agente, "completions": completions_por_agente.get(agente, 0), "total": total_alumnos}
        for agente in ("Teo", "Jojo")
    ]


@teacher_router.get("/{ramo_id}/contenido")
def listar_contenido(ramo_id: int, current: Alumno = Depends(get_current_alumno), db: Session = Depends(get_db)):
    ramo = db.query(Ramo).filter(Ramo.id == ramo_id).first()
    if not ramo:
        raise HTTPException(status_code=404, detail="Ramo no encontrado.")

    es_docente_o_admin = current.correo.endswith("@admin.uss.cl") or db.query(RamoDocente).filter(
        RamoDocente.ramo_id == ramo_id, RamoDocente.alumno_id == current.id,
    ).first() is not None

    if es_docente_o_admin:
        items = db.query(RamoContenido).filter(RamoContenido.ramo_id == ramo_id).order_by(RamoContenido.creado_en.desc()).all()
    else:
        matriculado = db.query(RamoAlumno).filter(
            RamoAlumno.ramo_id == ramo_id, RamoAlumno.alumno_id == current.id,
        ).first()
        if not matriculado:
            raise HTTPException(status_code=403, detail="No perteneces a este ramo.")
        items = db.query(RamoContenido).filter(
            RamoContenido.ramo_id == ramo_id, RamoContenido.publicado.is_(True),
        ).order_by(RamoContenido.creado_en.desc()).all()

    return {
        "contenido": [_contenido_out(i) for i in items],
        "simulaciones": _simulaciones_resumen(db, ramo),
    }


@teacher_router.post("/{ramo_id}/contenido")
def crear_contenido(ramo_id: int, payload: ContenidoCreate,
                     current: Alumno = Depends(get_current_alumno), db: Session = Depends(get_db)):
    _asegurar_docente_del_ramo(db, current, ramo_id)
    if payload.tipo not in ("recurso", "tarea", "anuncio"):
        raise HTTPException(status_code=400, detail="tipo debe ser 'recurso', 'tarea' o 'anuncio'.")
    if not payload.titulo.strip():
        raise HTTPException(status_code=400, detail="titulo es requerido.")

    item = RamoContenido(
        ramo_id=ramo_id,
        tipo=payload.tipo,
        titulo=payload.titulo.strip(),
        descripcion=payload.descripcion,
        fecha_entrega=payload.fecha_entrega if payload.tipo == "tarea" else None,
        publicado=False,
        creado_por=current.id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _contenido_out(item)


@teacher_router.patch("/{ramo_id}/contenido/{item_id}")
def editar_contenido(ramo_id: int, item_id: int, payload: ContenidoUpdate,
                      current: Alumno = Depends(get_current_alumno), db: Session = Depends(get_db)):
    _asegurar_docente_del_ramo(db, current, ramo_id)
    item = db.query(RamoContenido).filter(RamoContenido.id == item_id, RamoContenido.ramo_id == ramo_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Contenido no encontrado.")

    if payload.titulo is not None:
        item.titulo = payload.titulo.strip()
    if payload.descripcion is not None:
        item.descripcion = payload.descripcion
    if payload.fecha_entrega is not None:
        item.fecha_entrega = payload.fecha_entrega
    if payload.publicado is not None:
        item.publicado = payload.publicado

    db.commit()
    db.refresh(item)
    return _contenido_out(item)


@teacher_router.delete("/{ramo_id}/contenido/{item_id}")
def eliminar_contenido(ramo_id: int, item_id: int,
                        current: Alumno = Depends(get_current_alumno), db: Session = Depends(get_db)):
    _asegurar_docente_del_ramo(db, current, ramo_id)
    item = db.query(RamoContenido).filter(RamoContenido.id == item_id, RamoContenido.ramo_id == ramo_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Contenido no encontrado.")
    db.delete(item)
    db.commit()
    return {"ok": True}


@teacher_router.post("/{ramo_id}/chat-prueba")
def iniciar_chat_prueba(ramo_id: int, payload: ChatPruebaRequest,
                         current: Alumno = Depends(get_current_alumno), db: Session = Depends(get_db)):
    """
    Crea (o reutiliza) una Entrega ligera de prueba para explorar el chat de
    un agente sin pasar por el wizard completo de Simulacion. Reutiliza el
    mismo sistema de costos que las entregas reales (calculate_cost,
    GeneracionVoz) — solo queda marcada con Simulacion.es_prueba=True para
    no mezclarse con datos reales de alumnos en /admin/costos.
    """
    _asegurar_no_alumno(current)

    if payload.agente not in ("Teo", "Jojo"):
        raise HTTPException(status_code=400, detail="agente debe ser 'Teo' o 'Jojo'.")

    ramo = db.query(Ramo).filter(Ramo.id == ramo_id).first()
    if not ramo:
        raise HTTPException(status_code=404, detail="Ramo no encontrado.")

    sim = (
        db.query(Simulacion)
        .filter(Simulacion.ramo_codigo == ramo.codigo, Simulacion.es_prueba.is_(True))
        .first()
    )
    if not sim:
        sim = Simulacion(
            creado_por=current.id,
            ramo_codigo=ramo.codigo,
            nombre=f"Sesión de prueba — {ramo.codigo}",
            instrucciones="Sesión de exploración interna (docente/admin), no evaluada.",
            objetivos="Probar prompt, voz e imágenes antes de asignar la simulación real.",
            agente="Ambos",
            num_interacciones=999999,
            fecha_inicio=date.today(),
            fecha_termino=date.today() + timedelta(days=3650),
            pauta_tipo="general",
            es_prueba=True,
        )
        db.add(sim)
        db.commit()
        db.refresh(sim)

    num_existing = db.query(Entrega).filter(
        Entrega.simulacion_id == sim.id,
        Entrega.alumno_id == current.id,
    ).count()

    entrega = Entrega(
        simulacion_id=sim.id,
        alumno_id=current.id,
        num_interaccion=num_existing + 1,
        agente_usado=payload.agente,
        estado="en_progreso",
    )
    db.add(entrega)
    db.commit()
    db.refresh(entrega)

    return {"entrega_id": entrega.id, "simulacion_id": sim.id}
