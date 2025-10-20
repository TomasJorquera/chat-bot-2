# Contexto del Proyecto – Frontend

## 🎯 Objetivo
El frontend de esta plataforma permite a los estudiantes de pedagogía interactuar
con **Teo**, un chatbot educativo simulado con base en el perfil de un niño de 9 años
con dificultades específicas en Lenguaje y Comunicación.

## ⚙️ Stack Tecnológico
- **Framework:** React (Vite)
- **Estilos:** Tailwind CSS
- **Comunicación:** Fetch API / Axios
- **Backend:** API FastAPI (`http://localhost:8000`)

## 💬 Flujo de conversación
1. El usuario (estudiante de pedagogía) ingresa su mensaje.
2. El mensaje se envía al endpoint `/chat` del backend.
3. El backend procesa la IA con Gemini y devuelve la respuesta de Teo.
4. El frontend muestra el mensaje y respuesta en formato de chat.

## 🔌 Configuración de conexión local
En el archivo `.env` del frontend: