"""
Precios en USD por millón de tokens (verificados 2026-07-10 contra la
documentación oficial de cada proveedor).

- Gemini 2.5 Flash Lite: usado tanto para chat (Teo/Jojo) como para
  evaluación. Reemplazó a gemini-2.0-flash-lite, dado de baja por Google
  el 2026-06-01.
- gpt-4o-mini-tts: se factura distinto a un modelo de texto — el "input"
  son tokens de texto y el "output" son tokens de audio generado, mucho
  más caros. No hay descuento de caché.
- deepseek-v4-flash: reemplaza a deepseek-chat, deprecado 2026-07-24.
  Diferencia cache hit vs miss en el input.
"""

PRICING: dict[str, dict] = {
    "gemini-2.5-flash-lite": {
        "input":        0.10,   # texto/imagen/video
        "output":       0.40,
        "cache_read":   0.01,   # lectura de context cache
    },
    "deepseek-v4-flash": {
        "input_cache_hit":  0.0028,
        "input_cache_miss": 0.14,
        "output":           0.28,
    },
    "gpt-4o-mini-tts": {
        "input":  0.60,   # tokens de texto de entrada
        "output": 12.0,   # tokens de audio generado
    },
}

# Alias de nombres legacy -> nombres reales de modelo, para no romper
# datos/valores ya guardados con el nombre de grupo experimental.
MODEL_ALIASES: dict[str, str] = {
    "gemini-flash-lite": "gemini-2.5-flash-lite",
    "deepseek-v3":       "deepseek-v4-flash",
}


def calculate_cost(
    ia_asignada: str,
    tokens_input: int,
    tokens_output: int,
    tokens_cache: int = 0,
) -> float:
    """
    Calcula el costo exacto en USD de una interacción de chat/evaluación.

    - tokens_cache: tokens de entrada que vinieron de caché del proveedor.
    - El resto de tokens_input se factura a precio normal (cache miss).
    """
    model_key = MODEL_ALIASES.get(ia_asignada, ia_asignada)
    prices = PRICING.get(model_key)
    if not prices:
        return 0.0

    non_cached = max(tokens_input - tokens_cache, 0)

    if model_key == "deepseek-v4-flash":
        cost = (
            (tokens_cache  / 1_000_000) * prices["input_cache_hit"]  +
            (non_cached    / 1_000_000) * prices["input_cache_miss"] +
            (tokens_output / 1_000_000) * prices["output"]
        )
    elif model_key == "gpt-4o-mini-tts":
        # TTS no tiene descuento de caché: todo el input es "cache_miss".
        cost = (
            (tokens_input  / 1_000_000) * prices["input"] +
            (tokens_output / 1_000_000) * prices["output"]
        )
    else:
        # Gemini y cualquier otro proveedor con esquema input/output/cache_read
        cost = (
            (non_cached    / 1_000_000) * prices["input"]       +
            (tokens_cache  / 1_000_000) * prices["cache_read"]  +
            (tokens_output / 1_000_000) * prices["output"]
        )

    return round(cost, 8)


def cost_summary(ia_asignada: str, tokens_input: int, tokens_output: int, tokens_cache: int = 0) -> dict:
    """Retorna un dict con el desglose de costo para incluir en respuestas API."""
    return {
        "tokens_input":  tokens_input,
        "tokens_output": tokens_output,
        "tokens_cache":  tokens_cache,
        "request_cost":  calculate_cost(ia_asignada, tokens_input, tokens_output, tokens_cache),
    }
