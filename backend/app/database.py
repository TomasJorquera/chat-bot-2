from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os

DATABASE_URL_FROM_ENV = os.getenv("DATABASE_URL")

# Si la URL del entorno existe y comienza con "postgresql://", la adaptamos para usar el driver 'psycopg'.
if DATABASE_URL_FROM_ENV and DATABASE_URL_FROM_ENV.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL_FROM_ENV.replace("postgresql://", "postgresql+psycopg://", 1)
else:
    # Usamos la URL del entorno si existe, o un valor por defecto para desarrollo local.
    DATABASE_URL = DATABASE_URL_FROM_ENV or "postgresql+psycopg://admin:admin@localhost:5432/chatbotdb"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()
