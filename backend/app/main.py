from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import chat, evaluation
from .database import engine, Base

# Crea las tablas en la base de datos si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Chatbot Educativo API",
    description="API para interactuar con los chatbots Teo y Jojo.",
    version="1.0.0"
)

# Configuración de CORS para permitir que el frontend se conecte
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost",
        "https://chat-bot2-frontend.onrender.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluye las rutas definidas
app.include_router(chat.router, tags=["Chat"])
app.include_router(evaluation.router, tags=["Evaluation"])