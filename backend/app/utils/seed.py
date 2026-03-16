"""
Script de seed: inserta las 9 cuentas de docentes experimentadores.

Uso:
    cd backend
    python -m app.utils.seed
"""
import os
import sys
from pathlib import Path

# Permite ejecutar desde la carpeta backend/ sin instalar el paquete
sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

from passlib.context import CryptContext
from app.database import SessionLocal, engine, Base
from app.models import Alumno  # noqa: F401 — necesario para que Base lo registre

Base.metadata.create_all(bind=engine)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEFAULT_PASSWORD = os.getenv("SEED_PASSWORD_DEFAULT", "password123")

# Distribución ciega: el grupo visible NO revela el modelo
DOCENTES = [
    # Grupo A → gemini-flash-lite
    {"correo": "docente_01@correo.uss.cl", "grupo": "A", "ia_asignada": "gemini-flash-lite"},
    {"correo": "docente_02@correo.uss.cl", "grupo": "A", "ia_asignada": "gemini-flash-lite"},
    {"correo": "docente_03@correo.uss.cl", "grupo": "A", "ia_asignada": "gemini-flash-lite"},
    # Grupo B → gpt-nano
    {"correo": "docente_04@correo.uss.cl", "grupo": "B", "ia_asignada": "gpt-nano"},
    {"correo": "docente_05@correo.uss.cl", "grupo": "B", "ia_asignada": "gpt-nano"},
    {"correo": "docente_06@correo.uss.cl", "grupo": "B", "ia_asignada": "gpt-nano"},
    # Grupo C → deepseek-v3
    {"correo": "docente_07@correo.uss.cl", "grupo": "C", "ia_asignada": "deepseek-v3"},
    {"correo": "docente_08@correo.uss.cl", "grupo": "C", "ia_asignada": "deepseek-v3"},
    {"correo": "docente_09@correo.uss.cl", "grupo": "C", "ia_asignada": "deepseek-v3"},
]


def run():
    db = SessionLocal()
    creados = 0
    omitidos = 0
    try:
        for d in DOCENTES:
            existe = db.query(Alumno).filter(Alumno.correo == d["correo"]).first()
            if existe:
                print(f"  [OMITIDO] {d['correo']} ya existe.")
                omitidos += 1
                continue

            alumno = Alumno(
                correo          = d["correo"],
                contrasena_hash = pwd_context.hash(DEFAULT_PASSWORD),
                ia_asignada     = d["ia_asignada"],
                grupo           = d["grupo"],
                activo          = True,
            )
            db.add(alumno)
            creados += 1
            print(f"  [OK] {d['correo']}  grupo={d['grupo']}")

        db.commit()
        print(f"\nSeed completado: {creados} creados, {omitidos} omitidos.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
