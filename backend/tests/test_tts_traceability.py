"""
Tests de la trazabilidad de costo de voz (app/utils/ai_engine.py):
- estimate_tts_usage(): tokens de entrada exactos vs. salida estimada,
  cada uno con su fuente marcada por separado.
- get_audio_duration_ms(): duración real leída del mp3, nunca inventada.
"""
import io
import struct

import pytest

from app.utils.ai_engine import estimate_tts_usage, get_audio_duration_ms


# ── estimate_tts_usage() ────────────────────────────────────────────────────

def test_input_tokens_son_exactos_no_aproximados_por_caracter():
    # "Hola" en o200k_base es 1 solo token — la vieja fórmula len//4 daba 1
    # por casualidad, pero con texto más largo la diferencia es clara.
    usage = estimate_tts_usage("Hola, ¿cómo estás hoy?")
    old_approximation = len("Hola, ¿cómo estás hoy?") // 4
    assert usage["input_tokens"] != old_approximation
    assert usage["input_tokens"] > 0


def test_fuente_de_tokens_queda_marcada_por_separado():
    usage = estimate_tts_usage("Un texto cualquiera de prueba.")
    assert usage["input_tokens_source"] == "tiktoken"
    assert usage["output_tokens_source"] == "estimated"


def test_texto_vacio_no_rompe():
    usage = estimate_tts_usage("")
    assert usage["input_tokens"] == 0
    assert usage["output_tokens"] >= 1  # max(1, ...) en la fórmula de salida


def test_input_tokens_crece_con_el_texto():
    corto = estimate_tts_usage("Hola")
    largo = estimate_tts_usage("Hola " * 200)
    assert largo["input_tokens"] > corto["input_tokens"]


# ── get_audio_duration_ms() ─────────────────────────────────────────────────

def test_duracion_none_si_no_es_mp3_valido():
    assert get_audio_duration_ms(b"esto no es un mp3") is None


def test_duracion_none_con_bytes_vacios():
    assert get_audio_duration_ms(b"") is None


def _build_silent_mp3(num_frames: int = 20) -> bytes:
    """
    Construye un mp3 mínimo válido (MPEG1 Layer III, 44.1kHz, 128kbps,
    silencio) concatenando frames con el header correcto, para poder
    verificar que la duración se lee de metadatos reales y no se inventa.
    """
    # Header: sync(11) + MPEG1(2)=11 + Layer3(2)=01 + no CRC(1)=1 +
    # bitrate_index=1001 (128kbps) + samplerate_index=00 (44100) + pad(0) +
    # priv(0) + channel=11 (mono) + resto en 0.
    header = bytes([0xFF, 0xFB, 0x90, 0xC4])
    frame_size = 417  # tamaño estándar de un frame a 128kbps/44.1kHz sin padding
    frame = header + b"\x00" * (frame_size - len(header))
    return frame * num_frames


def test_duracion_real_de_un_mp3_valido():
    audio = _build_silent_mp3(num_frames=20)
    duration_ms = get_audio_duration_ms(audio)
    assert duration_ms is not None
    # 20 frames a 44.1kHz/MPEG1-L3 (1152 samples/frame) ≈ 522ms
    assert 400 < duration_ms < 700
