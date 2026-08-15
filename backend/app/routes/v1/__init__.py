"""Routers de la arquitectura Fase 2, montados bajo /api/v1 en app/main.py."""
from fastapi import APIRouter

from . import auth, users, academic, simulations, simulation_processes, simulation_sessions, evaluations, teacher_reviews

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["v1 - Auth"])
api_router.include_router(users.router, prefix="/users", tags=["v1 - Users"])
api_router.include_router(academic.router, prefix="/academic", tags=["v1 - Academic"])
api_router.include_router(simulations.router, prefix="/simulations", tags=["v1 - Simulations"])
api_router.include_router(simulation_processes.router, prefix="/simulation-processes", tags=["v1 - Simulation Processes"])
api_router.include_router(simulation_sessions.router, prefix="/simulation-sessions", tags=["v1 - Simulation Sessions"])
api_router.include_router(evaluations.router, prefix="/evaluations", tags=["v1 - Evaluations"])
api_router.include_router(teacher_reviews.router, prefix="/teacher-reviews", tags=["v1 - Teacher Reviews"])
