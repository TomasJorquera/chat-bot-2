# Arquitectura Fase 2 — Plataforma Educativa

> Nota de nombres: este documento describe lo que el proyecto llama internamente
> "Fase 2" (la migración de experimento de chat a plataforma educativa completa).
> Los archivos de código usan el sufijo `_v2` / `v1` (`models_v2.py`, `/api/v1`)
> porque `v1` ya estaba tomado por el experimento original.

## 1. Propósito

El proyecto nació como un experimento de chat ciego (alumno ↔ IA, ver `Paper.pdf` /
HCII 2025). Esa base (`app/models.py`: `Alumno`, `Interaccion`, `Simulacion`,
`Entrega`, `MensajeEntrega`, `Message`) no tiene roles, no versiona agentes ni
modelos IA, y mezcla "simulación" con "entrega" en dos únicos niveles.

Esta fase redefine la base de datos para soportar una plataforma educativa real:
usuarios con roles, estructura académica (cursos/ramos), agentes y modelos IA
versionables, y un ciclo de simulación con tres niveles (simulación → proceso →
sesión) en vez de dos.

**Los modelos legacy no se eliminan ni se migran.** Siguen operando exactamente
igual (mismas rutas, mismas tablas) mientras la nueva plataforma se construye en
paralelo bajo `/api/v1`. Los datos de ambos lados son de prueba; no hay migración
de datos legacy → nuevo.

## 2. Fuente de verdad y decisiones de diseño

La arquitectura sigue el DBML del proyecto (`CodigoDB.md`, en la raíz del repo)
como fuente principal, con tres adiciones que el DBML no tenía pero que la
arquitectura objetivo requiere:

| Adición | Por qué |
|---|---|
| `simulation_processes` | El DBML iba directo `simulations → simulation_sessions`. Se necesita una capa de proceso por estudiante-simulación para modelar inicio/progreso/cierre/nota final, independiente de cuántas sesiones tenga. |
| `simulation_agent_profiles` | El DBML tenía `simulations.agent_profile_id` como FK único. Se reemplaza por una tabla puente para soportar uno o más agentes por simulación. |
| `teacher_reviews` | El DBML solo tenía `evaluations` (resultado automático de IA). Se separa la revisión humana en su propia tabla, para no forzar todo el feedback docente dentro de `simulation_processes`. |

**Curso-ramo-docente**: el DBML modela esto como una única tabla `teacher_subjects`
(curso + ramo + docente en una fila). Se mantuvo así (en vez de separar
`course_subjects` + asignación de docente) porque es más simple y ya cubre el
caso de uso actual: un ramo siempre se dicta con un docente asignado. Si más
adelante se necesita armar la malla curricular antes de asignar profesor, se
puede separar en Fase 3 sin romper lo existente. El schema Pydantic expuesto en
`/api/v1/academic/course-subjects` se llama `CourseSubject*` pero mapea a este
modelo `TeacherSubject`.

**IDs**: todas las tablas nuevas usan `UUID` como PK (vía
`sqlalchemy.dialects.postgresql.UUID`), siguiendo el DBML. Las tablas legacy
mantienen sus IDs enteros — no se tocaron.

**Un solo `Base`**: `models_v2.py` importa el mismo `Base` de `app/database.py`
que usa `models.py`. Esto permite que Alembic gestione ambos conjuntos de
tablas con una sola migración y un solo `target_metadata`.

## 3. Tablas principales

**Usuarios y roles**: `roles`, `users`.

**Estructura académica**: `courses`, `subjects`, `teacher_subjects`,
`student_courses`, `student_subjects`.

**Configuración IA**: `ai_agents` (Teo, Jojo), `ai_models` (proveedor + costos),
`agent_profiles` (versión de un agente: prompt + modelo + voz + parámetros),
`evaluation_profiles` (versión del evaluador: prompt + modelo).

**Simulaciones**: `simulations`, `simulation_agent_profiles` (uno o más agentes
por simulación), `simulation_criteria`.

**Ciclo de simulación**: `simulation_processes`, `simulation_sessions`,
`simulation_messages`.

**Evaluación y revisión**: `evaluations`, `evaluation_criteria_results`,
`teacher_reviews`.

**Costos**: `ai_cost_logs`.

**Académico general** (no ligado a IA): `materials`, `assignments`,
`assignment_submissions`.

## 4. Simulación vs. Proceso vs. Sesión

- **`Simulation`**: la plantilla que crea el docente (instrucciones, objetivos,
  ramo/curso, criterios, uno o más `agent_profiles` habilitados).
- **`SimulationProcess`**: el recorrido de **un estudiante** dentro de esa
  simulación. Tiene estado (`iniciado → en_progreso → finalizado → cerrado`),
  contador de sesiones completadas, y — al cerrarse — nota final, resumen del
  evaluador, retroalimentación y observación docente, y observación indicada
  por el cliente.
- **`SimulationSession`**: una interacción concreta dentro de un proceso (por
  ejemplo, "interacción 1 con Teo", "interacción 2 con Jojo"). Un proceso puede
  tener 1..N sesiones. Cada sesión acumula sus propios mensajes, tokens y costo.

Equivalencia con el modelo legacy: `Simulacion` legacy ≈ `Simulation` +
`SimulationProcess` combinados; `Entrega` legacy ≈ `SimulationSession`.

## 5. Cómo se inicia y cierra una simulación

1. El docente crea la `Simulation` (`POST /api/v1/simulations`), indicando
   ramo/curso, criterios y los `agent_profile_ids` habilitados.
2. Cuando un estudiante empieza, se crea su `SimulationProcess`
   (`POST /api/v1/simulation-processes`), estado `iniciado`.
3. Cada interacción del estudiante crea una `SimulationSession`
   (`POST /api/v1/simulation-sessions`) con mensajes
   (`POST /api/v1/simulation-sessions/{id}/messages`).
4. Al terminar todas las sesiones esperadas, se llama
   `PATCH /api/v1/simulation-processes/{id}/finalizar` (estado `finalizado`,
   pendiente de revisión docente).
5. Se registra la evaluación automática de IA (`POST /api/v1/evaluations`, con
   `scope="process"` o `scope="session"` según corresponda) y, si el docente
   revisa manualmente, un `TeacherReview` (`POST /api/v1/teacher-reviews`).
6. El cierre definitivo se hace con
   `PATCH /api/v1/simulation-processes/{id}/cerrar`, que guarda nota final,
   retroalimentación docente, observación docente/cliente y marca el proceso
   como `cerrado`.

## 6. Cómo se registra la evaluación

`Evaluation.scope` distingue si el resultado aplica a una sesión puntual
(`"session"`, con `session_id`) o al proceso completo (`"process"`, con
`process_id`). `EvaluationCriteriaResult` guarda el detalle por criterio
(cumplimiento, análisis, justificación) enlazado a una `Evaluation`.
`Evaluation.raw_json` guarda la respuesta cruda del modelo para trazabilidad,
igual que hacía `Entrega.evaluacion_json` en el modelo legacy.

## 7. Migraciones (Alembic)

Configurado en `backend/alembic.ini` + `backend/alembic/env.py`. `env.py` lee
`DATABASE_URL` del entorno (mismo formato que usa `app/database.py`) y registra
`target_metadata` importando tanto `app.models` (legacy) como `app.models_v2`
(nuevo), así que un solo historial de migraciones cubre ambos.

`app/main.py` ya **no** llama `Base.metadata.create_all()` — el esquema se
gestiona exclusivamente con Alembic.

```bash
cd backend
alembic upgrade head                       # aplica todas las migraciones pendientes
alembic revision --autogenerate -m "..."   # genera una nueva migración tras cambiar modelos
alembic downgrade -1                       # revierte la última migración
```

La migración inicial (`alembic/versions/ba4904848bea_initial_schema_legacy_fase_2.py`)
crea **todas** las tablas —legacy y nuevas— porque se generó y se probó contra
un Postgres vacío. Se puede aplicar directamente sobre una base recién creada.

## 8. Cómo reiniciar la base desde cero

```bash
docker compose down -v          # elimina el volumen de Postgres (datos de prueba)
docker compose up -d db
cd backend
alembic upgrade head
python -m app.utils.seed_v2     # datos base de la Fase 2
python -m app.utils.seed        # (opcional) docentes del experimento legacy
```

## 9. Seeds

`python -m app.utils.seed_v2` (idempotente — omite lo que ya exista) inserta:

- Roles: `admin`, `teacher`, `student`, `evaluator`.
- Modelos IA: `gemini-2.0-flash-lite` (chat), `gemini-2.5-flash-lite`
  (evaluator), `gpt-4o-mini-tts` (tts), `deepseek-chat` (fallback).
- Agentes Teo y Jojo, cada uno con un `AgentProfile` v1 que reutiliza el
  `system_prompt` ya definido en `app/prompts.py`.
- Un `EvaluationProfile` inicial que reutiliza `PROMPTS["Evaluator"]`.
- Ramos: `EDU-301`, `PSP-201`, `INT-401`.
- Usuarios de prueba: `admin@docente.uss.cl`, `docente_prueba@docente.uss.cl`,
  `estudiante_prueba@correo.uss.cl` — contraseña `password123` para los tres.

El seed legacy (`python -m app.utils.seed`) sigue existiendo sin cambios.

## 10. Verificación realizada

- `python -c "import app.main"` — importa sin errores.
- `alembic upgrade head` contra Postgres vacío — aplica sin errores, sin drift
  posterior (`alembic revision --autogenerate` no detecta cambios extra).
- Smoke test con `TestClient` contra una base recién migrada + seed: login →
  `/users/me` → crear curso → crear simulación → crear proceso → crear sesión →
  agregar mensaje → registrar evaluación → finalizar proceso → registrar
  teacher review → cerrar proceso con nota final. Todo el ciclo respondió
  `200 OK` con los datos persistidos correctamente.
- Los routers legacy (`/auth`, `/experimento`, `/admin`, `/simulacion`, chat,
  evaluation, tts) no se modificaron; siguen registrados en `app/main.py` tal
  como estaban.

## 10.1 Nota: gestión de ramos/costos construida sobre tablas legacy

Para la experimentación real (previa a migrar el frontend a `/api/v1`), se
agregaron a **`app/models.py`** (no a `models_v2.py`):

- `Ramo` (`ramos`): catálogo código+nombre, independiente del string libre
  `Simulacion.ramo_codigo` (que se mantiene intacto para no romper nada).
- `RamoDocente` (`ramo_docentes`): asigna un docente (una fila de `Alumno`)
  a un ramo.
- `RamoAlumno` (`ramo_alumnos`): matrícula de alumnos en un ramo.
- Columnas de costo en `Entrega`/`MensajeEntrega` (tokens + costo real por
  turno y acumulado por sesión), pobladas desde `routes/simulacion.py` y
  `routes/tts.py` usando `app/utils/cost_tracker.py`.
- `GeneracionVoz` (`generaciones_voz`): una fila por cada llamada a
  `gpt-4o-mini-tts`, con FK opcional a `Entrega`/`MensajeEntrega` (opcional
  porque el chat directo del docente, sin sesión de alumno, también genera
  voz y también cuesta dinero). Guarda modelo, voz efectivamente usada
  (post-fallback), instrucciones y texto exactos enviados, tokens de entrada
  y salida **con su fuente por separado** (`input_tokens_source`/
  `output_tokens_source`), duración real del audio (mutagen, nunca estimada
  por caracteres) y tamaño en bytes. Ver "Costeo de voz (TTS)" más abajo.

### Costeo de voz (TTS): qué es exacto y qué es estimado

`app/voice_profiles.py` centraliza la voz/instrucciones por agente — es el
archivo a editar para ajustar cómo suena Teo o Jojo, o para agregar un
personaje nuevo. Nada de esto vive hardcodeado en `ai_engine.py`.

`gpt-4o-mini-tts` no devuelve `usage` en `/audio/speech`, así que el costo de
cada generación se compone de dos partes con confiabilidad distinta
(`estimate_tts_usage()` en `ai_engine.py`):

- **`input_tokens` (exacto)**: conteo real del texto enviado con el
  tokenizador `o200k_base` (familia gpt-4o) vía `tiktoken`. Ya no es la
  aproximación `len(text)//4` que había antes. `input_tokens_source =
  "tiktoken"`.
- **`output_tokens` (estimado)**: OpenAI no publica cómo tokeniza el audio
  generado — no hay forma de calcularlo con exactitud desde texto, duración
  o tamaño del archivo. Se mantiene una estimación calibrada (para no dejar
  el costo total en $0, inútil para presupuestar el experimento), pero
  queda marcada explícitamente como `output_tokens_source = "estimated"`.
  `GeneracionVoz.costo_estimado_usd` hereda esa incertidumbre — es una
  estimación, no un valor exacto del proveedor.
- **Duración y tamaño del audio son exactos**: `get_audio_duration_ms()` lee
  la duración real de los metadatos del mp3 (vía `mutagen`), nunca la infiere
  de caracteres. El tamaño en bytes es simplemente `len(audio_bytes)`.

Se evaluó migrar a un proveedor de TTS que cobre por carácter (costo 100%
exacto, ej. Google/Azure/Polly), pero se descartó para esta fase: se perdería
el parámetro `instructions` de `gpt-4o-mini-tts` que permite dirigir la voz
en lenguaje natural (clave para la timidez de Teo / calidez de Jojo), y
cambiar de proveedor justo antes de la experimentación real arriesgaría la
calidad de voz ya validada en el piloto (SUS=80.0, N=17).

**Por qué en legacy y no en `models_v2.py`**: el flujo real que usan los
estudiantes (`SimulacionFlow.tsx` → `simulacion.py` → `Entrega`/`MensajeEntrega`)
todavía no migró a `SimulationProcess`/`SimulationSession`. Construir la
gestión de ramos y el costeo sobre `models_v2.py` habría dejado ambas
funcionalidades sin datos reales durante la experimentación. Se prioriza que
el panel admin y el dashboard de costos reflejen el flujo que efectivamente
se va a usar. Endpoints nuevos: `POST/GET /admin/ramos`, `GET
/admin/ramos/{id}`, `POST /admin/ramos/{id}/profesor`, `POST
/admin/ramos/{id}/alumnos`, `DELETE /admin/ramos/{id}/alumnos/{alumno_id}`,
`GET /admin/costos`.

**Tarifas de IA usadas para el costeo** (`app/utils/cost_tracker.py`,
verificadas 2026-07-10): `gemini-2.5-flash-lite` ($0.10/$0.40/$0.01 por 1M
input/output/cache), `deepseek-v4-flash` ($0.0028/$0.14 cache hit/miss,
$0.28 output), `gpt-4o-mini-tts` ($0.60 input de texto, $12 output de audio
por 1M tokens — este último es una **estimación**, ya que el endpoint de
OpenAI no devuelve `usage` real; ver `estimate_tts_usage()` en `ai_engine.py`).

**Corrección de modelo caído en producción**: `chat_gemini_message()` usaba
`gemini-2.0-flash-lite`, dado de baja por Google el 2026-06-01. Se migró a
`gemini-2.5-flash-lite` (mismo modelo que ya usaba el evaluador). El fallback
DeepSeek se migró de `deepseek-chat` (deprecado 2026-07-24) a
`deepseek-v4-flash`.

Cuando se migre el flujo real a `models_v2.py` (ver más abajo), esta
gestión de ramos deberá reemplazarse por `TeacherSubject`/`StudentCourse`.

## 11. Pendiente para Fase 3

- Migrar `SimulacionFlow.tsx` / `InterfaceTeacher.tsx` (frontend) para consumir
  `/api/v1` en vez de las rutas legacy — **no** se tocó frontend en esta fase.
- Endpoints de escritura para `student_courses` / `student_subjects` (matrícula)
  y `materials` / `assignments` / `assignment_submissions` (solo hay modelos,
  no routers — no estaban en el alcance mínimo pedido).
- Autorización por rol en los endpoints de `/api/v1` (hoy cualquier usuario con
  token válido puede pegarle a cualquier endpoint; falta un `require_role()`).
- Migrar la lógica real de `chat_gemini_message` / `generate_gemini_response`
  para que las sesiones nuevas (`SimulationSession`/`SimulationMessage`)
  reemplacen a `Entrega`/`MensajeEntrega` en el flujo real de chat.
- Decidir si `teacher_subjects` se separa en `course_subjects` +
  `teacher_subjects` cuando exista el caso de uso de armar la malla antes de
  asignar docente (ver sección 2).
- Borrado/archivado real de los modelos legacy una vez el frontend migre.
