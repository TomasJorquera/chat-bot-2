import os
import google.generativeai as genai

# Configura la API key desde la variable de entorno.
# La librería busca automáticamente la variable de entorno GOOGLE_API_KEY.
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))

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
