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

type ViewType = 'dashboard' | 'students' | 'chat';

// ── Sidebar ───────────────────────────────────────────────────────────────────
const Sidebar: React.FC<{
  view: ViewType;
  setView: (v: ViewType) => void;
  user: any;
  onLogout: () => void;
}> = ({ view, setView, user, onLogout }) => {
  const nav = [
    { id: 'dashboard' as ViewType, label: 'Dashboard',   icon: '⊞' },
    { id: 'students'  as ViewType, label: 'Mis Alumnos', icon: '👥' },
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
        {nav.map(item => (
          <button key={item.id} onClick={() => setView(item.id)}
            style={{
              width: '100%', textAlign: 'left', padding: '11px 14px',
              borderRadius: 8, border: 'none', cursor: 'pointer',
              background: view === item.id ? 'rgba(192,57,43,0.18)' : 'transparent',
              color: view === item.id ? C.white : C.gray400,
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 14, fontFamily: "'Georgia', serif",
              fontWeight: view === item.id ? 700 : 400,
              marginBottom: 4, transition: 'all 0.15s',
              borderLeft: view === item.id ? `3px solid ${C.red}` : '3px solid transparent',
            }}>
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
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
const PageHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
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
);

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard: React.FC<{
  setView: (v: ViewType) => void;
  setSelectedRamo: (id: number) => void;
  setSelectedCharacter: (c: 'Teo' | 'Jojo') => void;
}> = ({ setView, setSelectedRamo, setSelectedCharacter }) => {
  const totalStudents = mockRamos.reduce((s, r) => s + r.students, 0);
  const totalSessions = mockRamos.reduce((s, r) => s + r.sessions, 0);
  const totalReports  = mockRamos.reduce((s, r) => s + r.reports,  0);

  return (
    <div style={{ flex: 1, background: C.gray50 }}>
      <PageHeader title="Panel del docente" subtitle="Plataforma de simulación pedagógica USS" />

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
              <button
                onClick={() => { setSelectedRamo(ramo.id); setView('students'); }}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: `1px solid ${C.gray200}`,
                  background: C.white, color: C.navy, cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, fontFamily: "'Georgia', serif",
                  transition: 'all 0.15s', flexShrink: 0,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = C.navy; (e.currentTarget as HTMLButtonElement).style.color = C.white; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = C.white; (e.currentTarget as HTMLButtonElement).style.color = C.navy; }}
              >
                Ver alumnos
              </button>
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
          />
        )}
        {view === 'students' && (
          <StudentsView selectedRamo={selectedRamo} setSelectedRamo={setSelectedRamo} />
        )}
      </div>
    </div>
  );
};

export default InterfaceTeacher;
