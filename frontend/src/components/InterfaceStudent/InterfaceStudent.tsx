import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import ChatInterface from '../Chat/ChatInterface';

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

type ViewType = 'my-courses' | 'schedule';

// ── Sidebar ───────────────────────────────────────────────────────────────────
const Sidebar: React.FC<{
  view: ViewType;
  setView: (v: ViewType) => void;
  user: any;
  onLogout: () => void;
}> = ({ view, setView, user, onLogout }) => {
  const nav = [
    { id: 'my-courses' as ViewType, label: 'Mis Ramos', icon: '📚' },
    { id: 'schedule'   as ViewType, label: 'Horario',   icon: '📅' },
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
    {/* Welcome banner */}
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
          <img
            src="/LogoUniversidadSanSebastian.jpg"
            alt="USS"
            style={{ height: 36, width: 'auto', objectFit: 'contain', display: 'block' }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = 'none'; }}
          />
        </div>
      </div>
    )}
    {/* Sub-header */}
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

// ── My Courses View ───────────────────────────────────────────────────────────
const MyCoursesView: React.FC<{
  user: any;
  onStartChat: (c: 'Teo' | 'Jojo') => void;
}> = ({ user, onStartChat }) => {
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
              {/* Top bar */}
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

                {/* Chatbots */}
                <div style={{ fontSize: 11, fontWeight: 700, color: C.gray400, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                  Practicar con:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {ramo.chatbots.map(bot => (
                    <button key={bot.name} onClick={() => onStartChat(bot.name)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px', borderRadius: 10,
                        border: `1px solid ${ramo.color}30`,
                        background: `${ramo.color}08`, cursor: 'pointer',
                        transition: 'all 0.15s', textAlign: 'left',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${ramo.color}18`; (e.currentTarget as HTMLButtonElement).style.transform = 'translateX(3px)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = `${ramo.color}08`; (e.currentTarget as HTMLButtonElement).style.transform = 'translateX(0)'; }}
                    >
                      <span style={{ fontSize: 22 }}>{bot.emoji}</span>
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
  const [view, setView] = useState<ViewType>('my-courses');
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
        {view === 'my-courses' && (
          <MyCoursesView user={user} onStartChat={setSelectedCharacter} />
        )}
        {view === 'schedule' && <ScheduleView />}
      </div>
    </div>
  );
};

export default InterfaceStudent;
