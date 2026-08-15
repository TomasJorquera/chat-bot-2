"""
Modelos SQLAlchemy de la arquitectura Fase 2 (plataforma educativa).

Basado en el DBML de referencia (`CodigoDB.md`) con tres adiciones no
presentes en ese DBML pero requeridas por la arquitectura objetivo:

- `SimulationProcess`: capa de proceso por estudiante-simulación, superior
  a las sesiones individuales (el DBML iba directo simulations -> sessions).
- `SimulationAgentProfile`: tabla puente para soportar uno o más agentes
  por simulación (el DBML tenía un FK único `simulations.agent_profile_id`).
- `TeacherReview`: historial de revisiones docentes, separado de los campos
  "actuales" que vive en `SimulationProcess` (ver ARCHITECTURE_PHASE_1.md).

Los modelos legacy (`app/models.py`: Alumno, Interaccion, Simulacion,
Entrega, MensajeEntrega, Message) NO se tocan ni se eliminan. Ambos módulos
comparten el mismo `Base` (`app/database.py`) para que Alembic gestione
todo con una sola migración.
"""
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Date, Boolean,
    ForeignKey, Numeric, func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from .database import Base


def uuid_pk():
    return Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)


# ── Usuarios y roles ─────────────────────────────────────────────────────────
class Role(Base):
    __tablename__ = "roles"

    id     = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(20), unique=True, nullable=False)  # admin|teacher|student|evaluator

    users = relationship("User", back_populates="role")


class User(Base):
    __tablename__ = "users"

    id = uuid_pk()

    nombre   = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)

    correo        = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)

    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)

    activo = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    role = relationship("Role", back_populates="users")


# ── Estructura académica ─────────────────────────────────────────────────────
class Course(Base):
    __tablename__ = "courses"

    id = uuid_pk()

    nombre  = Column(String(150), nullable=False)
    nivel   = Column(String(50), nullable=True)
    seccion = Column(String(20), nullable=True)
    anio    = Column(Integer, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Subject(Base):
    __tablename__ = "subjects"

    id = uuid_pk()

    codigo      = Column(String(20), unique=True, nullable=False, index=True)  # ej: "EDU-301"
    nombre      = Column(String(150), nullable=False)
    descripcion = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TeacherSubject(Base):
    """Docente asignado a un ramo dentro de un curso (curso-ramo-docente)."""
    __tablename__ = "teacher_subjects"

    id = uuid_pk()

    teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)
    course_id  = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    teacher = relationship("User", foreign_keys=[teacher_id])
    subject = relationship("Subject")
    course  = relationship("Course")


class StudentCourse(Base):
    __tablename__ = "student_courses"

    id = uuid_pk()

    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    course_id  = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class StudentSubject(Base):
    __tablename__ = "student_subjects"

    id = uuid_pk()

    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


# ── Configuración IA ─────────────────────────────────────────────────────────
class AIAgent(Base):
    __tablename__ = "ai_agents"

    id = uuid_pk()

    nombre      = Column(String(100), nullable=False)   # "Teo" | "Jojo"
    descripcion = Column(Text, nullable=True)

    categoria       = Column(String(50), nullable=True)   # ej: "DEA", "DIL"
    edad            = Column(Integer, nullable=True)
    nivel_educativo = Column(String(50), nullable=True)

    activo = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    profiles = relationship("AgentProfile", back_populates="agent")


class AIModel(Base):
    __tablename__ = "ai_models"

    id = uuid_pk()

    nombre   = Column(String(100), nullable=False)   # ej: "gemini-2.0-flash-lite"
    provider = Column(String(50), nullable=False)     # ej: "google", "deepseek", "openai"

    tipo = Column(String(20), nullable=False)  # "chat" | "tts" | "evaluator"

    input_cost  = Column(Numeric(12, 8), default=0)
    output_cost = Column(Numeric(12, 8), default=0)
    cache_cost  = Column(Numeric(12, 8), default=0)

    activo = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AgentProfile(Base):
    """Versión/perfil configurable de un agente IA (prompt, modelo, voz, params)."""
    __tablename__ = "agent_profiles"

    id = uuid_pk()

    agent_id = Column(UUID(as_uuid=True), ForeignKey("ai_agents.id"), nullable=False)

    version        = Column(String(20), nullable=False)   # ej: "v1"
    nombre_version = Column(String(100), nullable=True)

    system_prompt = Column(Text, nullable=False)

    chat_model_id = Column(UUID(as_uuid=True), ForeignKey("ai_models.id"), nullable=False)
    tts_model_id  = Column(UUID(as_uuid=True), ForeignKey("ai_models.id"), nullable=True)
    tts_voice     = Column(String(50), nullable=True)

    temperature = Column(Numeric(3, 2), nullable=True)
    max_tokens  = Column(Integer, nullable=True)
    top_p       = Column(Numeric(3, 2), nullable=True)

    activo = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    agent      = relationship("AIAgent", back_populates="profiles")
    chat_model = relationship("AIModel", foreign_keys=[chat_model_id])
    tts_model  = relationship("AIModel", foreign_keys=[tts_model_id])


class EvaluationProfile(Base):
    __tablename__ = "evaluation_profiles"

    id = uuid_pk()

    nombre      = Column(String(100), nullable=False)
    version     = Column(String(20), nullable=False)
    descripcion = Column(Text, nullable=True)

    system_prompt = Column(Text, nullable=False)

    model_id = Column(UUID(as_uuid=True), ForeignKey("ai_models.id"), nullable=False)

    activo = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    model = relationship("AIModel")


# ── Simulaciones ──────────────────────────────────────────────────────────────
class Simulation(Base):
    __tablename__ = "simulations"

    id = uuid_pk()

    titulo        = Column(String(200), nullable=False)
    descripcion   = Column(Text, nullable=True)
    instrucciones = Column(Text, nullable=False)
    objetivos     = Column(Text, nullable=False)

    teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=True)
    course_id  = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=True)

    evaluation_profile_id = Column(UUID(as_uuid=True), ForeignKey("evaluation_profiles.id"), nullable=True)

    fecha_inicio  = Column(Date, nullable=False)
    fecha_termino = Column(Date, nullable=False)

    estado = Column(String(20), nullable=False, default="borrador")  # borrador|publicada|cerrada

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    teacher            = relationship("User")
    subject            = relationship("Subject")
    course             = relationship("Course")
    evaluation_profile = relationship("EvaluationProfile")

    agent_profiles = relationship("SimulationAgentProfile", back_populates="simulation",
                                   cascade="all, delete-orphan")
    criteria       = relationship("SimulationCriteria", back_populates="simulation",
                                   cascade="all, delete-orphan")
    processes      = relationship("SimulationProcess", back_populates="simulation",
                                   cascade="all, delete-orphan")


class SimulationAgentProfile(Base):
    """Uno o más agentes (perfiles) habilitados para una simulación."""
    __tablename__ = "simulation_agent_profiles"

    id = uuid_pk()

    simulation_id    = Column(UUID(as_uuid=True), ForeignKey("simulations.id"), nullable=False)
    agent_profile_id = Column(UUID(as_uuid=True), ForeignKey("agent_profiles.id"), nullable=False)

    es_principal = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    simulation    = relationship("Simulation", back_populates="agent_profiles")
    agent_profile = relationship("AgentProfile")


class SimulationCriteria(Base):
    __tablename__ = "simulation_criteria"

    id = uuid_pk()

    simulation_id = Column(UUID(as_uuid=True), ForeignKey("simulations.id"), nullable=False)

    criterio    = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    obligatorio = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    simulation = relationship("Simulation", back_populates="criteria")


# ── Proceso completo del estudiante en una simulación ────────────────────────
class SimulationProcess(Base):
    """
    Representa el recorrido completo de UN estudiante dentro de UNA
    simulación, independiente de las sesiones individuales que la componen.

    Ciclo de estado: iniciado -> en_progreso -> finalizado -> cerrado.
    Los campos de evaluación/feedback aquí son el "estado actual" del
    proceso; el historial de revisiones docentes vive en `TeacherReview`.
    """
    __tablename__ = "simulation_processes"

    id = uuid_pk()

    simulation_id = Column(UUID(as_uuid=True), ForeignKey("simulations.id"), nullable=False)
    student_id    = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    estado = Column(String(20), nullable=False, default="iniciado")
    # iniciado | en_progreso | finalizado | cerrado

    sesiones_completadas = Column(Integer, nullable=False, default=0)

    started_at  = Column(DateTime(timezone=True), server_default=func.now())
    finished_at = Column(DateTime(timezone=True), nullable=True)
    closed_at   = Column(DateTime(timezone=True), nullable=True)

    resumen_evaluador        = Column(Text, nullable=True)
    retroalimentacion_docente = Column(Text, nullable=True)
    observacion_docente      = Column(Text, nullable=True)
    observacion_cliente      = Column(Text, nullable=True)

    nota_final = Column(Numeric(4, 2), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    simulation = relationship("Simulation", back_populates="processes")
    student    = relationship("User")

    sessions        = relationship("SimulationSession", back_populates="process",
                                    cascade="all, delete-orphan")
    teacher_reviews = relationship("TeacherReview", back_populates="process",
                                    cascade="all, delete-orphan")


class SimulationSession(Base):
    """Una interacción/sesión individual dentro de un proceso (1..N por proceso)."""
    __tablename__ = "simulation_sessions"

    id = uuid_pk()

    process_id       = Column(UUID(as_uuid=True), ForeignKey("simulation_processes.id"), nullable=False)
    agent_profile_id = Column(UUID(as_uuid=True), ForeignKey("agent_profiles.id"), nullable=False)

    started_at  = Column(DateTime(timezone=True), server_default=func.now())
    finished_at = Column(DateTime(timezone=True), nullable=True)

    score   = Column(Integer, nullable=True)
    pdf_url = Column(Text, nullable=True)

    total_cost          = Column(Numeric(12, 8), default=0)
    total_input_tokens  = Column(Integer, default=0)
    total_output_tokens = Column(Integer, default=0)
    total_cached_tokens = Column(Integer, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    process       = relationship("SimulationProcess", back_populates="sessions")
    agent_profile = relationship("AgentProfile")

    messages = relationship("SimulationMessage", back_populates="session",
                             cascade="all, delete-orphan", order_by="SimulationMessage.created_at")


class SimulationMessage(Base):
    __tablename__ = "simulation_messages"

    id = uuid_pk()

    session_id = Column(UUID(as_uuid=True), ForeignKey("simulation_sessions.id"), nullable=False)

    role    = Column(String(20), nullable=False)  # "user" | "assistant"
    content = Column(Text, nullable=False)

    input_tokens  = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    cached_tokens = Column(Integer, default=0)

    cost = Column(Numeric(12, 8), default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("SimulationSession", back_populates="messages")


# ── Evaluaciones ──────────────────────────────────────────────────────────────
class Evaluation(Base):
    """
    Resultado de evaluación IA. `scope` indica si aplica a una sesión
    puntual o a la evaluación final del proceso completo.
    """
    __tablename__ = "evaluations"

    id = uuid_pk()

    scope = Column(String(10), nullable=False)  # "session" | "process"

    session_id = Column(UUID(as_uuid=True), ForeignKey("simulation_sessions.id"), nullable=True)
    process_id = Column(UUID(as_uuid=True), ForeignKey("simulation_processes.id"), nullable=True)

    performance_range = Column(String(30), nullable=True)   # Aceptable|Competente|Exitosa
    total_score       = Column(Integer, nullable=True)
    conclusion        = Column(Text, nullable=True)

    raw_json = Column(Text, nullable=True)  # respuesta cruda del modelo, para trazabilidad

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("SimulationSession")
    process = relationship("SimulationProcess")

    criteria_results = relationship("EvaluationCriteriaResult", back_populates="evaluation",
                                     cascade="all, delete-orphan")


class EvaluationCriteriaResult(Base):
    __tablename__ = "evaluation_criteria_results"

    id = uuid_pk()

    evaluation_id = Column(UUID(as_uuid=True), ForeignKey("evaluations.id"), nullable=False)

    criterion_name = Column(String(200), nullable=False)
    compliance     = Column(String(10), nullable=True)   # "SI" | "NO"
    analysis       = Column(Text, nullable=True)
    justification  = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    evaluation = relationship("Evaluation", back_populates="criteria_results")


# ── Revisión docente ──────────────────────────────────────────────────────────
class TeacherReview(Base):
    """Historial de revisiones que un docente hace sobre un proceso de simulación."""
    __tablename__ = "teacher_reviews"

    id = uuid_pk()

    process_id = Column(UUID(as_uuid=True), ForeignKey("simulation_processes.id"), nullable=False)
    teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    feedback    = Column(Text, nullable=True)
    observacion = Column(Text, nullable=True)
    nota        = Column(Numeric(4, 2), nullable=True)

    estado = Column(String(20), nullable=False, default="pendiente")
    # pendiente | en_revision | aprobado | rechazado

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    process = relationship("SimulationProcess", back_populates="teacher_reviews")
    teacher = relationship("User")


# ── Costos IA ─────────────────────────────────────────────────────────────────
class AICostLog(Base):
    __tablename__ = "ai_cost_logs"

    id = uuid_pk()

    session_id = Column(UUID(as_uuid=True), ForeignKey("simulation_sessions.id"), nullable=False)
    model_id   = Column(UUID(as_uuid=True), ForeignKey("ai_models.id"), nullable=False)

    input_tokens  = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    cached_tokens = Column(Integer, default=0)

    total_cost = Column(Numeric(12, 8), default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session = relationship("SimulationSession")
    model   = relationship("AIModel")


# ── Material y tareas académicas generales ───────────────────────────────────
class Material(Base):
    __tablename__ = "materials"

    id = uuid_pk()

    titulo      = Column(String(200), nullable=False)
    descripcion = Column(Text, nullable=True)
    archivo_url = Column(Text, nullable=True)

    teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=True)
    course_id  = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Assignment(Base):
    __tablename__ = "assignments"

    id = uuid_pk()

    titulo        = Column(String(200), nullable=False)
    descripcion   = Column(Text, nullable=True)
    fecha_entrega = Column(DateTime(timezone=True), nullable=True)

    teacher_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    subject_id = Column(UUID(as_uuid=True), ForeignKey("subjects.id"), nullable=True)
    course_id  = Column(UUID(as_uuid=True), ForeignKey("courses.id"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    submissions = relationship("AssignmentSubmission", back_populates="assignment",
                                cascade="all, delete-orphan")


class AssignmentSubmission(Base):
    __tablename__ = "assignment_submissions"

    id = uuid_pk()

    assignment_id = Column(UUID(as_uuid=True), ForeignKey("assignments.id"), nullable=False)
    student_id    = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    archivo_url = Column(Text, nullable=True)
    comentario  = Column(Text, nullable=True)

    nota     = Column(Numeric(4, 2), nullable=True)
    feedback = Column(Text, nullable=True)

    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    assignment = relationship("Assignment", back_populates="submissions")
    student    = relationship("User")
