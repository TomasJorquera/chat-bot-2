import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ChatInterface from '../Chat/ChatInterface';

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

// ── Mock data ─────────────────────────────────────────────────────────────────
const mockRamos = [
  {
    id: 1, code: 'EDU-301', name: 'Educación Diferencial',
    schedule: 'Lun / Mié 10:00–11:30', room: 'Aula B-204',
    color: C.navy, students: 24, sessions: 18, reports: 9,
    chatbots: [
      { name: 'Teo' as const,  emoji: '🧒', diagnosis: 'DEA · F81.0' },
      { name: 'Jojo' as const, emoji: '👧', diagnosis: 'DIL' },
    ],
  },
  {
    id: 2, code: 'PSP-201', name: 'Psicopedagogía Básica',
    schedule: 'Mar / Jue 14:00–15:30', room: 'Lab C-101',
    color: C.red, students: 18, sessions: 11, reports: 5,
    chatbots: [
      { name: 'Teo' as const, emoji: '🧒', diagnosis: 'DEA · F81.0' },
    ],
  },
  {
    id: 3, code: 'INT-401', name: 'Intervención Temprana',
    schedule: 'Vie 08:00–11:00', room: 'Aula A-110',
    color: C.gold, students: 20, sessions: 14, reports: 7,
    chatbots: [
      { name: 'Teo' as const,  emoji: '🧒', diagnosis: 'DEA · F81.0' },
      { name: 'Jojo' as const, emoji: '👧', diagnosis: 'DIL' },
    ],
  },
];

const mockStudents: Record<number, { id: number; rut: string; name: string; email: string; status: string }[]> = {
  1: [
    { id: 1,  rut: '21.345.678-9', name: 'Sofía Álvarez Rojas',      email: 's.alvarez@correo.uss.cl',    status: 'Activo' },
    { id: 2,  rut: '20.987.654-3', name: 'Matías Contreras Vega',    email: 'm.contreras@correo.uss.cl',  status: 'Activo' },
    { id: 3,  rut: '21.111.222-3', name: 'Valentina Fuentes Lagos',  email: 'v.fuentes@correo.uss.cl',    status: 'Activo' },
    { id: 4,  rut: '20.555.444-K', name: 'Benjamín Herrera Mora',    email: 'b.herrera@correo.uss.cl',    status: 'Inactivo' },
    { id: 5,  rut: '21.777.888-5', name: 'Isidora Jiménez Parra',    email: 'i.jimenez@correo.uss.cl',    status: 'Activo' },
    { id: 6,  rut: '20.333.111-7', name: 'Nicolás Lara Cid',         email: 'n.lara@correo.uss.cl',       status: 'Activo' },
  ],
  2: [
    { id: 7,  rut: '20.100.200-1', name: 'Camila Ortega Soto',       email: 'c.ortega@correo.uss.cl',     status: 'Activo' },
    { id: 8,  rut: '21.400.500-6', name: 'Felipe Pereira Castro',    email: 'f.pereira@correo.uss.cl',    status: 'Activo' },
    { id: 9,  rut: '20.600.700-4', name: 'Renata Quiroz Ibáñez',     email: 'r.quiroz@correo.uss.cl',     status: 'Activo' },
    { id: 10, rut: '21.800.900-0', name: 'Tomás Reyes Bravo',        email: 't.reyes@correo.uss.cl',      status: 'Inactivo' },
  ],
  3: [
    { id: 11, rut: '21.010.203-K', name: 'Javiera Salinas Muñoz',    email: 'j.salinas@correo.uss.cl',    status: 'Activo' },
    { id: 12, rut: '20.304.506-7', name: 'Ignacio Torres Acuña',     email: 'i.torres@correo.uss.cl',     status: 'Activo' },
    { id: 13, rut: '21.607.809-3', name: 'Daniela Urrutia Flores',   email: 'd.urrutia@correo.uss.cl',    status: 'Activo' },
  ],
};

type ViewType = 'dashboard' | 'students' | 'chat' | 'ramo';
type RamoTab = 'contenido' | 'anuncios' | 'calificaciones' | 'participantes' | 'mensajes';

const mockModules: Record<number, {
  id: number; title: string; pinned?: boolean; items: {
    id: number; type: 'simulacion' | 'tarea' | 'recurso' | 'anuncio';
    title: string; description: string; status?: string; dueDate?: string;
    character?: 'Teo' | 'Jojo'; completions?: number; total?: number;
  }[]
}[]> = {
  1: [
    {
      id: 1, title: 'Información General', pinned: true,
      items: [
        { id: 1, type: 'recurso', title: 'Programa del curso', description: 'Objetivos, metodología y evaluaciones del semestre.', status: 'Publicado' },
        { id: 2, type: 'anuncio', title: 'Bienvenida al ramo', description: 'Estimados estudiantes: bienvenidos a Educación Diferencial semestre 2025-1.', status: 'Publicado' },
      ],
    },
    {
      id: 2, title: 'Simulaciones con IA',
      items: [
        { id: 3, type: 'simulacion', title: 'Simulación con Teo', description: 'Practica estrategias pedagógicas con Teo, estudiante con DEA (F81.0).', character: 'Teo', completions: 14, total: 24, status: 'Activo' },
        { id: 4, type: 'simulacion', title: 'Simulación con Jojo', description: 'Interactúa con Jojo, estudiante con Discapacidad Intelectual Leve.', character: 'Jojo', completions: 9, total: 24, status: 'Activo' },
      ],
    },
    {
      id: 3, title: 'Tareas y Evaluaciones',
      items: [
        { id: 5, type: 'tarea', title: 'Informe reflexivo N°1', description: 'Redacta un informe reflexivo sobre tu experiencia de simulación con Teo.', dueDate: '2025-04-14', status: 'Pendiente' },
        { id: 6, type: 'tarea', title: 'Portfolio pedagógico', description: 'Compila tus evaluaciones y estrategias aplicadas durante el semestre.', dueDate: '2025-06-30', status: 'Pendiente' },
      ],
    },
    {
      id: 4, title: 'Recursos y Material de Apoyo',
      items: [
        { id: 7, type: 'recurso', title: 'Manual DSM-5: Trastornos del aprendizaje', description: 'Criterios diagnósticos y orientaciones pedagógicas.', status: 'Publicado' },
        { id: 8, type: 'recurso', title: 'Guía de adaptaciones curriculares', description: 'Estrategias diferenciadas para el aula inclusiva.', status: 'Publicado' },
      ],
    },
  ],
  2: [
    {
      id: 1, title: 'Información General', pinned: true,
      items: [
        { id: 1, type: 'recurso', title: 'Programa del curso', description: 'Objetivos, metodología y evaluaciones del semestre.', status: 'Publicado' },
      ],
    },
    {
      id: 2, title: 'Simulaciones con IA',
      items: [
        { id: 2, type: 'simulacion', title: 'Simulación con Teo', description: 'Practica estrategias pedagógicas con Teo, estudiante con DEA (F81.0).', character: 'Teo', completions: 7, total: 18, status: 'Activo' },
      ],
    },
    {
      id: 3, title: 'Tareas y Evaluaciones',
      items: [
        { id: 3, type: 'tarea', title: 'Diagnóstico psicopedagógico', description: 'Elabora un diagnóstico a partir de los datos entregados en clases.', dueDate: '2025-04-21', status: 'Pendiente' },
      ],
    },
  ],
  3: [
    {
      id: 1, title: 'Información General', pinned: true,
      items: [
        { id: 1, type: 'recurso', title: 'Programa del curso', description: 'Objetivos, metodología y evaluaciones del semestre.', status: 'Publicado' },
      ],
    },
    {
      id: 2, title: 'Simulaciones con IA',
      items: [
        { id: 2, type: 'simulacion', title: 'Simulación con Teo', description: 'Practica estrategias pedagógicas con Teo, estudiante con DEA (F81.0).', character: 'Teo', completions: 11, total: 20, status: 'Activo' },
        { id: 3, type: 'simulacion', title: 'Simulación con Jojo', description: 'Interactúa con Jojo, estudiante con Discapacidad Intelectual Leve.', character: 'Jojo', completions: 6, total: 20, status: 'Activo' },
      ],
    },
    {
      id: 3, title: 'Tareas y Evaluaciones',
      items: [
        { id: 4, type: 'tarea', title: 'Plan de intervención temprana', description: 'Diseña un plan de intervención para un caso asignado.', dueDate: '2025-05-05', status: 'Pendiente' },
      ],
    },
  ],
};

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

const RamoView: React.FC<{
  ramoId: number;
  onBack: () => void;
  onStartSimulation: (c: 'Teo' | 'Jojo') => void;
  user: any;
}> = ({ ramoId, onBack, onStartSimulation, user }) => {
  const [activeTab, setActiveTab] = useState<RamoTab>('contenido');
  const ramo = mockRamos.find(r => r.id === ramoId)!;
  const [modules, setModules] = useState(() =>
    JSON.parse(JSON.stringify(mockModules[ramoId] ?? []))
  );
  const [modal, setModal] = useState<ModalState>({ open: false, moduleId: null });
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<{ moduleId: number; itemId: number } | null>(null);

  const tabs: { id: RamoTab; label: string }[] = [
    { id: 'contenido',      label: 'Contenido' },
    { id: 'anuncios',       label: 'Anuncios' },
    { id: 'calificaciones', label: 'Calificaciones' },
    { id: 'participantes',  label: 'Participantes' },
    { id: 'mensajes',       label: 'Mensajes' },
  ];

  const allItems = modules.flatMap((m: any) => m.items);
  const totalSims   = allItems.filter((i: any) => i.type === 'simulacion').length;
  const totalTareas = allItems.filter((i: any) => i.type === 'tarea').length;

  // ── CRUD helpers ──────────────────────────────────────────────────────────
  const openCreate = (moduleId: number) => {
    setForm(emptyForm);
    setModal({ open: true, moduleId, editItemId: undefined });
  };
  const openEdit = (moduleId: number, item: any) => {
    setForm({ type: item.type, title: item.title, description: item.description, dueDate: item.dueDate ?? '' });
    setModal({ open: true, moduleId, editItemId: item.id });
  };
  const closeModal = () => setModal({ open: false, moduleId: null });

  const saveItem = () => {
    if (!form.title.trim()) return;
    setModules((prev: any[]) => prev.map((mod: any) => {
      if (mod.id !== modal.moduleId) return mod;
      if (modal.editItemId !== undefined) {
        // edit
        return { ...mod, items: mod.items.map((it: any) => it.id === modal.editItemId
          ? { ...it, ...form, dueDate: form.dueDate || undefined }
          : it
        )};
      } else {
        // create
        const newItem = {
          id: Date.now(), type: form.type, title: form.title,
          description: form.description, status: 'Pendiente de publicación',
          dueDate: form.dueDate || undefined,
        };
        return { ...mod, items: [...mod.items, newItem] };
      }
    }));
    closeModal();
  };

  const deleteItem = (moduleId: number, itemId: number) => {
    setModules((prev: any[]) => prev.map((mod: any) =>
      mod.id === moduleId ? { ...mod, items: mod.items.filter((it: any) => it.id !== itemId) } : mod
    ));
    setDeleteConfirm(null);
  };

  const toggleStatus = (moduleId: number, itemId: number) => {
    setModules((prev: any[]) => prev.map((mod: any) =>
      mod.id === moduleId ? {
        ...mod, items: mod.items.map((it: any) => {
          if (it.id !== itemId || it.type === 'simulacion') return it;
          const next = it.status === 'Publicado' ? 'Borrador' : 'Publicado';
          return { ...it, status: next };
        })
      } : mod
    ));
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
              {/* File upload placeholder for recurso */}
              {form.type === 'recurso' && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 6 }}>Archivo adjunto</label>
                  <div style={{
                    border: `2px dashed ${C.gray200}`, borderRadius: 10, padding: '20px',
                    textAlign: 'center', cursor: 'pointer', color: C.gray400,
                    fontFamily: "'Georgia', serif", fontSize: 13,
                  }}>
                    <div style={{ fontSize: 28, marginBottom: 6 }}>📎</div>
                    Haz clic para subir un archivo (PDF, DOC, PPT...)
                    <div style={{ fontSize: 11, marginTop: 4, color: C.gray200 }}>Máx. 50 MB</div>
                  </div>
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
            ].map(({ icon, text }) => (
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
                  <button onClick={() => openCreate(mod.id)}
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

      {/* Placeholder tabs */}
      {activeTab !== 'contenido' && (
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
const Dashboard: React.FC<{
  setView: (v: ViewType) => void;
  setSelectedRamo: (id: number) => void;
  setSelectedCharacter: (c: 'Teo' | 'Jojo') => void;
  userName?: string;
}> = ({ setView, setSelectedRamo, setSelectedCharacter, userName }) => {
  const totalStudents = mockRamos.reduce((s, r) => s + r.students, 0);
  const totalSessions = mockRamos.reduce((s, r) => s + r.sessions, 0);
  const totalReports  = mockRamos.reduce((s, r) => s + r.reports,  0);

  return (
    <div style={{ flex: 1, background: C.gray50 }}>
      <PageHeader title="Panel del docente" subtitle="Plataforma de simulación pedagógica USS" userName={userName} />

      <div style={{ padding: 32 }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 20, marginBottom: 32 }}>
          {[
            { label: 'Total Alumnos',       value: totalStudents, icon: '👥', accent: C.navy },
            { label: 'Sesiones realizadas', value: totalSessions, icon: '💬', accent: C.red  },
            { label: 'Reportes generados',  value: totalReports,  icon: '📄', accent: C.gold },
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mockRamos.map(ramo => (
            <div key={ramo.id} style={{
              background: C.white, borderRadius: 14, padding: '20px 24px',
              boxShadow: '0 2px 12px rgba(26,39,68,0.06)',
              display: 'flex', alignItems: 'center', gap: 20,
              borderLeft: `5px solid ${ramo.color}`,
            }}>
              {/* Info */}
              <div style={{
                width: 54, height: 54, borderRadius: 12,
                background: `${ramo.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: ramo.color, fontFamily: "'Georgia', serif", textAlign: 'center' }}>{ramo.code}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.navyDark, fontFamily: "'Georgia', serif" }}>{ramo.name}</div>
                <div style={{ fontSize: 12, color: C.gray400, marginTop: 4 }}>{ramo.schedule} · {ramo.room}</div>
                {/* Chatbots */}
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  {ramo.chatbots.map(bot => (
                    <button key={bot.name}
                      onClick={() => { setSelectedCharacter(bot.name); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '5px 12px', borderRadius: 20, border: `1px solid ${ramo.color}40`,
                        background: `${ramo.color}10`, color: ramo.color,
                        fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        fontFamily: "'Georgia', serif", transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${ramo.color}25`; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${ramo.color}10`; }}
                    >
                      <span>{bot.emoji}</span> Simular con {bot.name}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: ramo.color, fontFamily: "'Georgia', serif" }}>{ramo.students}</div>
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
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Students View ─────────────────────────────────────────────────────────────
const StudentsView: React.FC<{
  selectedRamo: number | null;
  setSelectedRamo: (id: number | null) => void;
}> = ({ selectedRamo, setSelectedRamo }) => {
  const [search, setSearch] = useState('');

  const allStudents = selectedRamo
    ? mockStudents[selectedRamo] ?? []
    : Object.values(mockStudents).flat();

  const filtered = allStudents.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.rut.includes(search)
  );

  const currentRamo = mockRamos.find(r => r.id === selectedRamo);

  return (
    <div style={{ flex: 1, background: C.gray50 }}>
      <PageHeader title="Mis Alumnos" subtitle={currentRamo?.name ?? 'Todos los ramos'} />

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
          {mockRamos.map(r => (
            <button key={r.id} onClick={() => setSelectedRamo(r.id)}
              style={{
                padding: '8px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
                fontWeight: 600, fontFamily: "'Georgia', serif", transition: 'all 0.15s',
                border: `2px solid ${selectedRamo === r.id ? r.color : C.gray200}`,
                background: selectedRamo === r.id ? r.color : C.white,
                color: selectedRamo === r.id ? C.white : C.gray600,
              }}>{r.code}</button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 20, maxWidth: 360 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: C.gray400 }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre o RUT..."
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
                {['#', 'Nombre', 'RUT', 'Correo institucional', 'Estado'].map(h => (
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
                      }}>{s.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.navyDark, fontFamily: "'Georgia', serif" }}>{s.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '13px 18px', fontSize: 13, color: C.gray600 }}>{s.rut}</td>
                  <td style={{ padding: '13px 18px', fontSize: 13, color: C.gray600 }}>{s.email}</td>
                  <td style={{ padding: '13px 18px' }}>
                    <span style={{
                      display: 'inline-block', padding: '3px 12px', borderRadius: 20,
                      fontSize: 11, fontWeight: 700,
                      background: s.status === 'Activo' ? '#dcfce7' : '#fee2e2',
                      color: s.status === 'Activo' ? '#16a34a' : '#dc2626',
                    }}>{s.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: C.gray400, fontFamily: "'Georgia', serif" }}>
              No se encontraron alumnos
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
  const { user, logout } = useAuth();
  const [view, setView] = useState<ViewType>('dashboard');
  const [selectedRamo, setSelectedRamo] = useState<number | null>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<'Teo' | 'Jojo' | null>(null);

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
        {view === 'dashboard' && (
          <Dashboard
            setView={setView}
            setSelectedRamo={setSelectedRamo}
            setSelectedCharacter={setSelectedCharacter}
            userName={user ? `${user.name} ${user.lastName}` : undefined}
          />
        )}
        {view === 'students' && (
          <StudentsView selectedRamo={selectedRamo} setSelectedRamo={setSelectedRamo} />
        )}
        {view === 'ramo' && selectedRamo && (
          <RamoView
            ramoId={selectedRamo}
            onBack={() => setView('dashboard')}
            onStartSimulation={(c) => setSelectedCharacter(c)}
            user={user}
          />
        )}
      </div>
    </div>
  );
};

export default InterfaceTeacher;
