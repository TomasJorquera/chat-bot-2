import React, { useState, useRef, useEffect } from 'react';
import { Send, ArrowLeft, RotateCcw, FileText, Loader } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Message } from '../../types';

interface ChatInterfaceProps {
  character: 'Teo' | 'Josefina';
  onBack: () => void;
}

// Interfaz para el historial que viene del backend
interface HistoryMessage {
  id: number;
  content: string;
  role: 'user' | 'assistant';
  created_at: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ character, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const characterInfo = {
    Teo: {
      emoji: '🧒',
      age: 9,
      grade: '4º Básico',
      personality: 'Tímido pero curioso, prefiere ejemplos visuales',
      greeting: '¡Hola! Soy Teo. A veces me cuesta leer, pero me gusta aprender con dibujos y colores. ¿Me puedes ayudar?'
    },
    Josefina: {
      emoji: '👧',
      age: 15,
      grade: '1º Medio',
      personality: 'Tímida, aprende mejor con ejemplos concretos',
      greeting: '¡Hola! Soy Josefina. Me gusta la música y el fútbol. A veces necesito que me expliquen las cosas con ejemplos. ¿Podemos conversar?'
    }
  };

  useEffect(() => {
    // Al entrar al chat, reinicia el historial del personaje en el backend
    // y muestra el saludo inicial en el frontend.
    const startNewSession = async () => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
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
      .filter(m => m.content !== characterInfo[character].greeting)
      .map(m => ({
        role: m.sender === 'user' ? 'user' : 'model',
        parts: [m.content]
      }));

    setIsTyping(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
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
        throw new Error(errorData.detail || 'Error al conectar con el servidor');
      }

      const data = await apiResponse.json();
      console.log("[FRONT] Respuesta del backend:", data); // Depuración

      const content = data.response;
      if (!content) {
        throw new Error("La respuesta del servidor está vacía.");
      }

      const characterResponse: Message = {
        id: Date.now().toString(),
        content,
        sender: 'character',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, characterResponse]);
    } catch (error) {
      console.error("Error fetching character response:", error);
      let errorMessage = 'Lo siento, no me siento bien para hablar ahora...';
      if (error instanceof Error) {
        // Añadimos el detalle del error para facilitar la depuración
        errorMessage = `Error de conexión: ${error.message}. Revisa que el servidor esté funcionando.`;
      }
      const errorResponse: Message = {
        id: Date.now().toString(),
        content: errorMessage,
        sender: 'character',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorResponse]);
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

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    
    // Llamamos a la nueva función que conecta con el backend
    await getCharacterResponse(messageToSend); // Usamos la variable guardada
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleRestart = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
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
    const conversationToSave = messages.filter(
      msg => msg.content !== characterInfo[character].greeting
    );

    if (conversationToSave.length === 0) {
      alert("No hay conversación para generar un reporte.");
      return;
    }

    try {
      const doc = new jsPDF();
      const info = characterInfo[character];

      // Título del reporte
      doc.setFontSize(18);
      doc.text(`Reporte de Conversación con ${character}`, 14, 22);

      // Información del personaje
      doc.setFontSize(11);
      doc.text(`Personaje: ${character} (${info.age} años, ${info.grade})`, 14, 32);
      doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 14, 38);

      // Preparar los datos para la tabla
      const tableData = conversationToSave.map(msg => [
        msg.sender === 'user' ? 'Docente' : character,
        msg.content
      ]);

      // Crear la tabla con la conversación
      autoTable(doc, {
        startY: 50,
        head: [['Participante', 'Mensaje']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [22, 160, 133] }, // Color verde azulado para la cabecera
      });

      // Descargar el PDF
      doc.save(`reporte_chat_${character.toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`);
      
      // Después de descargar, vuelve a la pantalla de selección
      onBack();

    } catch (error) {
      console.error("Error al generar el reporte:", error);
      alert(error instanceof Error ? error.message : "No se pudo generar el reporte.");
    }
  };


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
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handleFinishAndSave}
              className="flex items-center space-x-2 px-4 py-2 bg-[#43A047] hover:bg-green-600 text-white rounded-lg transition-colors"
              title="Finalizar y guardar la conversación en PDF"
            >
              <FileText className="w-5 h-5" />
              <span>Finalizar y Guardar</span>
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
          {messages.map((message) => (
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
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Escribe un mensaje a ${character}...`}
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
    </div>
  );
};

export default ChatInterface;