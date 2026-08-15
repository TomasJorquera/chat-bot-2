from fastapi import APIRouter, Depends

from ...schemas_v2 import UserOut
from ... import models_v2 as m
from .deps import get_current_user

router = APIRouter()


@router.get("/me", response_model=UserOut)
def read_me(current_user: m.User = Depends(get_current_user)):
    return current_user
