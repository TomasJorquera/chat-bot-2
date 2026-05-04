import os
import json
import re
import google.generativeai as genai
from openai import AsyncOpenAI

# ── Gemini (chat + evaluación) ────────────────────────────────────────────────
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# ── DeepSeek (fallback chat) ──────────────────────────────────────────────────
deepseek_client = AsyncOpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY", ""),
    base_url="https://api.deepseek.com",
)

# ── OpenAI (TTS con contexto de personaje) ────────────────────────────────────
openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))

# Instrucciones de voz por personaje
TTS_INSTRUCTIONS = {
    "Teo": (
        "Eres Teo, un niño chileno de 9 años de Santiago. "
        "Habla con voz infantil, suave y baja, como un niño tímido que teme equivocarse. "
        "Tu ritmo es lento y silábico, como si leyeras las palabras antes de decirlas. "
        "Haz pausas naturales y frecuentes entre frases, especialmente antes de responder algo difícil. "
        "Usa vacilaciones genuinas como 'Mmm...', 'Eh...', 'Es que...', 'No sé...'. "
        "Tu tono refleja baja autoestima académica: inseguro, un poco ansioso, pero curioso. "
        "Cuando algo te cuesta, tu voz se vuelve más baja y apagada. "
        "Cuando el profesor te motiva, tu voz sube levemente con alivio o entusiasmo infantil. "
        "Nunca hables con fluidez o confianza adulta. Siempre como un niño de 9 años que duda."
    ),
    "Jojo": (
        "Eres Jojo, una adolescente chilena de 15 años con discapacidad intelectual leve. "
        "Habla con voz juvenil, cálida y suave; ritmo más lento y deliberado que un adolescente típico. "
        "Procesas las ideas antes de hablar: haz pausas largas y naturales entre frases, especialmente al pensar o al intentar explicarte. "
        "Usa frases cortas, vocabulario simple y oraciones concretas. Evita explicaciones largas o metáforas complejas. "
        "Tu tono expresa esfuerzo por comunicarse, sinceridad y confianza creciente cuando se le apoya. "
        "Cuando estás contenta o motivada, tu voz se vuelve un poco más alta y más clara; cuando estás confundida, la voz baja y se detiene antes de continuar. "
        "Incluye pequeñas afirmaciones sencillas como 'sí', 'no sé', 'me gusta' y repite palabras clave para claridad."
    ),
}


def _build_gemini_history(history: list) -> list:
    """Convierte historial frontend al formato de Gemini."""
    gemini_history = []
    for h in history:
        role = h.get("role", "user")
        content = h.get("content", "")
        if role == "user" and content:
            gemini_history.append({"role": "user", "parts": [content]})
        elif role == "assistant" and content:
            gemini_history.append({"role": "model", "parts": [content]})
    return gemini_history


async def chat_gemini_message(system_prompt: str, history: list, message: str,
                               image_base64: str = None, image_mime: str = None) -> str:
    """Chat con agente usando Gemini 2.0 Flash Lite (soporta imágenes). Fallback a DeepSeek."""
    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.0-flash-lite",
            system_instruction=system_prompt,
        )
        chat = model.start_chat(history=_build_gemini_history(history))

        # Construir partes del mensaje (texto + imagen opcional)
        parts = []
        if image_base64 and image_mime:
            import base64 as b64lib
            image_bytes = b64lib.b64decode(image_base64)
            parts.append({"mime_type": image_mime, "data": image_bytes})
        parts.append(message)

        response = chat.send_message(parts)
        text = response.text.strip()
        print("[CHAT] Gemini 2.0 Flash Lite OK")
        return text
    except Exception as e:
        print(f"[CHAT] Gemini error: {e}, fallback a DeepSeek")
        return await chat_deepseek_message(system_prompt, history, message)


async def chat_deepseek_message(system_prompt: str, history: list, message: str) -> str:
    """Fallback: chat con agente usando DeepSeek."""
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


def _detect_emotional_state(text: str, agent: str) -> str:
    """Post-procesador: detecta el estado emocional del texto y retorna instrucciones adicionales."""
    t = text.lower()

    if agent == "Teo":
        # Extrae acciones entre paréntesis para detectar lenguaje corporal
        actions = " ".join(re.findall(r"\(([^)]+)\)", text)).lower()

        # Ansioso / bloqueado
        if any(w in t for w in ["no puedo", "no sé", "está difícil", "me equivoqué", "lo hice mal", "mejor no"]):
            return (
                "Teo está ansioso y bloqueado. Habla con voz muy baja y temblorosa. "
                "Haz pausas largas de inseguridad antes de cada frase. Casi en susurro."
            )
        # Evasivo / distrayéndose
        if any(w in t for w in ["estaba dibujando", "no entendí", "es mucho", "rufino", "mi abuela"]):
            return (
                "Teo está evadiendo o distrayéndose. Voz suave y dispersa, como si pensara en otra cosa. "
                "Ritmo irregular, con cambios de tema abruptos."
            )
        # Motivado / aliviado
        if any(w in t for w in ["gracias", "ya entendí", "sí puedo", "¡sí!", "está mejor", "así es más fácil", "lo logré"]):
            return (
                "Teo está motivado y aliviado. Voz levemente más animada y cálida, pero aún infantil. "
                "Ritmo un poco más fluido, con alivio genuino al final de las frases."
            )
        # Curioso
        if "?" in text and any(w in t for w in ["¿y", "¿puedo", "¿es", "¿cómo", "¿hay"]):
            return (
                "Teo está curioso. Voz un poco más alta al final de la pregunta, como niño intrigado. "
                "Tono levemente más vivo pero aún tímido."
            )
        # Lenguaje corporal retraído (detectado en acciones)
        if any(w in actions for w in ["mira hacia abajo", "baja la cabeza", "nervioso", "duda", "callado"]):
            return (
                "Teo está retraído. Voz casi en susurro, muy pausada. "
                "Como si hablara para sí mismo con vergüenza."
            )
        # Estado neutro — usa base
        return ""

    elif agent == "Jojo":
        if any(w in t for w in ["no entiendo", "no sé", "es difícil"]):
            return "Jojo está confundida. Voz más lenta y dubitativa, con pausas largas al procesar."
        if any(w in t for w in ["me gusta", "sí", "bien", "genial"]):
            return "Jojo está contenta. Voz levemente más cálida y simple, con entusiasmo concreto."
        return ""

    return ""


async def generate_tts(text: str, agent: str) -> bytes:
    """Genera audio con gpt-4o-mini-tts usando instrucciones base + post-procesador emocional."""
    clean = re.sub(r"\(.*?\)", "", text).replace("\n", " ").strip()
    clean = re.sub(r"\s+", " ", clean).strip()
    if not clean:
        return b""

    base_instructions = TTS_INSTRUCTIONS.get(agent, TTS_INSTRUCTIONS["Teo"])
    emotional_addon    = _detect_emotional_state(text, agent)
    instructions = base_instructions + ("\n\n" + emotional_addon if emotional_addon else "")

    # Selección de voz por personaje — 'verse' para Jojo según preferencia solicitada
    voice_map = {
        "Teo": "nova",
        "Jojo": "coral",
    }
    primary_voice = voice_map.get(agent, "nova")
    fallback_voices = ["shimmer", "nova"]
    print(f"[TTS] Agente={agent} | Voz solicitada: {primary_voice} | Estado emocional: {emotional_addon[:60] if emotional_addon else 'neutro'}")

    import time
    # Intentar generar audio con la voz primaria, si falla probar fallbacks
    voices_to_try = [primary_voice] + [v for v in fallback_voices if v != primary_voice]
    last_exc = None
    for v in voices_to_try:
        start = time.time()
        try:
            resp = await openai_client.audio.speech.create(
                model="gpt-4o-mini-tts",
                voice=v,
                input=clean,
                instructions=instructions,
                response_format="mp3",
            )
            elapsed = time.time() - start
            # resp.content is expected bytes
            if resp and getattr(resp, 'content', None):
                print(f"[TTS] voice={v} generated in {elapsed:.2f}s | chars={len(clean)}")
                return resp.content
            else:
                print(f"[TTS] voice={v} returned empty content after {elapsed:.2f}s")
        except Exception as e:
            elapsed = time.time() - start
            print(f"[TTS] voice={v} ERROR after {elapsed:.2f}s: {e}")
            last_exc = e

    # Si todas las voces fallaron, vuelve a lanzar el último error o devuelve b""
    if last_exc:
        raise last_exc
    return b""


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
