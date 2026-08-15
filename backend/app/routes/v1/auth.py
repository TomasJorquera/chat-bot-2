from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ... import models_v2 as m
from ...schemas_v2 import UserLogin, TokenResponseV2
from .deps import get_db, verify_password, create_access_token

router = APIRouter()


@router.post("/login", response_model=TokenResponseV2)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(m.User).filter(m.User.correo == payload.correo).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos.",
        )
    if not user.activo:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cuenta desactivada.")

    token = create_access_token(str(user.id), user.role.nombre)
    return TokenResponseV2(access_token=token, user=user)
