import os
import json
import re
import asyncio
from datetime import timedelta
import google.generativeai as genai
from google.generativeai import caching
from openai import AsyncOpenAI

from ..voice_profiles import get_voice_profile

# ── Gemini (chat + evaluación) ────────────────────────────────────────────────
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

# ── Caché explícito del prompt de personalidad de Teo/Jojo ───────────────────
# Sin esto, cada turno de chat paga precio completo por el prompt de
# personalidad completo (miles de tokens) aunque sea idéntico turno a turno.
# Cacheado, Gemini cobra ~10x menos por esos tokens (ver PRICING["cache_read"]
# en cost_tracker.py). El prompt del Evaluator queda fuera: tiene menos de
# los 1024 tokens mínimos que exige la API de caché para este modelo.
_CACHEABLE_PERSONAJES = {"Teo", "Jojo"}
_CACHE_TTL = timedelta(minutes=30)
_prompt_cache: dict[str, "caching.CachedContent"] = {}
_prompt_cache_locks: dict[str, asyncio.Lock] = {p: asyncio.Lock() for p in _CACHEABLE_PERSONAJES}


async def _get_cached_model(personaje: str, system_prompt: str):
    """
    Modelo Gemini construido sobre un CachedContent para `personaje`, creándolo
    o refrescando su TTL (ventana deslizante: solo se paga almacenamiento
    mientras el personaje se sigue usando) según haga falta.

    Retorna None si el caché no está disponible — el llamador debe caer al
    modelo sin caché en ese caso; un problema de facturación nunca debe
    romper el chat real de un estudiante.
    """
    async with _prompt_cache_locks[personaje]:
        cached = _prompt_cache.get(personaje)
        if cached is not None:
            try:
                cached.update(ttl=_CACHE_TTL)
                return genai.GenerativeModel.from_cached_content(cached)
            except Exception as e:
                print(f"[CACHE] {personaje}: caché inválido server-side ({e}), recreando")
                _prompt_cache.pop(personaje, None)

        try:
            cached = caching.CachedContent.create(
                model="models/gemini-2.5-flash-lite",
                display_name=f"prompt-{personaje}",
                system_instruction=system_prompt,
                ttl=_CACHE_TTL,
            )
            _prompt_cache[personaje] = cached
            print(f"[CACHE] {personaje}: caché creado ({cached.name})")
            return genai.GenerativeModel.from_cached_content(cached)
        except Exception as e:
            print(f"[CACHE] {personaje}: no se pudo crear caché ({e}), usando modelo sin caché")
            return None

# ── DeepSeek (fallback chat) ──────────────────────────────────────────────────
deepseek_client = AsyncOpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY", ""),
    base_url="https://api.deepseek.com",
)

# ── OpenAI (TTS con contexto de personaje) ────────────────────────────────────
openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))


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
                               image_base64: str = None, image_mime: str = None,
                               usage_holder: dict = None, personaje: str = None) -> str:
    """
    Chat con agente usando Gemini 2.5 Flash Lite (soporta imágenes). Fallback a DeepSeek.

    Si se pasa `usage_holder` (dict), se rellena in-place con
    {model, input_tokens, output_tokens, cached_tokens} para permitir
    registrar el costo real de la llamada sin cambiar la firma para quien
    no lo necesita (compatibilidad con rutas legacy que solo usan el texto).

    Si se pasa `personaje` ("Teo"|"Jojo"), reutiliza el caché explícito de su
    prompt de personalidad en vez de reenviarlo completo en cada turno.
    """
    try:
        model = None
        if personaje in _CACHEABLE_PERSONAJES:
            model = await _get_cached_model(personaje, system_prompt)
        if model is None:
            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash-lite",
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
        print("[CHAT] Gemini 2.5 Flash Lite OK")

        if usage_holder is not None:
            um = getattr(response, "usage_metadata", None)
            usage_holder.update({
                "model":         "gemini-2.5-flash-lite",
                "input_tokens":  getattr(um, "prompt_token_count", 0) or 0,
                "output_tokens": getattr(um, "candidates_token_count", 0) or 0,
                "cached_tokens": getattr(um, "cached_content_token_count", 0) or 0,
            })
        return text
    except Exception as e:
        print(f"[CHAT] Gemini error: {e}, fallback a DeepSeek")
        return await chat_deepseek_message(system_prompt, history, message, usage_holder=usage_holder)


async def chat_deepseek_message(system_prompt: str, history: list, message: str,
                                 usage_holder: dict = None) -> str:
    """Fallback: chat con agente usando DeepSeek."""
    messages = [{"role": "system", "content": system_prompt}]
    for h in history:
        role = h.get("role", "user")
        content = h.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": message})

    response = await deepseek_client.chat.completions.create(
        model="deepseek-v4-flash",
        messages=messages,
        max_tokens=1024,
    )

    if usage_holder is not None:
        usage = getattr(response, "usage", None)
        usage_holder.update({
            "model":         "deepseek-v4-flash",
            "input_tokens":  getattr(usage, "prompt_tokens", 0) or 0,
            "output_tokens": getattr(usage, "completion_tokens", 0) or 0,
            "cached_tokens": getattr(usage, "prompt_cache_hit_tokens", 0) or 0,
        })
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


async def generate_tts(text: str, agent: str, meta_holder: dict = None) -> bytes:
    """
    Genera audio con gpt-4o-mini-tts usando instrucciones base (desde
    voice_profiles.py) + post-procesador emocional.

    Si se pasa `meta_holder` (dict), se rellena in-place con
    {voice_used, instructions, clean_text} correspondientes a la llamada que
    efectivamente generó el audio — necesario porque se prueban varias voces
    en cascada y la que responde no siempre es la primaria solicitada.
    """
    clean = re.sub(r"\(.*?\)", "", text).replace("\n", " ").strip()
    clean = re.sub(r"\s+", " ", clean).strip()
    if not clean:
        return b""

    profile = get_voice_profile(agent)
    emotional_addon = _detect_emotional_state(text, agent)
    instructions = profile["instructions"] + ("\n\n" + emotional_addon if emotional_addon else "")

    primary_voice = profile["voice"]
    fallback_voices = profile["fallback_voices"]
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
                if meta_holder is not None:
                    meta_holder.update({"voice_used": v, "instructions": instructions, "clean_text": clean})
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


async def _evaluate_with_deepseek(prompt: str, conversation: dict, usage_holder: dict = None) -> dict:
    """Fallback: evalúa usando DeepSeek cuando Gemini falla."""
    prompt_completo = prompt + "\n\nDevuelve ÚNICAMENTE JSON válido, sin texto adicional.\n\n" + json.dumps(conversation, indent=2, ensure_ascii=False)
    response = await deepseek_client.chat.completions.create(
        model="deepseek-v4-flash",
        messages=[{"role": "user", "content": prompt_completo}],
        max_tokens=8192,
    )
    text = response.choices[0].message.content.strip()
    result = _parse_json_text(text)
    if result is None:
        raise Exception(f"DeepSeek response not valid JSON: {text[:300]}")

    if usage_holder is not None:
        usage = getattr(response, "usage", None)
        usage_holder.update({
            "model":         "deepseek-v4-flash",
            "input_tokens":  getattr(usage, "prompt_tokens", 0) or 0,
            "output_tokens": getattr(usage, "completion_tokens", 0) or 0,
            "cached_tokens": getattr(usage, "prompt_cache_hit_tokens", 0) or 0,
        })
    return result


async def generate_gemini_response(prompt, conversation, usage_holder: dict = None):
    """
    Evalúa una conversación usando Gemini con fallback a DeepSeek.

    Igual que en `chat_gemini_message`, `usage_holder` es opcional y se
    rellena in-place con el consumo real de tokens de la llamada que
    efectivamente respondió (Gemini o DeepSeek).
    """
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
            if usage_holder is not None:
                um = getattr(response, "usage_metadata", None)
                usage_holder.update({
                    "model":         "gemini-2.5-flash-lite",
                    "input_tokens":  getattr(um, "prompt_token_count", 0) or 0,
                    "output_tokens": getattr(um, "candidates_token_count", 0) or 0,
                    "cached_tokens": getattr(um, "cached_content_token_count", 0) or 0,
                })
            return result
        print(f"[AI_ENGINE] Gemini parse failed, falling back to DeepSeek. Response: {text[:200]}")
    except Exception as e:
        print(f"[AI_ENGINE] Gemini error: {e}, falling back to DeepSeek")

    # Fallback: DeepSeek
    try:
        result = await _evaluate_with_deepseek(prompt, conversation, usage_holder=usage_holder)
        print("[AI_ENGINE] DeepSeek fallback OK")
        return result
    except Exception as e:
        print(f"[AI_ENGINE] DeepSeek fallback error: {e}")
        raise Exception(f"Evaluation failed on both Gemini and DeepSeek: {e}")


_tiktoken_encoding = None


def _get_tiktoken_encoding():
    """Carga perezosa del encoding o200k_base (familia gpt-4o), compartido entre llamadas."""
    global _tiktoken_encoding
    if _tiktoken_encoding is None:
        import tiktoken
        _tiktoken_encoding = tiktoken.get_encoding("o200k_base")
    return _tiktoken_encoding


def estimate_tts_usage(text: str) -> dict:
    """
    gpt-4o-mini-tts no devuelve `usage` en /audio/speech, así que el costo
    de voz solo puede aproximarse. Los dos lados NO tienen la misma
    confiabilidad y se marcan por separado:

    - input_tokens: conteo EXACTO del texto de entrada con el tokenizador
      o200k_base (familia gpt-4o) vía tiktoken. No es una aproximación de
      caracteres — es el conteo real de tokens de ese texto.
    - output_tokens: OpenAI no publica cómo tokeniza el audio generado, así
      que esto sigue siendo una estimación calibrada sobre la duración
      típica de habla (~0.15 tokens de audio por caracter). No inventar
      un número más "exacto" que esto — la fuente honesta es "estimated".
    """
    encoding = _get_tiktoken_encoding()
    input_tokens = len(encoding.encode(text))
    output_tokens = max(1, round(len(text) * 0.15))
    return {
        "model": "gpt-4o-mini-tts",
        "input_tokens": input_tokens,
        "input_tokens_source": "tiktoken",
        "output_tokens": output_tokens,
        "output_tokens_source": "estimated",
        "cached_tokens": 0,
    }


def get_audio_duration_ms(audio_bytes: bytes) -> int | None:
    """
    Duración real del audio mp3 en milisegundos, leída de los metadatos del
    archivo (vía mutagen) — NUNCA estimada a partir de caracteres o bytes.
    Retorna None si el archivo no se puede parsear.
    """
    if not audio_bytes:
        return None
    try:
        import io
        from mutagen.mp3 import MP3
        audio = MP3(io.BytesIO(audio_bytes))
        return round(audio.info.length * 1000)
    except Exception as e:
        print(f"[TTS] No se pudo leer duración del mp3: {e}")
        return None


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
