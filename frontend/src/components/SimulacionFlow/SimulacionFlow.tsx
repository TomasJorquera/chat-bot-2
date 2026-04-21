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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Resultado ──
  const [evaluacion, setEvaluacion]     = useState<any>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
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
  const sendMessage = async () => {
    const text = inputValue.trim();
    if (!text || isLoading) return;
    const userMsg: ChatMsg = { role: 'user', content: text };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputValue('');
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

          <div style={{ padding: '40px 64px', maxWidth: 960, display: 'flex', flexDirection: 'column', gap: 28 }}>

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
          <div style={{ padding: '14px 28px', background: C.white, borderTop: `1px solid ${C.gray100}`, display: 'flex', gap: 12, flexShrink: 0 }}>
            <textarea
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Escribe tu mensaje... (Enter para enviar, Shift+Enter para nueva línea)"
              rows={2}
              style={{
                flex: 1, padding: '11px 16px', borderRadius: 10,
                border: `1.5px solid ${C.gray200}`, fontSize: 14,
                fontFamily: "'Georgia', serif", color: C.navyDark,
                outline: 'none', resize: 'none', background: C.gray50, lineHeight: 1.5,
              }}
            />
            <button onClick={sendMessage} disabled={!inputValue.trim() || isLoading}
              style={{
                width: 50, height: 50, borderRadius: 12, border: 'none', alignSelf: 'flex-end',
                background: inputValue.trim() && !isLoading ? C.navyDark : C.gray200,
                color: inputValue.trim() && !isLoading ? C.white : C.gray400,
                cursor: inputValue.trim() && !isLoading ? 'pointer' : 'not-allowed',
                fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
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
