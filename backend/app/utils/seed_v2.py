"""
Seed inicial de la arquitectura Fase 2 (plataforma educativa).

Uso:
    cd backend
    python -m app.utils.seed_v2

Idempotente: si un registro ya existe (por nombre/correo/código único) se
omite en vez de duplicarse.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

from app.database import SessionLocal
from app import models_v2 as m
from app.prompts import PROMPTS
from app.routes.v1.deps import hash_password
from app.utils.cost_tracker import PRICING

DEFAULT_PASSWORD = "password123"


def get_or_create(db, model, defaults=None, **filters):
    instance = db.query(model).filter_by(**filters).first()
    if instance:
        return instance, False
    params = {**filters, **(defaults or {})}
    instance = model(**params)
    db.add(instance)
    db.flush()
    return instance, True


def run():
    db = SessionLocal()
    try:
        # ── Roles ─────────────────────────────────────────────────────────
        roles = {}
        for nombre in ["admin", "teacher", "student", "evaluator"]:
            role, created = get_or_create(db, m.Role, nombre=nombre)
            roles[nombre] = role
            print(f"  [{'OK' if created else 'OMITIDO'}] rol '{nombre}'")

        # ── Modelos IA (tarifas reales, ver app/utils/cost_tracker.py) ─────
        gemini_pricing = PRICING["gemini-2.5-flash-lite"]
        chat_model, _ = get_or_create(
            db, m.AIModel, nombre="gemini-2.5-flash-lite",
            defaults=dict(provider="google", tipo="chat",
                          input_cost=gemini_pricing["input"],
                          output_cost=gemini_pricing["output"],
                          cache_cost=gemini_pricing["cache_read"], activo=True),
        )
        tts_pricing = PRICING["gpt-4o-mini-tts"]
        tts_model, _ = get_or_create(
            db, m.AIModel, nombre="gpt-4o-mini-tts",
            defaults=dict(provider="openai", tipo="tts",
                          input_cost=tts_pricing["input"],
                          output_cost=tts_pricing["output"],
                          cache_cost=0, activo=True),
        )
        deepseek_pricing = PRICING["deepseek-v4-flash"]
        fallback_model, _ = get_or_create(
            db, m.AIModel, nombre="deepseek-v4-flash",
            defaults=dict(provider="deepseek", tipo="chat",
                          input_cost=deepseek_pricing["input_cache_miss"],
                          output_cost=deepseek_pricing["output"],
                          cache_cost=deepseek_pricing["input_cache_hit"], activo=True),
        )
        print("  [OK] modelos IA base (gemini-2.5-flash-lite, gpt-4o-mini-tts, deepseek-v4-flash) con tarifas reales")

        # ── Agentes IA + perfiles ─────────────────────────────────────────
        teo_agent, _ = get_or_create(
            db, m.AIAgent, nombre="Teo",
            defaults=dict(
                descripcion="9 años, Trastorno Específico del Aprendizaje en lectura/escritura (DEA F81.0), 3° básico.",
                categoria="DEA", edad=9, nivel_educativo="3° Básico", activo=True,
            ),
        )
        jojo_agent, _ = get_or_create(
            db, m.AIAgent, nombre="Jojo",
            defaults=dict(
                descripcion="15 años, Discapacidad Intelectual Leve (DIL), foco en transición a la vida adulta (TVA).",
                categoria="DIL", edad=15, nivel_educativo="1° Medio", activo=True,
            ),
        )

        get_or_create(
            db, m.AgentProfile, agent_id=teo_agent.id, version="v1",
            defaults=dict(
                nombre_version="Teo - perfil inicial",
                system_prompt=PROMPTS["Teo"],
                chat_model_id=chat_model.id,
                tts_model_id=tts_model.id,
                tts_voice="alloy",
                temperature=0.8, max_tokens=1024, top_p=0.95,
                activo=True,
            ),
        )
        get_or_create(
            db, m.AgentProfile, agent_id=jojo_agent.id, version="v1",
            defaults=dict(
                nombre_version="Jojo - perfil inicial",
                system_prompt=PROMPTS["Jojo"],
                chat_model_id=chat_model.id,
                tts_model_id=tts_model.id,
                tts_voice="verse",
                temperature=0.8, max_tokens=1024, top_p=0.95,
                activo=True,
            ),
        )
        print("  [OK] agentes IA Teo y Jojo + perfiles v1")

        # ── Perfil de evaluación ──────────────────────────────────────────
        get_or_create(
            db, m.EvaluationProfile, nombre="Evaluador Pedagógico", version="v1",
            defaults=dict(
                descripcion="Evaluación de 11 criterios pedagógicos sobre la interacción docente-estudiante.",
                system_prompt=PROMPTS["Evaluator"],
                model_id=chat_model.id,
                activo=True,
            ),
        )
        print("  [OK] perfil de evaluación inicial")

        # ── Ramos base ────────────────────────────────────────────────────
        for codigo, nombre in [
            ("EDU-301", "Necesidades Educativas Especiales"),
            ("PSP-201", "Psicopedagogía"),
            ("INT-401", "Intervención Psicoeducativa"),
        ]:
            get_or_create(db, m.Subject, codigo=codigo, defaults=dict(nombre=nombre))
        print("  [OK] ramos base EDU-301, PSP-201, INT-401")

        # ── Usuarios de prueba ────────────────────────────────────────────
        get_or_create(
            db, m.User, correo="admin@docente.uss.cl",
            defaults=dict(
                nombre="Admin", apellido="Prueba",
                password_hash=hash_password(DEFAULT_PASSWORD),
                role_id=roles["admin"].id, activo=True,
            ),
        )
        get_or_create(
            db, m.User, correo="docente_prueba@docente.uss.cl",
            defaults=dict(
                nombre="Docente", apellido="Prueba",
                password_hash=hash_password(DEFAULT_PASSWORD),
                role_id=roles["teacher"].id, activo=True,
            ),
        )
        get_or_create(
            db, m.User, correo="estudiante_prueba@correo.uss.cl",
            defaults=dict(
                nombre="Estudiante", apellido="Prueba",
                password_hash=hash_password(DEFAULT_PASSWORD),
                role_id=roles["student"].id, activo=True,
            ),
        )
        print(f"  [OK] usuarios de prueba (admin, docente, estudiante) — password: '{DEFAULT_PASSWORD}'")

        db.commit()
        print("\nSeed Fase 2 completado.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
