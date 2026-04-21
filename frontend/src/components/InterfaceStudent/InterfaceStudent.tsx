import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ChatInterface from '../Chat/ChatInterface';
import SimulacionFlow, { SimulacionData } from '../SimulacionFlow/SimulacionFlow';

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

// ── Mock data ─────────────────────────────────────────────────────────────────
const mockRamos = [
  {
    id: 1, code: 'EDU-301', name: 'Educación Diferencial',
    professor: 'Dra. Carmen Soto', schedule: 'Lun / Mié 10:00–11:30',
    room: 'Aula B-204', credits: 4, status: 'En curso', color: C.navy,
    chatbots: [
      { name: 'Teo' as const,  emoji: '🧒', diagnosis: 'DEA · F81.0', age: 9 },
      { name: 'Jojo' as const, emoji: '👧', diagnosis: 'DIL',         age: 15 },
    ],
  },
  {
    id: 2, code: 'PSP-201', name: 'Psicopedagogía Básica',
    professor: 'Dr. Roberto Vidal', schedule: 'Mar / Jue 14:00–15:30',
    room: 'Lab C-101', credits: 5, status: 'En curso', color: C.red,
    chatbots: [
      { name: 'Teo' as const, emoji: '🧒', diagnosis: 'DEA · F81.0', age: 9 },
    ],
  },
  {
    id: 3, code: 'INT-401', name: 'Intervención Temprana',
    professor: 'Mg. Patricia Sáez', schedule: 'Vie 08:00–11:00',
    room: 'Aula A-110', credits: 3, status: 'En curso', color: C.gold,
    chatbots: [
      { name: 'Teo' as const,  emoji: '🧒', diagnosis: 'DEA · F81.0', age: 9 },
      { name: 'Jojo' as const, emoji: '👧', diagnosis: 'DIL',         age: 15 },
    ],
  },
];

type StudentItemStatus = 'pendiente' | 'completado' | 'entregado' | 'visto';

const mockStudentModules: Record<number, {
  id: number; title: string; pinned?: boolean; items: {
    id: number; type: 'simulacion' | 'tarea' | 'recurso' | 'anuncio';
    title: string; description: string; dueDate?: string;
    character?: 'Teo' | 'Jojo'; myStatus: StudentItemStatus;
    grade?: number;
  }[]
}[]> = {
  1: [
    {
      id: 1, title: 'Información General', pinned: true,
      items: [
        { id: 1, type: 'recurso',  title: 'Programa del curso',  description: 'Objetivos, metodología y evaluaciones del semestre.', myStatus: 'visto' },
        { id: 2, type: 'anuncio',  title: 'Bienvenida al ramo',  description: 'Estimadas/os estudiantes: bienvenidos a Educación Diferencial semestre 2025-1. En este ramo desarrollarán competencias pedagógicas clave a través de simulaciones con IA.', myStatus: 'visto' },
      ],
    },
    {
      id: 2, title: 'Simulaciones con IA',
      items: [
        { id: 3, type: 'simulacion', title: 'Simulación con Teo',  description: 'Practica estrategias pedagógicas con Teo, un estudiante de 9 años con DEA (F81.0).', character: 'Teo',  myStatus: 'completado' },
        { id: 4, type: 'simulacion', title: 'Simulación con Jojo', description: 'Interactúa con Jojo, estudiante de 15 años con Discapacidad Intelectual Leve.', character: 'Jojo', myStatus: 'pendiente' },
      ],
    },
    {
      id: 3, title: 'Tareas y Evaluaciones',
      items: [
        { id: 5, type: 'tarea', title: 'Informe reflexivo N°1', description: 'Redacta un informe reflexivo de mínimo 2 páginas sobre tu experiencia de simulación con Teo. Incluye estrategias utilizadas y reflexión crítica.', dueDate: '2025-04-14', myStatus: 'pendiente' },
        { id: 6, type: 'tarea', title: 'Portfolio pedagógico', description: 'Compila tus evaluaciones y estrategias aplicadas durante el semestre en un portfolio digital.', dueDate: '2025-06-30', myStatus: 'pendiente' },
      ],
    },
    {
      id: 4, title: 'Recursos y Material de Apoyo',
      items: [
        { id: 7, type: 'recurso', title: 'Manual DSM-5: Trastornos del aprendizaje', description: 'Criterios diagnósticos y orientaciones pedagógicas para el trabajo con NEE.', myStatus: 'visto' },
        { id: 8, type: 'recurso', title: 'Guía de adaptaciones curriculares',         description: 'Estrategias diferenciadas para el aula inclusiva. Material de apoyo para las simulaciones.', myStatus: 'pendiente' },
      ],
    },
  ],
  2: [
    {
      id: 1, title: 'Información General', pinned: true,
      items: [
        { id: 1, type: 'recurso', title: 'Programa del curso', description: 'Objetivos, metodología y evaluaciones del semestre.', myStatus: 'visto' },
        { id: 2, type: 'anuncio', title: 'Evaluación parcial', description: 'La evaluación parcial se realizará el día martes 22 de abril. Temario: módulos 1 y 2.', myStatus: 'pendiente' },
      ],
    },
    {
      id: 2, title: 'Simulaciones con IA',
      items: [
        { id: 3, type: 'simulacion', title: 'Simulación con Teo', description: 'Practica estrategias pedagógicas con Teo, un estudiante con DEA (F81.0).', character: 'Teo', myStatus: 'pendiente' },
      ],
    },
    {
      id: 3, title: 'Tareas y Evaluaciones',
      items: [
        { id: 4, type: 'tarea', title: 'Diagnóstico psicopedagógico', description: 'Elabora un diagnóstico a partir de los datos entregados en clases. Extensión: mínimo 3 páginas.', dueDate: '2025-04-21', myStatus: 'entregado', grade: 5.8 },
      ],
    },
  ],
  3: [
    {
      id: 1, title: 'Información General', pinned: true,
      items: [
        { id: 1, type: 'recurso', title: 'Programa del curso', description: 'Objetivos, metodología y evaluaciones del semestre.', myStatus: 'visto' },
      ],
    },
    {
      id: 2, title: 'Simulaciones con IA',
      items: [
        { id: 2, type: 'simulacion', title: 'Simulación con Teo',  description: 'Practica estrategias pedagógicas con Teo.', character: 'Teo',  myStatus: 'completado' },
        { id: 3, type: 'simulacion', title: 'Simulación con Jojo', description: 'Interactúa con Jojo, estudiante con Discapacidad Intelectual Leve.', character: 'Jojo', myStatus: 'pendiente' },
      ],
    },
    {
      id: 3, title: 'Tareas y Evaluaciones',
      items: [
        { id: 4, type: 'tarea', title: 'Plan de intervención temprana', description: 'Diseña un plan de intervención para el caso asignado. Considera diagnóstico, objetivos, metodología y evaluación.', dueDate: '2025-05-05', myStatus: 'pendiente' },
      ],
    },
  ],
};

type ViewType = 'my-courses' | 'schedule' | 'ramo';
type RamoTab = 'contenido' | 'anuncios' | 'calificaciones' | 'mensajes';

const typeConfig = {
  simulacion: { icon: '🤖', label: 'Simulación', bg: '#ede9fe', color: '#7c3aed', border: '#c4b5fd' },
  tarea:      { icon: '📝', label: 'Tarea',       bg: '#fef3c7', color: '#b45309', border: '#fcd34d' },
  recurso:    { icon: '📄', label: 'Recurso',     bg: '#dbeafe', color: '#1d4ed8', border: '#93c5fd' },
  anuncio:    { icon: '📢', label: 'Anuncio',     bg: '#dcfce7', color: '#15803d', border: '#86efac' },
};

// ── Sidebar ───────────────────────────────────────────────────────────────────
const Sidebar: React.FC<{
  view: ViewType;
  setView: (v: ViewType) => void;
  user: any;
  onLogout: () => void;
}> = ({ view, setView, user, onLogout }) => {
  const nav = [
    { id: 'my-courses' as ViewType, label: 'Mis Ramos', icon: '📚', activeFor: ['my-courses', 'ramo'] },
    { id: 'schedule'   as ViewType, label: 'Horario',   icon: '📅', activeFor: ['schedule'] },
  ];
  const initials = (user?.name?.[0] ?? '') + (user?.lastName?.[0] ?? '');

  return (
    <div style={{
      width: 240, minHeight: '100vh', background: C.navyDark,
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      boxShadow: '4px 0 20px rgba(0,0,0,0.25)',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/LogoUniversidadSanSebastian.jpg" alt="USS" style={{ height: 40, width: 'auto', objectFit: 'contain' }} />
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
            <div style={{ fontSize: 10, color: C.gray400 }}>Estudiante</div>
          </div>
        </div>
        <button onClick={onLogout}
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.12)',
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

// ── Page Header ───────────────────────────────────────────────────────────────
const PageHeader: React.FC<{ title: string; subtitle?: string; userName?: string }> = ({ title, subtitle, userName }) => (
  <div style={{ background: C.white, borderBottom: `1px solid ${C.gray200}` }}>
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
    <div style={{ padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.navyDark, fontFamily: "'Georgia', serif" }}>{title}</h1>
        {subtitle && <p style={{ margin: '2px 0 0', fontSize: 12, color: C.gray400 }}>{subtitle}</p>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, color: C.gray400, fontFamily: "'Georgia', serif" }}>Semestre 2025-1</span>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 0 3px rgba(34,197,94,0.2)' }} />
      </div>
    </div>
  </div>
);

const API = ((import.meta as any).env?.VITE_API_URL) || 'http://localhost:8000';

// ── Student Ramo View ─────────────────────────────────────────────────────────
const StudentRamoView: React.FC<{
  ramoId: number;
  onBack: () => void;
  onStartChat: (c: 'Teo' | 'Jojo') => void;
  onStartSimulacion: (sim: SimulacionData) => void;
}> = ({ ramoId, onBack, onStartChat, onStartSimulacion }) => {
  const [activeTab, setActiveTab] = useState<RamoTab>('contenido');
  const ramo = mockRamos.find(r => r.id === ramoId)!;
  const [realSimulaciones, setRealSimulaciones] = useState<SimulacionData[]>([]);

  // Fetch real simulations (with full details) from backend for this ramo
  useEffect(() => {
    fetch(`${API}/simulacion/ramo/${ramo.code}`)
      .then(r => r.json())
      .then(async (list: any[]) => {
        const full = await Promise.all(
          list.map(s => fetch(`${API}/simulacion/${s.id}`).then(r => r.json()))
        );
        setRealSimulaciones(full.map(s => ({
          id: s.id,
          title: s.nombre,
          instrucciones: s.instrucciones ?? '',
          objetivos: s.objetivos ?? '',
          agente: s.agente as 'Teo' | 'Jojo' | 'Ambos',
          numInteracciones: s.num_interacciones,
          pautaTipo: s.pauta_tipo,
          ramo: { code: ramo.code, name: ramo.name },
        })));
      })
      .catch(() => { /* use mock fallback silently */ });
  }, [ramo.code, ramo.name]);

  // Build modules: replace mock simulacion items with real ones from backend when available
  const baseModules = mockStudentModules[ramoId] ?? [];
  const modules = realSimulaciones.length > 0
    ? baseModules.map(mod => {
        if (!mod.title.includes('Simulaci')) return mod;
        return {
          ...mod,
          items: realSimulaciones.map(sim => ({
            id: sim.id!,
            type: 'simulacion' as const,
            title: sim.title,
            description: `Interactúa con ${sim.agente}. ${sim.numInteracciones} interacción${sim.numInteracciones > 1 ? 'es' : ''} en esta simulación.`,
            character: (sim.agente === 'Ambos' ? 'Teo' : sim.agente) as 'Teo' | 'Jojo',
            myStatus: 'pendiente' as StudentItemStatus,
            dueDate: undefined as string | undefined,
            grade: undefined as number | undefined,
          })),
        };
      })
    : baseModules;

  const allItems = modules.flatMap(m => m.items);
  const completed  = allItems.filter(i => i.myStatus === 'completado' || i.myStatus === 'entregado' || i.myStatus === 'visto').length;
  const pending    = allItems.filter(i => i.myStatus === 'pendiente').length;
  const tasks      = allItems.filter(i => i.type === 'tarea');
  const submitted  = tasks.filter(i => i.myStatus === 'entregado').length;

  const statusBadge = (status: StudentItemStatus) => {
    const map = {
      pendiente:  { bg: '#fef3c7', color: '#b45309', label: 'Pendiente' },
      completado: { bg: '#dcfce7', color: '#15803d', label: 'Completado' },
      entregado:  { bg: '#dbeafe', color: '#1d4ed8', label: 'Entregado'  },
      visto:      { bg: C.gray100, color: C.gray400,  label: 'Visto'      },
    };
    const s = map[status];
    return (
      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color, fontWeight: 700 }}>
        {s.label}
      </span>
    );
  };

  const tabs: { id: RamoTab; label: string }[] = [
    { id: 'contenido',      label: 'Contenido' },
    { id: 'anuncios',       label: 'Anuncios' },
    { id: 'calificaciones', label: 'Calificaciones' },
    { id: 'mensajes',       label: 'Mensajes' },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: C.gray50, minHeight: '100vh' }}>

      {/* ── Hero header ── */}
      <div style={{
        background: `linear-gradient(160deg, ${C.navyDark} 0%, #0f2a5e 60%, #1a3a7a 100%)`,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -60, top: -60, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'absolute', right: 80, top: 20, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

        {/* breadcrumb */}
        <div style={{ padding: '14px 32px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.55)', fontSize: 13, fontFamily: "'Georgia', serif", padding: 0 }}>
            ← Mis Ramos
          </button>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>•</span>
          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontFamily: "'Georgia', serif" }}>{ramo.code}</span>
        </div>

        {/* university */}
        <div style={{ padding: '12px 32px 0', textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: C.white, letterSpacing: 2, fontFamily: "'Georgia', serif", textTransform: 'uppercase' }}>
            Universidad San Sebastián
          </h2>
        </div>

        {/* course */}
        <div style={{ padding: '14px 32px 22px' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontFamily: "'Georgia', serif", letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>{ramo.code}</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.white, fontFamily: "'Georgia', serif" }}>{ramo.name}</h1>
          <div style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { icon: '👨‍🏫', text: ramo.professor },
              { icon: '🕐',   text: ramo.schedule  },
              { icon: '📍',   text: ramo.room       },
              { icon: '📅',   text: 'Semestre 2025-1' },
            ].map(({ icon, text }) => (
              <span key={text} style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontFamily: "'Georgia', serif", display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>{icon}</span>{text}
              </span>
            ))}
          </div>
        </div>

        {/* Tabs */}
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
            {modules.map(mod => (
              <div key={mod.id} style={{ marginBottom: 20, background: C.white, borderRadius: 14, boxShadow: '0 2px 12px rgba(26,39,68,0.06)', overflow: 'hidden' }}>
                {/* Module header */}
                <div style={{
                  padding: '14px 20px',
                  background: mod.pinned ? C.navyDark : C.navy,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {mod.pinned && <span style={{ fontSize: 14 }}>📌</span>}
                    <span style={{ fontSize: 15, fontWeight: 700, color: C.white, fontFamily: "'Georgia', serif" }}>{mod.title}</span>
                  </div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: "'Georgia', serif" }}>
                    {mod.items.length} elemento{mod.items.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Items */}
                {mod.items.map((item, idx) => {
                  const cfg = typeConfig[item.type];
                  return (
                    <div key={item.id} style={{
                      padding: '16px 20px',
                      borderBottom: idx < mod.items.length - 1 ? `1px solid ${C.gray100}` : 'none',
                      display: 'flex', alignItems: 'flex-start', gap: 14,
                      transition: 'background 0.1s',
                    }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = C.gray50}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = C.white}
                    >
                      {/* Type icon */}
                      <div style={{
                        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                        background: cfg.bg, border: `1px solid ${cfg.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                      }}>{cfg.icon}</div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: C.navyDark, fontFamily: "'Georgia', serif" }}>{item.title}</span>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontWeight: 700 }}>{cfg.label}</span>
                          {statusBadge(item.myStatus)}
                          {item.grade !== undefined && (
                            <span style={{ fontSize: 12, fontWeight: 800, color: item.grade >= 4 ? '#15803d' : C.red, background: item.grade >= 4 ? '#dcfce7' : '#fee2e2', padding: '2px 10px', borderRadius: 20 }}>
                              Nota: {item.grade.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: C.gray400, lineHeight: 1.5 }}>{item.description}</p>

                        {item.dueDate && (
                          <div style={{ marginTop: 6, fontSize: 11, color: C.gray400, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span>📅</span> Entrega: {new Date(item.dueDate + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </div>
                        )}
                      </div>

                      {/* Action */}
                      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                        {item.type === 'simulacion' && item.character && (
                          <button onClick={() => {
                            const realSim = realSimulaciones.find(s => s.id === item.id);
                            onStartSimulacion(realSim ?? {
                              title: item.title,
                              instrucciones: item.description,
                              objetivos: '— Aplicar estrategias pedagógicas diferenciadas\n— Identificar barreras de aprendizaje\n— Desarrollar un vínculo pedagógico empático',
                              agente: item.character!,
                              numInteracciones: 2,
                              pautaTipo: 'general',
                              ramo: { code: ramo.code, name: ramo.name },
                            });
                          }}
                            style={{
                              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                              background: item.myStatus === 'completado' ? C.gray200 : cfg.color,
                              color: item.myStatus === 'completado' ? C.gray600 : C.white,
                              fontSize: 12, fontWeight: 700, fontFamily: "'Georgia', serif", transition: 'opacity 0.15s',
                            }}>
                            {item.myStatus === 'completado' ? '✓ Ver de nuevo' : 'Iniciar ▶'}
                          </button>
                        )}
                        {item.type === 'tarea' && item.myStatus !== 'entregado' && (
                          <button style={{
                            padding: '8px 16px', borderRadius: 8,
                            border: `1px solid ${cfg.border}`, cursor: 'pointer',
                            background: cfg.bg, color: cfg.color,
                            fontSize: 12, fontWeight: 700, fontFamily: "'Georgia', serif",
                          }}>
                            Entregar →
                          </button>
                        )}
                        {item.type === 'recurso' && (
                          <button style={{
                            padding: '8px 14px', borderRadius: 8,
                            border: `1px solid ${cfg.border}`, cursor: 'pointer',
                            background: cfg.bg, color: cfg.color,
                            fontSize: 12, fontWeight: 700, fontFamily: "'Georgia', serif",
                          }}>
                            Ver 📄
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Sidebar */}
          <div style={{ width: 268, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Mi progreso */}
            <div style={{ background: C.white, borderRadius: 14, boxShadow: '0 2px 12px rgba(26,39,68,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', background: C.navyDark }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', fontFamily: "'Georgia', serif", textTransform: 'uppercase', letterSpacing: 1 }}>Mi progreso</span>
              </div>
              <div style={{ padding: '16px' }}>
                {/* Progress ring substitute — horizontal bar */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: C.gray600, fontFamily: "'Georgia', serif" }}>Avance general</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.navyDark }}>{allItems.length > 0 ? Math.round((completed / allItems.length) * 100) : 0}%</span>
                  </div>
                  <div style={{ height: 8, background: C.gray100, borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: allItems.length > 0 ? `${(completed / allItems.length) * 100}%` : '0%', background: `linear-gradient(90deg, ${C.navy}, ${C.navyLight})`, borderRadius: 99, transition: 'width 0.5s' }} />
                  </div>
                </div>
                {[
                  { icon: '✅', label: 'Completados', value: completed,        color: '#15803d' },
                  { icon: '⏳', label: 'Pendientes',  value: pending,          color: '#b45309' },
                  { icon: '📝', label: 'Tareas entregadas', value: `${submitted}/${tasks.length}`, color: '#1d4ed8' },
                ].map(d => (
                  <div key={d.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.gray100}` }}>
                    <span style={{ fontSize: 12, color: C.gray600, display: 'flex', alignItems: 'center', gap: 6 }}><span>{d.icon}</span>{d.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: d.color, fontFamily: "'Georgia', serif" }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Docente */}
            <div style={{ background: C.white, borderRadius: 14, boxShadow: '0 2px 12px rgba(26,39,68,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', background: C.navyDark }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', fontFamily: "'Georgia', serif", textTransform: 'uppercase', letterSpacing: 1 }}>Docente del curso</span>
              </div>
              <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${C.navy}, ${C.gold})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 15, fontWeight: 700, color: C.white, flexShrink: 0,
                }}>
                  {ramo.professor.split(' ').map(w => w[0]).slice(0, 2).join('')}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.navyDark, fontFamily: "'Georgia', serif" }}>{ramo.professor}</div>
                  <div style={{ fontSize: 11, color: C.gold, marginTop: 2, fontWeight: 700 }}>USS DOCENTE</div>
                </div>
              </div>
            </div>

            {/* Info del ramo */}
            <div style={{ background: C.white, borderRadius: 14, boxShadow: '0 2px 12px rgba(26,39,68,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', background: C.navyDark }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', fontFamily: "'Georgia', serif", textTransform: 'uppercase', letterSpacing: 1 }}>Detalles</span>
              </div>
              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { icon: '📅', label: 'Horario',   value: ramo.schedule },
                  { icon: '📍', label: 'Sala',      value: ramo.room     },
                  { icon: '🏅', label: 'Créditos',  value: `${ramo.credits} SCT` },
                ].map(d => (
                  <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{d.icon}</span>
                    <div>
                      <div style={{ fontSize: 10, color: C.gray400, textTransform: 'uppercase', letterSpacing: 0.8 }}>{d.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.navyDark, fontFamily: "'Georgia', serif" }}>{d.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Acciones rápidas */}
            <div style={{ background: C.white, borderRadius: 14, boxShadow: '0 2px 12px rgba(26,39,68,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', background: C.navyDark }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.7)', fontFamily: "'Georgia', serif", textTransform: 'uppercase', letterSpacing: 1 }}>Practicar simulaciones</span>
              </div>
              <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ramo.chatbots.map(bot => (
                  <button key={bot.name} onClick={() => onStartChat(bot.name)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      border: `1px solid ${ramo.color}30`, background: `${ramo.color}08`,
                      color: ramo.color, cursor: 'pointer', fontSize: 13, fontWeight: 700,
                      fontFamily: "'Georgia', serif", display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = `${ramo.color}18`}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = `${ramo.color}08`}
                  >
                    <span style={{ fontSize: 18 }}>{bot.emoji}</span>
                    <div style={{ textAlign: 'left' }}>
                      <div>{bot.name} · {bot.age} años</div>
                      <div style={{ fontSize: 10, fontWeight: 400, color: C.gray400 }}>{bot.diagnosis}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Calificaciones tab */}
      {activeTab === 'calificaciones' && (
        <div style={{ padding: '28px 32px', flex: 1 }}>
          <div style={{ background: C.white, borderRadius: 14, boxShadow: '0 2px 12px rgba(26,39,68,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', background: C.navyDark }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: C.white, fontFamily: "'Georgia', serif" }}>Libro de calificaciones</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.gray50 }}>
                  {['Evaluación', 'Tipo', 'Fecha entrega', 'Estado', 'Nota'].map(h => (
                    <th key={h} style={{ padding: '12px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modules.flatMap(m => m.items).filter(i => i.type === 'tarea').map((item) => (
                  <tr key={item.id} style={{ borderBottom: `1px solid ${C.gray100}` }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = C.gray50}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = C.white}
                  >
                    <td style={{ padding: '14px 18px', fontSize: 14, fontWeight: 600, color: C.navyDark, fontFamily: "'Georgia', serif" }}>{item.title}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: typeConfig.tarea.bg, color: typeConfig.tarea.color, fontWeight: 700 }}>Tarea</span>
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: 13, color: C.gray400 }}>
                      {item.dueDate ? new Date(item.dueDate + 'T12:00:00').toLocaleDateString('es-CL') : '—'}
                    </td>
                    <td style={{ padding: '14px 18px' }}>
                      {item.myStatus === 'entregado'
                        ? <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#dbeafe', color: '#1d4ed8', fontWeight: 700 }}>Entregado</span>
                        : <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#fef3c7', color: '#b45309', fontWeight: 700 }}>Pendiente</span>
                      }
                    </td>
                    <td style={{ padding: '14px 18px', fontSize: 18, fontWeight: 800, fontFamily: "'Georgia', serif", color: item.grade ? (item.grade >= 4 ? '#15803d' : C.red) : C.gray200 }}>
                      {item.grade ? item.grade.toFixed(1) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {modules.flatMap(m => m.items).filter(i => i.type === 'tarea').length === 0 && (
              <div style={{ padding: 40, textAlign: 'center', color: C.gray400, fontFamily: "'Georgia', serif" }}>No hay evaluaciones registradas</div>
            )}
          </div>
        </div>
      )}

      {/* Placeholder tabs */}
      {(activeTab === 'anuncios' || activeTab === 'mensajes') && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: C.gray400 }}>
          <span style={{ fontSize: 48 }}>🚧</span>
          <p style={{ margin: 0, fontSize: 15, fontFamily: "'Georgia', serif", fontWeight: 700, color: C.gray600 }}>Próximamente</p>
          <p style={{ margin: 0, fontSize: 13, fontFamily: "'Georgia', serif" }}>Esta sección estará disponible en futuras versiones.</p>
        </div>
      )}
    </div>
  );
};

// ── My Courses View ───────────────────────────────────────────────────────────
const MyCoursesView: React.FC<{
  user: any;
  onStartChat: (c: 'Teo' | 'Jojo') => void;
  onOpenRamo: (id: number) => void;
}> = ({ user, onStartChat, onOpenRamo }) => {
  const totalCredits = mockRamos.reduce((s, r) => s + r.credits, 0);

  return (
    <div style={{ flex: 1, background: C.gray50 }}>
      <PageHeader
        title="Mis Ramos"
        subtitle="Plataforma de simulación pedagógica USS"
        userName={`${user?.name ?? ''} ${user?.lastName ?? ''}`.trim()}
      />

      <div style={{ padding: 32 }}>
        {/* Student card */}
        <div style={{
          background: `linear-gradient(135deg, ${C.navyDark} 0%, ${C.navyLight} 100%)`,
          borderRadius: 16, padding: '24px 28px', marginBottom: 28,
          display: 'flex', alignItems: 'center', gap: 20,
          boxShadow: '0 8px 24px rgba(26,39,68,0.18)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -20, top: -20, width: 120, height: 120, borderRadius: '50%', background: 'rgba(192,57,43,0.15)' }} />
          <div style={{ position: 'absolute', right: 40, bottom: -30, width: 80, height: 80, borderRadius: '50%', background: 'rgba(201,168,76,0.1)' }} />
          <div style={{
            width: 58, height: 58, borderRadius: '50%', flexShrink: 0,
            background: `linear-gradient(135deg, ${C.red}, ${C.gold})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 800, color: C.white,
          }}>
            {(user?.name?.[0] ?? '') + (user?.lastName?.[0] ?? '')}
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.white, fontFamily: "'Georgia', serif" }}>
              {user?.name} {user?.lastName}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>{user?.email}</div>
            <div style={{ fontSize: 12, color: C.gold, marginTop: 6, fontWeight: 600 }}>Educación · 5° Semestre</div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: C.white, fontFamily: "'Georgia', serif" }}>{totalCredits}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>créditos totales</div>
          </div>
        </div>

        {/* Label */}
        <div style={{ fontSize: 13, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 16, fontFamily: "'Georgia', serif" }}>
          Ramos inscritos · Semestre 2025-1
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
          {mockRamos.map(ramo => (
            <div key={ramo.id} style={{
              background: C.white, borderRadius: 16,
              boxShadow: '0 2px 12px rgba(26,39,68,0.06)', overflow: 'hidden',
            }}>
              <div style={{ height: 6, background: ramo.color }} />
              <div style={{ padding: '18px 22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{
                    fontSize: 11, fontWeight: 800, color: ramo.color,
                    background: `${ramo.color}15`, padding: '3px 10px',
                    borderRadius: 6, fontFamily: "'Georgia', serif",
                  }}>{ramo.code}</div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#dcfce7', color: '#16a34a' }}>
                    {ramo.status}
                  </span>
                </div>

                <div style={{ fontSize: 16, fontWeight: 800, color: C.navyDark, fontFamily: "'Georgia', serif", marginBottom: 8, lineHeight: 1.2 }}>
                  {ramo.name}
                </div>
                <div style={{ fontSize: 12, color: C.gray400, marginBottom: 4 }}>👨‍🏫 {ramo.professor}</div>
                <div style={{ fontSize: 12, color: C.gray400, marginBottom: 4 }}>🕐 {ramo.schedule}</div>
                <div style={{ fontSize: 12, color: C.gray400, marginBottom: 14 }}>📍 {ramo.room}</div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: `1px solid ${C.gray100}`, marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: C.gray400 }}>Créditos</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: ramo.color, fontFamily: "'Georgia', serif" }}>{ramo.credits} SCT</div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button onClick={() => onOpenRamo(ramo.id)}
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      border: 'none', background: ramo.color, color: C.white,
                      cursor: 'pointer', fontSize: 13, fontWeight: 700,
                      fontFamily: "'Georgia', serif", transition: 'opacity 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.85'}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
                  >
                    Ingresar al ramo →
                  </button>

                  <div style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 }}>
                    Acceso rápido:
                  </div>
                  {ramo.chatbots.map(bot => (
                    <button key={bot.name} onClick={() => onStartChat(bot.name)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '9px 14px', borderRadius: 10,
                        border: `1px solid ${ramo.color}30`,
                        background: `${ramo.color}08`, cursor: 'pointer',
                        transition: 'all 0.15s', textAlign: 'left',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${ramo.color}18`; (e.currentTarget as HTMLButtonElement).style.transform = 'translateX(3px)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${ramo.color}08`; (e.currentTarget as HTMLButtonElement).style.transform = 'translateX(0)'; }}
                    >
                      <span style={{ fontSize: 20 }}>{bot.emoji}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.navyDark, fontFamily: "'Georgia', serif" }}>
                          {bot.name} · {bot.age} años
                        </div>
                        <div style={{ fontSize: 11, color: C.gray400 }}>{bot.diagnosis}</div>
                      </div>
                      <span style={{ marginLeft: 'auto', fontSize: 16, color: C.gray200 }}>›</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Schedule placeholder ──────────────────────────────────────────────────────
const ScheduleView: React.FC = () => (
  <div style={{ flex: 1, background: C.gray50 }}>
    <PageHeader title="Horario" subtitle="Vista semanal de clases" />
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 73px)', color: C.gray400, fontFamily: "'Georgia', serif", fontSize: 16 }}>
      📅 Vista de Horario — próximamente
    </div>
  </div>
);

// ── Main ──────────────────────────────────────────────────────────────────────
const InterfaceStudent: React.FC = () => {
  const { user, logout } = useAuth();
  const [view, setView]                     = useState<ViewType>('my-courses');
  const [selectedRamo, setSelectedRamo]     = useState<number | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<'Teo' | 'Jojo' | null>(null);
  const [activeSimulacion, setActiveSimulacion]   = useState<SimulacionData | null>(null);

  // Flujo de simulación — pantalla completa (overlay)
  if (activeSimulacion) {
    return (
      <SimulacionFlow
        simulacion={activeSimulacion}
        onClose={() => setActiveSimulacion(null)}
        userEmail={user?.email ?? undefined}
      />
    );
  }

  // Chat libre (acceso rápido desde dashboard)
  if (selectedCharacter) {
    return (
      <ChatInterface
        character={selectedCharacter}
        onBack={() => setSelectedCharacter(null)}
      />
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui', background: C.gray50 }}>
      <Sidebar view={view} setView={setView} user={user} onLogout={logout} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {view === 'my-courses' && (
          <MyCoursesView
            user={user}
            onStartChat={setSelectedCharacter}
            onOpenRamo={(id) => { setSelectedRamo(id); setView('ramo'); }}
          />
        )}
        {view === 'schedule' && <ScheduleView />}
        {view === 'ramo' && selectedRamo && (
          <StudentRamoView
            ramoId={selectedRamo}
            onBack={() => setView('my-courses')}
            onStartChat={setSelectedCharacter}
            onStartSimulacion={setActiveSimulacion}
          />
        )}
      </div>
    </div>
  );
};

export default InterfaceStudent;
