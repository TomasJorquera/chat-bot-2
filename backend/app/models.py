from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean,
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
