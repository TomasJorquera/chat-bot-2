import base64
from fastapi import APIRouter
from pydantic import BaseModel
from ..utils.ai_engine import generate_tts

router = APIRouter()


class TTSRequest(BaseModel):
    text: str
    agent: str  # "Teo" | "Jojo"


@router.post("/tts")
async def text_to_speech(payload: TTSRequest):
    audio_bytes = await generate_tts(payload.text, payload.agent)
    if not audio_bytes:
        return {"audio_b64": ""}
    return {"audio_b64": base64.b64encode(audio_bytes).decode("utf-8")}
