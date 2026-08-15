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
    es_prueba          = Column(Boolean, nullable=False, default=False, server_default='false')  # sesión de exploración docente/admin, no evaluada
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
    planificacion      = Column(Text, nullable=True)                      # texto libre antes de chatear
    planificacion_archivo_url = Column(Text, nullable=True)             # ruta del archivo subido (Word/PDF)
    estado             = Column(String(20), nullable=False,
                                default="en_progreso")                    # "en_progreso"|"completada"
    puntaje            = Column(Integer, nullable=True)                   # null hasta finalizar
    evaluacion_json    = Column(Text, nullable=True)                      # JSON con criterios + puntajes
    pdf_base64         = Column(Text, nullable=True)                      # null hasta finalizar
    fecha_inicio       = Column(DateTime, default=datetime.utcnow)
    fecha_fin          = Column(DateTime, nullable=True)

    # ── Costos IA (chat + tts + evaluación), acumulados desde MensajeEntrega
    total_input_tokens  = Column(Integer, nullable=False, default=0)
    total_output_tokens = Column(Integer, nullable=False, default=0)
    total_cached_tokens = Column(Integer, nullable=False, default=0)
    total_cost_usd      = Column(Numeric(12, 8), nullable=False, default=0)

    simulacion         = relationship("Simulacion", back_populates="entregas")
    alumno             = relationship("Alumno", foreign_keys=[alumno_id])
    mensajes           = relationship("MensajeEntrega", back_populates="entrega",
                                      cascade="all, delete-orphan",
                                      order_by="MensajeEntrega.created_at")


class Ramo(Base):
    """
    Catálogo de ramos para el panel admin (ramo -> profesor -> alumnos).
    `Simulacion.ramo_codigo` sigue siendo un string libre para no romper
    el flujo existente; este modelo es la fuente de verdad para la
    asignación de docente y la matrícula de alumnos.
    """
    __tablename__ = "ramos"

    id        = Column(Integer, primary_key=True, autoincrement=True)
    codigo    = Column(String(20), unique=True, nullable=False, index=True)
    nombre    = Column(String(200), nullable=False)
    creado_en = Column(DateTime, default=datetime.utcnow)

    docentes = relationship("RamoDocente", back_populates="ramo", cascade="all, delete-orphan")
    alumnos  = relationship("RamoAlumno", back_populates="ramo", cascade="all, delete-orphan")


class RamoDocente(Base):
    """Docente(s) asignado(s) a un ramo. `alumno_id` es la cuenta (tabla `alumnos`) usada como profesor."""
    __tablename__ = "ramo_docentes"

    id        = Column(Integer, primary_key=True, autoincrement=True)
    ramo_id   = Column(Integer, ForeignKey("ramos.id"), nullable=False)
    alumno_id = Column(Integer, ForeignKey("alumnos.id"), nullable=False)
    creado_en = Column(DateTime, default=datetime.utcnow)

    ramo   = relationship("Ramo", back_populates="docentes")
    alumno = relationship("Alumno")


class RamoAlumno(Base):
    """Matrícula de un alumno en un ramo."""
    __tablename__ = "ramo_alumnos"

    id        = Column(Integer, primary_key=True, autoincrement=True)
    ramo_id   = Column(Integer, ForeignKey("ramos.id"), nullable=False)
    alumno_id = Column(Integer, ForeignKey("alumnos.id"), nullable=False)
    creado_en = Column(DateTime, default=datetime.utcnow)

    ramo   = relationship("Ramo", back_populates="alumnos")
    alumno = relationship("Alumno")


class RamoContenido(Base):
    """
    Contenido publicable de un ramo (recursos, tareas, anuncios) creado por
    el docente. Una sola tabla con `tipo` como discriminador — el frontend
    ya trata estos tres tipos como una misma forma con selector de tipo.
    """
    __tablename__ = "ramo_contenidos"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    ramo_id       = Column(Integer, ForeignKey("ramos.id"), nullable=False)
    tipo          = Column(String(20), nullable=False)   # "recurso"|"tarea"|"anuncio"
    titulo        = Column(String(200), nullable=False)
    descripcion   = Column(Text, nullable=True)
    fecha_entrega = Column(Date, nullable=True)           # solo aplica a "tarea"
    publicado     = Column(Boolean, nullable=False, default=False, server_default='false')
    creado_por    = Column(Integer, ForeignKey("alumnos.id"), nullable=False)
    creado_en     = Column(DateTime, default=datetime.utcnow)

    ramo   = relationship("Ramo")
    autor  = relationship("Alumno")


class MensajeEntrega(Base):
    __tablename__ = "mensajes_entrega"

    id                 = Column(Integer, primary_key=True, autoincrement=True)
    entrega_id         = Column(Integer, ForeignKey("entregas.id"), nullable=False)
    role               = Column(String(10), nullable=False)               # "user"|"assistant"
    content            = Column(Text, nullable=False)
    created_at         = Column(DateTime, default=datetime.utcnow)

    # ── Costo IA de este turno específico ─────────────────────────────────
    model_usado        = Column(String(50), nullable=True)   # "gemini-2.5-flash-lite"|"deepseek-v4-flash"|"gpt-4o-mini-tts"
    input_tokens       = Column(Integer, nullable=False, default=0)
    output_tokens      = Column(Integer, nullable=False, default=0)
    cached_tokens      = Column(Integer, nullable=False, default=0)
    cost_usd           = Column(Numeric(12, 8), nullable=False, default=0)

    entrega            = relationship("Entrega", back_populates="mensajes")


class GeneracionVoz(Base):
    """
    Traza de cada generación de audio TTS (gpt-4o-mini-tts), independiente
    de si el turno de texto que la originó viene de una entrega real o de
    una prueba directa de un docente. entrega_id/mensaje_entrega_id quedan
    nulos en ese segundo caso — igual se registra el gasto, solo que sin
    poder atribuirlo a una sesión de alumno específica.
    """
    __tablename__ = "generaciones_voz"

    id                 = Column(Integer, primary_key=True, autoincrement=True)
    entrega_id         = Column(Integer, ForeignKey("entregas.id"), nullable=True)
    mensaje_entrega_id = Column(Integer, ForeignKey("mensajes_entrega.id"), nullable=True)

    agente             = Column(String(20), nullable=False)   # "Teo"|"Jojo"
    modelo             = Column(String(50), nullable=False)   # "gpt-4o-mini-tts"
    voz                = Column(String(30), nullable=False)   # voz que efectivamente respondió (post-fallback)
    formato            = Column(String(10), nullable=False, default="mp3")

    instrucciones      = Column(Text, nullable=False)   # snapshot exacto enviado al proveedor (incluye addon emocional)
    texto_enviado      = Column(Text, nullable=False)

    # ── Tokens: cada lado tiene su propia confiabilidad, no se mezclan ─────
    input_tokens          = Column(Integer, nullable=False, default=0)
    input_tokens_source   = Column(String(20), nullable=False, default="tiktoken")    # "tiktoken"
    output_tokens         = Column(Integer, nullable=False, default=0)
    output_tokens_source  = Column(String(20), nullable=False, default="estimated")   # "estimated" | "provider_usage"

    audio_duration_ms  = Column(Integer, nullable=True)    # real, vía mutagen — null si no se pudo leer
    audio_size_bytes   = Column(Integer, nullable=False, default=0)

    costo_estimado_usd = Column(Numeric(12, 8), nullable=False, default=0)

    creado_en          = Column(DateTime, default=datetime.utcnow)

    entrega            = relationship("Entrega")
    mensaje_entrega    = relationship("MensajeEntrega")
