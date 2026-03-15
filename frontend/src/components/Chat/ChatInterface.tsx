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
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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

  // USS Design tokens (local)
  const C = {
    navy:     '#1a2744',
    navyDark: '#111b33',
    red:      '#c0392b',
    gold:     '#c9a84c',
    gray50:   '#f8f9fb',
    gray100:  '#eef0f5',
    gray200:  '#d8dce8',
    gray400:  '#8892aa',
    white:    '#ffffff',
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.gray50, fontFamily: 'system-ui' }}>

      {/* ── Header ── */}
      <div style={{
        background: C.white,
        borderBottom: `1px solid ${C.gray200}`,
        padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0, height: 72,
        boxShadow: '0 2px 8px rgba(26,39,68,0.07)',
      }}>
        {/* Left: back + character */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={onBack}
            style={{
              width: 36, height: 36, borderRadius: 8, border: `1px solid ${C.gray200}`,
              background: C.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = C.gray100; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = C.white; }}
          >
            <ArrowLeft style={{ width: 18, height: 18, color: C.navy }} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: `linear-gradient(135deg, ${C.navy}, #243459)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
            }}>{info.emoji}</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.navyDark, fontFamily: "'Georgia', serif" }}>{character}</div>
              <div style={{ fontSize: 12, color: C.gray400 }}>{info.age} años · {info.grade}</div>
            </div>
          </div>

          {evaluationError && (
            <div style={{
              marginLeft: 16, padding: '6px 12px', borderRadius: 8,
              background: '#fef9c3', border: '1px solid #fde047',
              fontSize: 11, color: '#854d0e', maxWidth: 340,
            }}>
              <strong>Nota:</strong> Se muestra evaluación de ejemplo. {evaluationError}
            </div>
          )}
        </div>

        {/* Right: actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleFinishAndSave}
            disabled={isEvaluating}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 18px', borderRadius: 8, border: 'none', cursor: isEvaluating ? 'wait' : 'pointer',
              background: isEvaluating ? C.gray200 : C.navy,
              color: isEvaluating ? C.gray400 : C.white,
              fontSize: 13, fontWeight: 700, fontFamily: "'Georgia', serif",
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (!isEvaluating) (e.currentTarget as HTMLButtonElement).style.background = '#243459'; }}
            onMouseLeave={e => { if (!isEvaluating) (e.currentTarget as HTMLButtonElement).style.background = C.navy; }}
          >
            <FileText style={{ width: 16, height: 16 }} />
            {isEvaluating ? 'Generando...' : 'Finalizar y guardar'}
          </button>

          <button onClick={handleRestart}
            style={{
              width: 36, height: 36, borderRadius: 8, border: `1px solid ${C.gray200}`,
              background: C.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            title="Reiniciar conversación"
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = C.gray100; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = C.white; }}
          >
            <RotateCcw style={{ width: 16, height: 16, color: C.gray400 }} />
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px 8px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map((message: Message) => (
            <div key={message.id} style={{ display: 'flex', justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start' }}>
              {/* Avatar for character */}
              {message.sender === 'character' && (
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0, marginRight: 8, marginTop: 4,
                  background: `linear-gradient(135deg, ${C.navy}, #243459)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
                }}>{info.emoji}</div>
              )}
              <div style={{
                maxWidth: '68%',
                padding: '10px 14px',
                borderRadius: message.sender === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: message.sender === 'user' ? C.navy : C.white,
                color: message.sender === 'user' ? C.white : C.navyDark,
                boxShadow: '0 1px 4px rgba(26,39,68,0.10)',
                borderLeft: message.sender === 'character' ? `3px solid ${C.gold}` : 'none',
              }}>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {message.content}
                </p>
                <span style={{ fontSize: 10, marginTop: 4, display: 'block', opacity: 0.55 }}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {isTyping && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: `linear-gradient(135deg, ${C.navy}, #243459)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              }}>{info.emoji}</div>
              <div style={{
                padding: '10px 16px', borderRadius: '18px 18px 18px 4px',
                background: C.white, boxShadow: '0 1px 4px rgba(26,39,68,0.10)',
                borderLeft: `3px solid ${C.gold}`,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <Loader style={{ width: 14, height: 14, color: C.navy, animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 13, color: C.gray400 }}>{character} está escribiendo...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* ── Input ── */}
      <div style={{
        background: C.white, borderTop: `1px solid ${C.gray200}`,
        padding: '16px 24px', flexShrink: 0,
      }}>
        <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={`Escribe un mensaje para ${character}... (Enter para enviar, Shift+Enter para nueva línea)`}
            disabled={isTyping}
            rows={1}
            style={{
              flex: 1, padding: '11px 16px',
              border: `1px solid ${C.gray200}`, borderRadius: 12,
              fontSize: 14, fontFamily: 'system-ui', outline: 'none',
              resize: 'none', overflowY: 'auto',
              maxHeight: 140, lineHeight: 1.5,
              color: C.navyDark, background: C.gray50,
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = C.navy; e.currentTarget.style.background = C.white; }}
            onBlur={e => { e.currentTarget.style.borderColor = C.gray200; e.currentTarget.style.background = C.gray50; }}
            onInput={e => {
              const t = e.currentTarget;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 140) + 'px';
            }}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            style={{
              width: 44, height: 44, borderRadius: 12, border: 'none', flexShrink: 0,
              background: !inputValue.trim() || isTyping ? C.gray200 : C.navy,
              cursor: !inputValue.trim() || isTyping ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (inputValue.trim() && !isTyping) (e.currentTarget as HTMLButtonElement).style.background = '#243459'; }}
            onMouseLeave={e => { if (inputValue.trim() && !isTyping) (e.currentTarget as HTMLButtonElement).style.background = C.navy; }}
          >
            <Send style={{ width: 18, height: 18, color: !inputValue.trim() || isTyping ? C.gray400 : C.white }} />
          </button>
        </div>
        <div style={{ maxWidth: 760, margin: '6px auto 0', fontSize: 11, color: C.gray400, textAlign: 'right' }}>
          Enter para enviar · Shift+Enter para nueva línea
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
          onConfirm={() => { setShowPreview(false); onBack(); }}
        />
      )}
    </div>
  );
};

export default ChatInterface;