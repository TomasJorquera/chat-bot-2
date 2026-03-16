# Precios en USD por millón de tokens: (input, output, cache)
PRICING = {
    "gemini-flash-lite": (0.10, 0.40, 0.01),
    "gpt-nano":          (0.05, 0.40, 0.005),
    "deepseek-v3":       (0.28, 0.42, 0.028),
}


def calculate_cost(
    ia_asignada: str,
    tokens_input: int,
    tokens_output: int,
    tokens_cache: int = 0,
) -> float:
    """
    Calcula el costo en USD de una interacción.
    Los tokens_cache son parte de tokens_input pero tienen precio reducido.
    """
    prices = PRICING.get(ia_asignada)
    if not prices:
        return 0.0

    input_price, output_price, cache_price = prices
    non_cached = max(tokens_input - tokens_cache, 0)

    cost = (
        (non_cached    / 1_000_000) * input_price  +
        (tokens_cache  / 1_000_000) * cache_price  +
        (tokens_output / 1_000_000) * output_price
    )
    return round(cost, 6)
