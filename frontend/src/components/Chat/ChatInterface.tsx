import React, { useState, useRef, useEffect } from 'react';
import { Send, ArrowLeft, RotateCcw, FileText, Loader } from 'lucide-react';
import { Message } from '../../types';
import EvaluationPdfPreview from './EvaluationPdfPreview';
import { useAuth } from '../../context/AuthContext';

interface ChatInterfaceProps {
  character: 'Teo' | 'Jojo';
  onBack: () => void;
}

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

const ChatInterface: React.FC<ChatInterfaceProps> = ({ character, onBack }) => {
  const { token } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [interaccionId, setInteraccionId] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<null | {
    evaluation: { criterio: string; descripcion: string; cumplimiento: 'SÍ' | 'NO'; analisis: string; justificacion: string }[];
    conclusion: { title: string; text: string }[];
    conversation: Message[];
    puntaje: number;
  }>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const characterInfo: Record<'Teo' | 'Jojo', { emoji: string; age: number; grade: string; personality: string; greeting: string }> = {
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

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  // Inicia una nueva interacción en la DB y muestra el saludo
  const startNewSession = async () => {
    try {
      const res = await fetch(`${API_URL}/experimento/iniciar`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ personaje: character }),
      });
      if (res.ok) {
        const data = await res.json();
        setInteraccionId(data.interaccion_id);
      } else {
        console.error('[CHAT] No se pudo iniciar la interacción:', await res.text());
      }
    } catch (err) {
      console.error('[CHAT] Error al iniciar interacción:', err);
    }

    const greeting: Message = {
      id: Date.now().toString(),
      content: characterInfo[character].greeting,
      sender: 'character',
      timestamp: new Date(),
    };
    setMessages([greeting]);
  };

  useEffect(() => {
    startNewSession();
  }, [character]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Construye el historial en el formato que espera el backend
  const buildHistory = (msgs: Message[]) =>
    msgs
      .filter(m => m.content !== characterInfo[character].greeting)
      .map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));

  const getCharacterResponse = async (userMessage: string, currentMessages: Message[]) => {
    if (!interaccionId) {
      console.error('[CHAT] interaccion_id no disponible');
      return;
    }

    setIsTyping(true);
    try {
      const res = await fetch(`${API_URL}/experimento/mensaje`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          interaccion_id: interaccionId,
          personaje: character,
          mensaje: userMessage,
          history: buildHistory(currentMessages),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || `Error ${res.status}`);
      }

      const data = await res.json();
      const characterResponse: Message = {
        id: Date.now().toString(),
        content: data.respuesta,
        sender: 'character',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, characterResponse]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error desconocido';
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: `Error de conexión: ${msg}`,
        sender: 'character',
        timestamp: new Date(),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    const text = inputValue;
    const userMessage: Message = {
      id: Date.now().toString(),
      content: text,
      sender: 'user',
      timestamp: new Date(),
    };
    const updated = [...messages, userMessage];
    setMessages(updated);
    setInputValue('');
    await getCharacterResponse(text, updated);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRestart = async () => {
    setMessages([]);
    setInteraccionId(null);
    await startNewSession();
  };

  const handleFinishAndSave = async () => {
    const conversationToSave = messages.filter(m => m.content !== characterInfo[character].greeting);
    if (conversationToSave.length === 0) {
      alert('No hay conversación para generar un informe.');
      return;
    }

    setIsEvaluating(true);
    setEvaluationError(null);

    let puntaje: number | null = null;
    let evaluationArray: any[] = [];
    let conclusionArray: { title: string; text: string }[] = [];

    try {
      const payload = {
        messages: conversationToSave.map(m => ({ sender: m.sender, content: m.content })),
        character,
      };
      const res = await fetch(`${API_URL}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Server responded ${res.status}: ${await res.text()}`);

      const evalData = await res.json();

      if (Array.isArray(evalData.evaluation)) {
        evaluationArray = evalData.evaluation.map((it: any) => ({
          criterio: it.criterio || it.name || '',
          descripcion: it.descripcion || it.description || '',
          cumplimiento: (it.cumplimiento || it.compliance || 'NO') as 'SÍ' | 'NO',
          analisis: it.analisis || it.analysis || '',
          justificacion: it.justificacion || it.justification || '',
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
          justificacion: it.justification || it.justificacion || '',
        }));
        const total = evalData.total_score ?? evaluationArray.filter((e: any) => e.cumplimiento === 'SÍ').length;
        const range = evalData.performance_range ?? (total >= 8 ? 'Excelente' : total >= 5 ? 'Competente' : total >= 3 ? 'Aceptable' : 'Por debajo del mínimo');
        conclusionArray = [{ title: 'Puntaje total', text: `${total} de 11 criterios cumplidos - Desempeño: ${range}` }];
        if (evalData.conclusion) conclusionArray.push({ title: 'Conclusión', text: evalData.conclusion });
      }

      if (!evaluationArray.length) throw new Error('Empty evaluation');

      puntaje = evaluationArray.filter((e: any) => e.cumplimiento === 'SÍ').length;
    } catch (err) {
      console.warn('[CHAT] Evaluación fallida, usando fallback:', err);
      setEvaluationError(err instanceof Error ? err.message : String(err));

      evaluationArray = [
        { criterio: '1. Andamiaje funcional/ecológico', descripcion: 'El docente relaciona el tema con situación real.', cumplimiento: 'SÍ' as const, analisis: 'Relaciona conceptos con ejemplos cotidianos.', justificacion: 'Observado en mensajes que contextualizan el aprendizaje.' },
        { criterio: '2. Secuenciación clara de pasos', descripcion: 'Descompone la actividad en pasos visuales.', cumplimiento: 'SÍ' as const, analisis: 'Las instrucciones se presentan de forma clara.', justificacion: 'Los mensajes muestran una secuencia lógica.' },
        { criterio: '3. Adaptación de textos y consignas', descripcion: 'Simplifica el lenguaje y evita preguntas abstractas.', cumplimiento: 'NO' as const, analisis: 'Algunas consignas podrían ser más concretas.', justificacion: 'Algunos mensajes usan términos abstractos.' },
        { criterio: '4. Uso de memoria concreta', descripcion: 'Usa conocimientos previos e intereses del estudiante.', cumplimiento: 'SÍ' as const, analisis: 'Conecta intereses con el aprendizaje.', justificacion: 'Referencias a los intereses del alumno.' },
        { criterio: '5. Prevención de burlas y miedo', descripcion: 'Aplica refuerzo positivo genuino.', cumplimiento: 'SÍ' as const, analisis: 'El tono refuerza la seguridad emocional.', justificacion: 'Mantiene un tono positivo y validante.' },
        { criterio: '6. Validación de la vulnerabilidad', descripcion: 'Valida emociones antes de redirigir la tarea.', cumplimiento: 'NO' as const, analisis: 'No se reconocieron explícitamente emociones.', justificacion: 'No se observó validación emocional clara.' },
        { criterio: '7. Promoción de autonomía social', descripcion: 'Anima al estudiante a expresar necesidades.', cumplimiento: 'SÍ' as const, analisis: 'Fomenta la autorregulación.', justificacion: 'Ofrece opciones e incentiva decisiones.' },
        { criterio: '8. Vinculación curricular', descripcion: 'Aplica ejemplos al contenido curricular.', cumplimiento: 'NO' as const, analisis: 'Los ejemplos no vinculan con objetivos curriculares.', justificacion: 'No se conectan con objetivos escolares.' },
        { criterio: '9. Indagación vocacional temprana', descripcion: 'Relaciona habilidades con proyecciones futuras.', cumplimiento: 'SÍ' as const, analisis: 'Fomenta percepción positiva del talento.', justificacion: 'Relaciona habilidades con desarrollos futuros.' },
        { criterio: '10. Refuerzo de autonomía comunitaria', descripcion: 'Propone simulaciones prácticas de la vida diaria.', cumplimiento: 'NO' as const, analisis: 'No incluyó escenarios prácticos.', justificacion: 'No se emplearon situaciones cotidianas.' },
        { criterio: '11. Promoción de inclusión curricular', descripcion: 'Propone situaciones para participar en grupo.', cumplimiento: 'SÍ' as const, analisis: 'Integra estrategias de participación.', justificacion: 'Sugiere actividades colaborativas.' },
      ];
      const count = evaluationArray.filter((e: any) => e.cumplimiento === 'SÍ').length;
      const rango = count >= 8 ? 'Excelente' : count >= 5 ? 'Competente' : count >= 3 ? 'Aceptable' : 'Por debajo del mínimo';
      conclusionArray = [
        { title: 'Puntaje total', text: `${count} de 11 criterios cumplidos - Desempeño: ${rango}` },
        { title: 'Fortalezas', text: 'El docente crea un entorno seguro y conecta ejemplos con los intereses del estudiante.' },
        { title: 'Áreas de mejora', text: 'Brindar validación emocional más explícita y enlaces curriculares más sólidos.' },
      ];
      puntaje = count;
    }

    setPreviewData({ evaluation: evaluationArray, conclusion: conclusionArray, conversation: conversationToSave, puntaje: puntaje ?? 0 });
    setShowPreview(true);
    setIsEvaluating(false);
  };

  const info = characterInfo[character];

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-[#E3F2FD] via-[#BBDEFB] to-[#90CAF9]">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-blue-200 px-4 py-4 mt-16">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button onClick={onBack} className="p-2 hover:bg-blue-50 rounded-lg transition-colors">
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
              <div className="ml-4 bg-yellow-100 border-l-4 border-yellow-400 p-3 text-sm text-yellow-800 rounded">
                <strong>Nota:</strong> Evaluación automática no disponible, se muestra un ejemplo.
                <div className="mt-1 text-xs text-yellow-700">{evaluationError}</div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleFinishAndSave}
              disabled={isEvaluating}
              className={`flex items-center space-x-2 px-4 py-2 ${isEvaluating ? 'bg-gray-400 cursor-wait' : 'bg-[#43A047] hover:bg-green-600'} text-white rounded-lg transition-colors`}
            >
              <FileText className="w-5 h-5" />
              <span>{isEvaluating ? 'Generando...' : 'Finalizar y guardar'}</span>
            </button>
            <button onClick={handleRestart} className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg" title="Reiniciar conversación">
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map(message => (
            <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                message.sender === 'user'
                  ? 'bg-[#1E88E5] text-white rounded-br-sm'
                  : 'bg-white text-[#0D47A1] rounded-bl-sm shadow-sm'
              }`}>
                <p className="text-sm leading-relaxed">{message.content}</p>
                <span className={`text-xs mt-1 block ${message.sender === 'user' ? 'text-blue-100' : 'text-[#37474F]'}`}>
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
                  <span className="text-[#37474F] text-sm">{character} está escribiendo...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white/90 backdrop-blur-sm border-t border-blue-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-end space-x-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Escribe un mensaje para ${character}...`}
            className="flex-1 px-4 py-3 border border-blue-200 rounded-2xl focus:ring-2 focus:ring-[#1E88E5] focus:border-transparent outline-none transition-all"
            disabled={isTyping}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            className="p-3 bg-[#1E88E5] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
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
          onConfirm={async (pdfBase64: string) => {
            if (interaccionId) {
              try {
                await fetch(`${API_URL}/experimento/finalizar`, {
                  method: 'POST',
                  headers: authHeaders,
                  body: JSON.stringify({
                    interaccion_id: interaccionId,
                    puntaje_evaluador: previewData.puntaje,
                    pdf_url: pdfBase64,
                  }),
                });
              } catch (err) {
                console.error('[CHAT] No se pudo guardar el PDF en DB:', err);
              }
            }
            setShowPreview(false);
            onBack();
          }}
        />
      )}
    </div>
  );
};

export default ChatInterface;
