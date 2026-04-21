"""
Seed script: crea 1 profesora, 5 alumnos y 1 simulación de prueba.
Ejecutar desde la carpeta backend/:
    python seed_test_data.py
"""
import os
import sys
from datetime import date

# Asegura que 'app' sea importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()  # carga backend/.env

from passlib.context import CryptContext
from app.database import SessionLocal, engine, Base
from app.models import Alumno, Simulacion

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # ── 1. Profesora ──────────────────────────────────────────────────────
        TEACHER_EMAIL = "profesora@docente.uss.cl"
        PASSWORD      = "Test1234"

        teacher = db.query(Alumno).filter(Alumno.correo == TEACHER_EMAIL).first()
        if not teacher:
            teacher = Alumno(
                correo          = TEACHER_EMAIL,
                contrasena_hash = pwd.hash(PASSWORD),
                ia_asignada     = "gemini-flash-lite",
                grupo           = "A",
                activo          = True,
            )
            db.add(teacher)
            db.flush()
            print(f"✓ Profesora creada:   {TEACHER_EMAIL}")
        else:
            print(f"ℹ Profesora ya existe: {TEACHER_EMAIL}")

        teacher_id = teacher.id

        # ── 2. Cinco alumnos ──────────────────────────────────────────────────
        NOMBRES = ["Ana García", "Luis Pérez", "María Torres", "Carlos Muñoz", "Sofía Ramos"]
        for i, nombre in enumerate(NOMBRES, start=1):
            email = f"alumno0{i}@correo.uss.cl"
            if not db.query(Alumno).filter(Alumno.correo == email).first():
                alumno = Alumno(
                    correo          = email,
                    contrasena_hash = pwd.hash(PASSWORD),
                    ia_asignada     = "gemini-flash-lite",
                    grupo           = "A",
                    activo          = True,
                )
                db.add(alumno)
                print(f"✓ Alumno creado:      {email}  ({nombre})")
            else:
                print(f"ℹ Alumno ya existe:   {email}")

        db.commit()

        # ── 3. Simulación para EDU-301 ────────────────────────────────────────
        SIM_NOMBRE = "Simulación Diagnóstica N°1 — Teo"
        sim = db.query(Simulacion).filter(
            Simulacion.nombre      == SIM_NOMBRE,
            Simulacion.ramo_codigo == "EDU-301",
        ).first()

        if not sim:
            sim = Simulacion(
                creado_por        = teacher_id,
                ramo_codigo       = "EDU-301",
                nombre            = SIM_NOMBRE,
                instrucciones     = (
                    "Deberás interactuar con Teo, un estudiante de 9 años con Dificultad "
                    "Específica del Aprendizaje (DEA · F81.0), que cursa 3° básico.\n\n"
                    "Tu objetivo es aplicar estrategias pedagógicas diferenciadas para apoyar "
                    "su proceso lector. Usa lenguaje adecuado a su edad, refuerzo positivo y "
                    "adapta el ritmo de la sesión a sus necesidades."
                ),
                objetivos         = (
                    "— Aplicar estrategias de apoyo pedagógico diferenciado\n"
                    "— Adaptar el lenguaje y el ritmo al perfil del alumno\n"
                    "— Desarrollar un vínculo pedagógico empático y respetuoso\n"
                    "— Fomentar la autonomía del estudiante"
                ),
                agente            = "Teo",
                num_interacciones = 2,
                fecha_inicio      = date(2026, 4, 17),
                fecha_termino     = date(2026, 6, 30),
                pauta_tipo        = "general",
                activo            = True,
            )
            db.add(sim)
            db.commit()
            db.refresh(sim)
            print(f"✓ Simulación creada:  '{SIM_NOMBRE}'  (ID={sim.id})")
        else:
            print(f"ℹ Simulación ya existe: '{SIM_NOMBRE}'  (ID={sim.id})")

        # ── Resumen ───────────────────────────────────────────────────────────
        print()
        print("═" * 52)
        print("  CREDENCIALES DE PRUEBA")
        print("═" * 52)
        print(f"  Profesora : {TEACHER_EMAIL}")
        print(f"  Alumnos   : alumno01..05@correo.uss.cl")
        print(f"  Contraseña: {PASSWORD}  (todos)")
        print(f"  Ramo      : EDU-301")
        print(f"  Simulación ID: {sim.id}")
        print("═" * 52)

    finally:
        db.close()


if __name__ == "__main__":
    seed()
