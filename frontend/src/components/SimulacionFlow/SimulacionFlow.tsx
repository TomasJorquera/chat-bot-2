import React, { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── USS Design Tokens ─────────────────────────────────────────────────────────
const C = {
  navy:      '#1a2744',
  navyDark:  '#111b33',
  navyLight: '#243459',
  red:       '#c0392b',
  gold:      '#c9a84c',
  white:     '#ffffff',
  gray50:    '#f8f9fb',
  gray100:   '#eef0f5',
  gray200:   '#d8dce8',
  gray400:   '#8892aa',
  gray600:   '#4a5568',
  gray800:   '#1e293b',
};

const API = ((import.meta as any).env?.VITE_API_URL) || 'http://localhost:8000';

// ── Normaliza la respuesta de evaluación a formato estándar ───────────────────
// El prompt devuelve dos formatos posibles; esto los unifica antes de renderizar
function normalizeEvaluation(raw: any): any {
  if (!raw || typeof raw !== 'object') return raw;

  let { criteria, conclusion, total_score, performance_range } = raw;

  // Formato alternativo: "evaluation" en lugar de "criteria"
  if (!criteria && Array.isArray(raw.evaluation)) {
    criteria = raw.evaluation.map((item: any, idx: number) => ({
      name:          item.criterio      || item.name          || `Criterio ${idx + 1}`,
      description:   item.descripcion   || item.description   || '',
      compliance:    item.cumplimiento  || item.compliance    || 'NO',
      analysis:      item.analisis      || item.analysis      || '',
      justification: item.justificacion || item.justification || '',
    }));
  }

  // conclusion puede ser array de { title, text } → convertir a string
  if (Array.isArray(conclusion)) {
    const parts: string[] = [];
    for (const item of conclusion) {
      if (item && typeof item === 'object' && item.title) {
        // Extraer puntuación si está en el título
        if (!total_score && item.title.includes('Puntuación')) {
          const m = String(item.text || '').match(/(\d+)\s+de\s+11/);
          if (m) total_score = parseInt(m[1], 10);
        }
        parts.push(`**${item.title}**: ${item.text || ''}`);
      } else if (typeof item === 'string') {
        parts.push(item);
      }
    }
    conclusion = parts.join('\n\n');
  }

  // Calcular total_score a partir de criterios si falta
  if (total_score == null && Array.isArray(criteria)) {
    total_score = criteria.filter((c: any) =>
      (c.compliance || c.cumplimiento || '').toUpperCase() === 'SÍ'
    ).length;
  }

  // Derivar performance_range si falta
  if (!performance_range && total_score != null) {
    performance_range = total_score >= 8 ? 'Exitosa' : total_score >= 5 ? 'Competente' : 'Aceptable';
  }

  // Fallback: si no hay conclusion (Gemini la omitió), construir una básica
  if (!conclusion && total_score != null) {
    const met = Array.isArray(criteria)
      ? criteria.filter((c: any) => (c.compliance || c.cumplimiento || '').toUpperCase() === 'SÍ').length
      : total_score;
    conclusion = `**Puntuación Total**: ${met} de 11 criterios cumplidos - Desempeño ${performance_range ?? '—'}\n\n**Fortalezas**: La evaluación está basada en la conversación registrada. Los criterios cumplidos reflejan los aspectos positivos de la interacción docente.\n\n**Aspectos a Mejorar**: Se recomienda ampliar la conversación para obtener una retroalimentación más detallada sobre cada criterio no cumplido.\n\n**Sugerencias Pedagógicas**: 1. Inicia la sesión vinculando el tema con la vida cotidiana del estudiante.\n2. Usa lenguaje simple y paso a paso.\n3. Refuerza positivamente cada logro del estudiante.`;
  }

  return { ...raw, criteria, conclusion, total_score, performance_range };
}

// ── Parsea conclusion string en secciones { title, text } ────────────────────
function parseConclusionSections(conclusion: string): { title: string; text: string }[] {
  if (!conclusion || typeof conclusion !== 'string') return [];
  const sections: { title: string; text: string }[] = [];
  for (const part of conclusion.split(/\n\n+/)) {
    const m = part.match(/^\*\*(.+?)\*\*:\s*([\s\S]*)$/);
    if (m) sections.push({ title: m[1].trim(), text: m[2].trim() });
    else if (part.trim()) sections.push({ title: '', text: part.trim() });
  }
  return sections;
}

// ── Types ─────────────────────────────────────────────────────────────────────
type FlowStep = 'antecedentes' | 'planificacion' | 'chat' | 'resultado';
type ChatMsg  = { role: 'user' | 'assistant'; content: string };

export interface SimulacionData {
  id?: number;
  title: string;
  instrucciones: string;
  objetivos?: string;
  agente: 'Teo' | 'Jojo' | 'Ambos';
  numInteracciones: number;
  pautaTipo?: 'general' | 'personalizada';
  criterios?: any[] | null;
  ramo?: { code: string; name: string };
}

const AGENT_INFO = {
  Teo: {
    emoji: '🧒',
    age: 9,
    diagnosis: 'Dificultad Específica del Aprendizaje (DEA · F81.0)',
    grade: '3° Básico',
    color: '#7c3aed',
    greeting: 'Hola, soy Teo. A veces me cuesta leer, pero me gusta aprender con dibujos y colores. ¿Puedes ayudarme?',
  },
  Jojo: {
    emoji: '👧',
    age: 15,
    diagnosis: 'Discapacidad Intelectual Leve (DIL)',
    grade: '1° Medio',
    color: '#db2777',
    greeting: 'Hola, soy Jojo. Me gusta la música y el fútbol. A veces necesito que me expliquen con ejemplos. ¿Podemos conversar?',
  },
};

// ── Component ─────────────────────────────────────────────────────────────────
const SimulacionFlow: React.FC<{
  simulacion: SimulacionData;
  onClose: () => void;
  userEmail?: string;
}> = ({ simulacion, onClose, userEmail }) => {

  // ── Flow state ──
  const [step, setStep]             = useState<FlowStep>('antecedentes');
  const [interaccion, setInteraccion] = useState(1);
  const [selectedAgent, setSelectedAgent] = useState<'Teo' | 'Jojo'>(
    simulacion.agente === 'Ambos' ? 'Teo' : simulacion.agente as 'Teo' | 'Jojo'
  );

  // ── Planificación ──
  const [planTexto, setPlanTexto]     = useState('');
  const [planArchivo, setPlanArchivo] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Entrega tracking ──
  const [entregaId, setEntregaId] = useState<number | null>(null);

  // ── Chat ──
  const [messages, setMessages]     = useState<ChatMsg[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading]   = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking]     = useState(false);
  const [isListening, setIsListening]   = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const transcriptRef  = useRef('');

  const toggleListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert('Tu navegador no soporta reconocimiento de voz. Usa Chrome o Edge.'); return; }
    if (isListening) { recognitionRef.current?.stop(); return; }
    transcriptRef.current = '';
    const recognition = new SR();
    recognition.lang = 'es-CL';
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onstart  = () => setIsListening(true);
    recognition.onerror  = () => setIsListening(false);
    recognition.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) transcriptRef.current += e.results[i][0].transcript + ' ';
      }
    };
    recognition.onend = () => {
      setIsListening(false);
      const t = transcriptRef.current.trim();
      transcriptRef.current = '';
      if (t) sendMessage(t);
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  // ── TTS (gTTS via backend) ──
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { return () => { audioRef.current?.pause(); }; }, []);

  const speakAgentResponse = async (text: string, agent: 'Teo' | 'Jojo') => {
    if (!audioEnabled) return;
    audioRef.current?.pause();
    try {
      const res = await fetch(`${API}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, agent }),
      });
      const { audio_b64 } = await res.json();
      if (!audio_b64) return;
      const audio = new Audio(`data:audio/mp3;base64,${audio_b64}`);
      audioRef.current = audio;
      audio.onplay  = () => setIsSpeaking(true);
      audio.onended = () => setIsSpeaking(false);
      audio.onerror = () => setIsSpeaking(false);
      audio.play();
    } catch { setIsSpeaking(false); }
  };

  // ── Resultado ──
  const [evaluacion, setEvaluacion]     = useState<any>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [availableFiles, setAvailableFiles] = useState<Record<string, boolean>>({});
  const [completedResults, setCompletedResults] = useState<
    { interaccion: number; agent: string; score: number; total: number }[]
  >([]);
  const [alreadyCompleted, setAlreadyCompleted] = useState(false);
  const [checkingCompletion, setCheckingCompletion] = useState(true);

  const agentInfo  = AGENT_INFO[selectedAgent];
  const numTotal   = simulacion.numInteracciones;
  const isLastStep = interaccion === numTotal;
  const canGoToChat = planTexto.trim() !== '' || planArchivo !== null;
  const userMsgCount = messages.filter(m => m.role === 'user').length;

  // ── Check if student already completed all interactions ──
  useEffect(() => {
    if (!simulacion.id || !userEmail) { setCheckingCompletion(false); return; }
    fetch(`${API}/simulacion/${simulacion.id}/resultados`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const alumnoData = (data.alumnos ?? []).find((a: any) => a.correo === userEmail);
        const completadas = (alumnoData?.interacciones ?? []).filter((e: any) => e.estado === 'completada').length;
        if (completadas >= (data.num_interacciones ?? numTotal)) {
          setAlreadyCompleted(true);
        }
      })
      .catch(() => {})
      .finally(() => setCheckingCompletion(false));
  }, [simulacion.id, userEmail]);

  // ── Comprobar archivos estáticos disponibles en el backend (ej. teo.pdf) ──
  useEffect(() => {
    const check = async () => {
      try {
        const name = 'teo.pdf';
        const res = await fetch(`${API}/uploads/planificaciones/${name}`, { method: 'HEAD' });
        setAvailableFiles(prev => ({ ...prev, [name]: res.ok }));
      } catch (e) {
        setAvailableFiles(prev => ({ ...prev, ['teo.pdf']: false }));
      }
    };
    check();
  }, []);

  // ── Auto-scroll chat ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Start chat: create entrega, save planificación, show greeting ──
  const startChat = async () => {
    setMessages([]);
    setInputValue('');
    setIsLoading(false);

    // If simulacion has a real backend ID and we know the user, track the entrega
    let newEntregaId: number | null = null;
    if (simulacion.id && userEmail) {
      try {
        const entregaRes = await fetch(`${API}/simulacion/${simulacion.id}/entrega`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ correo_alumno: userEmail, agente_usado: selectedAgent }),
        });
        if (entregaRes.ok) {
          const entregaData = await entregaRes.json();
          newEntregaId = entregaData.entrega_id;
          setEntregaId(newEntregaId);

          // Save planificación (text + optional file)
          if (planTexto.trim() || planArchivo) {
            const fd = new FormData();
            if (planTexto.trim()) fd.append('texto', planTexto);
            if (planArchivo) fd.append('archivo', planArchivo);
            await fetch(`${API}/simulacion/entrega/${newEntregaId}/planificacion`, {
              method: 'POST',
              body: fd,
            });
          }
        }
      } catch { /* non-blocking — proceed without tracking */ }
    }

    setMessages([{ role: 'assistant', content: agentInfo.greeting }]);
    setStep('chat');
  };

  // ── Send message ──
  const sendMessage = async (overrideText?: string) => {
    const text = (overrideText ?? inputValue).trim();
    if (!text || isLoading) return;
    const userMsg: ChatMsg = { role: 'user', content: text };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    if (!overrideText) setInputValue('');
    setIsLoading(true);
    try {
      let responseText = '';
      if (entregaId) {
        // Simulacion flow: save messages to DB under this entrega
        const res = await fetch(`${API}/simulacion/entrega/${entregaId}/mensaje`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personaje: selectedAgent,
            mensaje: text,
            history: messages.map(m => ({ role: m.role, content: m.content })),
          }),
        });
        const data = await res.json();
        responseText = data.respuesta || data.response || 'Sin respuesta.';
      } else {
        // Fallback: old /chat endpoint (no entrega tracking)
        const res = await fetch(`${API}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            character: selectedAgent,
            history: messages.map(m => ({ role: m.role, content: m.content })),
          }),
        });
        const data = await res.json();
        responseText = data.response || data.message || 'Sin respuesta.';
      }
      setMessages(h => [...h, { role: 'assistant', content: responseText }]);
      speakAgentResponse(responseText, selectedAgent);
    } catch {
      setMessages(h => [...h, {
        role: 'assistant',
        content: 'Hubo un error al conectar con el servidor. Por favor intenta de nuevo.',
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Finalize + evaluate ──
  const finalizarChat = async () => {
    setIsEvaluating(true);
    setStep('resultado');

    const formattedMessages = messages.map(m => ({
      sender: m.role === 'user' ? 'user' : 'character',
      content: m.content,
    }));

    try {
      let data: any;

      // If we have a backend entrega, use the entrega finalizar endpoint (handles evaluation internally)
      if (entregaId) {
        const res = await fetch(`${API}/simulacion/entrega/${entregaId}/finalizar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: formattedMessages,
            correo_alumno: userEmail ?? '',
          }),
        });
        const raw = await res.json();
        data = normalizeEvaluation(raw.evaluacion ?? raw);
      } else {
        // Fallback: direct evaluate endpoint (ya normaliza en el backend)
        const res = await fetch(`${API}/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: formattedMessages, character: selectedAgent }),
        });
        data = normalizeEvaluation(await res.json());
      }

      setEvaluacion(data);
      setCompletedResults(prev => [...prev, {
        interaccion,
        agent: selectedAgent,
        score: data.total_score ?? 0,
        total: data.criteria?.length ?? 11,
      }]);
    } catch {
      const fallback = { total_score: 0, performance_range: 'Error', conclusion: 'No se pudo conectar con el evaluador.', criteria: [] };
      setEvaluacion(fallback);
      setCompletedResults(prev => [...prev, { interaccion, agent: selectedAgent, score: 0, total: 11 }]);
    } finally {
      setIsEvaluating(false);
    }
  };

  // ── Next interaction ──
  const nextInteraccion = () => {
    const next = interaccion + 1;
    setInteraccion(next);
    setPlanTexto('');
    setPlanArchivo(null);
    setMessages([]);
    setEvaluacion(null);
    if (simulacion.agente === 'Ambos') {
      setSelectedAgent(prev => prev === 'Teo' ? 'Jojo' : 'Teo');
    }
    setStep('planificacion');
  };

  // ── File handling ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPlanArchivo(file);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.includes('pdf') || file.name.endsWith('.docx') || file.name.endsWith('.doc'))) {
      setPlanArchivo(file);
    }
  };

  // ── PDF generation ──
  const generatePDF = () => {
    if (!evaluacion) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210; const M = 14;

    // Header band
    doc.setFillColor(17, 27, 51);
    doc.rect(0, 0, W, 40, 'F');
    doc.setFillColor(192, 57, 43);
    doc.rect(0, 40, W, 3, 'F');
    doc.setFillColor(201, 168, 76);
    doc.rect(0, 43, W, 1.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Universidad San Sebastián', M, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(180, 190, 210);
    doc.text('Facultad de Educación — Evaluación de Simulación Pedagógica', M, 24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(201, 168, 76);
    doc.text('INFORME CONFIDENCIAL', M, 34);

    let y = 54;

    // Title + meta
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(17, 27, 51);
    doc.text(simulacion.title, M, y); y += 7;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(74, 85, 104);
    doc.text(`Interacción ${interaccion} · Agente: ${selectedAgent} · ${agentInfo.diagnosis}`, M, y); y += 5;
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })}`, M, y); y += 10;

    // Score box
    const score = evaluacion.total_score ?? 0;
    const total = evaluacion.criteria?.length ?? 11;
    const perf  = evaluacion.performance_range ?? '—';
    const sc: [number,number,number] = score >= 8 ? [21,128,61] : score >= 5 ? [180,83,9] : [192,57,43];
    doc.setFillColor(248, 249, 251);
    doc.roundedRect(M, y, W - M * 2, 18, 3, 3, 'F');
    doc.setDrawColor(...sc);
    doc.roundedRect(M, y, W - M * 2, 18, 3, 3, 'S');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...sc);
    doc.text(`${score}/${total}`, M + 6, y + 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(74, 85, 104);
    doc.text(`Desempeño: ${perf}`, M + 26, y + 12);
    y += 26;

    // Conversation table
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(17, 27, 51);
    doc.text('Transcripción de la Sesión', M, y); y += 4;
    autoTable(doc, {
      startY: y,
      head: [['Participante', 'Mensaje']],
      body: messages.map(m => [m.role === 'user' ? 'Docente-Estudiante' : selectedAgent, m.content]),
      margin: { left: M, right: M },
      headStyles: { fillColor: [26, 39, 68], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
      columnStyles: { 0: { cellWidth: 38, fontStyle: 'bold' } },
      alternateRowStyles: { fillColor: [248, 249, 251] },
    });

    // Criteria table
    if (evaluacion.criteria?.length > 0) {
      doc.addPage(); y = 15;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(17, 27, 51);
      doc.text('Criterios de Evaluación Pedagógica', M, y); y += 4;
      autoTable(doc, {
        startY: y,
        head: [['Criterio', 'Descripción', 'Cumpl.', 'Análisis', 'Justificación']],
        body: evaluacion.criteria.map((c: any) => [
          c.name || '', c.description || '',
          (c.compliance || c.cumplimiento || '').toUpperCase() === 'SÍ' ? 'Sí' : 'No',
          c.analysis || '', c.justification || '',
        ]),
        margin: { left: M, right: M },
        headStyles: { fillColor: [17, 27, 51], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
        columnStyles: { 0:{cellWidth:32}, 1:{cellWidth:34}, 2:{cellWidth:13,halign:'center'}, 3:{cellWidth:38}, 4:{cellWidth:38} },
        alternateRowStyles: { fillColor: [248, 249, 251] },
        didParseCell: (data: any) => {
          if (data.column.index === 2 && data.section === 'body') {
            data.cell.styles.textColor = data.cell.raw === 'Sí' ? [21,128,61] : [192,57,43];
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 12;
    }

    // Conclusion sections — siempre en página nueva para no cortar
    if (evaluacion.conclusion) {
      const sections = parseConclusionSections(evaluacion.conclusion);
      if (sections.length > 0) {
        doc.addPage(); y = 15;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(17, 27, 51);
        doc.text('Retroalimentación Pedagógica', M, y); y += 10;

        const sectionColor: Record<string, [number,number,number]> = {
          'Puntuación': [74, 85, 104], 'Fortalezas': [21,128,61],
          'Aspectos': [180,83,9], 'Sugerencias': [26,39,68],
        };
        for (const sec of sections) {
          if (y > 255) { doc.addPage(); y = 15; }
          const color: [number,number,number] = Object.entries(sectionColor).find(([k]) => sec.title.includes(k))?.[1] ?? [74,85,104];
          if (sec.title) {
            doc.setFillColor(...color);
            doc.rect(M, y, 3, 6, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...color);
            doc.text(sec.title, M + 6, y + 4.5); y += 10;
          }
          doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(50, 60, 80);
          const lines = doc.splitTextToSize(sec.text, W - M * 2 - 6) as string[];
          // page-break mid-section if needed
          for (const line of lines) {
            if (y > 270) { doc.addPage(); y = 15; }
            doc.text(line, M + 6, y); y += 5;
          }
          y += 6;
        }
      }
    }

    // Footer on every page
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setFillColor(17, 27, 51);
      doc.rect(0, 287, W, 10, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(180, 190, 210);
      doc.text('Universidad San Sebastián — Plataforma de Simulación Pedagógica', M, 293);
      doc.text(`Pág. ${p}/${pages}`, W - M, 293, { align: 'right' });
    }

    doc.save(`evaluacion_${selectedAgent}_int${interaccion}_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  // ── Descarga PDF informe psicológico/psicopedagógico ──
  const downloadInformePDF = (agent: 'Teo' | 'Jojo') => {
    const filename = agent === 'Teo' ? 'teo.pdf' : 'jojo.pdf';
    const link = document.createElement('a');
    link.href = `/informes/${filename}`;
    link.download = `Informe_${agent}_USS.pdf`;
    link.click();
    return;
    // eslint-disable-next-line no-unreachable
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210; const M = 14; let y = 0;
    const addPage = () => { doc.addPage(); y = 18; };
    const checkY = (need: number) => { if (y + need > 275) addPage(); };

    const header = () => {
      doc.setFillColor(17, 27, 51);
      doc.rect(0, 0, W, 28, 'F');
      doc.setFillColor(192, 57, 43);
      doc.rect(0, 28, W, 2, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(255, 255, 255);
      doc.text('Universidad San Sebastián', M, 12);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(180, 190, 210);
      doc.text('Facultad de Educación — Carpeta del Estudiante', M, 19);
      doc.setFontSize(7); doc.text('CONFIDENCIAL', W - M, 12, { align: 'right' });
      y = 38;
    };

    const sectionTitle = (title: string, color: [number,number,number]) => {
      checkY(12);
      doc.setFillColor(...color);
      doc.rect(M, y, W - M * 2, 7, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
      doc.text(title, M + 3, y + 5);
      y += 10;
    };

    const row = (label: string, value: string) => {
      const lines = doc.splitTextToSize(value, W - M * 2 - 48);
      const h = Math.max(8, lines.length * 5 + 4);
      checkY(h);
      doc.setFillColor(248, 249, 251);
      doc.rect(M, y, W - M * 2, h, 'F');
      doc.setDrawColor(220, 225, 235);
      doc.rect(M, y, W - M * 2, h, 'S');
      doc.setFillColor(17, 27, 51);
      doc.rect(M, y, 1.5, h, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(17, 27, 51);
      doc.text(label, M + 4, y + 5);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(60, 60, 80);
      doc.text(lines, M + 50, y + 5);
      y += h + 2;
    };

    const footer = () => {
      const pages = doc.getNumberOfPages();
      for (let p = 1; p <= pages; p++) {
        doc.setPage(p);
        doc.setFillColor(17, 27, 51);
        doc.rect(0, 287, W, 10, 'F');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(180, 190, 210);
        doc.text('Universidad San Sebastián — Plataforma de Simulación Pedagógica', M, 293);
        doc.text(`Pág. ${p}/${pages}`, W - M, 293, { align: 'right' });
      }
    };

    header();

    if (agent === 'Teo') {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(17, 27, 51);
      doc.text('INFORME DE EVALUACIÓN PSICOPEDAGÓGICA', M, y); y += 6;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 100, 120);
      doc.text('Dificultad Específica del Aprendizaje en Lectoescritura (F81.0)', M, y); y += 10;

      sectionTitle('I. DATOS DE IDENTIFICACIÓN', [17, 39, 68]);
      row('Estudiante', 'Teo');
      row('Edad', '9 años 5 meses');
      row('Curso', '3° Básico');
      row('Diagnóstico', 'Dificultad Específica del Aprendizaje en Lectoescritura (DEA - F81.0)');
      row('Profesional a Cargo', 'Educadora Diferencial (PIE)');
      row('Motivo de Evaluación', 'Solicitud familiar, debido a dificultades persistentes en lectoescritura observadas desde primero básico que se consolidaron durante todo el segundo básico.');
      y += 4;

      sectionTitle('II. ANTECEDENTES DEL PROCESO DE EVALUACIÓN', [17, 39, 68]);
      const antec = 'El proceso de evaluación integral se realizó a inicios del tercero Básico del estudiante, previa autorización y entrevista de anamnesis con ambos padres. La evaluación demandó tres sesiones de trabajo, superando la hora de duración cada una, debido a los altos y bajos en la motivación y los momentos de frustración del estudiante.\n\nSe aplicó el instrumento estandarizado EVALÚA 2. Para las pruebas de lectura, fue necesario modificar la estrategia: la examinadora leía los textos y el estudiante respondía oralmente. Esta adecuación fue altamente positiva, ya que comprobó que Teo posee un buen desempeño a nivel oral y que su comprensión se activa eficazmente cuando la información es accesada auditivamente.\n\nEl equipo multidisciplinario (psicólogo y educadora diferencial) concluyó el proceso sin requerir una evaluación formal del fonoaudiólogo.';
      const antecLines = doc.splitTextToSize(antec, W - M * 2);
      checkY(antecLines.length * 5 + 4);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(50, 50, 70);
      doc.text(antecLines, M, y); y += antecLines.length * 5 + 6;

      sectionTitle('III. RESULTADOS POR ÁREA', [192, 57, 43]);
      row('Lectoescritura (-2 DE)', 'Comprensión Lectoral, Exactitud Lectora, Ortografía Fonética/Visual y Expresión Escrita se ubican bajo dos desviaciones estándar de la media. Confirma DEA en el ámbito lector. Lectura silábica/palabra a palabra. Dificultades en conciencia fonológica activa (fonémica y silábica).');
      row('Matemáticas (-1 DE)', 'Cálculo, Numeración y Resolución de Problemas bajo una desviación estándar. La dificultad se concentra en la lectura de enunciados y en la representación simbólica (valor posicional, multiplicación), NO en el razonamiento lógico.');
      row('Escala Cognitiva', 'Memoria y Atención en la media. Organización Perceptiva es el puntaje más bajo (en rango de la media). Confirma que la DEA no es de origen cognitivo general. La dificultad perceptiva contribuye a la disgrafía (confusión d/b).');
      row('CI (WISC-V)', '115 — Rango Promedio-Alto. Este resultado DESCARTA Discapacidad Intelectual y establece la discrepancia requerida por D.S. N°170.');
      y += 4;

      sectionTitle('IV. SÍNTESIS SOCIOEMOCIONAL Y CONDUCTUAL', [180, 80, 0]);
      const socio = 'La DEA ha generado una baja autoestima académica y ansiedad de desempeño. El temor a no ser considerado inteligente y a la decepción de sus padres (en contraste con sus hermanos exitosos) se traduce en conductas de evasión: mentir sobre tareas, dibujar en clases, ocultar notas. Su dificultad para organizarse (copia de pizarra) y la falta de participación en grupos no preferenciales son manifestaciones directas de su frustración y desánimo.\n\nConclusión Diagnóstica: Teo presenta un Autoconcepto Académico Vulnerado en el área del lenguaje, manifestado a través de ansiedad de desempeño y conductas de evasión. El alto potencial intelectual (CI 115) indica que la intervención debe ser psicoeducativa y emocional, enfocada en la resiliencia y el valor del esfuerzo para superar las barreras de su DEA.';
      const socioLines = doc.splitTextToSize(socio, W - M * 2);
      checkY(socioLines.length * 5 + 4);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(50, 50, 70);
      doc.text(socioLines, M, y); y += socioLines.length * 5 + 6;

      sectionTitle('V. SUGERENCIAS PEDAGÓGICAS', [21, 128, 61]);
      row('Conciencia Fonológica', 'Trabajar conciencia silábica y fonémica (incluyendo pseudopalabras) para superar omisiones e inversiones. Método mixto (sintético + global) con palabras de alto interés para Teo (stickers, juegos, dibujos).');
      row('Organización y Comprensión', 'Usar apoyos gráficos (pictogramas) para ideas centrales. Proveer apoyos visuales y materiales concretos. Desfragmentar tareas en pasos simples y secuenciados.');
      row('Matemáticas', 'Fortalecer valor posicional y multiplicación con ejemplos de la vida real. Teo necesita comprender la utilidad de los aprendizajes para concentrarse.');
      row('Refuerzo y Motivación', 'Aprovechar habilidades de dibujo. Aplicar Técnica del Sándwich (elogio-corrección-elogio). Contratos conductuales simples usando el dibujo como reforzador.');
      row('Regulación Emocional', 'Validar la emoción de frustración ANTES de redirigir la tarea. Enseñarle a nombrar sus sentimientos. Favorecer roles de trabajo cooperativo que capitalicen sus fortalezas.');
      y += 4;

      sectionTitle('VI. ANÁLISIS PROYECTIVO (TEST DE LA FAMILIA)', [80, 80, 100]);
      row('Estructura familiar', 'Teo y su abuela se dibujan apartados del resto de la familia (hermanos, madre, padre), separados por un espacio. Indica percepción de distanciamiento del eje académico/deportivo familiar.');
      row('Vínculos afectivos', 'El perrito abrazándolo y el corazón sobre la abuela simbolizan sus redes de apoyo emocional clave (Rufino y la abuela Cecilia).');
      row('Autoimagen', 'Dibuja su ropa, perro y cuaderno de dibujos con detalles y color. Su identidad y talento artístico son un punto de orgullo y seguridad.');
      y += 4;

      sectionTitle('VII. AVANCES REPORTADOS', [17, 39, 68]);
      const avances = 'La profesora de aula ha incorporado estrategias de apoyo visual y desfragmentación de actividades. Asignó a Teo el rol de "Encargado de registrar el mejor momento del curso" mediante dibujos, lo que lo tiene muy motivado y reconocido por sus compañeros.\n\nLos padres comunicaron los resultados al niño de manera positiva: le explicaron que su cabeza "piensa muy bien y rápido" y le presentaron ejemplos de científicos con las mismas dificultades. Teo participa en un taller de Comics municipal y planea asistir a un taller de robótica con su abuela.\n\nAvances académicos: ya no tiene lectura silábica (pasó a lectura de palabras), su grafía mejoró y está manejando ejercicios con multiplicación. El contrato de responsabilidades escolares funciona bien.';
      const avancesLines = doc.splitTextToSize(avances, W - M * 2);
      checkY(avancesLines.length * 5 + 4);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(50, 50, 70);
      doc.text(avancesLines, M, y); y += avancesLines.length * 5 + 6;

    } else {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(17, 27, 51);
      doc.text('INFORME PSICOLÓGICO FUNCIONAL DE TRANSICIÓN', M, y); y += 6;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 100, 120);
      doc.text('Discapacidad Intelectual Leve (DIL) — Planificación Transición a la Vida Adulta', M, y); y += 10;

      sectionTitle('I. IDENTIFICACIÓN Y ANTECEDENTES', [17, 39, 68]);
      row('Estudiante', 'Josefina (Jojo)');
      row('Edad', '15 años (Ingreso a 1° Medio)');
      row('Diagnóstico PIE', 'Discapacidad Intelectual Leve (DIL) — Apoyo PIE desde 2° Básico');
      row('CI (WISC-V)', 'CI≈65-70 — Rango Discapacidad Intelectual Leve');
      row('Instrumentos', 'WISC-V, Escalas de Conducta Adaptativa, Entrevista a la estudiante, Entrevista familiar');
      row('Propósito del informe', 'Reconfirmación diagnóstica para continuidad en PIE en Enseñanza Media y orientación vocacional/laboral temprana.');
      y += 4;

      sectionTitle('II. FUNCIONAMIENTO INTELECTUAL Y COGNITIVO', [192, 57, 43]);
      row('Fortaleza principal', 'Excelente memoria para información concreta. Retiene datos fácticos de materias como Historia o Biología, y de sus intereses (fútbol). Esta memoria es la fortaleza clave a capitalizar en toda intervención.');
      row('Barrera principal', 'Comprensión inferencial y pensamiento abstracto (típicos de 1° Medio). Mayor dificultad en lectura de textos complejos y resolución de problemas matemáticos abstractos.');
      row('Punto focal', 'La intervención debe cambiar el foco hacia habilidades sociales de autoprotección y autonomía comunitaria para la vida adulta.');
      y += 4;

      sectionTitle('III. HABILIDADES ADAPTATIVAS', [180, 80, 0]);
      row('Habilidades Prácticas (Autocuidado)', 'AVANCE SÓLIDO: Ha mejorado su autonomía para el autocuidado personal (vestirse, bañarse, gestión de horarios de sueño). Muestra independencia y preocupación por su presentación.');
      row('Habilidades Conceptuales', 'ESTANCAMIENTO: Mantiene dependencia para tareas académicas. Dificultad en uso funcional del dinero (cálculo de vueltos, presupuesto simple) y comprensión de documentos oficiales o informativos.');
      row('Habilidades Sociales', 'Buenas habilidades en el coro y con pares individuales. Su miedo a las burlas la lleva a evitar el contacto con el resto del curso (evasión a sala PIE). Vulnerable a manipulación o exclusión social.');
      y += 4;

      sectionTitle('IV. PERFIL SOCIOEMOCIONAL', [21, 128, 61]);
      row('Autoestima', 'Tímida e insegura en grupos grandes. Se siente más segura en actividades de su interés (coro, fútbol). La familia muestra alta disposición y colaboración activa como red de apoyo.');
      row('Intereses y talentos', 'Fútbol (retiene estadísticas y datos), música/coro (disciplina y participación), cuidado de animales (gato de su tía).');
      row('Red de apoyo', 'Alta disposición y colaboración activa de la madre y abuela, especialmente para práctica de habilidades funcionales durante fines de semana.');
      y += 4;

      sectionTitle('V. OBJETIVOS PRIORITARIOS — TRANSICIÓN A LA VIDA ADULTA (TVA)', [17, 39, 68]);
      row('Manejo del Dinero Funcional', 'Identificación de billetes y monedas, cálculo de vuelto de forma práctica usando juegos de rol y ejemplos de compra reales (kiosco, supermercado).');
      row('Rutas y Seguridad Comunitaria', 'Reforzar recorrido colegio-casa con estrategias visuales (mapas simplificados, fotografías de puntos clave). Simular situaciones (pérdida de dinero, cambios de ruta).');
      row('Autoprotección y Riesgos', 'Trabajo en habilidades de autoprotección (decir que no, reconocer riesgos, identificar abuso) dado su vulnerabilidad en entornos sociales complejos.');
      row('Exploración Vocacional', 'Explorar intereses (fútbol, música/coro) para descubrir talentos transferibles. Iniciar indagación sobre opciones de capacitación futura (talleres laborales, cursos cortos).');
      row('Plan Personal de Vida', 'Documentar intereses y talentos en PTI con miras a expandir su Plan Personal de Vida año a año durante Enseñanza Media.');
      y += 4;

      sectionTitle('VI. ORIENTACIONES PEDAGÓGICAS (1° MEDIO)', [80, 80, 100]);
      row('Metodología', 'Funcional y ecológica. Conectar SIEMPRE el contenido académico con situaciones de la vida real (recetas, mapas, compras, transporte) en lugar de ejercicios abstractos.');
      row('Estrategias de Acceso', 'Apoyos visuales permanentes. Presentar información paso a paso. Ejemplificar el producto final esperado antes de iniciar la tarea.');
      row('Evaluación', 'Graduación en función de OA priorizados. Evaluaciones orales o de alternativa concreta. Refuerzos constantes. Promover autoevaluación.');
      row('Principio Rector', 'El aprendizaje debe tener un sentido ecológico y funcional para Josefina, vinculando constantemente el contenido académico con su utilidad práctica en la vida.');
      row('Inclusión Social', 'Promover roles de participación claros en el aula que capitalicen sus fortalezas (ej. encargada de datos o información fáctica, ayudante en organización de eventos del coro).');
    }

    footer();
    doc.save(`informe_${agent}_USS.pdf`);
  };

  // ── Shared styles ──
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    border: `1.5px solid ${C.gray200}`, fontSize: 14,
    fontFamily: "'Georgia', serif", color: C.navyDark,
    outline: 'none', boxSizing: 'border-box', background: C.white,
  };

  // ─────────────────────── RENDER ───────────────────────────────────────────
  if (checkingCompletion) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.white }}>
      <p style={{ fontSize: 14, color: C.gray400, fontFamily: "'Georgia', serif" }}>Cargando…</p>
    </div>
  );

  if (alreadyCompleted) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', background: C.white }}>
      <div style={{ background: C.navyDark, height: 58, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: C.white, cursor: 'pointer', width: 34, height: 34, borderRadius: 8, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 700, color: C.white, fontFamily: "'Georgia', serif" }}>{simulacion.title}</span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 40 }}>
        <div style={{ fontSize: 56 }}>✅</div>
        <p style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.navyDark, fontFamily: "'Georgia', serif" }}>Simulación completada</p>
        <p style={{ margin: 0, fontSize: 14, color: C.gray400, fontFamily: "'Georgia', serif", textAlign: 'center', maxWidth: 400 }}>
          Ya realizaste todas las interacciones de esta simulación. Los resultados están disponibles para tu docente.
        </p>
        <button onClick={onClose} style={{ marginTop: 8, padding: '10px 28px', background: C.navyDark, color: C.white, border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'Georgia', serif" }}>
          Volver
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', flexDirection: 'column', background: C.white }}>

      {/* ── Top bar ── */}
      <div style={{
        background: C.navyDark, height: 58, display: 'flex', alignItems: 'center',
        padding: '0 24px', flexShrink: 0, gap: 16,
        boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
      }}>
        <button onClick={onClose}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: C.white, cursor: 'pointer', width: 34, height: 34, borderRadius: 8, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          ←
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>
            {simulacion.ramo?.code ?? 'Simulación IA'}  ·  {simulacion.ramo?.name ?? ''}
          </p>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.white, fontFamily: "'Georgia', serif" }}>
            {simulacion.title}
          </p>
        </div>
        {/* Interaction dots */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {Array.from({ length: numTotal }, (_, i) => {
            const n = i + 1;
            const done   = n < interaccion;
            const active = n === interaccion;
            return (
              <div key={i} style={{
                width: 30, height: 30, borderRadius: '50%',
                border: `2px solid ${done ? C.gold : active ? C.white : 'rgba(255,255,255,0.2)'}`,
                background: done ? C.gold : active ? 'rgba(255,255,255,0.15)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800,
                color: done ? C.navyDark : active ? C.white : 'rgba(255,255,255,0.3)',
              }}>
                {done ? '✓' : n}
              </div>
            );
          })}
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginLeft: 4, fontFamily: "'Georgia', serif" }}>
            Interacción {interaccion} de {numTotal}
          </span>
        </div>
      </div>

      {/* ═══════════════ ANTECEDENTES ═══════════════ */}
      {step === 'antecedentes' && (
        <div style={{ flex: 1, overflowY: 'auto', background: C.gray50 }}>

          {/* Hero */}
          <div style={{
            background: `linear-gradient(160deg, ${C.navyDark} 0%, #0f2a5e 60%, #1a3a7a 100%)`,
            padding: '48px 64px', position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', right: -80, top: -80, width: 340, height: 340, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
            <div style={{ position: 'absolute', right: 80, bottom: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(201,168,76,0.06)' }} />
            <p style={{ margin: '0 0 10px', fontSize: 12, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 1.5 }}>
              {simulacion.ramo?.name ?? 'Educación Diferencial'}
            </p>
            <h1 style={{ margin: '0 0 20px', fontSize: 34, fontWeight: 900, color: C.white, fontFamily: "'Georgia', serif", lineHeight: 1.2 }}>
              {simulacion.title}
            </h1>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, padding: '5px 16px', background: 'rgba(255,255,255,0.12)', borderRadius: 20, color: 'rgba(255,255,255,0.8)' }}>
                {numTotal} interacción{numTotal > 1 ? 'es' : ''}
              </span>
              <span style={{ fontSize: 12, padding: '5px 16px', background: 'rgba(201,168,76,0.2)', borderRadius: 20, color: C.gold, fontWeight: 700 }}>
                {simulacion.agente === 'Ambos' ? 'Teo + Jojo' : `Agente: ${simulacion.agente}`}
              </span>
            </div>
          </div>

          <div style={{ padding: '40px 64px', maxWidth: 1100, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 28, boxSizing: 'border-box' }}>

            {/* Agent selector (Ambos) or Agent card */}
            {simulacion.agente === 'Ambos' ? (
              <div>
                <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 1 }}>
                  Elige tu agente para la Interacción {interaccion}
                </p>
                <div style={{ display: 'flex', gap: 16 }}>
                  {(['Teo', 'Jojo'] as const).map(a => {
                    const ai = AGENT_INFO[a];
                    return (
                      <button key={a} onClick={() => setSelectedAgent(a)}
                        style={{
                          flex: 1, padding: '22px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                          border: `2px solid ${selectedAgent === a ? ai.color : C.gray200}`,
                          background: selectedAgent === a ? `${ai.color}0d` : C.white,
                          transition: 'all 0.15s',
                        }}>
                        <div style={{ fontSize: 38, marginBottom: 10 }}>{ai.emoji}</div>
                        <div style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Georgia', serif", color: selectedAgent === a ? ai.color : C.navyDark }}>{a}</div>
                        <div style={{ fontSize: 12, color: C.gray400, marginTop: 4 }}>{ai.diagnosis}</div>
                        <div style={{ fontSize: 11, color: C.gray400, marginTop: 2 }}>{ai.age} años · {ai.grade}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{
                background: C.white, borderRadius: 16, padding: '22px 28px',
                boxShadow: '0 2px 16px rgba(26,39,68,0.08)',
                display: 'flex', gap: 22, alignItems: 'center',
                border: `2px solid ${agentInfo.color}20`,
              }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%', background: `${agentInfo.color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, flexShrink: 0,
                }}>
                  {agentInfo.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Georgia', serif", color: C.navyDark }}>{selectedAgent}</div>
                  <div style={{ fontSize: 13, color: agentInfo.color, fontWeight: 700, marginTop: 4 }}>{agentInfo.diagnosis}</div>
                  <div style={{ fontSize: 13, color: C.gray400, marginTop: 4 }}>{agentInfo.age} años · {agentInfo.grade}</div>
                </div>
                <div style={{ background: `${agentInfo.color}10`, borderRadius: 12, padding: '14px 20px', textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 11, color: C.gray400, textTransform: 'uppercase', letterSpacing: 1 }}>Interacciones</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: agentInfo.color, fontFamily: "'Georgia', serif" }}>{numTotal}</div>
                </div>
              </div>
            )}

            {/* ── Informe Psicológico y Psicopedagógico ── */}
            {(() => {
              const agentsToShow: ('Teo' | 'Jojo')[] = simulacion.agente === 'Ambos'
                ? ['Teo', 'Jojo']
                : [simulacion.agente as 'Teo' | 'Jojo'];

              const INFORMES: Record<'Teo' | 'Jojo', { sections: { title: string; icon: string; color: string; items: { label: string; value: string }[] }[] }> = {
                Teo: {
                  sections: [
                    {
                      title: 'Identificación', icon: '🧒', color: '#1a2744',
                      items: [
                        { label: 'Estudiante', value: 'Teo' },
                        { label: 'Edad', value: '9 años 5 meses' },
                        { label: 'Curso', value: '3° Básico' },
                        { label: 'Diagnóstico', value: 'DEA en Lectoescritura (F81.0) — Dificultad Específica del Aprendizaje' },
                        { label: 'CI (WISC-V)', value: '115 — Rango Promedio-Alto (descarta Discapacidad Intelectual)' },
                        { label: 'Motivo de derivación', value: 'Dificultades persistentes en lectoescritura observadas desde 1° Básico' },
                      ],
                    },
                    {
                      title: 'Resultados de la Evaluación', icon: '📊', color: '#c0392b',
                      items: [
                        { label: 'Lectoescritura', value: 'Comprensión lectora, Exactitud lectora, Ortografía y Expresión escrita: -2 DE (bajo la media). Lectura silábica, lenta e insegura. Confunde letras parecidas (b/d, s/z).' },
                        { label: 'Matemáticas', value: 'Cálculo, Numeración y Resolución de problemas: -1 DE. La dificultad se concentra en la lectura de enunciados, no en el razonamiento lógico.' },
                        { label: 'Escala Cognitiva', value: 'Memoria y Atención en la media. Organización Perceptiva es el índice más bajo (contribuye a la disgrafía).' },
                        { label: 'Comprensión oral', value: 'Excelente cuando la información se presenta auditivamente. Responde bien a apoyos pictográficos y visuales.' },
                      ],
                    },
                    {
                      title: 'Perfil Socioemocional', icon: '💛', color: '#b45309',
                      items: [
                        { label: 'Autoestima', value: 'Baja autoestima académica. Percibe su dificultad lectora como una deficiencia de inteligencia.' },
                        { label: 'Mecanismos de defensa', value: 'Evasión (mentir sobre tareas, ocultar notas) y refugio (dibujar en clases) para protegerse del juicio familiar y la frustración.' },
                        { label: 'Presión familiar', value: 'Teme decepcionar a sus padres en comparación con sus hermanos mayores (exitosos en deportes y estudios).' },
                        { label: 'Vínculos clave', value: 'Su abuela Cecilia (profesora y artista) y su perro Rufino son su red de apoyo emocional principal. Pedro es su mejor amigo y lo ayuda a leer.' },
                        { label: 'Motivadores', value: 'Responde muy bien al refuerzo positivo, al dibujo como medio de aprendizaje y a las actividades con sentido concreto y funcional.' },
                      ],
                    },
                    {
                      title: 'Orientaciones Pedagógicas', icon: '🎯', color: '#15803d',
                      items: [
                        { label: 'Conciencia fonológica', value: 'Trabajar conciencia silábica y fonémica con palabras de alto interés para Teo (dibujos, stickers, juegos). Método mixto (sintético + global).' },
                        { label: 'Apoyos visuales', value: 'Usar pictogramas para reforzar ideas centrales. Proveer instrucciones paso a paso con ejemplos visuales.' },
                        { label: 'Matemáticas', value: 'Conectar contenidos con situaciones de la vida real. Fortalecer valor posicional y multiplicación con ejemplos funcionales y concretos.' },
                        { label: 'Refuerzo y motivación', value: 'Aprovechar sus habilidades de dibujo. Aplicar Técnica del Sándwich (elogio-corrección-elogio). Contratos conductuales simples.' },
                        { label: 'Regulación emocional', value: 'Validar su emoción de frustración ANTES de redirigir la tarea. Enseñarle a nombrar sus sentimientos.' },
                      ],
                    },
                  ],
                },
                Jojo: {
                  sections: [
                    {
                      title: 'Identificación', icon: '👧', color: '#1a2744',
                      items: [
                        { label: 'Estudiante', value: 'Josefina (Jojo)' },
                        { label: 'Edad', value: '15 años' },
                        { label: 'Curso', value: '1° Medio' },
                        { label: 'Diagnóstico', value: 'Discapacidad Intelectual Leve (DIL) — Apoyo PIE desde 2° Básico' },
                        { label: 'CI (WISC-V)', value: 'CI≈65-70 — Rango DIL' },
                        { label: 'Propósito actual', value: 'Reconfirmación diagnóstica y planificación de Transición a la Vida Adulta (TVA)' },
                      ],
                    },
                    {
                      title: 'Perfil Cognitivo y Adaptativo', icon: '📊', color: '#c0392b',
                      items: [
                        { label: 'Fortaleza principal', value: 'Excelente memoria para información concreta (retiene datos fácticos de Historia, Biología, fútbol).' },
                        { label: 'Barrera principal', value: 'Comprensión inferencial y pensamiento abstracto — mayor dificultad en contenidos de 1° Medio.' },
                        { label: 'Habilidades prácticas', value: 'Avance sólido en autocuidado (vestirse, gestión de horarios). Dificultad en uso funcional del dinero (cálculo de vueltos, presupuesto simple).' },
                        { label: 'Habilidades sociales', value: 'Buenas habilidades en el coro y con pares individuales. Evita el contacto grupal por miedo a burlas.' },
                        { label: 'Intereses', value: 'Fútbol, música/coro. Afición por el gato de su tía.' },
                      ],
                    },
                    {
                      title: 'Perfil Socioemocional', icon: '💛', color: '#b45309',
                      items: [
                        { label: 'Autoestima', value: 'Tímida e insegura en grupos grandes. Se siente más segura en actividades de su interés (coro, fútbol).' },
                        { label: 'Vulnerabilidad', value: 'Susceptible a situaciones de manipulación o exclusión social. Requiere trabajo de autoprotección.' },
                        { label: 'Red de apoyo', value: 'Alta disposición y colaboración activa de madre y abuela. Esta red es fundamental para los objetivos de TVA.' },
                        { label: 'Motivadores', value: 'Reconocimiento de sus talentos, actividades funcionales y concretas vinculadas a sus intereses.' },
                      ],
                    },
                    {
                      title: 'Orientaciones Pedagógicas (TVA)', icon: '🎯', color: '#15803d',
                      items: [
                        { label: 'Metodología', value: 'Funcional y ecológica. Conectar siempre el contenido académico con situaciones de la vida real (recetas, mapas, compras, transporte).' },
                        { label: 'Acceso al aprendizaje', value: 'Apoyos visuales permanentes. Presentar información paso a paso. Ejemplificar el producto final esperado.' },
                        { label: 'Evaluación', value: 'Evaluaciones orales o de alternativa concreta. Graduar complejidad. Favorecer autoevaluación.' },
                        { label: 'Habilidades comunitarias', value: 'Trabajar manejo del dinero con juegos de rol. Rutas y seguridad con mapas simplificados. Autoprotección y reconocimiento de riesgos.' },
                        { label: 'Exploración vocacional', value: 'Indagar intereses (fútbol, música) para conectar con opciones de capacitación futura. Documentar en PTI.' },
                      ],
                    },
                  ],
                },
              };

              return agentsToShow.map(agent => {
                const ai = AGENT_INFO[agent];
                return (
                  <div key={agent} style={{
                    background: `linear-gradient(135deg, ${C.navyDark}, #0f2a5e)`,
                    borderRadius: 16, boxShadow: '0 4px 20px rgba(17,27,51,0.18)',
                    padding: '24px 32px', display: 'flex', alignItems: 'center', gap: 20,
                    border: `1px solid rgba(255,255,255,0.07)`,
                  }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: `${ai.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0 }}>
                      {ai.emoji}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: '0 0 4px', fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 1.5 }}>📂 Carpeta del Estudiante</p>
                      <p style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.white, fontFamily: "'Georgia', serif" }}>
                        Informe Psicológico y Psicopedagógico — {agent}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: ai.color }}>{ai.diagnosis} · {ai.age} años · {ai.grade}</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                      <button onClick={() => downloadInformePDF(agent)}
                        style={{
                          padding: '10px 24px', borderRadius: 8, border: `1.5px solid ${C.gold}`,
                          background: 'transparent', color: C.gold, cursor: 'pointer',
                          fontSize: 13, fontWeight: 700, fontFamily: "'Georgia', serif",
                        }}>
                        ⬇ Descargar informe PDF
                      </button>
                      {agent === 'Teo' && availableFiles['teo.pdf'] && (
                        <a href={`${API}/uploads/planificaciones/teo.pdf`} target="_blank" rel="noopener noreferrer"
                          style={{ marginTop: 8, padding: '10px 18px', borderRadius: 8, border: `1.5px solid ${C.navy}`, background: C.navy, color: C.white, textDecoration: 'none', fontSize: 13, fontWeight: 700, display: 'inline-block' }}>
                          ⬇ Descargar PDF adjunto (Teo)
                        </a>
                      )}
                      <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>
                        Informe completo · Evaluación Psicopedagógica + Psicológica
                      </p>
                    </div>
                  </div>
                );
              });
            })()}

            {/* Instrucciones */}
            <div style={{ background: C.white, borderRadius: 14, boxShadow: '0 2px 12px rgba(26,39,68,0.06)', overflow: 'hidden' }}>
              <div style={{ background: C.navyDark, padding: '13px 22px' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.white, fontFamily: "'Georgia', serif" }}>📋 Instrucciones</span>
              </div>
              <div style={{ padding: '20px 24px', fontSize: 14, color: C.gray600, fontFamily: "'Georgia', serif", lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                {simulacion.instrucciones}
              </div>
            </div>

            {/* Objetivos */}
            {simulacion.objetivos && (
              <div style={{ background: C.white, borderRadius: 14, boxShadow: '0 2px 12px rgba(26,39,68,0.06)', overflow: 'hidden' }}>
                <div style={{ background: C.navyLight, padding: '13px 22px' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.white, fontFamily: "'Georgia', serif" }}>🎯 Objetivos de aprendizaje</span>
                </div>
                <div style={{ padding: '20px 24px', fontSize: 14, color: C.gray600, fontFamily: "'Georgia', serif", lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                  {simulacion.objetivos}
                </div>
              </div>
            )}

            {/* Info boxes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { icon: '📝', title: 'Planificación previa', desc: 'Antes de cada sesión escribe o adjunta tu planificación pedagógica.' },
                { icon: '💬', title: `Chat con ${selectedAgent}`, desc: `Conversarás aplicando estrategias pedagógicas diferenciadas.` },
                { icon: '📊', title: 'Evaluación automática', desc: 'Al finalizar recibirás retroalimentación basada en 11 criterios pedagógicos.' },
                { icon: '🔄', title: `${numTotal} sesión${numTotal > 1 ? 'es' : ''}`, desc: `Realizarás ${numTotal} interacción${numTotal > 1 ? 'es' : ''} completa${numTotal > 1 ? 's' : ''} en esta simulación.` },
              ].map(box => (
                <div key={box.title} style={{ background: C.white, borderRadius: 12, padding: '18px 20px', boxShadow: '0 2px 8px rgba(26,39,68,0.05)' }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{box.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.navyDark, fontFamily: "'Georgia', serif", marginBottom: 4 }}>{box.title}</div>
                  <div style={{ fontSize: 12, color: C.gray400, lineHeight: 1.5 }}>{box.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '0 64px 48px', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={() => setStep('planificacion')}
              style={{
                padding: '15px 44px', borderRadius: 12, border: 'none',
                background: `linear-gradient(135deg, ${C.navyDark}, ${C.navy})`,
                color: C.white, cursor: 'pointer', fontSize: 16, fontWeight: 700,
                fontFamily: "'Georgia', serif", boxShadow: '0 6px 24px rgba(17,27,51,0.3)',
              }}>
              Comenzar Interacción {interaccion} →
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════ PLANIFICACIÓN ═══════════════ */}
      {step === 'planificacion' && (
        <div style={{ flex: 1, overflowY: 'auto', background: C.gray50 }}>
          <div style={{ padding: '44px 64px', maxWidth: 860, display: 'flex', flexDirection: 'column', gap: 24 }}>

            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 800, color: C.navyDark, fontFamily: "'Georgia', serif" }}>
                Planificación — Interacción {interaccion}
              </h2>
              <p style={{ margin: 0, fontSize: 14, color: C.gray400 }}>
                Antes de comenzar tu sesión con {selectedAgent}, describe tu estrategia pedagógica.
              </p>
            </div>

            <div style={{ background: `${C.navy}08`, border: `1px solid ${C.navy}20`, borderRadius: 12, padding: '14px 20px', fontSize: 13, color: C.navy, fontFamily: "'Georgia', serif" }}>
              💡 Esta planificación será visible para tu docente junto con los resultados de tu sesión.
            </div>

            {/* Textarea */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 8 }}>
                Escribe tu planificación
              </label>
              <textarea
                style={{ ...inputStyle, minHeight: 200, resize: 'vertical', lineHeight: 1.7 }}
                placeholder={`Describe la estrategia pedagógica que aplicarás con ${selectedAgent}.\n\nEjemplo:\n— Comenzaré con una actividad de lectura guiada apoyada en imágenes\n— Aplicaré técnica de andamiaje para estructurar la sesión\n— Usaré refuerzo positivo y lenguaje adaptado a su edad y diagnóstico`}
                value={planTexto}
                onChange={e => setPlanTexto(e.target.value)}
              />
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1, height: 1, background: C.gray200 }} />
              <span style={{ fontSize: 13, color: C.gray400, fontFamily: "'Georgia', serif" }}>o adjunta un archivo</span>
              <div style={{ flex: 1, height: 1, background: C.gray200 }} />
            </div>

            {/* File upload zone */}
            {planArchivo ? (
              <div style={{ background: '#f0fdf4', border: `2px solid #86efac`, borderRadius: 14, padding: '22px 28px', display: 'flex', alignItems: 'center', gap: 18 }}>
                <span style={{ fontSize: 36 }}>{planArchivo.name.endsWith('.pdf') ? '📕' : '📄'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.navyDark, fontFamily: "'Georgia', serif" }}>{planArchivo.name}</div>
                  <div style={{ fontSize: 12, color: '#15803d', marginTop: 3 }}>{(planArchivo.size / 1024).toFixed(0)} KB · Listo para enviar</div>
                </div>
                <button onClick={() => setPlanArchivo(null)}
                  style={{ background: '#fee2e2', border: 'none', color: C.red, cursor: 'pointer', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 700 }}>
                  Eliminar
                </button>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: `2px dashed ${C.gray200}`, borderRadius: 14, padding: '40px 28px',
                  textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s', background: C.white,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = C.navy;
                  (e.currentTarget as HTMLDivElement).style.background  = `${C.navy}04`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = C.gray200;
                  (e.currentTarget as HTMLDivElement).style.background  = C.white;
                }}
              >
                <div style={{ fontSize: 38, marginBottom: 12 }}>📎</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.navyDark, fontFamily: "'Georgia', serif", marginBottom: 6 }}>
                  Arrastra tu archivo aquí
                </div>
                <div style={{ fontSize: 13, color: C.gray400, marginBottom: 10 }}>o haz clic para seleccionar</div>
                <span style={{ fontSize: 11, color: C.gray400, background: C.gray100, padding: '4px 14px', borderRadius: 20 }}>
                  Word (.docx) o PDF · máx. 5 MB
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '0 64px 48px', display: 'flex', justifyContent: 'space-between' }}>
            <button onClick={() => setStep(interaccion === 1 ? 'antecedentes' : 'resultado')}
              style={{ padding: '12px 28px', borderRadius: 10, border: `1.5px solid ${C.gray200}`, background: C.white, color: C.gray600, cursor: 'pointer', fontSize: 14, fontFamily: "'Georgia', serif" }}>
              ← Volver
            </button>
            <button onClick={startChat} disabled={!canGoToChat}
              style={{
                padding: '12px 40px', borderRadius: 10, border: 'none',
                background: canGoToChat ? C.navyDark : C.gray200,
                color: canGoToChat ? C.white : C.gray400,
                cursor: canGoToChat ? 'pointer' : 'not-allowed',
                fontSize: 14, fontWeight: 700, fontFamily: "'Georgia', serif",
              }}>
              Ir al chat con {selectedAgent} →
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════ CHAT ═══════════════ */}
      {step === 'chat' && (
        <>
          {/* Agent sub-header */}
          <div style={{
            background: C.white, borderBottom: `1px solid ${C.gray100}`,
            padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0,
          }}>
            <div style={{
              width: 50, height: 50, borderRadius: '50%',
              background: `${agentInfo.color}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0,
            }}>
              {agentInfo.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.navyDark, fontFamily: "'Georgia', serif" }}>{selectedAgent}</div>
              <div style={{ fontSize: 12, color: agentInfo.color }}>{agentInfo.diagnosis}</div>
            </div>
            <div style={{ fontSize: 12, color: C.gray400, fontFamily: "'Georgia', serif" }}>
              {userMsgCount} mensaje{userMsgCount !== 1 ? 's' : ''} enviado{userMsgCount !== 1 ? 's' : ''}
            </div>
            {/* Botón audio */}
            <button onClick={() => { setAudioEnabled(p => !p); window.speechSynthesis?.cancel(); }}
              title={audioEnabled ? 'Silenciar audio' : 'Activar audio'}
              style={{
                width: 36, height: 36, borderRadius: 8, border: `1.5px solid ${audioEnabled ? C.navy : C.gray200}`,
                background: audioEnabled ? `${C.navy}12` : C.gray50,
                color: audioEnabled ? C.navy : C.gray400,
                cursor: 'pointer', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, position: 'relative',
              }}>
              {isSpeaking ? '🔊' : audioEnabled ? '🔈' : '🔇'}
              {isSpeaking && (
                <span style={{
                  position: 'absolute', top: -3, right: -3, width: 8, height: 8,
                  borderRadius: '50%', background: C.red,
                }} />
              )}
            </button>
            <button onClick={finalizarChat} disabled={userMsgCount === 0}
              style={{
                padding: '9px 22px', borderRadius: 8, border: 'none',
                background: userMsgCount > 0 ? C.red : C.gray200,
                color: userMsgCount > 0 ? C.white : C.gray400,
                cursor: userMsgCount > 0 ? 'pointer' : 'not-allowed',
                fontSize: 13, fontWeight: 700, fontFamily: "'Georgia', serif",
              }}>
              Finalizar sesión ✓
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', background: C.gray50, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: 12 }}>
                {msg.role === 'assistant' && (
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: `${agentInfo.color}15`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 20, flexShrink: 0, marginTop: 2,
                  }}>
                    {agentInfo.emoji}
                  </div>
                )}
                <div style={{
                  maxWidth: '68%', padding: '13px 18px',
                  borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  background: msg.role === 'user' ? C.navyDark : C.white,
                  color: msg.role === 'user' ? C.white : C.gray800,
                  fontSize: 14, lineHeight: 1.65, fontFamily: "'Georgia', serif",
                  boxShadow: '0 2px 10px rgba(0,0,0,0.07)',
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: `${agentInfo.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  {agentInfo.emoji}
                </div>
                <div style={{ padding: '13px 18px', background: C.white, borderRadius: '18px 18px 18px 4px', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', display: 'flex', gap: 6, alignItems: 'center' }}>
                  {[0, 1, 2].map(j => (
                    <div key={j} style={{
                      width: 8, height: 8, borderRadius: '50%', background: C.gray200,
                      animation: `pulse 1.2s ${j * 0.2}s ease-in-out infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div style={{ padding: '14px 28px', background: C.white, borderTop: `1px solid ${C.gray100}`, display: 'flex', gap: 10, flexShrink: 0, alignItems: 'flex-end' }}>
            <textarea
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Escribe tu mensaje o usa el micrófono..."
              rows={2}
              style={{
                flex: 1, padding: '11px 16px', borderRadius: 10,
                border: `1.5px solid ${C.gray200}`, fontSize: 14,
                fontFamily: "'Georgia', serif", color: C.navyDark,
                outline: 'none', resize: 'none', background: C.gray50, lineHeight: 1.5,
              }}
            />
            {/* Micrófono */}
            <button onClick={toggleListening} disabled={isLoading}
              title={isListening ? 'Detener grabación' : 'Hablar'}
              style={{
                width: 46, height: 46, borderRadius: 10, flexShrink: 0,
                border: `1.5px solid ${isListening ? C.red : C.gray200}`,
                background: isListening ? '#fef2f2' : C.white,
                cursor: 'pointer', fontSize: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              {isListening ? '🔴' : '🎤'}
            </button>
            {/* Enviar */}
            <button onClick={() => sendMessage()} disabled={!inputValue.trim() || isLoading}
              style={{
                width: 46, height: 46, borderRadius: 10, border: 'none', flexShrink: 0,
                background: inputValue.trim() && !isLoading ? C.navyDark : C.gray200,
                color: inputValue.trim() && !isLoading ? C.white : C.gray400,
                cursor: inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
                fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              ›
            </button>
          </div>
        </>
      )}

      {/* ═══════════════ RESULTADO ═══════════════ */}
      {step === 'resultado' && (
        <div style={{ flex: 1, overflowY: 'auto', background: C.gray50 }}>
          {isEvaluating ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 18 }}>
              <div style={{ fontSize: 52 }}>⏳</div>
              <p style={{ fontSize: 20, fontWeight: 700, color: C.navyDark, fontFamily: "'Georgia', serif", margin: 0 }}>Evaluando tu sesión...</p>
              <p style={{ fontSize: 14, color: C.gray400, margin: 0 }}>Analizando los criterios pedagógicos. Esto toma unos segundos.</p>
            </div>
          ) : evaluacion ? (
            <div style={{ padding: '44px 64px', maxWidth: 960 }}>

              {/* Header resultado */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 36 }}>
                <div style={{ fontSize: 52 }}>
                  {(evaluacion.total_score ?? 0) >= 8 ? '🏆' : (evaluacion.total_score ?? 0) >= 5 ? '👍' : '📚'}
                </div>
                <div style={{ flex: 1 }}>
                  <h2 style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 800, color: C.navyDark, fontFamily: "'Georgia', serif" }}>
                    Resultado — Interacción {interaccion}
                  </h2>
                  <p style={{ margin: 0, fontSize: 14, color: C.gray400 }}>
                    {selectedAgent} · {agentInfo.diagnosis}
                  </p>
                </div>
                {/* Score card */}
                <div style={{
                  background: C.white, borderRadius: 16, padding: '18px 28px',
                  boxShadow: '0 4px 20px rgba(26,39,68,0.1)', textAlign: 'center', flexShrink: 0,
                }}>
                  <div style={{ fontSize: 44, fontWeight: 900, color: C.navyDark, fontFamily: "'Georgia', serif", lineHeight: 1 }}>
                    {evaluacion.total_score ?? 0}
                    <span style={{ fontSize: 20, color: C.gray400, fontWeight: 400 }}>/{evaluacion.criteria?.length ?? 11}</span>
                  </div>
                  <div style={{ fontSize: 12, color: C.gray400, marginTop: 6 }}>{evaluacion.performance_range ?? '—'}</div>
                </div>
              </div>

              {/* Retroalimentación */}
              {evaluacion.conclusion && (() => {
                const sections = parseConclusionSections(evaluacion.conclusion);
                const sectionMeta: Record<string, { color: string; bg: string; icon: string }> = {
                  'Puntuación Total':      { color: C.navyDark, bg: `${C.navy}0d`, icon: '🎯' },
                  'Fortalezas':            { color: '#15803d', bg: '#f0fdf4', icon: '✅' },
                  'Aspectos a Mejorar':   { color: '#b45309', bg: '#fffbeb', icon: '⚠️' },
                  'Sugerencias':           { color: C.navy,   bg: `${C.navy}08`, icon: '💡' },
                };
                return (
                  <div style={{ marginBottom: 24 }}>
                    <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 1 }}>Retroalimentación</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {sections.map((sec, i) => {
                        const meta = Object.entries(sectionMeta).find(([k]) => sec.title.includes(k))?.[1];
                        return (
                          <div key={i} style={{
                            background: meta?.bg ?? C.white, borderRadius: 12, padding: '16px 20px',
                            borderLeft: `4px solid ${meta?.color ?? C.gray200}`,
                            boxShadow: '0 2px 8px rgba(26,39,68,0.05)',
                          }}>
                            {sec.title && (
                              <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: meta?.color ?? C.navyDark, fontFamily: "'Georgia', serif" }}>
                                {meta?.icon ?? ''} {sec.title}
                              </p>
                            )}
                            <p style={{ margin: 0, fontSize: 13, color: C.gray600, fontFamily: "'Georgia', serif", lineHeight: 1.75 }}>{sec.text}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Criterios — tabla 5 columnas */}
              {evaluacion.criteria && evaluacion.criteria.length > 0 && (
                <div style={{ background: C.white, borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 12px rgba(26,39,68,0.06)', marginBottom: 28 }}>
                  <div style={{ background: C.navyDark, padding: '14px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.white, fontFamily: "'Georgia', serif" }}>
                      Criterios Pedagógicos
                    </span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                      {evaluacion.criteria.filter((c: any) => (c.compliance || c.cumplimiento || '').toUpperCase() === 'SÍ').length} / {evaluacion.criteria.length} cumplidos
                    </span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: C.gray50, borderBottom: `2px solid ${C.gray200}` }}>
                          {['Criterio','Descripción','Cumplimiento','Análisis','Justificación'].map(h => (
                            <th key={h} style={{
                              padding: '10px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700,
                              color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.8,
                              whiteSpace: 'nowrap',
                            }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {evaluacion.criteria.map((c: any, i: number) => {
                          const met = (c.compliance || c.cumplimiento || '').toUpperCase() === 'SÍ';
                          return (
                            <tr key={i} style={{ background: i % 2 === 0 ? C.white : C.gray50, borderBottom: `1px solid ${C.gray100}` }}>
                              <td style={{ padding: '12px 14px', fontWeight: 700, color: C.navyDark, fontFamily: "'Georgia', serif", verticalAlign: 'top', minWidth: 140 }}>
                                {c.name || `Criterio ${i + 1}`}
                              </td>
                              <td style={{ padding: '12px 14px', color: C.gray600, verticalAlign: 'top', minWidth: 160, lineHeight: 1.5 }}>
                                {c.description || '—'}
                              </td>
                              <td style={{ padding: '12px 14px', textAlign: 'center', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                                <span style={{
                                  display: 'inline-block', padding: '3px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                  background: met ? '#dcfce7' : '#fee2e2', color: met ? '#15803d' : C.red,
                                }}>
                                  {met ? 'Sí' : 'No'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', color: C.gray600, verticalAlign: 'top', minWidth: 180, lineHeight: 1.5 }}>
                                {c.analysis || '—'}
                              </td>
                              <td style={{ padding: '12px 14px', color: C.gray600, verticalAlign: 'top', minWidth: 180, lineHeight: 1.5 }}>
                                {c.justification || '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Resumen progreso (si hay más de 1 interacción completada) */}
              {completedResults.length > 1 && (
                <div style={{ background: C.white, borderRadius: 14, padding: '20px 24px', marginBottom: 28, boxShadow: '0 2px 12px rgba(26,39,68,0.06)' }}>
                  <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 1 }}>Progreso en la simulación</p>
                  <div style={{ display: 'flex', gap: 14 }}>
                    {completedResults.map(r => (
                      <div key={r.interaccion} style={{ flex: 1, textAlign: 'center', background: C.gray50, borderRadius: 12, padding: '14px' }}>
                        <div style={{ fontSize: 11, color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>Int. {r.interaccion}</div>
                        <div style={{ fontSize: 24, fontWeight: 800, color: C.navyDark, fontFamily: "'Georgia', serif" }}>{r.score}/{r.total}</div>
                        <div style={{ fontSize: 12, color: agentInfo.color, marginTop: 2 }}>{r.agent}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={generatePDF}
                  style={{
                    padding: '12px 26px', borderRadius: 10,
                    border: `1.5px solid ${C.navy}`, background: C.white,
                    color: C.navy, cursor: 'pointer', fontSize: 14, fontWeight: 700,
                    fontFamily: "'Georgia', serif",
                  }}>
                  ⬇ Descargar PDF
                </button>
                {!isLastStep ? (
                  <button onClick={nextInteraccion}
                    style={{
                      padding: '14px 40px', borderRadius: 10, border: 'none',
                      background: `linear-gradient(135deg, ${C.navyDark}, ${C.navy})`,
                      color: C.white, cursor: 'pointer', fontSize: 15, fontWeight: 700,
                      fontFamily: "'Georgia', serif", boxShadow: '0 6px 24px rgba(17,27,51,0.25)',
                    }}>
                    Continuar → Interacción {interaccion + 1}
                  </button>
                ) : (
                  <button onClick={onClose}
                    style={{
                      padding: '14px 40px', borderRadius: 10, border: 'none',
                      background: 'linear-gradient(135deg, #15803d, #22c55e)',
                      color: C.white, cursor: 'pointer', fontSize: 15, fontWeight: 700,
                      fontFamily: "'Georgia', serif", boxShadow: '0 6px 24px rgba(21,128,61,0.3)',
                    }}>
                    ✓ Simulación completada
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SimulacionFlow;
