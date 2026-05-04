from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import SessionLocal
from ..models import Message
from ..utils.ai_engine import iniciar_chat_con_historial, chat_gemini_message
from ..prompts import PROMPTS

router = APIRouter()

class ChatRequest(BaseModel):
    message: str
    history: list
    character: str
    image_base64: Optional[str] = None   # imagen en base64 (opcional)
    image_mime: Optional[str] = None     # ej: "image/jpeg", "image/png"

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/chat")
async def chat(chat_request: ChatRequest, db: Session = Depends(get_db)):
    try:
        user_message = chat_request.message
        character_name = chat_request.character
        print(f"[CHAT] Mensaje recibido: {user_message}")

        prompt_base = PROMPTS.get(character_name)
        if not prompt_base:
            raise HTTPException(status_code=404, detail=f"Personaje '{character_name}' no encontrado.")

        # Gemini 2.0 Flash Lite — soporta texto e imagen
        respuesta = await chat_gemini_message(
            system_prompt=prompt_base,
            history=chat_request.history,
            message=user_message,
            image_base64=chat_request.image_base64,
            image_mime=chat_request.image_mime,
        )
        print(f"[CHAT] Respuesta enviada: {respuesta}")

        # 3. Guardar el nuevo intercambio en la base de datos
        db.add_all([
            Message(role="user", content=user_message, character=character_name),
            Message(role="assistant", content=respuesta, character=character_name)
        ])
        db.commit()

        return {"response": respuesta}
    except Exception as e:
        print(f"[CHAT] Error: {e}")  # Depuración
        raise HTTPException(status_code=500, detail=f"Error al procesar el chat: {str(e)}")

@router.post("/chat/restart")
def restart_chat(chat_request: dict, db: Session = Depends(get_db)):
    try:
        character_name = chat_request.get("character")
        if not character_name:
            raise HTTPException(status_code=400, detail="El nombre del personaje es requerido.")

        # Borra solo el historial del personaje especificado
        db.query(Message).filter(Message.character == character_name).delete()
        db.commit()
        return {"message": f"Historial de chat para {character_name} reiniciado exitosamente"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error al reiniciar el chat: {str(e)}")

class FinalizeRequest(BaseModel):
    character: str
    conversation: list
