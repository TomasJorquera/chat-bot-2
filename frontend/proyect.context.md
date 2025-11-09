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

#### 🗂️ Portada
REPORTE DE INTERACCIÓN CON TEO
Fecha: [fecha actual]
Docente participante: [nombre del evaluado o “Simulador”]
Personaje: Teo (9 años, 3º Básico)

shell
Copiar código

#### 💬 Conversación
Se listan los mensajes con el siguiente formato:
Docente: [mensaje]
Teo: [respuesta]

### 📊 Evaluación de la Interacción con Teo

El desempeño del docente (simulador) será evaluado en una escala de **0 a 11** y categorizado en los rangos:
- **Aceptable:** 3–4 criterios cumplidos  
- **Competente:** 5–7 criterios cumplidos  
- **Exitosa:** 8 o más criterios cumplidos  

| Criterio de Éxito | Descripción de la Conducta Docente (Observada en el Reporte) | Cumplimiento | Análisis de la Interacción |
|--------------------|--------------------------------------------------------------|---------------|----------------------------|
| **1. Uso de Andamiaje Funcional/Ecológico** | El docente intenta vincular el tema de la sesión con una situación real (ej. compras, transporte, etc.). | SÍ / NO | Explica si el docente aplicó o no ejemplos funcionales al contexto real del estudiante. |
| **2. Secuenciación Clara de Pasos** | El docente descompone la actividad en pasos visuales simples y evita instrucciones complejas. | SÍ / NO | Evalúa si se presentó una instrucción estructurada y paso a paso. |
| **3. Adaptación de Textos y Enunciados** | El docente simplifica el lenguaje y evita preguntas abstractas. | SÍ / NO | Evalúa si el lenguaje fue accesible y concreto para Teo. |
| **4. Uso de la Memoria para lo Concreto** | El docente utiliza conocimientos previos o intereses del estudiante (dibujo, lógica, perro, abuela). | SÍ / NO | Analiza si el docente logró conectar los intereses personales de Teo con el aprendizaje. |
| **5. Prevención de Burlas y Miedo** | El docente aplica un refuerzo positivo genuino y enfatiza que es un espacio seguro. | SÍ / NO | Indica si el tono del docente fortaleció la seguridad emocional de Teo. |
| **6. Validación de la Vulnerabilidad** | El docente valida las emociones (ej. frustración, inseguridad) antes de redirigir la tarea. | SÍ / NO | Evalúa si el docente reconoció la emoción de Teo antes de guiarlo. |
| **7. Fomento de la Autonomía Social** | El docente promueve que Teo exprese lo que necesita o decida cómo continuar. | SÍ / NO | Indica si se fomentó la autorregulación o la petición de ayuda. |
| **8. Vinculación Curricular Ecológica** | El docente aplica el ejemplo funcional a los contenidos curriculares de Lenguaje o Matemática. | SÍ / NO | Evalúa si el docente logró conectar la conversación con los contenidos escolares. |
| **9. Indagación Vocacional Temprana** | El docente vincula las habilidades de Teo (dibujo, lógica) con proyecciones futuras. | SÍ / NO | Analiza si se fomentó la autopercepción positiva del talento personal. |
| **10. Refuerzo de la Autonomía Comunitaria** | El docente plantea simulaciones prácticas (comprar, resolver un problema, cuidar a Rufino). | SÍ / NO | Evalúa si se promovieron escenarios de vida cotidiana funcionales. |
| **11. Fomento de la Inclusión Curricular** | El docente propone situaciones donde Teo pueda participar en grupo o con apoyo. | SÍ / NO | Evalúa si el docente integró estrategias para fomentar la participación de Teo con sus pares. |

---
Las columnas tiene que ser:
1. Criterios de exito
2. Descripción de la Conducta Docente (Observada en el Reporte)
3. Cumplimiento
4. Análisis de la Interacción
5. Porque si se cumplio y no.

### 📈 Conclusión de la Evaluación del Desempeño

| Puntuación Total | Rango de Desempeño | Comentarios de Retroalimentación |
|------------------|--------------------|----------------------------------|
| X de 11 criterios cumplidos | (Aceptable / Competente / Exitosa) | Texto generado por la IA con el análisis global del desempeño del docente. Debe incluir fortalezas, debilidades y sugerencias pedagógicas. |

---

### 🧠 Instrucciones para la IA evaluadora (Gemini)
- Analizar **solo la conducta del docente**, no la de Teo.  
- Completar la tabla con base en la conversación y los criterios predefinidos.  
- Usar formato Markdown limpio y estructurado.  
- Mantener un tono profesional, pedagógico y objetivo.  
- Si hay ambigüedad o falta de evidencia, marcar “NO” y justificar.  

---

💡 **Nota:** Este formato debe conservarse al generar el PDF final.  
El bloque de conversación va arriba, y esta tabla con la conclusión se añade debajo, en la misma página o en una nueva sección titulada:  
**“Evaluación del Desempeño Docente en la Interacción con Teo”.**
