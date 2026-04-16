import os
import json
import google.generativeai as genai

# Configura la API key desde la variable de entorno.
# La librería busca automáticamente la variable de entorno GOOGLE_API_KEY.
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

async def generate_gemini_response(prompt, conversation):
    """Genera una respuesta usando el modelo Gemini para evaluar una conversación."""
    try:
        model = genai.GenerativeModel(model_name="gemini-2.5-flash-lite")

        # Combina el prompt con la conversación
        prompt_completo = prompt + "\n\n" + json.dumps(conversation, indent=2)

        # Genera la respuesta
        response = model.generate_content(prompt_completo)

        import re

        # Normalizar texto de la respuesta
        text = (response.text or "").strip()

        # 1) Limpiar fences de markdown antes de parsear
        #    Cubre: ```json\n...\n``` o ```\n...\n``` al inicio/fin del texto
        clean = text
        if clean.startswith("```"):
            clean = re.sub(r"^```(?:json)?\r?\n?", "", clean)
            clean = re.sub(r"\r?\n?```$", "", clean).strip()

        # 2) Intentar parsear el texto limpio directamente
        try:
            return json.loads(clean)
        except Exception:
            pass

        # 3) Buscar el primer objeto JSON {...} en el texto completo
        obj_match = re.search(r"\{[\s\S]*\}", clean)
        if obj_match:
            try:
                return json.loads(obj_match.group(0))
            except Exception as e:
                print(f"[AI_ENGINE] Error parsing extracted JSON object: {e}")

        # 4) Buscar primer array JSON [...] como fallback
        arr_match = re.search(r"\[[\s\S]*\]", clean)
        if arr_match:
            try:
                return json.loads(arr_match.group(0))
            except Exception as e:
                print(f"[AI_ENGINE] Error parsing extracted JSON array: {e}")

        print(f"[AI_ENGINE] Respuesta no parseable:\n{text[:500]}")
        raise Exception(f"AI response not valid JSON: {text[:500]}")
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
