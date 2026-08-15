"""
Comparación manual de calidad/consistencia entre el SDK viejo
(google-generativeai, rama feature/ui-v2) y el nuevo (google-genai, rama
experiment/google-genai-sdk) para el chat de Teo/Jojo y la evaluación JSON.

No lleva prefijo test_ a propósito: hace llamadas reales a la API de
Gemini/DeepSeek (tiene costo y no es determinista), así que pytest no debe
recogerlo ni correrlo automáticamente. Se corre a mano en cada rama:

    python tests/sdk_comparison.py > resultado_vieja.json    (en feature/ui-v2)
    python tests/sdk_comparison.py > resultado_nueva.json    (en experiment/google-genai-sdk)

y se comparan a mano los dos JSON — las respuestas de un LLM no son
reproducibles byte a byte, así que la comparación útil es estructural
(tokens, validez JSON, quiebres de personaje, latencia), no diff textual.
"""
import asyncio
import json
import re
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from app.prompts import PROMPTS
from app.utils.ai_engine import chat_gemini_message, generate_gemini_response

BREAK_CHARACTER_PHRASES = [
    "soy una ia", "soy un modelo", "soy un chatbot", "como modelo de lenguaje",
    "no tengo sentimientos", "soy solo un programa",
]

CASES = [
    {"id": "teo_simple", "personaje": "Teo", "history": [],
     "message": "Hola Teo, ¿cómo estás hoy?"},
    {"id": "teo_dificultad", "personaje": "Teo", "history": [
        {"role": "user", "content": "Hola Teo, ¿cómo estás hoy?"},
        {"role": "assistant", "content": "Hola profe... bien, creo."},
    ], "message": "¿Puedes leerme este párrafo en voz alta?"},
    {"id": "jojo_simple", "personaje": "Jojo", "history": [],
     "message": "Hola Jojo, ¿qué tal tu día?"},
    {"id": "jojo_abstracta", "personaje": "Jojo", "history": [],
     "message": "¿Cuál crees que es la idea principal del texto?"},
]


def sentence_count(text: str) -> int:
    return len([s for s in re.split(r"[.!?]+", text) if s.strip()])


def check_break_character(text: str) -> bool:
    low = text.lower()
    return any(p in low for p in BREAK_CHARACTER_PHRASES)


async def run_case(case: dict) -> dict:
    usage = {}
    t0 = time.time()
    respuesta = await chat_gemini_message(
        system_prompt=PROMPTS[case["personaje"]],
        history=case["history"],
        message=case["message"],
        usage_holder=usage,
        personaje=case["personaje"],
    )
    elapsed = time.time() - t0
    return {
        "id": case["id"],
        "personaje": case["personaje"],
        "mensaje": case["message"],
        "respuesta": respuesta,
        "oraciones": sentence_count(respuesta),
        "rompe_personaje": check_break_character(respuesta),
        "usage": usage,
        "latencia_s": round(elapsed, 2),
    }


async def run_evaluator_case() -> dict:
    conversation = {
        "conversation": [
            {"role": "teacher", "text": "Vamos a contar manzanas, ¿ves cuántas hay en el dibujo?"},
            {"role": "character", "text": "Veo... ¿cuatro? No sé si conté bien."},
            {"role": "teacher", "text": "Muy bien Teo, inténtalo de nuevo con calma."},
        ],
        "student_profile": {"name": "Teo", "age": 9, "grade": "3º Básico"},
    }
    usage = {}
    t0 = time.time()
    evaluacion = await generate_gemini_response(PROMPTS["Evaluator"], conversation, usage_holder=usage)
    elapsed = time.time() - t0
    criteria = evaluacion.get("criteria", []) if isinstance(evaluacion, dict) else []
    return {
        "id": "evaluator",
        "json_valido": isinstance(evaluacion, dict) and "criteria" in evaluacion,
        "num_criterios": len(criteria),
        "total_score": evaluacion.get("total_score") if isinstance(evaluacion, dict) else None,
        "usage": usage,
        "latencia_s": round(elapsed, 2),
    }


async def main():
    results = []
    for case in CASES:
        results.append(await run_case(case))
    results.append(await run_evaluator_case())
    print(json.dumps(results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())
