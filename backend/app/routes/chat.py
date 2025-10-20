from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from ..database import SessionLocal
from ..models import Message # Este import ya no es estrictamente necesario para el endpoint /chat
from ..utils.ai_engine import iniciar_chat_con_historial
from ..prompts import PROMPTS

router = APIRouter()

class ChatRequest(BaseModel): # Modelo Pydantic para validar el cuerpo de la petición
    message: str
    history: list # Aceptamos el historial que envía el frontend
    character: str

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
        print(f"[CHAT] Mensaje recibido: {user_message}")  # Depuración

        # Usamos el personaje recibido en la petición para obtener el prompt correcto
        prompt_base = PROMPTS.get(character_name)
        if not prompt_base:
            raise HTTPException(status_code=404, detail=f"Personaje '{character_name}' no encontrado.")
        
        historial_frontend = chat_request.history

        # 2. Iniciar una sesión de chat con el historial y enviar el último mensaje
        chat_session = iniciar_chat_con_historial(prompt_base, historial_frontend)
        response = chat_session.send_message(user_message)
        respuesta = response.text.strip()
        print(f"[CHAT] Respuesta enviada: {respuesta}")  # Depuración

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
