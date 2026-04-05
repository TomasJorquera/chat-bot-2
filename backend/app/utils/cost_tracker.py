"""
Precios en USD por millón de tokens.
DeepSeek diferencia cache hit vs miss.
Gemini tiene precio reducido para tokens cacheados.
"""

PRICING: dict[str, dict] = {
    "gemini-flash-lite": {
        "input":        0.10,
        "output":       0.40,
        "cache_read":   0.01,    # lectura de context cache (90% descuento del input)
    },
    "deepseek-v3": {
        "input_cache_hit":  0.028,   # token ya en caché del proveedor (10%)
        "input_cache_miss": 0.28,    # token nuevo (sin caché)
        "output":           0.42,
    },
}


def calculate_cost(
    ia_asignada: str,
    tokens_input: int,
    tokens_output: int,
    tokens_cache: int = 0,
) -> float:
    """
    Calcula el costo exacto en USD de una interacción.

    - tokens_cache: tokens de entrada que vinieron de caché del proveedor.
    - El resto de tokens_input se factura a precio normal (cache miss).
    """
    prices = PRICING.get(ia_asignada)
    if not prices:
        return 0.0

    non_cached = max(tokens_input - tokens_cache, 0)

    if ia_asignada == "deepseek-v3":
        cost = (
            (tokens_cache  / 1_000_000) * prices["input_cache_hit"]  +
            (non_cached    / 1_000_000) * prices["input_cache_miss"] +
            (tokens_output / 1_000_000) * prices["output"]
        )
    else:
        # Gemini y cualquier otro proveedor Google
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
