import base64
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..models import Entrega, GeneracionVoz
from ..utils.ai_engine import generate_tts, estimate_tts_usage, get_audio_duration_ms
from ..utils.cost_tracker import calculate_cost
from .deps import get_db

router = APIRouter()


class TTSRequest(BaseModel):
    text: str
    agent: str  # "Teo" | "Jojo"
    entrega_id: Optional[int] = None          # si se pasa, el costo se acumula en esa entrega
    mensaje_entrega_id: Optional[int] = None  # turno exacto que originó este audio, si se conoce


@router.post("/tts")
async def text_to_speech(payload: TTSRequest, db: Session = Depends(get_db)):
    meta: dict = {}
    audio_bytes = await generate_tts(payload.text, payload.agent, meta_holder=meta)
    if not audio_bytes:
        return {"audio_b64": ""}

    usage = estimate_tts_usage(meta.get("clean_text", payload.text))
    cost = calculate_cost(usage["model"], usage["input_tokens"], usage["output_tokens"])

    # Traza completa de esta generación — siempre se guarda, tenga o no
    # entrega asociada (ej. prueba directa del docente sin sesión de alumno).
    db.add(GeneracionVoz(
        entrega_id=payload.entrega_id,
        mensaje_entrega_id=payload.mensaje_entrega_id,
        agente=payload.agent,
        modelo=usage["model"],
        voz=meta.get("voice_used", ""),
        formato="mp3",
        instrucciones=meta.get("instructions", ""),
        texto_enviado=meta.get("clean_text", payload.text),
        input_tokens=usage["input_tokens"],
        input_tokens_source=usage["input_tokens_source"],
        output_tokens=usage["output_tokens"],
        output_tokens_source=usage["output_tokens_source"],
        audio_duration_ms=get_audio_duration_ms(audio_bytes),
        audio_size_bytes=len(audio_bytes),
        costo_estimado_usd=cost,
    ))

    if payload.entrega_id is not None:
        entrega = db.query(Entrega).filter(Entrega.id == payload.entrega_id).first()
        if entrega:
            entrega.total_input_tokens  += usage["input_tokens"]
            entrega.total_output_tokens += usage["output_tokens"]
            entrega.total_cost_usd      += Decimal(str(cost))

    db.commit()

    return {"audio_b64": base64.b64encode(audio_bytes).decode("utf-8")}
