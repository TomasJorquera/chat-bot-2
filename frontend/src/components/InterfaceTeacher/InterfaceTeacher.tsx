import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuth } from '../../context/AuthContext';
import ChatInterface from '../Chat/ChatInterface';

const API = ((import.meta as any).env?.VITE_API_URL) || 'http://localhost:8000';

// TS infiere mal el tipo de `token ? { Authorization: ... } : {}` cuando se
// usa como HeadersInit (rechaza la rama vacía) — se arma explícito en su lugar.
const authHeaders = (token: string | null): Record<string, string> =>
  token ? { Authorization: `Bearer ${token}` } : {};

function normalizeEvaluation(raw: any): any {
  if (!raw || typeof raw !== 'object') return raw;
  let { criteria, conclusion, total_score, performance_range } = raw;
  if (!criteria && Array.isArray(raw.evaluation)) {
    criteria = raw.evaluation.map((item: any, idx: number) => ({
      name: item.criterio || item.name || `Criterio ${idx + 1}`,
      description: item.descripcion || item.description || '',
      compliance: item.cumplimiento || item.compliance || 'NO',
      analysis: item.analisis || item.analysis || '',
      justification: item.justificacion || item.justification || '',
    }));
  }
  if (Array.isArray(conclusion)) {
    conclusion = conclusion.map((item: any) =>
      item && typeof item === 'object' && item.title ? `**${item.title}**: ${item.text || ''}` : String(item)
    ).join('\n\n');
  }
  if (total_score == null && Array.isArray(criteria)) {
    total_score = criteria.filter((c: any) => (c.compliance || c.cumplimiento || '').toUpperCase() === 'SÍ').length;
  }
  if (!performance_range && total_score != null) {
    performance_range = total_score >= 8 ? 'Exitosa' : total_score >= 5 ? 'Competente' : 'Aceptable';
  }
  return { ...raw, criteria, conclusion, total_score, performance_range };
}

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

// ── USS Design Tokens ─────────────────────────────────────────────────────────
const C = {
  navy:      '#1a2744',
  navyDark:  '#111b33',
  navyLight: '#243459',
  red:       '#c0392b',
  redLight:  '#e74c3c',
  gold:      '#c9a84c',
  white:     '#ffffff',
  gray50:    '#f8f9fb',
  gray100:   '#eef0f5',
  gray200:   '#d8dce8',
  gray400:   '#8892aa',
  gray600:   '#4a5568',
  gray800:   '#1e293b',
};

type ViewType = 'dashboard' | 'students' | 'chat' | 'ramo';
type RamoTab = 'contenido' | 'anuncios' | 'calificaciones' | 'participantes' | 'mensajes' | 'resultados';

// ── Sidebar ───────────────────────────────────────────────────────────────────
const Sidebar: React.FC<{
  view: ViewType;
  setView: (v: ViewType) => void;
  user: any;
  onLogout: () => void;
}> = ({ view, setView, user, onLogout }) => {
  const nav = [
    { id: 'dashboard' as ViewType, label: 'Dashboard',   icon: '⊞', activeFor: ['dashboard', 'ramo'] },
    { id: 'students'  as ViewType, label: 'Mis Alumnos', icon: '👥', activeFor: ['students'] },
  ];
  const initials = user?.name?.[0] + (user?.lastName?.[0] ?? '');

  return (
    <div style={{
      width: 240, minHeight: '100vh', background: C.navyDark,
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      boxShadow: '4px 0 20px rgba(0,0,0,0.25)',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src="/LogoUniversidadSanSebastian.jpg"
            alt="USS"
            style={{ height: 40, width: 'auto', objectFit: 'contain' }}
          />
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px' }}>
        {nav.map(item => {
          const isActive = item.activeFor.includes(view);
          return (
          <button key={item.id} onClick={() => setView(item.id)}
            style={{
              width: '100%', textAlign: 'left', padding: '11px 14px',
              borderRadius: 8, border: 'none', cursor: 'pointer',
              background: isActive ? 'rgba(192,57,43,0.18)' : 'transparent',
              color: isActive ? C.white : C.gray400,
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 14, fontFamily: "'Georgia', serif",
              fontWeight: isActive ? 700 : 400,
              marginBottom: 4, transition: 'all 0.15s',
              borderLeft: isActive ? `3px solid ${C.red}` : '3px solid transparent',
            }}>
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            {item.label}
          </button>
          );
        })}
      </nav>

      {/* User + logout */}
      <div style={{ padding: '16px 14px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: `linear-gradient(135deg, ${C.red}, ${C.navy})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: C.white, flexShrink: 0,
          }}>{initials}</div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.white, fontFamily: "'Georgia', serif", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.name} {user?.lastName}
            </div>
            <div style={{ fontSize: 10, color: C.gold }}>Docente</div>
          </div>
        </div>
        <button onClick={onLogout}
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid rgba(255,255,255,0.12)`,
            background: 'transparent', color: C.gray400, cursor: 'pointer',
            fontSize: 12, fontFamily: "'Georgia', serif", transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLButtonElement).style.color = C.white; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = C.gray400; }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
};

// ── Top Header ────────────────────────────────────────────────────────────────
const PageHeader: React.FC<{ title: string; subtitle?: string; userName?: string }> = ({ title, subtitle, userName }) => (
  <div>
    {userName && (
      <div style={{
        background: `linear-gradient(135deg, ${C.navyDark} 0%, ${C.navyLight} 100%)`,
        padding: '16px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.55)', fontFamily: "'Georgia', serif" }}>
            Bienvenido a la plataforma educativa <strong style={{ color: C.gold }}>CHAT-BOT</strong>
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 800, color: C.white, fontFamily: "'Georgia', serif" }}>
            {userName}
          </p>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 10, padding: '8px 14px' }}>
          <img src="/LogoUniversidadSanSebastian.jpg" alt="USS"
            style={{ height: 36, width: 'auto', objectFit: 'contain', display: 'block' }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = 'none'; }}
          />
        </div>
      </div>
    )}
    <div style={{
      background: C.white, borderBottom: `1px solid ${C.gray200}`,
      padding: '18px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: C.navyDark, fontFamily: "'Georgia', serif" }}>{title}</h1>
        {subtitle && <p style={{ margin: '3px 0 0', fontSize: 13, color: C.gray400 }}>{subtitle}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, color: C.gray400, fontFamily: "'Georgia', serif" }}>Semestre 2025-1</span>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 3px rgba(34,197,94,0.2)' }} />
      </div>
    </div>
  </div>
);

// ── Ramo View ─────────────────────────────────────────────────────────────────
const typeConfig = {
  simulacion: { icon: '🤖', label: 'Simulación', bg: '#ede9fe', color: '#7c3aed', border: '#c4b5fd' },
  tarea:      { icon: '📝', label: 'Tarea',       bg: '#fef3c7', color: '#b45309', border: '#fcd34d' },
  recurso:    { icon: '📄', label: 'Recurso',     bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
  anuncio:    { icon: '📢', label: 'Anuncio',     bg: '#dcfce7', color: '#15803d', border: '#86efac' },
};

type EditableItemType = 'anuncio' | 'recurso' | 'tarea';

interface ModalState {
  open: boolean;
  moduleId: number | null;
  editItemId?: number;
}

const emptyForm = { type: 'anuncio' as EditableItemType, title: '', description: '', dueDate: '' };

// ── Criterios generales por defecto ──────────────────────────────────────────
const CRITERIOS_GENERALES = [
  'Lenguaje adecuado al nivel del estudiante',
  'Estrategias de apoyo pedagógico',
  'Adaptación al perfil del alumno',
  'Uso de refuerzo positivo',
  'Manejo del ritmo de aprendizaje',
  'Claridad en las instrucciones',
  'Fomento de la autonomía del estudiante',
  'Empatía y vínculo pedagógico',
  'Evaluación formativa durante la interacción',
  'Coherencia con los objetivos planteados',
  'Cierre y síntesis de la sesión',
];

const defaultCriterios = () => [
  { id: 1, nombre: '', descripcion: '' },
  { id: 2, nombre: '', descripcion: '' },
  { id: 3, nombre: '', descripcion: '' },
];

// ── Modal Crear Simulación — pantalla completa (wizard 3 pasos) ───────────────
const SimulacionModal: React.FC<{
  ramo: any;
  correoDocente: string;
  onClose: () => void;
  onSave: (sim: any) => void;
}> = ({ ramo, correoDocente, onClose, onSave }) => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    nombre: '',
    agente: 'Teo' as 'Teo' | 'Jojo' | 'Ambos',
    numInteracciones: 2,
    fechaInicio: '',
    fechaTermino: '',
    instrucciones: '',
    objetivos: '',
    pautaTipo: 'general' as 'general' | 'personalizada',
    criterios: defaultCriterios(),
  });

  const set = (key: string, val: any) => setForm(f => ({ ...f, [key]: val }));

  const canNext = () => {
    if (step === 1) return form.nombre.trim() !== '' && form.fechaInicio !== '' && form.fechaTermino !== '';
    if (step === 2) return form.instrucciones.trim() !== '' && form.objetivos.trim() !== '';
    return true;
  };

  const handleSave = async () => {
    // Persist to backend
    try {
      const res = await fetch(`${API}/simulacion/crear`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          correo_docente:   correoDocente,
          ramo_codigo:      ramo.code,
          nombre:           form.nombre,
          instrucciones:    form.instrucciones,
          objetivos:        form.objetivos,
          agente:           form.agente,
          num_interacciones: form.numInteracciones,
          fecha_inicio:     form.fechaInicio,
          fecha_termino:    form.fechaTermino,
          pauta_tipo:       form.pautaTipo,
          pauta_criterios:  form.pautaTipo === 'personalizada' ? form.criterios : null,
        }),
      });
      const data = res.ok ? await res.json() : null;
      const simId = data?.simulacion_id ?? Date.now();

      const sim = {
        id: simId,
        type: 'simulacion' as const,
        title: form.nombre,
        description: form.instrucciones,
        status: 'Activo',
        agente: form.agente,
        numInteracciones: form.numInteracciones,
        completions: 0,
        total: ramo.students,
      };
      onSave(sim);
    } catch {
      // Non-blocking: still add locally even if backend fails
      onSave({
        id: Date.now(), type: 'simulacion' as const,
        title: form.nombre, description: form.instrucciones,
        status: 'Activo', agente: form.agente,
        numInteracciones: form.numInteracciones,
        completions: 0, total: ramo.students,
      });
    }
    onClose();
  };

  const addCriterio = () => {
    if (form.criterios.length >= 15) return;
    setForm(f => ({ ...f, criterios: [...f.criterios, { id: Date.now(), nombre: '', descripcion: '' }] }));
  };
  const removeCriterio = (id: number) => {
    if (form.criterios.length <= 1) return;
    setForm(f => ({ ...f, criterios: f.criterios.filter(c => c.id !== id) }));
  };
  const updateCriterio = (id: number, key: string, val: any) => {
    setForm(f => ({ ...f, criterios: f.criterios.map(c => c.id === id ? { ...c, [key]: val } : c) }));
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: `1px solid ${C.gray200}`, fontSize: 14,
    fontFamily: "'Georgia', serif", color: C.navyDark,
    outline: 'none', boxSizing: 'border-box', background: C.white,
  };

  const steps = [
    { label: 'Configuración', icon: '⚙️', desc: 'Nombre, agente y fechas' },
    { label: 'Instrucciones', icon: '📝', desc: 'Contenido visible al alumno' },
    { label: 'Pauta', icon: '📋', desc: 'Criterios de evaluación' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', flexDirection: 'column', background: C.white }}>

      {/* ── Top bar ── */}
      <div style={{ background: C.navyDark, padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: C.white, cursor: 'pointer', width: 36, height: 36, borderRadius: 8, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Cerrar">←</button>
          <div>
            <p style={{ margin: 0, fontSize: 11, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 1, fontFamily: "'Georgia', serif" }}>
              {ramo.code} · {ramo.name}
            </p>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: C.white, fontFamily: "'Georgia', serif" }}>
              Nueva simulación IA
            </h2>
          </div>
        </div>
        <button onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 24, lineHeight: 1, padding: 4 }}>×</button>
      </div>

      {/* ── Main layout: sidebar + content ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left sidebar — step nav */}
        <div style={{ width: 260, background: '#f8f9fc', borderRight: `1px solid ${C.gray200}`, padding: '32px 20px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <p style={{ margin: '0 0 16px', fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 1.2, paddingLeft: 12 }}>Pasos</p>
          {steps.map((s, i) => {
            const num = i + 1;
            const done = num < step;
            const active = num === step;
            return (
              <div key={s.label}
                onClick={() => done && setStep(num)}
                style={{
                  padding: '14px 16px', borderRadius: 12, cursor: done ? 'pointer' : 'default',
                  background: active ? C.navyDark : done ? `${C.navy}08` : 'transparent',
                  border: `1.5px solid ${active ? C.navyDark : done ? `${C.navy}20` : C.gray200}`,
                  display: 'flex', alignItems: 'center', gap: 14, transition: 'all 0.15s',
                }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: done ? C.gold : active ? C.white : C.gray200,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: done ? 14 : 13, fontWeight: 800,
                  color: done ? C.navyDark : active ? C.navyDark : C.gray400,
                }}>
                  {done ? '✓' : num}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Georgia', serif", color: active ? C.white : done ? C.navy : C.gray600 }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 11, color: active ? 'rgba(255,255,255,0.55)' : C.gray400, marginTop: 2 }}>
                    {s.desc}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Resumen lateral */}
          {form.nombre && (
            <div style={{ marginTop: 24, padding: '14px 16px', background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}` }}>
              <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 1 }}>Resumen</p>
              <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: C.navyDark, fontFamily: "'Georgia', serif" }}>{form.nombre}</p>
              {form.agente && <p style={{ margin: '0 0 2px', fontSize: 12, color: C.gray600 }}>Agente: {form.agente}</p>}
              {form.fechaInicio && <p style={{ margin: 0, fontSize: 11, color: C.gray400 }}>{form.fechaInicio} → {form.fechaTermino || '…'}</p>}
            </div>
          )}
        </div>

        {/* Right — scrollable form content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '40px 56px', maxWidth: 860 }}>

          {/* ── STEP 1: Configuración ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: C.navyDark, fontFamily: "'Georgia', serif" }}>Configuración general</h3>
                <p style={{ margin: 0, fontSize: 14, color: C.gray400 }}>Define el nombre, agente y duración de la simulación.</p>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 8 }}>
                  Nombre de la simulación *
                </label>
                <input style={{ ...inputStyle, fontSize: 16 }} placeholder="Ej: Simulación diagnóstica N°1 — Teo" value={form.nombre} onChange={e => set('nombre', e.target.value)} />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 12 }}>
                  Agente(s) asignado(s) *
                </label>
                <div style={{ display: 'flex', gap: 16 }}>
                  {(['Teo', 'Jojo', 'Ambos'] as const).map(a => (
                    <button key={a} onClick={() => set('agente', a)}
                      style={{
                        flex: 1, padding: '20px 12px', borderRadius: 14, cursor: 'pointer',
                        border: `2px solid ${form.agente === a ? C.navy : C.gray200}`,
                        background: form.agente === a ? `${C.navy}0d` : C.white,
                        transition: 'all 0.15s',
                      }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>
                        {a === 'Teo' ? '🧒' : a === 'Jojo' ? '👧' : '🧒👧'}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: form.agente === a ? C.navy : C.gray400, fontFamily: "'Georgia', serif" }}>{a}</div>
                      <div style={{ fontSize: 11, color: C.gray400, marginTop: 4 }}>
                        {a === 'Teo' ? 'DEA · 9 años · 3° básico' : a === 'Jojo' ? 'DIL · 15 años' : 'Ambos agentes'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 12 }}>
                  Número de interacciones *
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 0, width: 'fit-content', border: `1px solid ${C.gray200}`, borderRadius: 12, overflow: 'hidden' }}>
                  <button onClick={() => set('numInteracciones', Math.max(1, form.numInteracciones - 1))}
                    style={{ width: 52, height: 52, border: 'none', background: C.gray50, cursor: 'pointer', fontSize: 22, color: C.gray600, fontWeight: 700 }}>−</button>
                  <div style={{ width: 72, textAlign: 'center', fontSize: 24, fontWeight: 800, color: C.navyDark, fontFamily: "'Georgia', serif" }}>
                    {form.numInteracciones}
                  </div>
                  <button onClick={() => set('numInteracciones', Math.min(5, form.numInteracciones + 1))}
                    style={{ width: 52, height: 52, border: 'none', background: C.gray50, cursor: 'pointer', fontSize: 22, color: C.gray600, fontWeight: 700 }}>+</button>
                </div>
                <p style={{ margin: '10px 0 0', fontSize: 13, color: C.gray400 }}>
                  El alumno realizará {form.numInteracciones} interacción{form.numInteracciones !== 1 ? 'es' : ''} completa{form.numInteracciones !== 1 ? 's' : ''} con el agente. Máximo 5.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 8 }}>
                    Fecha de inicio *
                  </label>
                  <input type="date" style={inputStyle} value={form.fechaInicio} onChange={e => set('fechaInicio', e.target.value)} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 8 }}>
                    Fecha de término *
                  </label>
                  <input type="date" style={inputStyle} value={form.fechaTermino} min={form.fechaInicio} onChange={e => set('fechaTermino', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Instrucciones ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: C.navyDark, fontFamily: "'Georgia', serif" }}>Instrucciones y objetivos</h3>
                <p style={{ margin: 0, fontSize: 14, color: C.gray400 }}>Este contenido será visible para el alumno al iniciar la simulación.</p>
              </div>

              <div style={{ background: `${C.navy}08`, border: `1px solid ${C.navy}20`, borderRadius: 12, padding: '14px 18px', fontSize: 13, color: C.navy, fontFamily: "'Georgia', serif" }}>
                💡 El alumno verá estas instrucciones y objetivos <strong>antes de comenzar</strong> la conversación con el agente.
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 8 }}>
                  Instrucciones para el alumno *
                </label>
                <textarea style={{ ...inputStyle, minHeight: 160, resize: 'vertical', lineHeight: 1.6 }}
                  placeholder="Describe qué debe hacer el alumno en esta simulación. Ej: Deberás interactuar con Teo, un estudiante de 9 años con Dificultad Específica del Aprendizaje (DEA), aplicando estrategias de apoyo en lectura y escritura. Tu objetivo es generar un ambiente de confianza y utilizar al menos 2 estrategias diferenciadas durante la sesión."
                  value={form.instrucciones} onChange={e => set('instrucciones', e.target.value)} />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 8 }}>
                  Objetivos de aprendizaje *
                </label>
                <textarea style={{ ...inputStyle, minHeight: 130, resize: 'vertical', lineHeight: 1.6 }}
                  placeholder="Ej:&#10;— Aplicar estrategias diferenciadas de lectura&#10;— Identificar barreras de aprendizaje en contexto real&#10;— Desarrollar un vínculo pedagógico empático y respetuoso"
                  value={form.objetivos} onChange={e => set('objetivos', e.target.value)} />
              </div>
            </div>
          )}

          {/* ── STEP 3: Pauta ── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: C.navyDark, fontFamily: "'Georgia', serif" }}>Pauta de evaluación</h3>
                <p style={{ margin: 0, fontSize: 14, color: C.gray400 }}>Define cómo se evaluará el desempeño pedagógico del alumno.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(['general', 'personalizada'] as const).map(tipo => (
                  <button key={tipo} onClick={() => set('pautaTipo', tipo)}
                    style={{
                      padding: '18px 22px', borderRadius: 14, cursor: 'pointer', textAlign: 'left',
                      border: `2px solid ${form.pautaTipo === tipo ? C.navy : C.gray200}`,
                      background: form.pautaTipo === tipo ? `${C.navy}08` : C.white,
                      display: 'flex', alignItems: 'flex-start', gap: 16, transition: 'all 0.15s',
                    }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 3,
                      border: `2px solid ${form.pautaTipo === tipo ? C.navy : C.gray200}`,
                      background: form.pautaTipo === tipo ? C.navy : C.white,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {form.pautaTipo === tipo && <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.white }} />}
                    </div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: form.pautaTipo === tipo ? C.navy : C.gray600, fontFamily: "'Georgia', serif" }}>
                        {tipo === 'general' ? '📋 Usar pauta general del sistema' : '✏️ Crear pauta personalizada'}
                      </div>
                      <div style={{ fontSize: 13, color: C.gray400, marginTop: 4 }}>
                        {tipo === 'general'
                          ? '11 criterios pedagógicos predefinidos, validados para DEA y DIL. Evaluación SÍ/NO por criterio.'
                          : 'Define tus propios criterios para esta simulación. Evaluación SÍ/NO por criterio.'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Vista previa pauta general */}
              {form.pautaTipo === 'general' && (
                <div style={{ background: C.gray50, borderRadius: 14, padding: '20px 24px', border: `1px solid ${C.gray200}` }}>
                  <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.8 }}>Vista previa — 11 criterios pedagógicos</p>
                  {CRITERIOS_GENERALES.map((c, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 0', borderBottom: i < CRITERIOS_GENERALES.length - 1 ? `1px solid ${C.gray200}` : 'none' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.gray200, width: 22, textAlign: 'right', flexShrink: 0 }}>{i + 1}.</span>
                      <span style={{ fontSize: 14, color: C.gray600, fontFamily: "'Georgia', serif", flex: 1 }}>{c}</span>
                      <span style={{ fontSize: 11, color: C.gray400, background: C.gray200, borderRadius: 6, padding: '2px 8px', flexShrink: 0 }}>SÍ / NO</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Builder pauta personalizada */}
              {form.pautaTipo === 'personalizada' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ background: `${C.gold}18`, border: `1px solid ${C.gold}40`, borderRadius: 12, padding: '12px 18px', fontSize: 13, color: '#78580a', fontFamily: "'Georgia', serif" }}>
                    ⚠️ Los alumnos <strong>no verán</strong> esta pauta. Solo se usa para generar su retroalimentación al finalizar cada interacción. Cada criterio se evalúa <strong>SÍ / NO</strong>.
                  </div>
                  {form.criterios.map((c, i) => (
                    <div key={c.id} style={{ background: C.white, border: `1.5px solid ${C.gray200}`, borderRadius: 14, padding: '18px 20px', display: 'flex', gap: 14 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.navyDark, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, marginTop: 3 }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <input style={inputStyle} placeholder="Nombre del criterio *" value={c.nombre} onChange={e => updateCriterio(c.id, 'nombre', e.target.value)} />
                        <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical', fontSize: 13, lineHeight: 1.5 }} placeholder="Descripción del criterio (opcional) — ¿Qué debe observarse para considerar que se cumplió?" value={c.descripcion} onChange={e => updateCriterio(c.id, 'descripcion', e.target.value)} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, color: C.gray400 }}>Evaluación:</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: C.navy, background: `${C.navy}0d`, borderRadius: 6, padding: '3px 10px' }}>SÍ / NO</span>
                        </div>
                      </div>
                      <button onClick={() => removeCriterio(c.id)}
                        style={{ width: 32, height: 32, border: `1px solid #fee2e2`, background: '#fff5f5', borderRadius: 8, cursor: form.criterios.length <= 1 ? 'not-allowed' : 'pointer', fontSize: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: form.criterios.length <= 1 ? 0.4 : 1 }}
                        title="Eliminar criterio">🗑️</button>
                    </div>
                  ))}
                  {form.criterios.length < 15 && (
                    <button onClick={addCriterio}
                      style={{ padding: '14px', borderRadius: 12, border: `2px dashed ${C.gray200}`, background: 'transparent', cursor: 'pointer', fontSize: 14, color: C.gray400, fontFamily: "'Georgia', serif", fontWeight: 700, transition: 'all 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.navy; (e.currentTarget as HTMLButtonElement).style.color = C.navy; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = C.gray200; (e.currentTarget as HTMLButtonElement).style.color = C.gray400; }}>
                      + Agregar criterio
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom footer ── */}
      <div style={{ height: 72, borderTop: `1px solid ${C.gray200}`, background: C.white, padding: '0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <button onClick={step === 1 ? onClose : () => setStep(s => s - 1)}
          style={{ padding: '11px 26px', borderRadius: 10, border: `1.5px solid ${C.gray200}`, background: C.white, color: C.gray600, cursor: 'pointer', fontSize: 14, fontFamily: "'Georgia', serif" }}>
          {step === 1 ? 'Cancelar' : '← Anterior'}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{ width: n === step ? 28 : 10, height: 10, borderRadius: 99, background: n === step ? C.navy : n < step ? C.gold : C.gray200, transition: 'all 0.2s' }} />
          ))}
        </div>
        {step < 3 ? (
          <button onClick={() => canNext() && setStep(s => s + 1)}
            style={{ padding: '11px 30px', borderRadius: 10, border: 'none', background: canNext() ? C.navy : C.gray200, color: canNext() ? C.white : C.gray400, cursor: canNext() ? 'pointer' : 'not-allowed', fontSize: 14, fontWeight: 700, fontFamily: "'Georgia', serif", transition: 'all 0.15s' }}>
            Siguiente →
          </button>
        ) : (
          <button onClick={handleSave}
            style={{ padding: '11px 32px', borderRadius: 10, border: 'none', background: C.navy, color: C.white, cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: "'Georgia', serif" }}>
            ✓ Crear simulación
          </button>
        )}
      </div>
    </div>
  );
};

const RamoView: React.FC<{
  ramoId: number;
  onBack: () => void;
  onStartSimulation: (c: 'Teo' | 'Jojo') => void;
  user: any;
}> = ({ ramoId, onBack, onStartSimulation, user }) => {
  const { token } = useAuth();
  const correoDocente = user?.email ?? '';
  const [activeTab, setActiveTab] = useState<RamoTab>('contenido');

  // Datos reales del ramo (código/nombre/alumnos) — antes venían de
  // mockRamos, que usaba ids ficticios (1,2,3) incompatibles con los ids
  // reales que ahora entrega GET /ramos/mios.
  const [ramoReal, setRamoReal] = useState<RamoReal | null>(null);
  useEffect(() => {
    const fetchRamo = async () => {
      try {
        const apiUrl = ((import.meta as any).env?.VITE_API_URL) || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/ramos/mios`, {
          headers: authHeaders(token),
        });
        if (res.ok) {
          const list: RamoReal[] = await res.json();
          setRamoReal(list.find(r => r.id === ramoId) ?? null);
        }
      } catch (e) {
        console.error('[RamoView] Error cargando ramo:', e);
      }
    };
    fetchRamo();
  }, [ramoId, token]);

  const ramo = {
    id: ramoId,
    code: ramoReal?.codigo ?? '—',
    name: ramoReal?.nombre ?? 'Cargando…',
    schedule: '', room: '',
    color: C.navy,
    students: ramoReal?.num_alumnos ?? 0,
    sessions: 0, reports: 0,
    chatbots: [
      { name: 'Teo' as const, emoji: '🧒', diagnosis: 'DEA · F81.0' },
      { name: 'Jojo' as const, emoji: '👧', diagnosis: 'DIL' },
    ],
  };
  // Contenido real del ramo (recursos/tareas/anuncios) + resumen de
  // simulaciones — reemplaza el antiguo estado local mutado desde mockModules.
  const [contenido, setContenido] = useState<any[]>([]);
  const [simulacionesResumen, setSimulacionesResumen] = useState<{ agente: string; completions: number; total: number }[]>([]);

  const fetchContenido = async () => {
    try {
      const res = await fetch(`${API}/ramos/${ramoId}/contenido`, { headers: authHeaders(token) });
      if (res.ok) {
        const data = await res.json();
        setContenido(data.contenido ?? []);
        setSimulacionesResumen(data.simulaciones ?? []);
      }
    } catch (e) {
      console.error('[RamoView] Error cargando contenido:', e);
    }
  };
  useEffect(() => { fetchContenido(); }, [ramoId, token]);

  const toDisplayItem = (i: any) => ({
    id: i.id, type: i.tipo, title: i.titulo, description: i.descripcion ?? '',
    dueDate: i.fecha_entrega ?? undefined,
    status: i.publicado ? 'Publicado' : 'Borrador',
  });
  const bucketFor = (tipo: string) => contenido.filter((i: any) => i.tipo === tipo).map(toDisplayItem);
  const modules = [
    { id: 1, title: 'Anuncios', items: bucketFor('anuncio') },
    {
      id: 2, title: 'Simulaciones con IA',
      items: simulacionesResumen.map((s, idx) => ({
        id: 1000 + idx, type: 'simulacion', title: `Simulación con ${s.agente}`,
        description: s.agente === 'Teo'
          ? 'Practica estrategias pedagógicas con Teo, estudiante con DEA (F81.0).'
          : 'Interactúa con Jojo, estudiante con Discapacidad Intelectual Leve.',
        character: s.agente, completions: s.completions, total: s.total, status: 'Activo',
      })),
    },
    { id: 3, title: 'Tareas y Evaluaciones', items: bucketFor('tarea') },
    { id: 4, title: 'Recursos y Material de Apoyo', items: bucketFor('recurso') },
  ];
  const [modal, setModal] = useState<ModalState>({ open: false, moduleId: null });
  const [simModal, setSimModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<{ moduleId: number; itemId: number } | null>(null);

  const tabs: { id: RamoTab; label: string }[] = [
    { id: 'contenido',      label: 'Contenido' },
    { id: 'resultados',     label: 'Resultados alumnos' },
    { id: 'anuncios',       label: 'Anuncios' },
    { id: 'calificaciones', label: 'Calificaciones' },
    { id: 'participantes',  label: 'Participantes' },
    { id: 'mensajes',       label: 'Mensajes' },
  ];

  // ── Resultados state ──
  const [resultadosSims, setResultadosSims] = useState<any[]>([]);
  const [selectedSimId, setSelectedSimId] = useState<number | null>(null);
  const [resultadosData, setResultadosData] = useState<any>(null);
  const [loadingResultados, setLoadingResultados] = useState(false);
  const [selectedAlumno, setSelectedAlumno] = useState<any>(null);

  // ── Detail modal state ──
  const [detailAlumno, setDetailAlumno] = useState<any>(null);
  const [detailEntregaIdx, setDetailEntregaIdx] = useState(0);
  const [entregaMensajes, setEntregaMensajes] = useState<Record<number, any[]>>({});
  const [loadingMensajes, setLoadingMensajes] = useState<Record<number, boolean>>({});

  const fetchEntregaMensajes = async (entregaId: number) => {
    if (entregaMensajes[entregaId] !== undefined) return;
    setLoadingMensajes(prev => ({ ...prev, [entregaId]: true }));
    try {
      const data = await fetch(`${API}/simulacion/entrega/${entregaId}/mensajes`).then(r => r.json());
      setEntregaMensajes(prev => ({ ...prev, [entregaId]: Array.isArray(data) ? data : [] }));
    } catch {
      setEntregaMensajes(prev => ({ ...prev, [entregaId]: [] }));
    } finally {
      setLoadingMensajes(prev => ({ ...prev, [entregaId]: false }));
    }
  };

  const openDetail = (alumno: any) => {
    setDetailAlumno(alumno);
    setDetailEntregaIdx(0);
    const ints: any[] = alumno.interacciones ?? [];
    if (ints.length > 0) fetchEntregaMensajes(ints[0].entrega_id);
  };

  const generateTeacherPDF = (alumno: any, ent: any, msgs: any[], evalData: any) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W = 210; const M = 14;
    doc.setFillColor(17, 27, 51); doc.rect(0, 0, W, 40, 'F');
    doc.setFillColor(192, 57, 43); doc.rect(0, 40, W, 3, 'F');
    doc.setFillColor(201, 168, 76); doc.rect(0, 43, W, 1.5, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(15);
    doc.text('Universidad San Sebastián', M, 16);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(180, 190, 210);
    doc.text('Facultad de Educación — Revisión Docente de Simulación', M, 24);
    let y = 54;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(17, 27, 51);
    doc.text(`Alumno: ${alumno.correo}`, M, y); y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(74, 85, 104);
    doc.text(`Interacción ${ent.num_interaccion} · Agente: ${ent.agente_usado} · Estado: ${ent.estado}`, M, y); y += 12;
    if (ent.planificacion) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(17, 27, 51);
      doc.text('Planificación', M, y); y += 5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(74, 85, 104);
      const planLines = doc.splitTextToSize(ent.planificacion, W - M * 2) as string[];
      doc.text(planLines, M, y); y += planLines.length * 4.5 + 8;
    }
    if (msgs.length > 0) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(17, 27, 51);
      doc.text('Transcripción', M, y); y += 4;
      autoTable(doc, {
        startY: y, head: [['Participante', 'Mensaje']],
        body: msgs.map((m: any) => [m.role === 'user' ? 'Docente-Estudiante' : ent.agente_usado, m.content]),
        margin: { left: M, right: M },
        headStyles: { fillColor: [26, 39, 68], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { fontSize: 8 }, columnStyles: { 0: { cellWidth: 38, fontStyle: 'bold' } },
        alternateRowStyles: { fillColor: [248, 249, 251] },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
    }
    if (evalData?.criteria?.length > 0) {
      if (y > 220) { doc.addPage(); y = 15; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(17, 27, 51);
      doc.text('Criterios de Evaluación', M, y); y += 4;
      autoTable(doc, {
        startY: y, head: [['Criterio','Descripción','Cumpl.','Análisis','Justificación']],
        body: evalData.criteria.map((c: any) => [
          c.name||'', c.description||'',
          (c.compliance||c.cumplimiento||'').toUpperCase()==='SÍ'?'Sí':'No',
          c.analysis||'', c.justification||'',
        ]),
        margin: { left: M, right: M },
        headStyles: { fillColor: [17,27,51], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5 },
        columnStyles: { 0:{cellWidth:30},1:{cellWidth:34},2:{cellWidth:13,halign:'center'},3:{cellWidth:38},4:{cellWidth:38} },
        alternateRowStyles: { fillColor: [248,249,251] },
        didParseCell: (data: any) => {
          if (data.column.index===2 && data.section==='body') {
            data.cell.styles.textColor = data.cell.raw==='Sí'?[21,128,61]:[192,57,43];
            data.cell.styles.fontStyle = 'bold';
          }
        },
      });
    }
    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p++) {
      doc.setPage(p);
      doc.setFillColor(17,27,51); doc.rect(0,287,W,10,'F');
      doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(180,190,210);
      doc.text('Universidad San Sebastián — Plataforma de Simulación Pedagógica', M, 293);
      doc.text(`Pág. ${p}/${pages}`, W-M, 293, { align: 'right' });
    }
    doc.save(`revision_${alumno.correo.split('@')[0]}_int${ent.num_interaccion}.pdf`);
  };

  useEffect(() => {
    if (activeTab !== 'resultados') return;
    fetch(`${API}/simulacion/ramo/${ramo.code}`)
      .then(r => r.json())
      .then(data => {
        setResultadosSims(data);
        if (data.length > 0 && !selectedSimId) {
          setSelectedSimId(data[0].id);
        }
      })
      .catch(() => {});
  }, [activeTab, ramo.code]);

  useEffect(() => {
    if (!selectedSimId) return;
    setLoadingResultados(true);
    setResultadosData(null);
    setSelectedAlumno(null);
    fetch(`${API}/simulacion/${selectedSimId}/resultados`)
      .then(r => r.json())
      .then(data => setResultadosData(data))
      .catch(() => setResultadosData(null))
      .finally(() => setLoadingResultados(false));
  }, [selectedSimId]);

  const allItems = modules.flatMap((m: any) => m.items);
  const totalSims   = allItems.filter((i: any) => i.type === 'simulacion').length;
  const totalTareas = allItems.filter((i: any) => i.type === 'tarea').length;

  // ── CRUD helpers (backend real /ramos/{id}/contenido) ───────────────────────
  const openCreate = (moduleId: number) => {
    const defaultType = moduleId === 1 ? 'anuncio' : moduleId === 3 ? 'tarea' : 'recurso';
    setForm({ ...emptyForm, type: defaultType });
    setModal({ open: true, moduleId, editItemId: undefined });
  };
  const openEdit = (moduleId: number, item: any) => {
    setForm({ type: item.type, title: item.title, description: item.description, dueDate: item.dueDate ?? '' });
    setModal({ open: true, moduleId, editItemId: item.id });
  };
  const closeModal = () => setModal({ open: false, moduleId: null });

  // La simulación en sí se crea en SimulacionModal (POST /simulacion/crear);
  // acá solo refrescamos el resumen de completions tras cerrarlo.
  const saveSim = (_sim: any) => { fetchContenido(); };

  const saveItem = async () => {
    if (!form.title.trim()) return;
    try {
      if (modal.editItemId !== undefined) {
        await fetch(`${API}/ramos/${ramoId}/contenido/${modal.editItemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
          body: JSON.stringify({ titulo: form.title, descripcion: form.description, fecha_entrega: form.dueDate || null }),
        });
      } else {
        await fetch(`${API}/ramos/${ramoId}/contenido`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
          body: JSON.stringify({
            tipo: form.type, titulo: form.title, descripcion: form.description,
            fecha_entrega: form.type === 'tarea' && form.dueDate ? form.dueDate : null,
          }),
        });
      }
      await fetchContenido();
    } catch (e) {
      console.error('[RamoView] Error guardando contenido:', e);
    }
    closeModal();
  };

  const deleteItem = async (_moduleId: number, itemId: number) => {
    try {
      await fetch(`${API}/ramos/${ramoId}/contenido/${itemId}`, { method: 'DELETE', headers: authHeaders(token) });
      await fetchContenido();
    } catch (e) {
      console.error('[RamoView] Error eliminando contenido:', e);
    }
    setDeleteConfirm(null);
  };

  const toggleStatus = async (_moduleId: number, itemId: number) => {
    const item = contenido.find((i: any) => i.id === itemId);
    if (!item) return;
    try {
      await fetch(`${API}/ramos/${ramoId}/contenido/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ publicado: !item.publicado }),
      });
      await fetchContenido();
    } catch (e) {
      console.error('[RamoView] Error publicando/despublicando:', e);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: `1px solid ${C.gray200}`, fontSize: 13,
    fontFamily: "'Georgia', serif", color: C.navyDark,
    outline: 'none', boxSizing: 'border-box', background: C.white,
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: C.gray50, minHeight: '100vh' }}>

      {/* ── Modal overlay ── */}
      {modal.open && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={closeModal}>
          <div style={{
            background: C.white, borderRadius: 16, width: 520, maxWidth: '92vw',
            boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
          }} onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div style={{ padding: '18px 24px', background: C.navyDark, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.white, fontFamily: "'Georgia', serif" }}>
                {modal.editItemId !== undefined ? 'Editar elemento' : 'Agregar nuevo elemento'}
              </span>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
            </div>
            {/* Modal body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Type selector (only on create) */}
              {modal.editItemId === undefined && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 8 }}>Tipo de elemento</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['anuncio', 'recurso', 'tarea'] as EditableItemType[]).map(t => {
                      const cfg = typeConfig[t];
                      return (
                        <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                          style={{
                            flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer', border: `2px solid`,
                            borderColor: form.type === t ? cfg.color : C.gray200,
                            background: form.type === t ? cfg.bg : C.white,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, transition: 'all 0.15s',
                          }}>
                          <span style={{ fontSize: 20 }}>{cfg.icon}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: form.type === t ? cfg.color : C.gray400 }}>{cfg.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Title */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Título *</label>
                <input style={inputStyle} placeholder="Escribe un título..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>
              {/* Description */}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Descripción</label>
                <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical' }}
                  placeholder="Descripción o instrucciones para los estudiantes..."
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              {/* Due date (only for tasks) */}
              {form.type === 'tarea' && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Fecha de entrega</label>
                  <input type="date" style={inputStyle} value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
              )}
            </div>
            {/* Modal footer */}
            <div style={{ padding: '16px 24px', borderTop: `1px solid ${C.gray100}`, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={closeModal}
                style={{ padding: '9px 20px', borderRadius: 8, border: `1px solid ${C.gray200}`, background: C.white, color: C.gray600, cursor: 'pointer', fontSize: 13, fontFamily: "'Georgia', serif" }}>
                Cancelar
              </button>
              <button onClick={saveItem}
                style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: C.navy, color: C.white, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: "'Georgia', serif", opacity: form.title.trim() ? 1 : 0.5 }}>
                {modal.editItemId !== undefined ? 'Guardar cambios' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Simulacion Modal ── */}
      {simModal && (
        <SimulacionModal
          ramo={ramo}
          correoDocente={correoDocente}
          onClose={() => setSimModal(false)}
          onSave={saveSim}
        />
      )}

      {/* ── Delete confirm ── */}
      {deleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setDeleteConfirm(null)}>
          <div style={{ background: C.white, borderRadius: 14, padding: '28px', width: 360, boxShadow: '0 16px 40px rgba(0,0,0,0.2)', textAlign: 'center' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
            <p style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: C.navyDark, fontFamily: "'Georgia', serif" }}>¿Eliminar este elemento?</p>
            <p style={{ margin: '0 0 20px', fontSize: 13, color: C.gray400 }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setDeleteConfirm(null)}
                style={{ padding: '9px 22px', borderRadius: 8, border: `1px solid ${C.gray200}`, background: C.white, color: C.gray600, cursor: 'pointer', fontSize: 13, fontFamily: "'Georgia', serif" }}>
                Cancelar
              </button>
              <button onClick={() => deleteItem(deleteConfirm.moduleId, deleteConfirm.itemId)}
                style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: C.red, color: C.white, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: "'Georgia', serif" }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero header ── */}
      <div style={{ background: `linear-gradient(160deg, ${C.navyDark} 0%, #0f2a5e 60%, #1a3a7a 100%)`, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -60, top: -60, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'absolute', right: 80, top: 20, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        <div style={{ padding: '14px 32px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', fontSize: 13, fontFamily: "'Georgia', serif", padding: 0 }}>
            ← Cursos
          </button>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>•</span>
          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontFamily: "'Georgia', serif" }}>{ramo.code}</span>
        </div>

        <div style={{ padding: '12px 32px 0', textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: C.white, letterSpacing: 2, fontFamily: "'Georgia', serif", textTransform: 'uppercase' }}>
            Universidad San Sebastián
          </h2>
        </div>

        <div style={{ padding: '14px 32px 22px' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: "'Georgia', serif", letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>{ramo.code}</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.white, fontFamily: "'Georgia', serif" }}>{ramo.name}</h1>
          <div style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { icon: '👥', text: `${ramo.students} estudiantes` },
              { icon: '🗓️', text: ramo.schedule },
              { icon: '📍', text: ramo.room },
              { icon: '📅', text: 'Semestre 2025-1' },
            ].filter(({ text }) => !!text).map(({ icon, text }) => (
              <span key={text} style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: "'Georgia', serif", display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>{icon}</span>{text}
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', paddingLeft: 32, borderTop: '1px solid rgba(255,255,255,0.1)', gap: 2 }}>
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 20px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontFamily: "'Georgia', serif", fontWeight: activeTab === tab.id ? 700 : 400,
                color: activeTab === tab.id ? C.white : 'rgba(255,255,255,0.5)',
                borderBottom: activeTab === tab.id ? `3px solid ${C.gold}` : '3px solid transparent',
                transition: 'all 0.15s',
              }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenido tab ── */}
      {activeTab === 'contenido' && (
        <div style={{ display: 'flex', gap: 28, padding: '28px 32px', flex: 1, alignItems: 'flex-start' }}>

          {/* Main column */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {modules.map((mod: any) => (
              <div key={mod.id} style={{ marginBottom: 20, background: C.white, borderRadius: 14, boxShadow: '0 2px 12px rgba(26,39,68,0.06)', overflow: 'hidden' }}>
                {/* Module header */}
                <div style={{ padding: '14px 20px', background: mod.pinned ? C.navyDark : C.navy, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {mod.pinned && <span style={{ fontSize: 14 }}>📌</span>}
                    <span style={{ fontSize: 15, fontWeight: 700, color: C.white, fontFamily: "'Georgia', serif" }}>{mod.title}</span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: "'Georgia', serif" }}>{mod.items.length} elemento{mod.items.length !== 1 ? 's' : ''}</span>
                  </div>
                  {/* "+ Agregar" button per module */}
                  <button onClick={() => mod.title.includes('Simulaci') ? setSimModal(true) : openCreate(mod.id)}
                    style={{
                      padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.25)',
                      background: 'rgba(255,255,255,0.1)', color: C.white, cursor: 'pointer',
                      fontSize: 12, fontWeight: 700, fontFamily: "'Georgia', serif",
                      display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.2)'}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'}
                  >
                    + Agregar
                  </button>
                </div>

                {/* Items */}
                <div>
                  {mod.items.map((item: any, idx: number) => {
                    const cfg = typeConfig[item.type as keyof typeof typeConfig];
                    return (
                      <div key={item.id}
                        className="teacher-item-row"
                        style={{
                          padding: '16px 20px', borderBottom: idx < mod.items.length - 1 ? `1px solid ${C.gray100}` : 'none',
                          display: 'flex', alignItems: 'flex-start', gap: 14, transition: 'background 0.1s', position: 'relative',
                        }}
                        onMouseEnter={e => {
                          (e.currentTarget as HTMLDivElement).style.background = C.gray50;
                          const btns = (e.currentTarget as HTMLDivElement).querySelectorAll<HTMLElement>('.item-actions');
                          btns.forEach(b => b.style.opacity = '1');
                        }}
                        onMouseLeave={e => {
                          (e.currentTarget as HTMLDivElement).style.background = C.white;
                          const btns = (e.currentTarget as HTMLDivElement).querySelectorAll<HTMLElement>('.item-actions');
                          btns.forEach(b => b.style.opacity = '0');
                        }}
                      >
                        <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0, background: cfg.bg, border: `1px solid ${cfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{cfg.icon}</div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: C.navyDark, fontFamily: "'Georgia', serif" }}>{item.title}</span>
                            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontWeight: 700 }}>{cfg.label}</span>
                            {item.status && (
                              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20,
                                background: item.status === 'Activo' || item.status === 'Publicado' ? '#dcfce7' : '#fef3c7',
                                color: item.status === 'Activo' || item.status === 'Publicado' ? '#15803d' : '#b45309',
                                fontWeight: 700,
                              }}>{item.status}</span>
                            )}
                          </div>
                          <p style={{ margin: '4px 0 0', fontSize: 13, color: C.gray400, lineHeight: 1.5 }}>{item.description}</p>

                          {item.type === 'simulacion' && item.completions !== undefined && (
                            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ flex: 1, height: 6, background: C.gray100, borderRadius: 99, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${(item.completions / item.total) * 100}%`, background: cfg.color, borderRadius: 99 }} />
                              </div>
                              <span style={{ fontSize: 11, color: C.gray400, whiteSpace: 'nowrap' }}>{item.completions} de {item.total} completados</span>
                            </div>
                          )}
                          {item.dueDate && (
                            <div style={{ marginTop: 6, fontSize: 11, color: C.gray400, display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span>📅</span> Entrega: {new Date(item.dueDate + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                          )}
                        </div>

                        {/* Actions column */}
                        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                          {/* Always-visible action for simulations */}
                          {item.type === 'simulacion' && item.character && (
                            <button onClick={() => onStartSimulation(item.character)}
                              style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: cfg.color, color: C.white, fontSize: 12, fontWeight: 700, fontFamily: "'Georgia', serif" }}>
                              Probar ▶
                            </button>
                          )}
                          {/* Edit/delete/publish — appear on hover */}
                          {item.type !== 'simulacion' && (
                            <div className="item-actions" style={{ display: 'flex', gap: 6, opacity: 0, transition: 'opacity 0.15s' }}>
                              <button onClick={() => toggleStatus(mod.id, item.id)}
                                style={{
                                  padding: '6px 12px', borderRadius: 7, border: `1px solid ${C.gray200}`,
                                  background: C.white, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                                  color: item.status === 'Publicado' ? '#b45309' : '#15803d',
                                  fontFamily: "'Georgia', serif",
                                }}>
                                {item.status === 'Publicado' ? 'Despublicar' : 'Publicar'}
                              </button>
                              <button onClick={() => openEdit(mod.id, item)}
                                style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${C.gray200}`, background: C.white, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Editar">✏️</button>
                              <button onClick={() => setDeleteConfirm({ moduleId: mod.id, itemId: item.id })}
                                style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid #fee2e2`, background: '#fff5f5', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Eliminar">🗑️</button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {/* Empty state per module */}
                  {mod.items.length === 0 && (
                    <div style={{ padding: '24px', textAlign: 'center', color: C.gray400, fontFamily: "'Georgia', serif", fontSize: 13 }}>
                      No hay elementos. <button onClick={() => openCreate(mod.id)} style={{ background: 'none', border: 'none', color: C.navy, cursor: 'pointer', fontWeight: 700, fontFamily: "'Georgia', serif", fontSize: 13 }}>+ Agregar uno</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Quick create */}
            <div style={{ background: C.white, borderRadius: 14, boxShadow: '0 2px 12px rgba(26,39,68,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', background: C.navyDark }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', fontFamily: "'Georgia', serif", textTransform: 'uppercase', letterSpacing: 1 }}>Publicar contenido</span>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Nueva simulación — acción especial */}
                <button onClick={() => setSimModal(true)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: 10,
                    border: `2px solid #7c3aed40`, background: '#ede9fe',
                    color: '#7c3aed', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                    fontFamily: "'Georgia', serif", display: 'flex', alignItems: 'center',
                    gap: 10, textAlign: 'left', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(0.95)'}
                  onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)'}
                >
                  <span style={{ fontSize: 18 }}>🤖</span>
                  <div>
                    <div>Nueva simulación IA</div>
                    <div style={{ fontSize: 10, fontWeight: 400, marginTop: 1 }}>Teo, Jojo o ambos agentes</div>
                  </div>
                </button>

                {([
                  { type: 'anuncio', label: 'Nuevo anuncio', icon: '📢', desc: 'Avisos para tus estudiantes' },
                  { type: 'recurso', label: 'Subir material', icon: '📄', desc: 'PDF, presentaciones, guías' },
                  { type: 'tarea',   label: 'Crear tarea',   icon: '📝', desc: 'Asignación con fecha límite' },
                ] as { type: EditableItemType; label: string; icon: string; desc: string }[]).map(action => (
                  <button key={action.type}
                    onClick={() => {
                      setForm({ ...emptyForm, type: action.type });
                      setModal({ open: true, moduleId: modules[0]?.id ?? null });
                    }}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      border: `1px solid ${typeConfig[action.type].border}`,
                      background: typeConfig[action.type].bg,
                      color: typeConfig[action.type].color, cursor: 'pointer',
                      fontSize: 13, fontWeight: 700, fontFamily: "'Georgia', serif",
                      display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(0.95)'}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)'}
                  >
                    <span style={{ fontSize: 18 }}>{action.icon}</span>
                    <div>
                      <div>{action.label}</div>
                      <div style={{ fontSize: 10, fontWeight: 400, marginTop: 1 }}>{action.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Docente */}
            <div style={{ background: C.white, borderRadius: 14, boxShadow: '0 2px 12px rgba(26,39,68,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', background: C.navyDark }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', fontFamily: "'Georgia', serif", textTransform: 'uppercase', letterSpacing: 1 }}>Docente del curso</span>
              </div>
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg, ${C.red}, ${C.navy})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: C.white, flexShrink: 0 }}>
                  {(user?.name?.[0] ?? '') + (user?.lastName?.[0] ?? '')}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.navyDark, fontFamily: "'Georgia', serif" }}>{user?.name} {user?.lastName}</div>
                  <div style={{ fontSize: 11, color: C.gold, marginTop: 2, fontWeight: 700 }}>USS DOCENTE</div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ background: C.white, borderRadius: 14, boxShadow: '0 2px 12px rgba(26,39,68,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', background: C.navyDark }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', fontFamily: "'Georgia', serif", textTransform: 'uppercase', letterSpacing: 1 }}>Resumen del ramo</span>
              </div>
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { icon: '👥', label: 'Estudiantes',      value: `${ramo.students}` },
                  { icon: '💬', label: 'Sesiones',         value: `${ramo.sessions}` },
                  { icon: '📄', label: 'Reportes',         value: `${ramo.reports}`  },
                  { icon: '🤖', label: 'Simulaciones',     value: `${totalSims}`      },
                  { icon: '📝', label: 'Tareas publicadas',value: `${totalTareas}`    },
                ].map(d => (
                  <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{d.icon}</span>
                    <div>
                      <div style={{ fontSize: 10, color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.8 }}>{d.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.navyDark, fontFamily: "'Georgia', serif" }}>{d.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Simular */}
            <div style={{ background: C.white, borderRadius: 14, boxShadow: '0 2px 12px rgba(26,39,68,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', background: C.navyDark }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', fontFamily: "'Georgia', serif", textTransform: 'uppercase', letterSpacing: 1 }}>Probar simulaciones</span>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ramo.chatbots.map((bot: any) => (
                  <button key={bot.name} onClick={() => onStartSimulation(bot.name)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${ramo.color}30`, background: `${ramo.color}08`, color: ramo.color, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: "'Georgia', serif", display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = `${ramo.color}18`}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = `${ramo.color}08`}
                  >
                    <span style={{ fontSize: 16 }}>{bot.emoji}</span> Simular con {bot.name}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── Resultados tab ── */}
      {activeTab === 'resultados' && (
        <div style={{ padding: '28px 32px', flex: 1 }}>

          {/* Simulation selector */}
          {resultadosSims.length > 0 && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
              {resultadosSims.map((s: any) => (
                <button key={s.id} onClick={() => setSelectedSimId(s.id)}
                  style={{
                    padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                    fontWeight: 600, fontFamily: "'Georgia', serif", transition: 'all 0.15s',
                    border: `2px solid ${selectedSimId === s.id ? C.navy : C.gray200}`,
                    background: selectedSimId === s.id ? C.navy : C.white,
                    color: selectedSimId === s.id ? C.white : C.gray600,
                  }}>
                  🤖 {s.nombre}
                </button>
              ))}
            </div>
          )}

          {resultadosSims.length === 0 && !loadingResultados && (
            <div style={{ background: C.white, borderRadius: 14, padding: 40, textAlign: 'center', boxShadow: '0 2px 12px rgba(26,39,68,0.06)' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>📭</div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.navyDark, fontFamily: "'Georgia', serif" }}>Sin simulaciones creadas</p>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: C.gray400 }}>Crea una simulación en la pestaña Contenido para ver resultados aquí.</p>
            </div>
          )}

          {loadingResultados && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: C.gray400, fontFamily: "'Georgia', serif" }}>
              Cargando resultados…
            </div>
          )}

          {resultadosData && !loadingResultados && (
            <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

              {/* Students table */}
              <div style={{ flex: 1, background: C.white, borderRadius: 14, boxShadow: '0 2px 12px rgba(26,39,68,0.06)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', background: C.navyDark, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.white, fontFamily: "'Georgia', serif" }}>
                    {resultadosData.nombre} — {resultadosData.alumnos?.length ?? 0} entregas
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
                    {resultadosData.num_interacciones} interacción{resultadosData.num_interacciones > 1 ? 'es' : ''} por alumno
                  </span>
                </div>

                {/* Table header */}
                <div style={{ display: 'grid', gridTemplateColumns: `2fr repeat(${resultadosData.num_interacciones}, 1fr)`, background: C.gray50, padding: '10px 18px', borderBottom: `1px solid ${C.gray200}` }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.8 }}>Alumno</span>
                  {Array.from({ length: resultadosData.num_interacciones }, (_, i) => (
                    <span key={i} style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center' }}>
                      Int. {i + 1}
                    </span>
                  ))}
                </div>

                {resultadosData.alumnos?.length === 0 && (
                  <div style={{ padding: 36, textAlign: 'center', color: C.gray400, fontFamily: "'Georgia', serif" }}>
                    Ningún alumno ha completado entregas aún.
                  </div>
                )}

                {resultadosData.alumnos?.map((alumno: any) => {
                  const interacciones: any[] = alumno.interacciones ?? [];
                  return (
                    <div key={alumno.correo}
                      onClick={() => openDetail(alumno)}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: `2fr repeat(${resultadosData.num_interacciones}, 1fr)`,
                        padding: '13px 18px', cursor: 'pointer',
                        borderBottom: `1px solid ${C.gray100}`,
                        background: C.white, transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = C.gray50; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = C.white; }}
                    >
                      {/* Name */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: `linear-gradient(135deg, ${C.navy}, ${C.red})`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, color: C.white, flexShrink: 0,
                        }}>
                          {alumno.correo.split('@')[0].slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.navyDark, fontFamily: "'Georgia', serif" }}>
                            {alumno.correo.split('@')[0]}
                          </div>
                          <div style={{ fontSize: 10, color: C.gray400 }}>{alumno.correo}</div>
                        </div>
                      </div>

                      {/* Scores per interaction */}
                      {Array.from({ length: resultadosData.num_interacciones }, (_, i) => {
                        const ent = interacciones.find((e: any) => e.num_interaccion === i + 1);
                        if (!ent) return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 11, color: C.gray200, fontFamily: "'Georgia', serif" }}>—</span>
                          </div>
                        );
                        const score = ent.puntaje ?? 0;
                        const color = score >= 8 ? '#15803d' : score >= 5 ? '#b45309' : C.red;
                        const bg    = score >= 8 ? '#dcfce7' : score >= 5 ? '#fef3c7' : '#fee2e2';
                        return (
                          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <span style={{ fontSize: 15, fontWeight: 800, color, fontFamily: "'Georgia', serif" }}>{score}</span>
                            <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, background: bg, color, fontWeight: 700 }}>
                              {ent.estado === 'completada' ? '✓' : '…'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Click a row to open the full-screen detail modal */}
            </div>
          )}
        </div>
      )}

      {/* ── Full-screen alumno detail modal ── */}
      {detailAlumno && (() => {
        const ints: any[] = detailAlumno.interacciones ?? [];
        const ent = ints[detailEntregaIdx];
        const msgs: any[] = ent ? (entregaMensajes[ent.entrega_id] ?? []) : [];
        const loadingMsg = ent ? (loadingMensajes[ent.entrega_id] ?? false) : false;
        let evalData: any = null;
        if (ent?.evaluacion_json) {
          try { evalData = normalizeEvaluation(JSON.parse(ent.evaluacion_json)); } catch { /* malformed */ }
        }
        const sectionMeta: Record<string, { color: string; bg: string; icon: string }> = {
          'Puntuación Total':     { color: C.navyDark, bg: `${C.navy}0d`, icon: '🎯' },
          'Fortalezas':           { color: '#15803d', bg: '#f0fdf4', icon: '✅' },
          'Aspectos a Mejorar':  { color: '#b45309', bg: '#fffbeb', icon: '⚠️' },
          'Sugerencias':          { color: C.navy,   bg: `${C.navy}08`, icon: '💡' },
        };
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.55)', display: 'flex' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: C.white, margin: '0 0 0 40px', boxShadow: '-8px 0 40px rgba(0,0,0,0.25)' }}>

              {/* Header */}
              <div style={{ background: C.navyDark, padding: '0 28px', height: 60, display: 'flex', alignItems: 'center', gap: 18, flexShrink: 0 }}>
                <button onClick={() => setDetailAlumno(null)}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: C.white, cursor: 'pointer', width: 34, height: 34, borderRadius: 8, fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  ←
                </button>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Revisión de alumno</p>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.white, fontFamily: "'Georgia', serif" }}>{detailAlumno.correo}</p>
                </div>
                {ent && (
                  <button onClick={() => generateTeacherPDF(detailAlumno, ent, msgs, evalData)}
                    style={{ padding: '8px 20px', borderRadius: 8, border: `1.5px solid ${C.gold}`, background: 'transparent', color: C.gold, cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: "'Georgia', serif" }}>
                    ⬇ PDF
                  </button>
                )}
              </div>

              {/* Interaction tabs */}
              <div style={{ background: C.gray50, borderBottom: `1px solid ${C.gray200}`, padding: '0 28px', display: 'flex', gap: 4, flexShrink: 0 }}>
                {ints.map((e: any, i: number) => (
                  <button key={e.entrega_id}
                    onClick={() => { setDetailEntregaIdx(i); fetchEntregaMensajes(e.entrega_id); }}
                    style={{
                      padding: '12px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: "'Georgia', serif",
                      borderBottom: `3px solid ${i === detailEntregaIdx ? C.navy : 'transparent'}`,
                      background: 'transparent', fontWeight: i === detailEntregaIdx ? 700 : 400,
                      color: i === detailEntregaIdx ? C.navyDark : C.gray400,
                    }}>
                    Interacción {e.num_interaccion}
                    {e.puntaje != null && (
                      <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: e.puntaje >= 8 ? '#15803d' : e.puntaje >= 5 ? '#b45309' : C.red }}>
                        {e.puntaje}/11
                      </span>
                    )}
                  </button>
                ))}
                {ints.length === 0 && (
                  <p style={{ padding: '12px 0', fontSize: 13, color: C.gray400, fontFamily: "'Georgia', serif", margin: 0 }}>Sin interacciones</p>
                )}
              </div>

              {/* Body */}
              {ent ? (
                <div style={{ flex: 1, overflowY: 'auto', padding: '28px', display: 'flex', flexDirection: 'column', gap: 24 }}>

                  {/* Top: planificación + chat (side by side) */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, alignItems: 'flex-start' }}>

                    {/* Planificación */}
                    <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, overflow: 'hidden' }}>
                      <div style={{ background: C.navyLight, padding: '10px 16px' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.white, fontFamily: "'Georgia', serif" }}>📝 Planificación</span>
                      </div>
                      <div style={{ padding: '14px 16px' }}>
                        {ent.planificacion ? (
                          <p style={{ margin: 0, fontSize: 12, color: C.gray600, fontFamily: "'Georgia', serif", lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                            {ent.planificacion}
                          </p>
                        ) : (
                          <p style={{ margin: 0, fontSize: 12, color: C.gray400, fontFamily: "'Georgia', serif" }}>Sin planificación registrada.</p>
                        )}
                        {ent.planificacion_archivo_url && (
                          <a href={`${API}${ent.planificacion_archivo_url}`} target="_blank" rel="noreferrer"
                            style={{ display: 'inline-block', marginTop: 12, fontSize: 12, color: C.navy, fontWeight: 700 }}>
                            📎 Descargar archivo adjunto
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Chat transcript */}
                    <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, overflow: 'hidden' }}>
                      <div style={{ background: C.navyDark, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.white, fontFamily: "'Georgia', serif" }}>💬 Transcripción del chat</span>
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>Agente: {ent.agente_usado}</span>
                      </div>
                      <div style={{ maxHeight: 400, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {loadingMsg && (
                          <p style={{ fontSize: 12, color: C.gray400, fontFamily: "'Georgia', serif", textAlign: 'center', padding: '20px 0' }}>Cargando mensajes…</p>
                        )}
                        {!loadingMsg && msgs.length === 0 && (
                          <p style={{ fontSize: 12, color: C.gray400, fontFamily: "'Georgia', serif", textAlign: 'center', padding: '20px 0' }}>Sin mensajes registrados.</p>
                        )}
                        {msgs.map((msg: any, i: number) => (
                          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                            <div style={{
                              maxWidth: '80%', padding: '9px 14px', fontSize: 12, lineHeight: 1.6,
                              fontFamily: "'Georgia', serif",
                              borderRadius: msg.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                              background: msg.role === 'user' ? C.navyDark : C.gray50,
                              color: msg.role === 'user' ? C.white : C.gray800,
                            }}>
                              {msg.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Evaluation section */}
                  {evalData ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                      {/* Score bar */}
                      <div style={{ background: C.white, borderRadius: 12, padding: '16px 20px', border: `1px solid ${C.gray200}`, display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div>
                          <p style={{ margin: 0, fontSize: 10, color: C.gray400, textTransform: 'uppercase', letterSpacing: 1 }}>Puntaje</p>
                          <p style={{ margin: 0, fontSize: 28, fontWeight: 900, color: C.navyDark, fontFamily: "'Georgia', serif", lineHeight: 1 }}>
                            {evalData.total_score ?? 0}<span style={{ fontSize: 14, fontWeight: 400, color: C.gray400 }}>/{evalData.criteria?.length ?? 11}</span>
                          </p>
                        </div>
                        <div style={{ width: 1, height: 40, background: C.gray200 }} />
                        <div>
                          <p style={{ margin: 0, fontSize: 10, color: C.gray400, textTransform: 'uppercase', letterSpacing: 1 }}>Desempeño</p>
                          <p style={{ margin: '2px 0 0', fontSize: 15, fontWeight: 700, color: C.navyDark, fontFamily: "'Georgia', serif" }}>{evalData.performance_range ?? '—'}</p>
                        </div>
                      </div>

                      {/* Criteria table */}
                      {evalData.criteria?.length > 0 && (
                        <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.gray200}`, overflow: 'hidden' }}>
                          <div style={{ background: C.navyDark, padding: '10px 16px' }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: C.white, fontFamily: "'Georgia', serif" }}>Criterios Pedagógicos</span>
                          </div>
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                              <thead>
                                <tr style={{ background: C.gray50, borderBottom: `2px solid ${C.gray200}` }}>
                                  {['Criterio','Descripción','Cumplimiento','Análisis','Justificación'].map(h => (
                                    <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 9, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.8, whiteSpace: 'nowrap' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {evalData.criteria.map((c: any, i: number) => {
                                  const met = (c.compliance || c.cumplimiento || '').toUpperCase() === 'SÍ';
                                  return (
                                    <tr key={i} style={{ background: i % 2 === 0 ? C.white : C.gray50, borderBottom: `1px solid ${C.gray100}` }}>
                                      <td style={{ padding: '10px 12px', fontWeight: 700, color: C.navyDark, fontFamily: "'Georgia', serif", verticalAlign: 'top', minWidth: 130 }}>{c.name || `Criterio ${i+1}`}</td>
                                      <td style={{ padding: '10px 12px', color: C.gray600, verticalAlign: 'top', minWidth: 150, lineHeight: 1.5 }}>{c.description || '—'}</td>
                                      <td style={{ padding: '10px 12px', textAlign: 'center', verticalAlign: 'top' }}>
                                        <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: met ? '#dcfce7' : '#fee2e2', color: met ? '#15803d' : C.red }}>
                                          {met ? 'Sí' : 'No'}
                                        </span>
                                      </td>
                                      <td style={{ padding: '10px 12px', color: C.gray600, verticalAlign: 'top', minWidth: 160, lineHeight: 1.5 }}>{c.analysis || '—'}</td>
                                      <td style={{ padding: '10px 12px', color: C.gray600, verticalAlign: 'top', minWidth: 160, lineHeight: 1.5 }}>{c.justification || '—'}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Conclusion sections */}
                      {evalData.conclusion && (() => {
                        const sections = parseConclusionSections(evalData.conclusion);
                        return sections.length > 0 ? (
                          <div>
                            <p style={{ margin: '0 0 10px', fontSize: 10, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 1 }}>Retroalimentación</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {sections.map((sec, i) => {
                                const meta = Object.entries(sectionMeta).find(([k]) => sec.title.includes(k))?.[1];
                                return (
                                  <div key={i} style={{ background: meta?.bg ?? C.white, borderRadius: 10, padding: '14px 18px', borderLeft: `4px solid ${meta?.color ?? C.gray200}` }}>
                                    {sec.title && <p style={{ margin: '0 0 5px', fontSize: 11, fontWeight: 700, color: meta?.color ?? C.navyDark, fontFamily: "'Georgia', serif" }}>{meta?.icon ?? ''} {sec.title}</p>}
                                    <p style={{ margin: 0, fontSize: 12, color: C.gray600, fontFamily: "'Georgia', serif", lineHeight: 1.7 }}>{sec.text}</p>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  ) : ent.estado === 'completada' ? (
                    <p style={{ fontSize: 13, color: C.gray400, fontFamily: "'Georgia', serif" }}>Evaluación no disponible.</p>
                  ) : (
                    <div style={{ background: `${C.gold}15`, borderRadius: 12, padding: '14px 18px', border: `1px solid ${C.gold}40` }}>
                      <p style={{ margin: 0, fontSize: 13, color: '#b45309', fontFamily: "'Georgia', serif" }}>⏳ Esta interacción aún está en progreso.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ fontSize: 14, color: C.gray400, fontFamily: "'Georgia', serif" }}>Sin interacciones registradas para este alumno.</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Placeholder tabs */}
      {activeTab !== 'contenido' && activeTab !== 'resultados' && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: C.gray400 }}>
          <span style={{ fontSize: 48 }}>🚧</span>
          <p style={{ margin: 0, fontSize: 15, fontFamily: "'Georgia', serif", fontWeight: 700, color: C.gray600 }}>Próximamente</p>
          <p style={{ margin: 0, fontSize: 13, fontFamily: "'Georgia', serif" }}>Esta sección estará disponible en futuras versiones.</p>
        </div>
      )}
    </div>
  );
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
const RAMO_COLORS = [C.navy, C.red, C.gold];

interface RamoReal { id: number; codigo: string; nombre: string; profesor_correo: string | null; num_alumnos: number; }

const Dashboard: React.FC<{
  setView: (v: ViewType) => void;
  setSelectedRamo: (id: number) => void;
  onSimular: (ramoId: number, c: 'Teo' | 'Jojo') => void;
  userName?: string;
}> = ({ setView, setSelectedRamo, onSimular, userName }) => {
  const { token } = useAuth();
  const [ramos, setRamos] = useState<RamoReal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRamos = async () => {
      try {
        const apiUrl = ((import.meta as any).env?.VITE_API_URL) || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/ramos/mios`, {
          headers: authHeaders(token),
        });
        if (res.ok) setRamos(await res.json());
      } catch (e) {
        console.error('[Dashboard] Error cargando ramos:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchRamos();
  }, [token]);

  const totalStudents = ramos.reduce((s, r) => s + r.num_alumnos, 0);

  return (
    <div style={{ flex: 1, background: C.gray50 }}>
      <PageHeader title="Panel del docente" subtitle="Plataforma de simulación pedagógica USS" userName={userName} />

      <div style={{ padding: 32 }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 20, marginBottom: 32 }}>
          {[
            { label: 'Total Alumnos', value: totalStudents, icon: '👥', accent: C.navy },
            { label: 'Ramos asignados', value: ramos.length, icon: '📚', accent: C.gold },
          ].map(s => (
            <div key={s.label} style={{
              background: C.white, borderRadius: 14, padding: '22px 24px',
              boxShadow: '0 2px 12px rgba(26,39,68,0.07)',
              borderTop: `4px solid ${s.accent}`,
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{ fontSize: 32 }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.accent, fontFamily: "'Georgia', serif", lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, color: C.gray400, marginTop: 4 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Ramos */}
        <div style={{ fontSize: 13, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 16, fontFamily: "'Georgia', serif" }}>
          Mis Ramos
        </div>
        {loading && <div style={{ color: C.gray400, fontSize: 13 }}>Cargando ramos…</div>}
        {!loading && ramos.length === 0 && (
          <div style={{ color: C.gray400, fontSize: 13 }}>Aún no tienes ramos asignados. Pídele al administrador que te asigne uno.</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {ramos.map((ramo, idx) => {
            const color = RAMO_COLORS[idx % RAMO_COLORS.length];
            return (
              <div key={ramo.id} style={{
                background: C.white, borderRadius: 14, padding: '20px 24px',
                boxShadow: '0 2px 12px rgba(26,39,68,0.06)',
                display: 'flex', alignItems: 'center', gap: 20,
                borderLeft: `5px solid ${color}`,
              }}>
                {/* Info */}
                <div style={{
                  width: 54, height: 54, borderRadius: 12,
                  background: `${color}15`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color, fontFamily: "'Georgia', serif", textAlign: 'center' }}>{ramo.codigo}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.navyDark, fontFamily: "'Georgia', serif" }}>{ramo.nombre}</div>
                  {/* Chatbots — Teo y Jojo siempre disponibles para probar */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    {([{ name: 'Teo' as const, emoji: '🧒' }, { name: 'Jojo' as const, emoji: '👧' }]).map(bot => (
                      <button key={bot.name}
                        onClick={() => onSimular(ramo.id, bot.name)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '5px 12px', borderRadius: 20, border: `1px solid ${color}40`,
                          background: `${color}10`, color,
                          fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          fontFamily: "'Georgia', serif", transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${color}25`; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${color}10`; }}
                      >
                        <span>{bot.emoji}</span> Simular con {bot.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: "'Georgia', serif" }}>{ramo.num_alumnos}</div>
                  <div style={{ fontSize: 11, color: C.gray400 }}>alumnos</div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => { setSelectedRamo(ramo.id); setView('students'); }}
                    style={{
                      padding: '8px 16px', borderRadius: 8, border: `1px solid ${C.gray200}`,
                      background: C.white, color: C.navy, cursor: 'pointer',
                      fontSize: 12, fontWeight: 700, fontFamily: "'Georgia', serif",
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = C.gray100; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = C.white; }}
                  >
                    👥 Alumnos
                  </button>
                  <button
                    onClick={() => { setSelectedRamo(ramo.id); setView('ramo'); }}
                    style={{
                      padding: '8px 16px', borderRadius: 8, border: 'none',
                      background: C.navy, color: C.white, cursor: 'pointer',
                      fontSize: 12, fontWeight: 700, fontFamily: "'Georgia', serif",
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = C.navyLight; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = C.navy; }}
                  >
                    Ver ramo →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ── Students View ─────────────────────────────────────────────────────────────
interface AlumnoRow { id: number; correo: string; activo: boolean; }

const StudentsView: React.FC<{
  ramos: RamoReal[];
  selectedRamo: number | null;
  setSelectedRamo: (id: number | null) => void;
}> = ({ ramos, selectedRamo, setSelectedRamo }) => {
  const { token } = useAuth();
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState<AlumnoRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const apiUrl = ((import.meta as any).env?.VITE_API_URL) || 'http://localhost:8000';
        const headers = authHeaders(token);
        const ramoIds = selectedRamo !== null ? [selectedRamo] : ramos.map(r => r.id);
        const results = await Promise.all(
          ramoIds.map(id => fetch(`${apiUrl}/ramos/${id}/alumnos`, { headers }).then(r => r.ok ? r.json() : []))
        );
        const merged = new Map<number, AlumnoRow>();
        results.flat().forEach((a: AlumnoRow) => merged.set(a.id, a));
        setStudents(Array.from(merged.values()));
      } catch (e) {
        console.error('[StudentsView] Error cargando alumnos:', e);
      } finally {
        setLoading(false);
      }
    };
    if (ramos.length > 0) fetchStudents();
  }, [selectedRamo, ramos, token]);

  const filtered = students.filter(s => s.correo.toLowerCase().includes(search.toLowerCase()));

  const currentRamo = ramos.find(r => r.id === selectedRamo);
  const displayName = (correo: string) => {
    const prefix = correo.split('@')[0];
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  };

  return (
    <div style={{ flex: 1, background: C.gray50 }}>
      <PageHeader title="Mis Alumnos" subtitle={currentRamo?.nombre ?? 'Todos los ramos'} />

      <div style={{ padding: 32 }}>
        {/* Filtro por ramo */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
          <button onClick={() => setSelectedRamo(null)}
            style={{
              padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
              fontWeight: 600, fontFamily: "'Georgia', serif", transition: 'all 0.15s',
              border: `2px solid ${!selectedRamo ? C.navy : C.gray200}`,
              background: !selectedRamo ? C.navy : C.white,
              color: !selectedRamo ? C.white : C.gray600,
            }}>Todos</button>
          {ramos.map((r, idx) => {
            const color = RAMO_COLORS[idx % RAMO_COLORS.length];
            return (
              <button key={r.id} onClick={() => setSelectedRamo(r.id)}
                style={{
                  padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                  fontWeight: 600, fontFamily: "'Georgia', serif", transition: 'all 0.15s',
                  border: `2px solid ${selectedRamo === r.id ? color : C.gray200}`,
                  background: selectedRamo === r.id ? color : C.white,
                  color: selectedRamo === r.id ? C.white : C.gray600,
                }}>{r.codigo}</button>
            );
          })}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 20, maxWidth: 360 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: C.gray400 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por correo..."
            style={{
              width: '100%', padding: '11px 16px 11px 42px',
              borderRadius: 10, border: `1px solid ${C.gray200}`,
              fontSize: 13, fontFamily: "'Georgia', serif", outline: 'none',
              background: C.white, color: C.navyDark, boxSizing: 'border-box',
            }} />
        </div>

        {/* Table */}
        <div style={{ background: C.white, borderRadius: 14, boxShadow: '0 2px 12px rgba(26,39,68,0.06)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: C.navyDark }}>
                {['#', 'Alumno', 'Correo institucional', 'Estado'].map(h => (
                  <th key={h} style={{ padding: '13px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 1.1, fontFamily: "'Georgia', serif" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr key={s.id}
                  style={{ borderBottom: `1px solid ${C.gray100}`, background: i % 2 === 0 ? C.white : C.gray50, transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = C.gray100}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? C.white : C.gray50}
                >
                  <td style={{ padding: '13px 18px', fontSize: 13, color: C.gray400, width: 40 }}>{i + 1}</td>
                  <td style={{ padding: '13px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: `linear-gradient(135deg, ${C.navy}, ${C.red})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: C.white, flexShrink: 0,
                      }}>{displayName(s.correo)[0]}</div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.navyDark, fontFamily: "'Georgia', serif" }}>{displayName(s.correo)}</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 18px', fontSize: 13, color: C.gray600 }}>{s.correo}</td>
                  <td style={{ padding: '13px 18px' }}>
                    <span style={{
                      display: 'inline-block', padding: '3px 12px', borderRadius: 20,
                      fontSize: 11, fontWeight: 700,
                      background: s.activo ? '#dcfce7' : '#fee2e2',
                      color: s.activo ? '#16a34a' : '#dc2626',
                    }}>{s.activo ? 'Activo' : 'Inactivo'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: C.gray400, fontFamily: "'Georgia', serif" }}>
              No se encontraron alumnos
            </div>
          )}
          {loading && (
            <div style={{ padding: 40, textAlign: 'center', color: C.gray400, fontFamily: "'Georgia', serif" }}>
              Cargando…
            </div>
          )}
          <div style={{ padding: '12px 18px', borderTop: `1px solid ${C.gray100}`, fontSize: 12, color: C.gray400 }}>
            {filtered.length} alumno{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main ──────────────────────────────────────────────────────────────────────
const InterfaceTeacher: React.FC = () => {
  const { user, token, logout } = useAuth();
  const [view, setView] = useState<ViewType>('dashboard');
  const [selectedRamo, setSelectedRamo] = useState<number | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<'Teo' | 'Jojo' | null>(null);
  const [selectedEntregaId, setSelectedEntregaId] = useState<number | undefined>(undefined);
  const [ramos, setRamos] = useState<RamoReal[]>([]);

  useEffect(() => {
    const fetchRamos = async () => {
      try {
        const apiUrl = ((import.meta as any).env?.VITE_API_URL) || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/ramos/mios`, {
          headers: authHeaders(token),
        });
        if (res.ok) setRamos(await res.json());
      } catch (e) {
        console.error('[InterfaceTeacher] Error cargando ramos:', e);
      }
    };
    fetchRamos();
  }, [token]);

  // Crea (o reutiliza) una entrega de prueba trazada para este ramo antes de
  // abrir el chat — así el costo y la voz quedan enlazados a la sesión en
  // vez de perderse en el /chat legacy sin traza.
  const iniciarChatPrueba = async (ramoId: number, character: 'Teo' | 'Jojo') => {
    try {
      const apiUrl = ((import.meta as any).env?.VITE_API_URL) || 'http://localhost:8000';
      const res = await fetch(`${apiUrl}/ramos/${ramoId}/chat-prueba`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
        body: JSON.stringify({ agente: character }),
      });
      if (!res.ok) throw new Error(`chat-prueba respondió ${res.status}`);
      const data = await res.json();
      setSelectedEntregaId(data.entrega_id);
      setSelectedCharacter(character);
    } catch (e) {
      console.error('[iniciarChatPrueba]', e);
      alert('No se pudo iniciar la sesión de prueba. Intenta de nuevo.');
    }
  };

  if (selectedCharacter) {
    return (
      <ChatInterface
        character={selectedCharacter}
        entregaId={selectedEntregaId}
        onBack={() => { setSelectedCharacter(null); setSelectedEntregaId(undefined); }}
      />
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui', background: C.gray50 }}>
      <Sidebar view={view} setView={setView} user={user} onLogout={logout} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {view === 'dashboard' && (
          <Dashboard
            setView={setView}
            setSelectedRamo={setSelectedRamo}
            onSimular={iniciarChatPrueba}
            userName={user ? `${user.name} ${user.lastName}` : undefined}
          />
        )}
        {view === 'students' && (
          <StudentsView ramos={ramos} selectedRamo={selectedRamo} setSelectedRamo={setSelectedRamo} />
        )}
        {view === 'ramo' && selectedRamo && (
          <RamoView
            ramoId={selectedRamo}
            onBack={() => setView('dashboard')}
            onStartSimulation={(c) => iniciarChatPrueba(selectedRamo, c)}
            user={user}
          />
        )}
      </div>
    </div>
  );
};

export default InterfaceTeacher;
