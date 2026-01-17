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
      grade: '4th Grade',
      personality: 'Shy but curious; prefers visual examples',
      greeting: 'Hi, I am Teo. I sometimes struggle with reading, but I like learning with drawings and colors. Can you help me?'
    },
    Jojo: {
      emoji: '👧',
      age: 15,
      grade: '10th Grade',
      personality: 'Shy; learns better with concrete examples',
      greeting: 'Hi, I am Jojo. I like music and soccer. Sometimes I need things explained with examples. Can we talk?'
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
      let errorMessage = 'Sorry, I am not able to talk right now.';
      if (error instanceof Error) {
        // Include error detail for debugging
        errorMessage = `Connection error: ${error.message}. Please check that the server is running.`;
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
      alert("Could not restart the conversation. Please try again.");
    }
  };

  const handleFinishAndSave = async () => {
    // Excluir el saludo inicial antes de generar el reporte
    const conversationToSave = messages.filter((msg: Message) => msg.content !== characterInfo[character].greeting);

    if (conversationToSave.length === 0) {
      alert("There is no conversation to generate a report.");
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
        conclusionArray = [ { title: 'Total Score', text: `${total} of 11 criteria met - Performance: ${range}` } ];
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
      console.warn('Could not obtain evaluation from backend; using example data. Detail:', err);
      setEvaluationError(err instanceof Error ? err.message : String(err));

      // Fallback: mantener los datos de ejemplo previos para que la UI funcione
      const exampleEvaluation = [
        { criterio: '1. Use of Functional/Ecological Scaffolding', descripcion: 'Teacher links the session topic to a real-life situation.', cumplimiento: 'SÍ' as const, analisis: 'Teacher appropriately relates concepts to everyday examples.', justificacion: 'Observed in messages that contextualize learning with daily situations.' },
        { criterio: '2. Clear Step Sequencing', descripcion: 'Teacher breaks down the activity into simple visual steps and avoids complex instructions.', cumplimiento: 'SÍ' as const, analisis: 'Instructions are presented clearly and in a structured way.', justificacion: 'Messages show a logical, progressive sequence of instructions.' },
        { criterio: '3. Adaptation of Texts and Prompts', descripcion: 'Teacher simplifies language and avoids abstract questions.', cumplimiento: 'NO' as const, analisis: 'Some prompts could be more concrete.', justificacion: 'Some messages use abstract terms that could be simplified.' },
        { criterio: '4. Use of Concrete Memory', descripcion: 'Teacher uses prior knowledge or student interests (drawing, logic, pet, grandmother).', cumplimiento: 'SÍ' as const, analisis: 'Teacher connects student interests to learning.', justificacion: 'References to the student’s interests (drawing, pet) help facilitate learning.' },
        { criterio: '5. Prevention of Teasing and Fear', descripcion: 'Teacher applies genuine positive reinforcement and emphasizes a safe space.', cumplimiento: 'SÍ' as const, analisis: 'Tone strengthened the student’s emotional safety.', justificacion: 'Maintains a positive and validating tone throughout the interaction.' },
        { criterio: '6. Validation of Vulnerability', descripcion: 'Teacher validates emotions (e.g., frustration) before redirecting the task.', cumplimiento: 'NO' as const, analisis: 'Teacher did not explicitly recognize emotions at some difficulty points.', justificacion: 'No clear emotional validation observed during moments of difficulty.' },
        { criterio: '7. Promotion of Social Autonomy', descripcion: 'Teacher encourages the student to express needs or decide how to proceed.', cumplimiento: 'SÍ' as const, analisis: 'Encouraged self-regulation or asking for help.', justificacion: 'Offers options and encourages decision-making about the learning process.' },
        { criterio: '8. Curricular Linkage', descripcion: 'Teacher applies functional examples to curricular content (language or math).', cumplimiento: 'NO' as const, analisis: 'Examples did not explicitly link to curricular objectives.', justificacion: 'Used examples are not clearly connected to school objectives.' },
        { criterio: '9. Early Vocational Inquiry', descripcion: 'Teacher links student skills (drawing, logic) to future projections.', cumplimiento: 'SÍ' as const, analisis: 'Fosters a positive perception of personal talent.', justificacion: 'Relates artistic skills to possible future developments.' },
        { criterio: '10. Reinforcement of Community Autonomy', descripcion: 'Teacher proposes practical simulations (shopping, solving a problem, caring for Rufino).', cumplimiento: 'NO' as const, analisis: 'Did not include practical everyday scenarios in examples.', justificacion: 'No practical daily-life situations were used.' },
        { criterio: '11. Promotion of Curricular Inclusion', descripcion: 'Teacher proposes situations where the student can participate in groups or with support.', cumplimiento: 'SÍ' as const, analisis: 'Integrated strategies to foster peer participation.', justificacion: 'Suggests collaborative activities and opportunities for group participation.' }
      ];

      const criteriosCumplidos = exampleEvaluation.filter(e => e.cumplimiento === 'SÍ').length;
      const rangoDesempeno = criteriosCumplidos >= 8 ? 'Successful' : criteriosCumplidos >= 5 ? 'Competent' : criteriosCumplidos >= 3 ? 'Acceptable' : 'Below minimum';
      const exampleConclusion = [ { title: 'Total Score', text: `${criteriosCumplidos} of 11 criteria met - Performance: ${rangoDesempeno}` }, { title: 'Strengths', text: 'Teacher demonstrates skill creating a safe, validating environment and connecting examples to student interests.' }, { title: 'Areas for Improvement', text: 'Opportunities exist to provide more explicit emotional validation and stronger curricular connections.' }, { title: 'Pedagogical Suggestions', text: '1. Include more moments of emotional validation before redirecting tasks.\n2. Increase the use of practical examples linked to daily life and curriculum.' } ];

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
                    <strong>Note:</strong> The automatic evaluation from the backend could not be retrieved. A sample is shown.
                    <div className="mt-1 text-xs text-yellow-700">Detail: {evaluationError}</div>
                  </div>
                </div>
              )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleFinishAndSave}
              disabled={isEvaluating}
              className={`flex items-center space-x-2 px-4 py-2 ${isEvaluating ? 'bg-gray-400 cursor-wait' : 'bg-[#43A047] hover:bg-green-600'} text-white rounded-lg transition-colors`}
              title="Finish and save the conversation as PDF"
            >
                <FileText className="w-5 h-5" />
                <span>{isEvaluating ? 'Generating...' : 'Finish and Save'}</span>
            </button>
            <button onClick={handleRestart} className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg" title="Restart conversation (clears current history)">
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
                    {character} is typing...
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
                placeholder={`Type a message to ${character}...`}
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