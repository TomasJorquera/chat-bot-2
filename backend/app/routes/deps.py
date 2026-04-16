"""Dependencias FastAPI compartidas entre rutas."""
import os
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from ..database import SessionLocal
from ..models import Alumno

SECRET_KEY = os.getenv("SECRET_KEY", "cambia_esta_clave_en_produccion")
ALGORITHM  = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_alumno(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Alumno:
    credentials_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o expirado.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        correo: str = payload.get("sub")
        if not correo:
            raise credentials_error
    except JWTError:
        raise credentials_error

    alumno = db.query(Alumno).filter(Alumno.correo == correo).first()
    if not alumno or not alumno.activo:
        raise credentials_error
    return alumno


def get_admin_token(token: str = Depends(oauth2_scheme)) -> dict:
    """Solo valida que el token tenga rol=admin."""
    error = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Acceso restringido a administradores.",
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("rol") != "admin":
            raise error
        return payload
    except JWTError:
        raise error
