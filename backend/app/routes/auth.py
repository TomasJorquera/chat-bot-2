import os
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import jwt
from passlib.context import CryptContext

from ..database import SessionLocal
from ..models import Alumno
from ..schemas import AlumnoLogin, TokenResponse

router = APIRouter()

# ── Seguridad ─────────────────────────────────────────────────────────────────
SECRET_KEY  = os.getenv("SECRET_KEY", "cambia_esta_clave_en_produccion")
ALGORITHM   = "HS256"
TOKEN_EXPIRE_HOURS = 12

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


# ── DB dependency ─────────────────────────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
def login(payload: AlumnoLogin, db: Session = Depends(get_db)):
    alumno = db.query(Alumno).filter(Alumno.correo == payload.correo).first()

    if not alumno or not verify_password(payload.contrasena, alumno.contrasena_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos.",
        )

    if not alumno.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta desactivada. Contacta al administrador.",
        )

    # Rol admin: cuentas @admin.uss.cl (habilita endpoints protegidos por get_admin_token)
    rol = "admin" if alumno.correo.endswith("@admin.uss.cl") else None

    # El token NO incluye ia_asignada → experimento ciego
    token_payload = {"sub": alumno.correo, "grupo": alumno.grupo}
    if rol:
        token_payload["rol"] = rol
    token = create_access_token(token_payload)

    return TokenResponse(
        access_token=token,
        correo=alumno.correo,
        grupo=alumno.grupo,
    )
