import os
import json
import google.generativeai as genai

# Configura la API key desde la variable de entorno.
# La librería busca automáticamente la variable de entorno GOOGLE_API_KEY.
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

async def generate_gemini_response(prompt, conversation):
    """Genera una respuesta usando el modelo Gemini para evaluar una conversación."""
    try:
        model = genai.GenerativeModel(model_name="gemini-2.5-flash")

        # Combina el prompt con la conversación
        prompt_completo = prompt + "\n\n" + json.dumps(conversation, indent=2)

        # Genera la respuesta
        response = model.generate_content(prompt_completo)

        # Normalizar texto de la respuesta
        text = (response.text or "").strip()

        # Intentos robustos para extraer JSON válido cuando el modelo añade texto
        import re

        # 1) Intentar parsear JSON tal cual
        try:
            return json.loads(text)
        except Exception:
            pass

        # 2) Buscar un bloque encerrado en fences de Markdown (```json ... ```)
        fence_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE)
        if fence_match:
            candidate = fence_match.group(1).strip()
            try:
                return json.loads(candidate)
            except Exception as e:
                print(f"[AI_ENGINE] Error parsing JSON inside code fence: {e}")

        # 3) Eliminar posibles backticks y etiquetas como 'json' al inicio y volver a intentar
        cleaned = re.sub(r"`+", "", text)
        cleaned = re.sub(r"^\s*json\s*[:\-]*\s*", "", cleaned, flags=re.IGNORECASE)

        # 4) Extraer la primera ocurrencia de un objeto {...} o un array [...] del texto limpio
        obj_match = re.search(r"\{[\s\S]*\}", cleaned)
        arr_match = re.search(r"\[[\s\S]*\]", cleaned)
        candidate = None
        if obj_match:
            candidate = obj_match.group(0)
        elif arr_match:
            candidate = arr_match.group(0)

        if candidate:
            try:
                return json.loads(candidate)
            except Exception as e:
                print(f"[AI_ENGINE] Error parsing extracted JSON candidate: {e}")

        # Si no pudimos parsear, logueamos la respuesta cruda y lanzamos excepción
        print(f"[AI_ENGINE] Error al generar evaluación: respuesta no es JSON válido. Respuesta cruda:\n{text}")
        raise Exception(f"AI response not valid JSON: {text[:1000]}")
    except Exception as e:
        print(f"[AI_ENGINE] Error al generar evaluación: {e}")
        raise e

def iniciar_chat_con_historial(prompt_sistema, historial):
    """Inicia una sesión de chat con un historial preexistente."""
    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash", # Usaremos gemini-1.5-flash que es más reciente
            system_instruction=prompt_sistema
        )
        # Inicia el chat con el historial proporcionado
        chat_session = model.start_chat(history=historial)
        return chat_session
    except Exception as e:
        print(f"[AI_ENGINE] Error al iniciar chat: {e}")
        # Relanzamos la excepción para que sea capturada en la ruta
        raise e
