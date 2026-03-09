import React, { useState, useRef, useEffect } from 'react';
import { Send, ArrowLeft, RotateCcw, FileText, Loader } from 'lucide-react';
import { Message } from '../../types';
import EvaluationPdfPreview from './EvaluationPdfPreview';

interface ChatInterfaceProps {
  character: 'Teo' | 'Jojo';
  onBack: () => void;
}

// (HistoryMessage removed — not used)

const ChatInterface: React.FC<ChatInterfaceProps> = (props: ChatInterfaceProps) => {
  const { character, onBack } = props;
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const characterInfo: Record<ChatInterfaceProps['character'], { emoji: string; age: number; grade: string; personality: string; greeting: string }> = {
    Teo: {
      emoji: '🧒',
      age: 9,
      grade: '4º Básico',
      personality: 'Tímido pero curioso; prefiere ejemplos visuales',
      greeting: 'Hola, soy Teo. A veces me cuesta leer, pero me gusta aprender con dibujos y colores. ¿Puedes ayudarme?'
    },
    Jojo: {
      emoji: '👧',
      age: 15,
      grade: '10º Medio',
      personality: 'Tímida; aprende mejor con ejemplos concretos',
      greeting: 'Hola, soy Jojo. Me gusta la música y el fútbol. A veces necesito que me expliquen con ejemplos. ¿Podemos conversar?'
    }
  };

  useEffect(() => {
    // Al entrar al chat, reinicia el historial del personaje en el backend
    // y muestra el saludo inicial en el frontend.
    const startNewSession = async () => {
      const apiUrl = ((import.meta as any).env?.VITE_API_URL) || 'http://localhost:8000';
      await fetch(`${apiUrl}/chat/restart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character: character }),
      });

      const greeting: Message = {
        id: Date.now().toString(),
        content: characterInfo[character].greeting,
        sender: 'character',
        timestamp: new Date()
      };
      setMessages([greeting]);
    };
    startNewSession();
  }, [character]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getCharacterResponse = async (userMessage: string) => {
    // Prepara el historial para la IA, excluyendo el saludo inicial (comparando por contenido)
    const historyForAI = messages
      .filter((m: Message) => m.content !== characterInfo[character].greeting)
      .map((m: Message) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [m.content]
      }));

    setIsTyping(true);
    try {
  const apiUrl = ((import.meta as any).env?.VITE_API_URL) || 'http://localhost:8000';
      const apiResponse = await fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          character: character,
          history: historyForAI // Enviamos el historial actual
        }),
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.detail || 'Error connecting to server');
      }

      const data = await apiResponse.json();
      console.log("[FRONT] Respuesta del backend:", data); // Depuración

      const content = data.response;
      if (!content) {
        throw new Error("Server response is empty.");
      }

      const characterResponse: Message = {
        id: Date.now().toString(),
        content,
        sender: 'character',
        timestamp: new Date(),
      };
  setMessages((prev: Message[]) => [...prev, characterResponse]);
    } catch (error) {
      console.error("Error fetching character response:", error);
      let errorMessage = 'Lo siento, no puedo conversar en este momento.';
      if (error instanceof Error) {
        // Include error detail for debugging
        errorMessage = `Error de conexión: ${error.message}. Comprueba que el servidor esté en funcionamiento.`;
      }
      const errorResponse: Message = {
        id: Date.now().toString(),
        content: errorMessage,
        sender: 'character',
        timestamp: new Date(),
      };
  setMessages((prev: Message[]) => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const messageToSend = inputValue; // Guardamos el mensaje antes de limpiar el input

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageToSend,
      sender: 'user',
      timestamp: new Date()
    };

  setMessages((prev: Message[]) => [...prev, userMessage]);
    setInputValue('');
    
    // Llamamos a la nueva función que conecta con el backend
    await getCharacterResponse(messageToSend); // Usamos la variable guardada
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRestart = async () => {
    try {
    const apiUrl = ((import.meta as any).env?.VITE_API_URL) || 'http://localhost:8000';
      await fetch(`${apiUrl}/chat/restart`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ character: character })
      });
      
      // Si la llamada al backend es exitosa, reinicia el estado local
      const greeting: Message = {
        id: Date.now().toString(),
        content: characterInfo[character].greeting,
        sender: 'character',
        timestamp: new Date()
      };
      setMessages([greeting]);

    } catch (error) {
      console.error("Error al reiniciar la conversación:", error);
      alert("No se pudo reiniciar la conversación. Inténtalo de nuevo.");
    }
  };

  const handleFinishAndSave = async () => {
    // Excluir el saludo inicial antes de generar el reporte
    const conversationToSave = messages.filter((msg: Message) => msg.content !== characterInfo[character].greeting);

    if (conversationToSave.length === 0) {
      alert("No hay conversación para generar un informe.");
      return;
    }

    // Intentamos solicitar la evaluación real al backend. Si falla, usamos datos de ejemplo como fallback.
    const apiUrl = ((import.meta as any).env?.VITE_API_URL) || 'http://localhost:8000';
    try {
      setIsEvaluating(true);
      setEvaluationError(null);
      const payload = {
        messages: conversationToSave.map(m => ({ sender: m.sender, content: m.content })),
        character: character
      };

      const res = await fetch(`${apiUrl}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        // Intentar leer detalle del error devuelto por el backend
        let text = await res.text();
        try {
          const parsed = JSON.parse(text);
          text = parsed.detail || JSON.stringify(parsed);
        } catch (e) {
          // mantener text crudo
        }
        throw new Error(`Server responded ${res.status}: ${text}`);
      }

      const evalData = await res.json();
      console.log('[FRONT] Evaluación recibida:', evalData);

      // El backend puede devolver dos formatos según la implementación del prompt:
      // 1) { evaluation: [...], conclusion: [...] }
      // 2) { criteria: [...], total_score, performance_range, conclusion: '...' }
      let evaluationArray: any[] = [];
      let conclusionArray: { title: string; text: string }[] = [];

      if (Array.isArray(evalData.evaluation)) {
        evaluationArray = evalData.evaluation.map((it: any) => ({
          criterio: it.criterio || it.name || '',
          descripcion: it.descripcion || it.description || '',
          cumplimiento: (it.cumplimiento || it.compliance || 'NO') as 'SÍ' | 'NO',
          analisis: it.analisis || it.analysis || '',
          justificacion: it.justificacion || it.justification || ''
        }));

        if (Array.isArray(evalData.conclusion)) {
          conclusionArray = evalData.conclusion;
        } else if (typeof evalData.conclusion === 'string') {
          conclusionArray = [{ title: 'Conclusión', text: evalData.conclusion }];
        }
      } else if (Array.isArray(evalData.criteria)) {
        evaluationArray = evalData.criteria.map((it: any) => ({
          criterio: `${it.number}. ${it.name}`,
          descripcion: it.description || '',
          cumplimiento: (it.compliance || it.cumplimiento || 'NO') as 'SÍ' | 'NO',
          analisis: it.analysis || it.analisis || '',
          justificacion: it.justification || it.justificacion || ''
        }));

        // Create conclusion based on total_score/performance_range
        const total = evalData.total_score ?? evaluationArray.filter(e => e.cumplimiento === 'SÍ').length;
        const range = evalData.performance_range ?? (total >= 8 ? 'Successful' : total >=5 ? 'Competent' : total >=3 ? 'Acceptable' : 'Below minimum');
        conclusionArray = [ { title: 'Puntaje total', text: `${total} de 11 criterios cumplidos - Desempeño: ${range}` } ];
        if (evalData.conclusion && typeof evalData.conclusion === 'string') {
          conclusionArray.push({ title: 'Conclusión', text: evalData.conclusion });
        }
      }

      // Si el backend no devolvió la evaluación esperada, fallback a ejemplo
      if (!evaluationArray || evaluationArray.length === 0) throw new Error('Empty evaluation');

      setPreviewData({ evaluation: evaluationArray, conclusion: conclusionArray, conversation: conversationToSave });
      setShowPreview(true);
      return;
    } catch (err) {
      console.warn('No se pudo obtener la evaluación del backend; usando datos de ejemplo. Detalle:', err);
      setEvaluationError(err instanceof Error ? err.message : String(err));

      // Fallback: mantener los datos de ejemplo previos para que la UI funcione
      const exampleEvaluation = [
        { criterio: '1. Andamiaje funcional/ecológico', descripcion: 'El docente relaciona el tema de la sesión con una situación de la vida real.', cumplimiento: 'SÍ' as const, analisis: 'Relaciona conceptos con ejemplos cotidianos.', justificacion: 'Observado en mensajes que contextualizan el aprendizaje con situaciones diarias.' },
        { criterio: '2. Secuenciación clara de pasos', descripcion: 'El docente descompone la actividad en pasos visuales y evita instrucciones complejas.', cumplimiento: 'SÍ' as const, analisis: 'Las instrucciones se presentan de forma clara y ordenada.', justificacion: 'Los mensajes muestran una secuencia lógica y progresiva.' },
        { criterio: '3. Adaptación de textos y consignas', descripcion: 'El docente simplifica el lenguaje y evita preguntas abstractas.', cumplimiento: 'NO' as const, analisis: 'Algunas consignas podrían ser más concretas.', justificacion: 'Algunos mensajes usan términos abstractos que podrían simplificarse.' },
        { criterio: '4. Uso de memoria concreta', descripcion: 'El docente usa conocimientos previos o intereses del estudiante (dibujo, mascota).', cumplimiento: 'SÍ' as const, analisis: 'Conecta los intereses del estudiante con el aprendizaje.', justificacion: 'Referencias a los intereses del alumno ayudan a facilitar el aprendizaje.' },
        { criterio: '5. Prevención de burlas y miedo', descripcion: 'El docente aplica refuerzo positivo genuino y enfatiza un espacio seguro.', cumplimiento: 'SÍ' as const, analisis: 'El tono refuerza la seguridad emocional del estudiante.', justificacion: 'Mantiene un tono positivo y validante durante la interacción.' },
        { criterio: '6. Validación de la vulnerabilidad', descripcion: 'El docente valida emociones (p. ej., frustración) antes de redirigir la tarea.', cumplimiento: 'NO' as const, analisis: 'No se reconocieron explícitamente emociones en algunos puntos de dificultad.', justificacion: 'No se observó validación emocional clara en momentos de dificultad.' },
        { criterio: '7. Promoción de autonomía social', descripcion: 'El docente anima al estudiante a expresar necesidades o decidir cómo avanzar.', cumplimiento: 'SÍ' as const, analisis: 'Fomenta la autorregulación y la petición de ayuda.', justificacion: 'Ofrece opciones e incentiva la toma de decisiones.' },
        { criterio: '8. Vinculación curricular', descripcion: 'El docente aplica ejemplos funcionales al contenido curricular (lenguaje o matemáticas).', cumplimiento: 'NO' as const, analisis: 'Los ejemplos no vinculan claramente con objetivos curriculares.', justificacion: 'Los ejemplos usados no se conectan explícitamente con objetivos escolares.' },
        { criterio: '9. Indagación vocacional temprana', descripcion: 'El docente relaciona habilidades del estudiante (dibujo, lógica) con proyecciones futuras.', cumplimiento: 'SÍ' as const, analisis: 'Fomenta una percepción positiva del talento personal.', justificacion: 'Relaciona habilidades artísticas con posibles desarrollos futuros.' },
        { criterio: '10. Refuerzo de autonomía comunitaria', descripcion: 'El docente propone simulaciones prácticas (compras, resolución de problemas).', cumplimiento: 'NO' as const, analisis: 'No incluyó escenarios prácticos de la vida diaria en los ejemplos.', justificacion: 'No se emplearon situaciones prácticas cotidianas.' },
        { criterio: '11. Promoción de inclusión curricular', descripcion: 'El docente propone situaciones para que el estudiante participe en grupo o con apoyo.', cumplimiento: 'SÍ' as const, analisis: 'Integra estrategias para fomentar la participación entre pares.', justificacion: 'Sugiere actividades colaborativas y oportunidades de participación.' }
      ];

      const criteriosCumplidos = exampleEvaluation.filter(e => e.cumplimiento === 'SÍ').length;
      const rangoDesempeno = criteriosCumplidos >= 8 ? 'Excelente' : criteriosCumplidos >= 5 ? 'Competente' : criteriosCumplidos >= 3 ? 'Aceptable' : 'Por debajo del mínimo';
      const exampleConclusion = [ { title: 'Puntaje total', text: `${criteriosCumplidos} de 11 criterios cumplidos - Desempeño: ${rangoDesempeno}` }, { title: 'Fortalezas', text: 'El docente demuestra habilidad para crear un entorno seguro y conectar ejemplos con los intereses del estudiante.' }, { title: 'Áreas de mejora', text: 'Existen oportunidades para brindar validación emocional más explícita y enlaces curriculares más sólidos.' }, { title: 'Sugerencias pedagógicas', text: '1. Incluir más momentos de validación emocional antes de redirigir tareas.\n2. Aumentar el uso de ejemplos prácticos vinculados a la vida diaria y al currículo.' } ];

      setPreviewData({ evaluation: exampleEvaluation, conclusion: exampleConclusion, conversation: conversationToSave });
      setShowPreview(true);
    } finally {
      setIsEvaluating(false);
    }
  };

  // Estados para la vista previa
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<null | { 
    evaluation: { 
      criterio: string;
      descripcion: string;
      cumplimiento: 'SÍ' | 'NO';
      analisis: string;
      justificacion: string;
    }[];
    conclusion: { title: string; text: string }[];
    conversation: Message[];
  }>(null);

  // Estado para indicar que se está generando la evaluación y cualquier error ocurrido
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);


  const info = characterInfo[character];

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-[#E3F2FD] via-[#BBDEFB] to-[#90CAF9]">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-blue-200 px-4 py-4 mt-16">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-[#1E88E5]" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-[#42A5F5] to-[#90CAF9] rounded-full flex items-center justify-center">
                <span className="text-2xl">{info.emoji}</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#0D47A1]">{character}</h2>
                <p className="text-sm text-[#37474F]">{info.age} años - {info.grade}</p>
              </div>
            </div>

              {evaluationError && (
                <div className="max-w-4xl mx-auto mt-3 px-4">
                    <div className="bg-yellow-100 border-l-4 border-yellow-400 p-3 text-sm text-yellow-800 rounded">
                      <strong>Nota:</strong> No se pudo obtener la evaluación automática desde el backend. Se muestra un ejemplo.
                      <div className="mt-1 text-xs text-yellow-700">Detalle: {evaluationError}</div>
                    </div>
                </div>
              )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleFinishAndSave}
              disabled={isEvaluating}
              className={`flex items-center space-x-2 px-4 py-2 ${isEvaluating ? 'bg-gray-400 cursor-wait' : 'bg-[#43A047] hover:bg-green-600'} text-white rounded-lg transition-colors`}
              title="Finalizar y guardar la conversación como PDF"
            >
                <FileText className="w-5 h-5" />
                <span>{isEvaluating ? 'Generando...' : 'Finalizar y guardar'}</span>
            </button>
            <button onClick={handleRestart} className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg" title="Reiniciar conversación (borra el historial actual)">
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message: Message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                  message.sender === 'user'
                    ? 'bg-[#1E88E5] text-white rounded-br-sm'
                    : 'bg-white text-[#0D47A1] rounded-bl-sm shadow-sm'
                }`}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
                <span className={`text-xs mt-1 block ${
                  message.sender === 'user' ? 'text-blue-100' : 'text-[#37474F]'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                <div className="flex items-center space-x-2">
                  <Loader className="w-4 h-4 animate-spin text-[#1E88E5]" />
                  <span className="text-[#37474F] text-sm">
                    {character} está escribiendo...
                  </span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-white/90 backdrop-blur-sm border-t border-blue-200 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <input
                ref={inputRef}
                id="chat-input" // <-- Agregado para accesibilidad
                type="text"
                value={inputValue}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Escribe un mensaje para ${character}...`}
                className="w-full px-4 py-3 border border-blue-200 rounded-2xl focus:ring-2 focus:ring-[#1E88E5] focus:border-transparent outline-none resize-none transition-all"
                disabled={isTyping}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="p-3 bg-[#1E88E5] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      {showPreview && previewData && (
        <EvaluationPdfPreview
          character={character}
          info={info}
          conversation={previewData.conversation}
          evaluation={previewData.evaluation}
          conclusion={previewData.conclusion}
          evaluationError={evaluationError}
          onClose={() => setShowPreview(false)}
          onConfirm={() => {
            setShowPreview(false);
            // Confirmar: volvemos a la pantalla anterior (se puede ajustar según el flujo requerido)
            onBack();
          }}
        />
      )}
    </div>
  );
};

export default ChatInterface;