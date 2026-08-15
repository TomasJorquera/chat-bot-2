"""
Tests de `calculate_cost()` / `cost_summary()` en app/utils/cost_tracker.py.

Objetivo: proteger el cálculo de costos usado durante la experimentación real
(~100-120 alumnos) de una regresión silenciosa — un error aquí no rompe la
app, solo corrompe los datos de costo sin que nadie lo note hasta el
análisis final.
"""
import pytest

from app.utils.cost_tracker import calculate_cost, cost_summary, PRICING, MODEL_ALIASES


# ── Gemini 2.5 Flash Lite ──────────────────────────────────────────────────

def test_gemini_sin_cache():
    cost = calculate_cost("gemini-2.5-flash-lite", tokens_input=1_000_000, tokens_output=1_000_000)
    assert cost == pytest.approx(0.10 + 0.40)


def test_gemini_con_cache():
    # 1M input, 400k de esos vinieron de cache -> 600k se cobran a precio normal
    cost = calculate_cost("gemini-2.5-flash-lite", tokens_input=1_000_000, tokens_output=0, tokens_cache=400_000)
    assert cost == pytest.approx(0.6 * 0.10 + 0.4 * 0.01)


def test_gemini_alias_legacy():
    # "gemini-flash-lite" es el nombre de grupo experimental guardado en datos viejos
    aliased  = calculate_cost("gemini-flash-lite", tokens_input=1_000_000, tokens_output=1_000_000)
    real     = calculate_cost("gemini-2.5-flash-lite", tokens_input=1_000_000, tokens_output=1_000_000)
    assert aliased == real


# ── DeepSeek v4 Flash (fallback) ───────────────────────────────────────────

def test_deepseek_cache_hit_total():
    cost = calculate_cost("deepseek-v4-flash", tokens_input=1_000_000, tokens_output=0, tokens_cache=1_000_000)
    assert cost == pytest.approx(0.0028)


def test_deepseek_cache_miss_total():
    cost = calculate_cost("deepseek-v4-flash", tokens_input=1_000_000, tokens_output=0, tokens_cache=0)
    assert cost == pytest.approx(0.14)


def test_deepseek_output():
    cost = calculate_cost("deepseek-v4-flash", tokens_input=0, tokens_output=1_000_000)
    assert cost == pytest.approx(0.28)


def test_deepseek_alias_legacy():
    aliased = calculate_cost("deepseek-v3", tokens_input=1_000_000, tokens_output=0)
    real    = calculate_cost("deepseek-v4-flash", tokens_input=1_000_000, tokens_output=0)
    assert aliased == real


# ── TTS (gpt-4o-mini-tts) ──────────────────────────────────────────────────

def test_tts_input_y_output():
    cost = calculate_cost("gpt-4o-mini-tts", tokens_input=1_000_000, tokens_output=1_000_000)
    assert cost == pytest.approx(0.60 + 12.0)


def test_tts_no_tiene_descuento_de_cache():
    # tokens_cache se ignora para TTS: todo el input se cobra a precio pleno
    con_cache = calculate_cost("gpt-4o-mini-tts", tokens_input=1_000_000, tokens_output=0, tokens_cache=1_000_000)
    sin_cache = calculate_cost("gpt-4o-mini-tts", tokens_input=1_000_000, tokens_output=0, tokens_cache=0)
    assert con_cache == sin_cache == pytest.approx(0.60)


# ── Casos límite ────────────────────────────────────────────────────────────

def test_modelo_desconocido_retorna_cero():
    assert calculate_cost("modelo-que-no-existe", tokens_input=1000, tokens_output=1000) == 0.0


def test_sin_tokens_retorna_cero():
    assert calculate_cost("gemini-2.5-flash-lite", tokens_input=0, tokens_output=0) == 0.0


def test_cache_mayor_a_input_no_da_costo_negativo():
    # tokens_cache > tokens_input no debería producir non_cached negativo
    cost = calculate_cost("gemini-2.5-flash-lite", tokens_input=100, tokens_output=0, tokens_cache=500)
    assert cost >= 0


def test_redondeo_a_8_decimales():
    cost = calculate_cost("gemini-2.5-flash-lite", tokens_input=1, tokens_output=1)
    assert cost == round(cost, 8)


# ── cost_summary() ─────────────────────────────────────────────────────────

def test_cost_summary_shape_y_consistencia():
    summary = cost_summary("gemini-2.5-flash-lite", tokens_input=1_000_000, tokens_output=1_000_000, tokens_cache=0)
    assert summary == {
        "tokens_input":  1_000_000,
        "tokens_output": 1_000_000,
        "tokens_cache":  0,
        "request_cost":  calculate_cost("gemini-2.5-flash-lite", 1_000_000, 1_000_000, 0),
    }


# ── Guardas de configuración ────────────────────────────────────────────────
# Si estas tablas cambian sin querer (ej. se borra un modelo), todos los
# costos calculados con ese modelo silenciosamente pasan a valer $0.

def test_todos_los_modelos_de_pricing_tienen_claves_esperadas():
    esquemas = {
        "gemini-2.5-flash-lite": {"input", "output", "cache_read"},
        "deepseek-v4-flash":     {"input_cache_hit", "input_cache_miss", "output"},
        "gpt-4o-mini-tts":       {"input", "output"},
    }
    for model, expected_keys in esquemas.items():
        assert model in PRICING, f"{model} fue removido de PRICING"
        assert set(PRICING[model].keys()) == expected_keys

def test_todos_los_alias_apuntan_a_un_modelo_real():
    for alias, real_model in MODEL_ALIASES.items():
        assert real_model in PRICING, f"alias '{alias}' apunta a '{real_model}', que no está en PRICING"
