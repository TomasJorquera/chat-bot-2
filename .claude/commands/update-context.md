Regenera el archivo CLAUDE.md del proyecto con el estado actual del código. Sigue estos pasos:

1. Lee los siguientes archivos para entender el estado actual:
   - backend/app/main.py (rutas registradas)
   - backend/app/models.py (modelos de BD)
   - backend/app/routes/ (todos los archivos de rutas)
   - backend/app/prompts.py (agentes disponibles)
   - backend/app/utils/ai_engine.py (motores de IA usados)
   - backend/requirements.txt (dependencias)
   - frontend/src/components/ (estructura de componentes)
   - frontend/src/context/AuthContext.tsx (lógica de autenticación)
   - docker-compose.yml (infraestructura)

2. Luego reescribe CLAUDE.md completo con las siguientes secciones:

# CLAUDE.md

## Project Purpose
(Describe el propósito académico: plataforma de simulación pedagógica para formación docente en Educación Especial USS. Ciclo: Planificar → Implementar → Evaluar → Reflexionar → Ajustar. Agentes: Teo y Jojo.)

## Development Commands
(Comandos reales para levantar frontend, backend y docker)

## Required Environment Variables
(Variables de .env del backend y frontend)

## Architecture
(Flujo de request real según el código actual, archivos clave con sus responsabilidades)

## User Roles
(Roles reales según AuthContext.tsx)

## API Endpoints
(Todos los endpoints reales registrados en main.py con sus prefijos)

## Simulation Flow
(Flujo completo alumno: desde SimulacionFlow.tsx hasta los endpoints de simulacion.py)

## Teacher Interface
(Qué muestra InterfaceTeacher.tsx y cómo obtiene los datos)

## Evaluation & PDF
(Cómo funciona la evaluación con Gemini/DeepSeek y cómo se genera el PDF)

## AI Agents
(Modelos usados: DeepSeek para chat, Gemini con fallback DeepSeek para evaluación)

## Database Models
(Tablas reales según models.py)

## Adding a New Character
(Pasos reales para agregar un agente nuevo)

3. Escribe el CLAUDE.md resultante al archivo. Sé específico con rutas, nombres de funciones y detalles técnicos reales — no uses descripciones genéricas.
