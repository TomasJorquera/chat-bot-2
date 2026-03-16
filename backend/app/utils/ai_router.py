import os
import google.generativeai as genai
from openai import AsyncOpenAI

# ── Configuración por modelo ──────────────────────────────────────────────────
MODELOS_CONFIG = {
    "gemini-flash-lite": {
        "provider":     "google",
        "model_id":     "gemini-2.5-flash-lite",
        "input_price":  0.10,
        "output_price": 0.40,
        "cache_price":  0.01,
    },
    "gpt-nano": {
        "provider":     "openai",
        "model_id":     "gpt-4o-mini",
        "input_price":  0.15,
        "output_price": 0.60,
        "cache_price":  0.075,
    },
    "deepseek-v3": {
        "provider":     "deepseek",
        "model_id":     "deepseek-chat",
        "input_price":  0.28,
        "output_price": 0.42,
        "cache_price":  0.028,
    },
}


def get_model_config(ia_asignada: str) -> dict:
    config = MODELOS_CONFIG.get(ia_asignada)
    if not config:
        raise ValueError(f"Modelo desconocido: '{ia_asignada}'")
    return config


async def call_ai(
    messages: list,        # historial previo [{role: "user"|"assistant", content: str}]
    user_message: str,     # mensaje nuevo del docente
    ia_asignada: str,
    system_prompt: str,
) -> dict:
    """
    Llama al proveedor de IA correcto según ia_asignada.

    Retorna:
        {
            "content":       str,
            "tokens_input":  int,
            "tokens_output": int,
            "tokens_cache":  int,
        }
    """
    config = get_model_config(ia_asignada)
    provider = config["provider"]

    if provider == "google":
        return await _call_gemini(messages, user_message, system_prompt, config["model_id"])

    elif provider in ("openai", "deepseek"):
        return await _call_openai_compatible(messages, user_message, system_prompt, config, provider)

    raise ValueError(f"Proveedor no soportado: '{provider}'")


# ── Gemini ────────────────────────────────────────────────────────────────────
async def _call_gemini(
    messages: list,
    user_message: str,
    system_prompt: str,
    model_id: str,
) -> dict:
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

    # Convertir historial al formato Gemini: role "user"/"model"
    history = [
        {
            "role": "user" if m["role"] == "user" else "model",
            "parts": [m["content"]],
        }
        for m in messages
    ]

    model = genai.GenerativeModel(
        model_name=model_id,
        system_instruction=system_prompt,
    )
    chat_session = model.start_chat(history=history)
    response = chat_session.send_message(user_message)

    # Extraer tokens del usage_metadata
    usage = response.usage_metadata
    tokens_input  = getattr(usage, "prompt_token_count", 0) or 0
    tokens_output = getattr(usage, "candidates_token_count", 0) or 0
    tokens_cache  = getattr(usage, "cached_content_token_count", 0) or 0

    return {
        "content":       response.text.strip(),
        "tokens_input":  tokens_input,
        "tokens_output": tokens_output,
        "tokens_cache":  tokens_cache,
    }


# ── OpenAI / DeepSeek (mismo formato) ────────────────────────────────────────
async def _call_openai_compatible(
    messages: list,
    user_message: str,
    system_prompt: str,
    config: dict,
    provider: str,
) -> dict:
    if provider == "deepseek":
        client = AsyncOpenAI(
            api_key=os.getenv("DEEPSEEK_API_KEY"),
            base_url="https://api.deepseek.com",
        )
    else:
        client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    # Construir lista completa de mensajes en formato OpenAI
    openai_messages = [{"role": "system", "content": system_prompt}]
    for m in messages:
        openai_messages.append({
            "role":    m["role"],           # "user" | "assistant"
            "content": m["content"],
        })
    openai_messages.append({"role": "user", "content": user_message})

    response = await client.chat.completions.create(
        model=config["model_id"],
        messages=openai_messages,
    )

    usage = response.usage
    tokens_input  = usage.prompt_tokens if usage else 0
    tokens_output = usage.completion_tokens if usage else 0
    # cached_tokens disponible en prompt_tokens_details (OpenAI o1 / gpt-4o)
    tokens_cache = 0
    if usage and hasattr(usage, "prompt_tokens_details") and usage.prompt_tokens_details:
        tokens_cache = getattr(usage.prompt_tokens_details, "cached_tokens", 0) or 0

    return {
        "content":       response.choices[0].message.content.strip(),
        "tokens_input":  tokens_input,
        "tokens_output": tokens_output,
        "tokens_cache":  tokens_cache,
    }
