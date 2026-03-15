feature/ui-v2 — Interfaz v2: Home Page Blanca + Dashboard USS
¿Qué contiene esta rama?
Esta rama contiene la segunda versión de la interfaz de usuario de la plataforma Chat-BOT.

Home Page (blanca / clara)
Paleta: blanco + índigo (#4f46e5) + cyan (#06b6d4)
Diseño moderno orientado a IA educativa
Dot-grid sutil en el hero, floating cards con perfiles de Teo y Jojo
Navbar glassmorphism al hacer scroll
Archivo: frontend/src/components/HomePage/HomePage_Blanco.tsx
Dashboard post-login
InterfaceStudent (frontend/src/components/InterfaceStudent/)
Sidebar USS (navy/rojo/dorado) con logo de la universidad
Vista "Mis Ramos" con botones de chatbot por ramo
Bienvenida con nombre del usuario
InterfaceTeacher (frontend/src/components/InterfaceTeacher/)
Sidebar USS con badge "Docente" dorado
Dashboard con estadísticas y lista de ramos
Vista de alumnos filtrable por ramo
Chat y Evaluación
ChatInterface.tsx rediseñado con branding USS (navbar navy, burbujas navy/blanco)
EvaluationPdfPreview.tsx rediseñado con logo USS y colores institucionales
PDF con cabecera navy, tabla roja, conclusión dorada
Cómo ejecutar localmente

# Frontend
cd frontend && npm install && npm run dev   # → http://localhost:5173

# Backend
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload   # → http://localhost:8000
Variables de entorno requeridas
Backend (backend/.env): DATABASE_URL + GOOGLE_API_KEY

Frontend (frontend/.env): VITE_API_URL=http://localhost:8000

Credenciales de prueba (mock)
Docente: @docente.uss.cl + cualquier contraseña
Estudiante: @correo.uss.cl + cualquier contraseña
