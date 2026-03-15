# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

An educational chatbot platform where student-teachers practice pedagogy by interacting with AI-simulated students with learning disabilities. The AI characters are:
- **Teo**: 9-year-old with Specific Learning Disorder in reading/writing (F81.0), 3rd grade
- **Jojo**: 15-year-old with Mild Intellectual Disability (DIL), focused on transition to adult life

After each session, the teacher's pedagogical performance is evaluated against 11 criteria and exported as a PDF report.

## Development Commands

### Frontend (React + Vite + TypeScript + Tailwind)
```bash
cd frontend
npm install          # install dependencies
npm run dev          # start dev server at http://localhost:5173
npm run build        # production build
npm run lint         # run ESLint
```

### Backend (FastAPI + Python)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload   # start API at http://localhost:8000
```

## Required Environment Variables

**Backend** (`backend/.env`):
- `DATABASE_URL` — PostgreSQL connection string (e.g. `postgresql://user:pass@host/db`)
- `GOOGLE_API_KEY` — Google Gemini API key

**Frontend** (`.env` in `frontend/`):
- `VITE_API_URL` — Backend URL (defaults to `http://localhost:8000` if not set)

## Architecture

### Request Flow
1. User types message in `ChatInterface.tsx`
2. Frontend sends `POST /chat` with `{ message, character, history }` — history is built client-side from the current session
3. Backend (`routes/chat.py`) retrieves the character's system prompt from `app/prompts.py`, passes it to Gemini via `iniciar_chat_con_historial()`, and returns the AI response
4. Messages are also persisted to PostgreSQL (`messages` table)
5. "Finalizar y guardar" button triggers `POST /evaluate` — Gemini evaluates the full conversation against the 11 pedagogical criteria and returns a structured JSON
6. `EvaluationPdfPreview.tsx` renders the evaluation for PDF export

### Key Files
- `backend/app/prompts.py` — `PROMPTS` dict containing system prompts for `"Teo"`, `"Jojo"`, and `"Evaluator"`. This is where character behavior is defined.
- `backend/app/utils/ai_engine.py` — Gemini integration. Uses `gemini-2.5-flash`. `iniciar_chat_con_historial()` for chat, `generate_gemini_response()` for evaluation (returns parsed JSON with robust fallback parsing).
- `frontend/src/context/AuthContext.tsx` — Auth is **frontend-only, mocked** (no backend auth). Role is determined by email domain: `@docente.uss.cl` → teacher, `@correo.uss.cl` → student. User persisted in `localStorage`.
- `frontend/src/components/Chat/ChatInterface.tsx` — Manages chat state, calls backend, triggers evaluation. Includes fallback example evaluation if backend fails.

### User Roles
- **Teacher** (`user.type === 'teacher'`): Sees `TeacherDashboard` with student management and access to both characters
- **Student** (`user.type === 'student'`): Sees `StudentDashboard`

### API Endpoints
- `POST /chat` — Send message to character
- `POST /chat/restart` — Clear DB history for a character (also called on session start)
- `POST /evaluate` — Evaluate full conversation, returns `EvaluationResponse` with 11 criteria, score (0–11), performance range, and conclusion

### Evaluation Scoring
- 3–4 criteria: Aceptable
- 5–7 criteria: Competente
- 8+ criteria: Exitosa

### Adding a New Character
1. Add a new key to `PROMPTS` in `backend/app/prompts.py`
2. Add the character to the `ChatInterfaceProps` union type and `characterInfo` map in `ChatInterface.tsx`
3. Update the `student_profile` logic in `routes/evaluation.py` if age/grade-specific data is needed
