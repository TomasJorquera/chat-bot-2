"""Schemas Pydantic de la arquitectura Fase 2 (plataforma educativa)."""
from datetime import date, datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel


# ── Roles / Usuarios ──────────────────────────────────────────────────────────
class RoleOut(BaseModel):
    id: int
    nombre: str

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    nombre: str
    apellido: str
    correo: str
    password: str
    role_id: int


class UserLogin(BaseModel):
    correo: str
    password: str


class UserOut(BaseModel):
    id: UUID
    nombre: str
    apellido: str
    correo: str
    role_id: int
    activo: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponseV2(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ── Académico ─────────────────────────────────────────────────────────────────
class CourseCreate(BaseModel):
    nombre: str
    nivel: Optional[str] = None
    seccion: Optional[str] = None
    anio: int


class CourseOut(BaseModel):
    id: UUID
    nombre: str
    nivel: Optional[str]
    seccion: Optional[str]
    anio: int
    created_at: datetime

    class Config:
        from_attributes = True


class SubjectCreate(BaseModel):
    codigo: str
    nombre: str
    descripcion: Optional[str] = None


class SubjectOut(BaseModel):
    id: UUID
    codigo: str
    nombre: str
    descripcion: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class CourseSubjectCreate(BaseModel):
    """Asigna un docente a un ramo dentro de un curso (teacher_subjects)."""
    teacher_id: UUID
    subject_id: UUID
    course_id: UUID


class CourseSubjectOut(BaseModel):
    id: UUID
    teacher_id: UUID
    subject_id: UUID
    course_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


# ── Simulaciones ──────────────────────────────────────────────────────────────
class SimulationCreate(BaseModel):
    titulo: str
    descripcion: Optional[str] = None
    instrucciones: str
    objetivos: str
    teacher_id: UUID
    subject_id: Optional[UUID] = None
    course_id: Optional[UUID] = None
    evaluation_profile_id: Optional[UUID] = None
    fecha_inicio: date
    fecha_termino: date
    agent_profile_ids: List[UUID] = []


class SimulationOut(BaseModel):
    id: UUID
    titulo: str
    descripcion: Optional[str]
    instrucciones: str
    objetivos: str
    teacher_id: UUID
    subject_id: Optional[UUID]
    course_id: Optional[UUID]
    evaluation_profile_id: Optional[UUID]
    fecha_inicio: date
    fecha_termino: date
    estado: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Proceso de simulación ─────────────────────────────────────────────────────
class SimulationProcessCreate(BaseModel):
    simulation_id: UUID
    student_id: UUID


class SimulationProcessOut(BaseModel):
    id: UUID
    simulation_id: UUID
    student_id: UUID
    estado: str
    sesiones_completadas: int
    started_at: datetime
    finished_at: Optional[datetime]
    closed_at: Optional[datetime]
    resumen_evaluador: Optional[str]
    retroalimentacion_docente: Optional[str]
    observacion_docente: Optional[str]
    observacion_cliente: Optional[str]
    nota_final: Optional[float]

    class Config:
        from_attributes = True


# ── Sesiones y mensajes ───────────────────────────────────────────────────────
class SimulationSessionCreate(BaseModel):
    process_id: UUID
    agent_profile_id: UUID


class SimulationSessionOut(BaseModel):
    id: UUID
    process_id: UUID
    agent_profile_id: UUID
    started_at: datetime
    finished_at: Optional[datetime]
    score: Optional[int]
    pdf_url: Optional[str]
    total_cost: float
    total_input_tokens: int
    total_output_tokens: int
    total_cached_tokens: int

    class Config:
        from_attributes = True


class SimulationMessageCreate(BaseModel):
    session_id: UUID
    role: str
    content: str
    input_tokens: int = 0
    output_tokens: int = 0
    cached_tokens: int = 0
    cost: float = 0


class SimulationMessageOut(BaseModel):
    id: UUID
    session_id: UUID
    role: str
    content: str
    input_tokens: int
    output_tokens: int
    cached_tokens: int
    cost: float
    created_at: datetime

    class Config:
        from_attributes = True


# ── Evaluaciones ──────────────────────────────────────────────────────────────
class EvaluationCreate(BaseModel):
    scope: str  # "session" | "process"
    session_id: Optional[UUID] = None
    process_id: Optional[UUID] = None
    performance_range: Optional[str] = None
    total_score: Optional[int] = None
    conclusion: Optional[str] = None
    raw_json: Optional[str] = None


class EvaluationOut(BaseModel):
    id: UUID
    scope: str
    session_id: Optional[UUID]
    process_id: Optional[UUID]
    performance_range: Optional[str]
    total_score: Optional[int]
    conclusion: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Revisión docente ──────────────────────────────────────────────────────────
class TeacherReviewCreate(BaseModel):
    process_id: UUID
    teacher_id: UUID
    feedback: Optional[str] = None
    observacion: Optional[str] = None
    nota: Optional[float] = None
    estado: str = "pendiente"


class TeacherReviewOut(BaseModel):
    id: UUID
    process_id: UUID
    teacher_id: UUID
    feedback: Optional[str]
    observacion: Optional[str]
    nota: Optional[float]
    estado: str
    created_at: datetime

    class Config:
        from_attributes = True
