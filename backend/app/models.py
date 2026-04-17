from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean, Date,
    ForeignKey, Numeric, func
)
from sqlalchemy.orm import relationship
from .database import Base


# ── Modelo existente ────────────────────────────────────────────────────────
class Message(Base):
    __tablename__ = "messages"

    id         = Column(Integer, primary_key=True, index=True)
    role       = Column(String(20), nullable=False)
    content    = Column(String(2000), nullable=False)
    character  = Column(String(50), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ── Nuevos modelos para el experimento multi-modelo ──────────────────────────
class Alumno(Base):
    __tablename__ = "alumnos"

    id              = Column(Integer, primary_key=True, autoincrement=True)
    correo          = Column(String(100), unique=True, nullable=False, index=True)
    contrasena_hash = Column(String(255), nullable=False)
    ia_asignada     = Column(String(50), nullable=False)   # "gemini-flash-lite" | "gpt-nano" | "deepseek-v3"
    grupo           = Column(String(1), nullable=False)     # "A" | "B" | "C"
    activo          = Column(Boolean, default=True)
    creado_en       = Column(DateTime, default=datetime.utcnow)

    interacciones   = relationship("Interaccion", back_populates="alumno")


class Interaccion(Base):
    __tablename__ = "interacciones"

    id                = Column(Integer, primary_key=True, autoincrement=True)
    alumno_id         = Column(Integer, ForeignKey("alumnos.id"), nullable=False)
    correo            = Column(String(100), nullable=False)
    ia_asignada       = Column(String(50), nullable=False)
    personaje         = Column(String(20), nullable=False)
    tokens_input      = Column(Integer, default=0)
    tokens_output     = Column(Integer, default=0)
    tokens_cache      = Column(Integer, default=0)
    costo_total_usd   = Column(Numeric(10, 6), default=0)
    inicio_datetime   = Column(DateTime, default=datetime.utcnow)
    fin_datetime      = Column(DateTime, nullable=True)
    puntaje_evaluador = Column(Integer, nullable=True)
    pdf_url           = Column(Text, nullable=True)

    alumno            = relationship("Alumno", back_populates="interacciones")


# ── Modelos para simulaciones pedagógicas ────────────────────────────────────

class Simulacion(Base):
    __tablename__ = "simulaciones"

    id                 = Column(Integer, primary_key=True, autoincrement=True)
    creado_por         = Column(Integer, ForeignKey("alumnos.id"), nullable=False)
    ramo_codigo        = Column(String(20), nullable=False, index=True)   # ej: "EDU-301"
    nombre             = Column(String(200), nullable=False)
    instrucciones      = Column(Text, nullable=False)                     # visible al alumno
    objetivos          = Column(Text, nullable=False)                     # visible al alumno
    agente             = Column(String(10), nullable=False)               # "Teo"|"Jojo"|"Ambos"
    num_interacciones  = Column(Integer, nullable=False, default=2)       # 1–5
    fecha_inicio       = Column(Date, nullable=False)
    fecha_termino      = Column(Date, nullable=False)
    pauta_tipo         = Column(String(20), nullable=False, default="general")  # "general"|"personalizada"
    pauta_criterios    = Column(Text, nullable=True)                      # JSON si es personalizada
    activo             = Column(Boolean, default=True)
    creado_en          = Column(DateTime, default=datetime.utcnow)

    docente            = relationship("Alumno", foreign_keys=[creado_por])
    entregas           = relationship("Entrega", back_populates="simulacion",
                                      cascade="all, delete-orphan")


class Entrega(Base):
    __tablename__ = "entregas"

    id                 = Column(Integer, primary_key=True, autoincrement=True)
    simulacion_id      = Column(Integer, ForeignKey("simulaciones.id"), nullable=False)
    alumno_id          = Column(Integer, ForeignKey("alumnos.id"), nullable=False)
    num_interaccion    = Column(Integer, nullable=False)                  # 1, 2, 3…
    agente_usado       = Column(String(10), nullable=False)               # "Teo"|"Jojo"
    planificacion      = Column(Text, nullable=True)                      # sube el alumno antes de chatear
    estado             = Column(String(20), nullable=False,
                                default="en_progreso")                    # "en_progreso"|"completada"
    puntaje            = Column(Integer, nullable=True)                   # null hasta finalizar
    evaluacion_json    = Column(Text, nullable=True)                      # JSON con criterios + puntajes
    pdf_base64         = Column(Text, nullable=True)                      # null hasta finalizar
    fecha_inicio       = Column(DateTime, default=datetime.utcnow)
    fecha_fin          = Column(DateTime, nullable=True)

    simulacion         = relationship("Simulacion", back_populates="entregas")
    alumno             = relationship("Alumno", foreign_keys=[alumno_id])
    mensajes           = relationship("MensajeEntrega", back_populates="entrega",
                                      cascade="all, delete-orphan",
                                      order_by="MensajeEntrega.created_at")


class MensajeEntrega(Base):
    __tablename__ = "mensajes_entrega"

    id                 = Column(Integer, primary_key=True, autoincrement=True)
    entrega_id         = Column(Integer, ForeignKey("entregas.id"), nullable=False)
    role               = Column(String(10), nullable=False)               # "user"|"assistant"
    content            = Column(Text, nullable=False)
    created_at         = Column(DateTime, default=datetime.utcnow)

    entrega            = relationship("Entrega", back_populates="mensajes")
