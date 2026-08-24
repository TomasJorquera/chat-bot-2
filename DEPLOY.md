# Despliegue gratuito: Render + Neon + Vercel

Dominio final para la profesora: **el de Vercel** (`https://<tu-proyecto>.vercel.app`).
Render solo expone la API (`https://<tu-backend>.onrender.com`), consumida internamente por el frontend.

## 1. Neon (base de datos Postgres) — hacer primero

1. Ir a https://neon.tech → "Sign up" → entrar con GitHub.
2. En el dashboard, botón **"New Project"** (o "Create a project").
   - **Project name**: `chatbot-db`
   - **Postgres version**: la que venga por defecto está bien
   - **Region**: la más cercana disponible (si no hay Sudamérica, `US East`)
   - Click **"Create project"**.
3. Al crearse, Neon muestra un panel **"Connection string"** (o pestaña "Connection Details"). Ahí sale algo así:
   `postgresql://neondb_owner:AbCdEf123@ep-xxxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require`
   - Copia ese string completo y guárdalo — es el `DATABASE_URL` que vas a pegar en Render en el paso siguiente.
   - Nota: usa el connection string que dice **"Pooled connection"** si Neon te da a elegir entre pooled/direct — es el recomendado para apps web.
4. No crees tablas manualmente: las migraciones de Alembic (paso 5 de Render) las crean solas al desplegar.

## 2. Render (backend)

1. Ir a https://render.com → "Get Started" → entrar con GitHub → autorizar acceso al repo `chat-bot-2` cuando lo pida.
2. En el dashboard, botón **"New +"** (arriba a la derecha) → **"Web Service"**.
3. Elegir el repo `chat-bot-2` de la lista (si no aparece, click "Configure account" y dale permiso a Render sobre ese repo).
4. En el formulario de configuración:
   - **Name**: `chatbot-backend` (o el que prefieras, define parte de la URL)
   - **Branch**: `feature/ui-v2`
   - **Root Directory**: `backend`
   - **Runtime**: Render debería detectar "Docker" solo (por el `Dockerfile`); si pregunta, elegir **Docker**
   - **Instance Type**: **Free**
5. Bajar a la sección **"Environment Variables"** (o "Advanced" → "Add Environment Variable") y agregar una por una, con los mismos valores que tienes en tu `backend/.env` local:
   - `DATABASE_URL` → el connection string de Neon del paso 1
   - `GOOGLE_API_KEY`
   - `OPENAI_API_KEY`
   - `DEEPSEEK_API_KEY`
   - `SECRET_KEY`
   - `ADMIN_PASSWORD`
   - `SEED_PASSWORD_DEFAULT`
   - `ENVIRONMENT` → `production`
6. Click **"Create Web Service"**. Render clona el repo, construye el Dockerfile y despliega — puede tardar varios minutos la primera vez. Ver el progreso en la pestaña "Logs".
7. Cuando el deploy termine (estado "Live" en verde), correr las migraciones **una sola vez** contra Neon desde tu máquina local:
   ```bash
   cd backend
   DATABASE_URL="postgresql://...el-mismo-string-de-neon..." alembic upgrade head
   ```
8. Anotar la URL pública que Render asigna arriba del dashboard del servicio, ej: `https://chatbot-backend-xxxx.onrender.com` — la necesitas para Vercel.

## 3. Vercel (frontend)

1. Ir a https://vercel.com → "Sign Up" → entrar con GitHub.
2. En el dashboard, botón **"Add New..."** → **"Project"**.
3. En la lista de repos de GitHub, buscar `chat-bot-2` → click **"Import"**.
4. En la pantalla de configuración del proyecto:
   - **Root Directory**: click "Edit" al lado y seleccionar `frontend`
   - **Framework Preset**: debería autodetectar "Vite" (si no, elegirlo manualmente)
   - **Build Command** / **Output Directory**: dejar los valores por defecto (`npm run build` / `dist`)
5. Antes de darle a Deploy, abrir la sección **"Environment Variables"** en esa misma pantalla y agregar:
   - **Name**: `VITE_API_URL` → **Value**: la URL de Render del paso 2 (ej. `https://chatbot-backend-xxxx.onrender.com`, sin `/` al final)
6. Click **"Deploy"**. Vercel construye y al terminar muestra el dominio final: `https://<nombre-proyecto>.vercel.app`.
   - Nota: hay que elegir la rama correcta — por defecto Vercel despliega la rama por defecto del repo (probablemente `main`); si quieres que despliegue `feature/ui-v2` como producción, ir a **Settings → Git → Production Branch** y cambiarlo a `feature/ui-v2` después de importar.

## 4. Conectar ambos (CORS)

En `backend/app/main.py` (línea ~23-30) agregar el dominio real de Vercel a `allow_origins`:

```python
allow_origins=[
    ...,
    "https://chat-bot2-frontend.onrender.com",
    "https://<tu-proyecto>.vercel.app",  # <- agregar después de desplegar en Vercel
],
```

Commitear y hacer push — Render redespliega solo al detectar el push (si el auto-deploy está activo).

## 5. Aviso para la profesora

- El backend gratis de Render **duerme tras 15 min sin uso**. El primer mensaje del chat puede tardar 30-50s en responder mientras despierta; los siguientes son normales.
- Avisarle que use el link de Vercel, no el de Render.
