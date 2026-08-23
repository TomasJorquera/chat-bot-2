# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

An educational chatbot platform where student-teachers practice pedagogy by interacting with AI-simulated students with learning disabilities. The AI characters are:
- **Teo**: 9-year-old with Specific Learning Disorder in reading/writing (DEA F81.0), 3rd grade. CI 115 (Promedio-Alto). Prompt built on Multidimensional Model using EVALÚA 2 + WISC-V reports.
- **Jojo**: 15-year-old with Mild Intellectual Disability (DIL), focused on transition to adult life (TVA). CI≈65-70. Prompt built on adaptive behavior scales.

After each session, the teacher's pedagogical performance is evaluated against 11 criteria and exported as a PDF report. Validated pilot study: SUS=80.0, pedagogical confidence +0.76 (3.53→4.29), N=17. Published: HCII 2025 (Springer LNCS).

## Development Commands

### With Docker (recommended)
```bash
docker compose up -d                        # start all services
docker compose build frontend && docker compose up -d frontend  # rebuild frontend
docker compose build && docker compose up -d  # full rebuild
docker compose logs backend --tail=20       # check backend logs
```

### Reset a simulation's entregas
```bash
docker compose exec db psql -U ingrequerimientos -d chatbot_db -c \
"DELETE FROM mensajes_entrega WHERE entrega_id IN (SELECT id FROM entregas WHERE simulacion_id = X); DELETE FROM entregas WHERE simulacion_id = X;"
```

### Frontend (React + Vite + TypeScript)
```bash
cd frontend && npm run dev   # dev server at http://localhost:5173
```

### Backend (FastAPI + Python)
```bash
cd backend && uvicorn app.main:app --reload  # API at http://localhost:8000
```

## Required Environment Variables

**Backend** (`backend/.env`):
- `DATABASE_URL` — PostgreSQL connection string
- `GOOGLE_API_KEY` — Google Gemini API key (used for chat + evaluation)
- `DEEPSEEK_API_KEY` — DeepSeek API key (fallback for chat and evaluation)
- `OPENAI_API_KEY` — OpenAI API key (used for TTS: `gpt-4o-mini-tts`)

**Frontend** (`.env` in `frontend/`):
- `VITE_API_URL` — Backend URL (defaults to `http://localhost:8000` if not set)

## Architecture

### AI Models Used
| Role | Model | Reason |
|------|-------|---------|
| **Chat Teo/Jojo** | `gemini-2.5-flash-lite` (Gemini) | Multimodal: handles text + image uploads. DeepSeek as automatic fallback. (Migrated from `gemini-2.0-flash-lite`, shut down by Google 2026-06-01.) |
| **Chat fallback** | `deepseek-v4-flash` (DeepSeek) | Fallback when Gemini fails. (Migrated from `deepseek-chat`, deprecated 2026-07-24.) |
| **Evaluation** | `gemini-2.5-flash-lite` (Gemini) | JSON output, 11-criteria evaluation. DeepSeek as fallback. |
| **TTS (Teo/Jojo voice)** | `gpt-4o-mini-tts` (OpenAI) | Accepts character instructions for contextual voice (childlike, hesitant, etc.) |
| **STT (user voice)** | Web Speech API (browser native) | Free, no API key, sends on mic button release |

**Why Gemini for chat instead of DeepSeek**: Gemini 2.5 Flash Lite is multimodal — it can receive images uploaded by the teacher during the chat session (e.g., a drawing of 4 apples for a math activity). DeepSeek is text-only. Context consistency is maintained because the frontend sends the full history on every request; Gemini and DeepSeek are both stateless.

### Explicit Gemini Context Caching
- `ai_engine.py` caches the static personality prompt for `Teo`/`Jojo` via `genai.caching.CachedContent` (`_get_cached_model()`), TTL 30 min, refreshed on each use.
- Requires a Gemini API key with billing linked — free-tier accounts have `TotalCachedContentStorageTokensPerModelFreeTier limit=0` and caching silently falls back to an uncached model (chat still works, just without the cost saving). Check backend logs for `[CACHE] ... caché creado` vs `no se pudo crear caché` to confirm it's active.
- Gemini's real minimum cacheable size is **2048 tokens** (not the 1024 documented in some docs) — Teo's prompt qualifies, Jojo's currently does not.
- `experiment/google-genai-sdk` branch has the same feature ported to the new `google-genai` SDK (the old `google-generativeai` package is deprecated/EOL); pending the user's manual functional testing before merge.

### TTS Pipeline
```
Chat text → _detect_emotional_state() → dynamic TTS instructions → gpt-4o-mini-tts → audio
```
- `_detect_emotional_state()` in `ai_engine.py` detects emotional state from text keywords and adds dynamic instructions (e.g. "voz temblorosa" for anxious, "más animada" for motivated)
- Base TTS instructions per character in `TTS_INSTRUCTIONS` dict in `ai_engine.py`
- Parenthetical actions `(...)` are stripped before TTS

### Image Upload in Chat
- Teacher uploads image → frontend converts to base64 → sent in JSON body as `image_base64` + `image_mime`
- Backend passes image bytes to Gemini (decoded from base64)
- Teo/Jojo responds seeing the image
- Image shown in chat bubble; only text is read by TTS

### Voice Input (STT)
- 🎤 button → continuous SpeechRecognition → accumulates transcript → 🔴 stop → sends message automatically
- Works in Chrome/Edge. Language: `es-CL`

### Simulation Flow (`SimulacionFlow.tsx`)
1. **Antecedentes** — Shows agent info + downloadable PDF reports (teo.pdf / jojo.pdf from `/informes/`)
2. **Planificación** — Student writes pedagogical plan (text + optional file upload)
3. **Chat** — Interaction with Teo/Jojo (text, voice, images). Saved to `mensajes_entrega` table.
4. **Resultado** — Automatic evaluation, retroalimentación with 4 sections, downloadable PDF

Students cannot redo a completed simulation (checked via `GET /simulacion/{id}/resultados` on mount).

### API Endpoints
- `POST /chat` — Send message to character (supports `image_base64` + `image_mime` for multimodal)
- `POST /chat/restart` — Clear DB history
- `POST /evaluate` — Evaluate conversation (old flow)
- `POST /simulacion/crear` — Create simulation (teacher)
- `POST /simulacion/{id}/entrega` — Start interaction (student)
- `POST /simulacion/entrega/{id}/mensaje` — Send chat message (supports images)
- `POST /simulacion/entrega/{id}/finalizar` — Finalize + evaluate interaction
- `GET /simulacion/{id}/resultados` — Teacher view: all students' results
- `GET /simulacion/entrega/{id}/mensajes` — Get chat transcript
- `POST /tts` — Text-to-speech via `gpt-4o-mini-tts`

### Key Files
- `backend/app/prompts.py` — `PROMPTS` dict: `"Teo"`, `"Jojo"`, `"Evaluator"`. Character behavior defined here based on Multidimensional Model.
- `backend/app/utils/ai_engine.py` — All AI functions: `chat_gemini_message()`, `chat_deepseek_message()`, `generate_tts()`, `_detect_emotional_state()`, `generate_gemini_response()`.
- `backend/app/routes/simulacion.py` — Full simulation flow routes.
- `backend/app/routes/tts.py` — TTS endpoint.
- `frontend/src/components/SimulacionFlow/SimulacionFlow.tsx` — Full student simulation UI.
- `frontend/src/components/Chat/ChatInterface.tsx` — Direct chat with Teo/Jojo (teacher dashboard).
- `frontend/src/components/InterfaceTeacher/InterfaceTeacher.tsx` — Teacher dashboard with simulation results.
- `frontend/public/informes/teo.pdf` — Original psychopedagogical report for Teo (served statically).
- `frontend/public/informes/jojo.pdf` — Original psychopedagogical report for Jojo (served statically).

### User Roles
- **Teacher** (`@docente.uss.cl`): Creates simulations, views results, accesses direct chat
- **Student** (`@correo.uss.cl`): Completes assigned simulations (max 1 attempt per simulation)

### Evaluation Scoring
- 3–4 criteria: Aceptable
- 5–7 criteria: Competente
- 8+ criteria: Exitosa

### Evaluation Response Format
Gemini returns JSON with `criteria` array (11 items) + `conclusion` array of 4 `{title, text}` objects:
1. Puntuación Total
2. Fortalezas
3. Aspectos a Mejorar
4. Sugerencias Pedagógicas

### Adding a New Character
1. Add key to `PROMPTS` in `backend/app/prompts.py`
2. Add to `AGENT_INFO` in `SimulacionFlow.tsx` and `characterInfo` in `ChatInterface.tsx`
3. Add TTS instructions to `TTS_INSTRUCTIONS` in `ai_engine.py`
4. Add emotional detection rules to `_detect_emotional_state()` in `ai_engine.py`
5. Add PDF report to `frontend/public/informes/`
