from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from .routes import chat, evaluation, auth, experimento, admin, simulacion
from .database import engine, Base

# Crea todas las tablas (existentes + nuevas) al iniciar
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Chatbot Educativo API",
    description="API para interactuar con los chatbots Teo y Jojo.",
    version="2.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost",
        "https://chat-bot2-frontend.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers existentes ────────────────────────────────────────────────────────
app.include_router(chat.router,       tags=["Chat"])
app.include_router(evaluation.router, tags=["Evaluation"])

# ── Routers nuevos ────────────────────────────────────────────────────────────
app.include_router(auth.router,        prefix="/auth",        tags=["Auth"])
app.include_router(experimento.router, prefix="/experimento", tags=["Experimento"])
app.include_router(admin.router,       prefix="/admin",       tags=["Admin"])
app.include_router(simulacion.router,  prefix="/simulacion",  tags=["Simulacion"])

# ── Archivos estáticos (planificaciones subidas por alumnos) ──────────────────
uploads_dir = "uploads"
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")
