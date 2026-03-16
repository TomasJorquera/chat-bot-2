from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ── Auth ─────────────────────────────────────────────────────────────────────
class AlumnoCreate(BaseModel):
    correo: str
    contrasena: str
    ia_asignada: str   # "gemini-flash-lite" | "gpt-nano" | "deepseek-v3"
    grupo: str         # "A" | "B" | "C"


class AlumnoLogin(BaseModel):
    correo: str
    contrasena: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    correo: str
    grupo: str           # visible al usuario (sabe su grupo, no su modelo)


# ── Experimento ───────────────────────────────────────────────────────────────
class InteraccionCreate(BaseModel):
    personaje: str       # "Teo" | "Jojo"


class MensajeRequest(BaseModel):
    interaccion_id: int
    personaje: str
    mensaje: str
    history: list        # historial de mensajes en formato [{role, content}]


class FinalizarRequest(BaseModel):
    interaccion_id: int
    puntaje_evaluador: Optional[int] = None
    pdf_url: Optional[str] = None


class InteraccionUpdate(BaseModel):
    tokens_input: int
    tokens_output: int
    tokens_cache: int
    costo_total_usd: float
    puntaje_evaluador: Optional[int] = None
    pdf_url: Optional[str] = None


# ── Admin ─────────────────────────────────────────────────────────────────────
class AlumnoOut(BaseModel):
    id: int
    correo: str
    ia_asignada: str
    grupo: str
    activo: bool
    creado_en: datetime

    class Config:
        from_attributes = True


class InteraccionOut(BaseModel):
    id: int
    correo: str
    ia_asignada: str
    personaje: str
    tokens_input: int
    tokens_output: int
    tokens_cache: int
    costo_total_usd: float
    inicio_datetime: datetime
    fin_datetime: Optional[datetime]
    puntaje_evaluador: Optional[int]
    pdf_url: Optional[str]

    class Config:
        from_attributes = True
