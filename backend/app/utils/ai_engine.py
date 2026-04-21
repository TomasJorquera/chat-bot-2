import os
import json
import re
import google.generativeai as genai
from openai import AsyncOpenAI

# ── Gemini (evaluación) ───────────────────────────────────────────────────────
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# ── DeepSeek (chat con agentes) ───────────────────────────────────────────────
deepseek_client = AsyncOpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY", ""),
    base_url="https://api.deepseek.com",
)


async def chat_deepseek_message(system_prompt: str, history: list, message: str) -> str:
    """Envía un mensaje al agente usando DeepSeek y retorna la respuesta como texto."""
    messages = [{"role": "system", "content": system_prompt}]
    for h in history:
        role = h.get("role", "user")
        content = h.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": message})

    response = await deepseek_client.chat.completions.create(
        model="deepseek-chat",
        messages=messages,
        max_tokens=1024,
    )
    return response.choices[0].message.content.strip()


def _parse_json_text(text: str):
    """Intenta parsear JSON desde texto, eliminando markdown fences si es necesario."""
    clean = text.strip()
    if clean.startswith("```"):
        clean = re.sub(r"^```(?:json)?\r?\n?", "", clean)
        clean = re.sub(r"\r?\n?```$", "", clean).strip()
    try:
        return json.loads(clean)
    except Exception:
        pass
    obj_match = re.search(r"\{[\s\S]*\}", clean)
    if obj_match:
        try:
            return json.loads(obj_match.group(0))
        except Exception:
            pass
    return None


async def _evaluate_with_deepseek(prompt: str, conversation: dict) -> dict:
    """Fallback: evalúa usando DeepSeek cuando Gemini falla."""
    prompt_completo = prompt + "\n\nDevuelve ÚNICAMENTE JSON válido, sin texto adicional.\n\n" + json.dumps(conversation, indent=2, ensure_ascii=False)
    response = await deepseek_client.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": "user", "content": prompt_completo}],
        max_tokens=8192,
    )
    text = response.choices[0].message.content.strip()
    result = _parse_json_text(text)
    if result is None:
        raise Exception(f"DeepSeek response not valid JSON: {text[:300]}")
    return result


async def generate_gemini_response(prompt, conversation):
    """Evalúa una conversación usando Gemini con fallback a DeepSeek."""
    prompt_completo = prompt + "\n\n" + json.dumps(conversation, indent=2, ensure_ascii=False)

    # Intento 1: Gemini con response_mime_type=application/json
    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash-lite",
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                max_output_tokens=8192,
            ),
        )
        response = model.generate_content(prompt_completo)
        text = (response.text or "").strip()
        result = _parse_json_text(text)
        if result is not None:
            print("[AI_ENGINE] Gemini OK")
            return result
        print(f"[AI_ENGINE] Gemini parse failed, falling back to DeepSeek. Response: {text[:200]}")
    except Exception as e:
        print(f"[AI_ENGINE] Gemini error: {e}, falling back to DeepSeek")

    # Fallback: DeepSeek
    try:
        result = await _evaluate_with_deepseek(prompt, conversation)
        print("[AI_ENGINE] DeepSeek fallback OK")
        return result
    except Exception as e:
        print(f"[AI_ENGINE] DeepSeek fallback error: {e}")
        raise Exception(f"Evaluation failed on both Gemini and DeepSeek: {e}")


def iniciar_chat_con_historial(prompt_sistema, historial):
    """Mantiene compatibilidad con la ruta /chat — retorna sesión de chat Gemini."""
    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=prompt_sistema,
        )
        chat_session = model.start_chat(history=historial)
        return chat_session
    except Exception as e:
        print(f"[AI_ENGINE] Error al iniciar chat: {e}")
        raise e
