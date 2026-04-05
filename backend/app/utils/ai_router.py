"""
Router multi-modelo con rotación de API keys.

Soporta múltiples keys por modelo:
  - GOOGLE_API_KEYS=key1,key2,key3   (o GOOGLE_API_KEY para una sola)
  - DEEPSEEK_API_KEYS=key1,key2      (o DEEPSEEK_API_KEY para una sola)

La rotación es round-robin para distribuir carga y evitar rate limits.
"""
import os
import itertools
import google.generativeai as genai
from openai import AsyncOpenAI

# ── Configuración por modelo ──────────────────────────────────────────────────
MODELOS_CONFIG = {
    "gemini-flash-lite": {
        "provider":     "google",
        "model_id":     "gemini-2.5-flash-lite",
    },
    "deepseek-v3": {
        "provider":     "deepseek",
        "model_id":     "deepseek-chat",
    },
}


# ── Rotación de API keys ──────────────────────────────────────────────────────
def _load_keys(env_plural: str, env_single: str) -> list[str]:
    """Carga múltiples keys desde env (comma-separated) o una sola key."""
    multi = os.getenv(env_plural, "")
    if multi:
        return [k.strip() for k in multi.split(",") if k.strip()]
    single = os.getenv(env_single, "")
    return [single] if single else []


_google_keys   = _load_keys("GOOGLE_API_KEYS",   "GOOGLE_API_KEY")
_deepseek_keys = _load_keys("DEEPSEEK_API_KEYS", "DEEPSEEK_API_KEY")

_google_cycle   = itertools.cycle(_google_keys)   if _google_keys   else None
_deepseek_cycle = itertools.cycle(_deepseek_keys) if _deepseek_keys else None


def get_next_api_key(provider: str) -> str:
    """Retorna la siguiente API key disponible (round-robin)."""
    if provider == "google"   and _google_cycle:
        return next(_google_cycle)
    if provider == "deepseek" and _deepseek_cycle:
        return next(_deepseek_cycle)
    return ""


def get_model_config(ia_asignada: str) -> dict:
    config = MODELOS_CONFIG.get(ia_asignada)
    if not config:
        raise ValueError(f"Modelo desconocido: '{ia_asignada}'")
    return config


# ── Dispatcher principal ──────────────────────────────────────────────────────
async def call_ai(
    messages: list,        # historial [{role: "user"|"assistant", content: str}]
    user_message: str,
    ia_asignada: str,
    system_prompt: str,
) -> dict:
    """
    Llama al proveedor correcto y retorna:
        {
            "content":       str,
            "tokens_input":  int,
            "tokens_output": int,
            "tokens_cache":  int,
        }
    """
    config   = get_model_config(ia_asignada)
    provider = config["provider"]
    api_key  = get_next_api_key(provider)

    if provider == "google":
        return await _call_gemini(messages, user_message, system_prompt, config["model_id"], api_key)

    if provider == "deepseek":
        return await _call_openai_compatible(messages, user_message, system_prompt, config, api_key)

    raise ValueError(f"Proveedor no soportado: '{provider}'")


# ── Gemini ────────────────────────────────────────────────────────────────────
async def _call_gemini(
    messages: list,
    user_message: str,
    system_prompt: str,
    model_id: str,
    api_key: str,
) -> dict:
    genai.configure(api_key=api_key)

    history = [
        {
            "role":  "user" if m["role"] == "user" else "model",
            "parts": [m["content"]],
        }
        for m in messages
    ]

    model = genai.GenerativeModel(
        model_name=model_id,
        system_instruction=system_prompt,
    )
    chat_session = model.start_chat(history=history)
    response     = chat_session.send_message(user_message)

    usage         = response.usage_metadata
    tokens_input  = getattr(usage, "prompt_token_count",           0) or 0
    tokens_output = getattr(usage, "candidates_token_count",        0) or 0
    tokens_cache  = getattr(usage, "cached_content_token_count",    0) or 0

    return {
        "content":       response.text.strip(),
        "tokens_input":  tokens_input,
        "tokens_output": tokens_output,
        "tokens_cache":  tokens_cache,
    }


# ── DeepSeek (formato OpenAI compatible) ─────────────────────────────────────
async def _call_openai_compatible(
    messages: list,
    user_message: str,
    system_prompt: str,
    config: dict,
    api_key: str,
) -> dict:
    client = AsyncOpenAI(
        api_key=api_key,
        base_url="https://api.deepseek.com",
    )

    openai_messages = [{"role": "system", "content": system_prompt}]
    for m in messages:
        openai_messages.append({"role": m["role"], "content": m["content"]})
    openai_messages.append({"role": "user", "content": user_message})

    response = await client.chat.completions.create(
        model=config["model_id"],
        messages=openai_messages,
    )

    usage         = response.usage
    tokens_input  = usage.prompt_tokens            if usage else 0
    tokens_output = usage.completion_tokens        if usage else 0
    tokens_cache  = 0
    if usage and hasattr(usage, "prompt_cache_hit_tokens"):
        tokens_cache = getattr(usage, "prompt_cache_hit_tokens", 0) or 0
    elif usage and hasattr(usage, "prompt_tokens_details") and usage.prompt_tokens_details:
        tokens_cache = getattr(usage.prompt_tokens_details, "cached_tokens", 0) or 0

    return {
        "content":       response.choices[0].message.content.strip(),
        "tokens_input":  tokens_input,
        "tokens_output": tokens_output,
        "tokens_cache":  tokens_cache,
    }
