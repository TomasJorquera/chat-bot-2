"""
Módulo de construcción de prompts.

Separa el prompt estático (cacheable por el proveedor) del contexto dinámico
que se puede inyectar en runtime según la sesión.
"""
from ..prompts import PROMPTS


def get_system_prompt(personaje: str, extra_context: dict | None = None) -> str:
    """
    Retorna el prompt base del personaje.

    Args:
        personaje: "Teo" | "Jojo" | "Evaluator"
        extra_context: dict opcional con datos de sesión para personalizar el prompt.
                       Ejemplo: {"fecha": "2026-03-29", "nivel": "avanzado"}

    Returns:
        Prompt completo listo para enviar como system_instruction.
    """
    base = PROMPTS.get(personaje, "")
    if not base:
        raise ValueError(f"Personaje '{personaje}' no encontrado.")

    if not extra_context:
        return base

    # Inyección dinámica: agrega contexto de sesión al inicio del prompt
    dynamic_lines = "\n".join(f"- {k}: {v}" for k, v in extra_context.items())
    dynamic_block = f"\n## Contexto de sesión\n{dynamic_lines}\n"

    return base + dynamic_block


def get_evaluator_prompt() -> str:
    """Retorna el prompt del evaluador pedagógico."""
    return PROMPTS.get("Evaluator", "")
