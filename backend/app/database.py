from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os

DATABASE_URL_FROM_ENV = os.getenv("DATABASE_URL")

if not DATABASE_URL_FROM_ENV:
    raise ValueError("La variable de entorno DATABASE_URL no está configurada.")

# Nos aseguramos de que la URL de conexión use el dialecto `+psycopg`
if DATABASE_URL_FROM_ENV.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL_FROM_ENV.replace("postgresql://", "postgresql+psycopg://", 1)
else:
    DATABASE_URL = DATABASE_URL_FROM_ENV

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()
