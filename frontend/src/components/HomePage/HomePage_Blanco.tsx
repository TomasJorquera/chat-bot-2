import React, { useState, useEffect, useRef } from 'react';
import {
  LogIn, ChevronRight,
  ShieldCheck, BarChart2, FileText, Brain, Sparkles, ArrowDown
} from 'lucide-react';
import AuthModal from '../Auth/AuthModal';

/* ── tiny hook: detect when an element enters the viewport ── */
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

const FadeUp: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({
  children, delay = 0, className = ''
}) => {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
};

/* ── Design tokens ── */
const C = {
  indigo:     '#4f46e5',
  indigoLight:'#818cf8',
  indigoBg:   '#eef2ff',
  cyan:       '#06b6d4',
  cyanLight:  '#67e8f9',
  cyanBg:     '#ecfeff',
  slate900:   '#0f172a',
  slate700:   '#334155',
  slate500:   '#64748b',
  slate200:   '#e2e8f0',
  slate100:   '#f1f5f9',
  slate50:    '#f8fafc',
  white:      '#ffffff',
};

const HomePageBlanco: React.FC = () => {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const openLogin    = () => { setAuthMode('login');    setShowAuth(true); };

  return (
    <div style={{ minHeight: '100vh', background: C.white, color: C.slate900, overflowX: 'hidden', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ══════════════════════════════
          NAVBAR
      ══════════════════════════════ */}
      <header
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
          transition: 'all 0.4s ease',
          background: scrolled ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0)',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? `1px solid ${C.slate200}` : 'none',
          boxShadow: scrolled ? '0 1px 20px rgba(0,0,0,0.06)' : 'none',
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 32px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: `linear-gradient(135deg, ${C.indigo}, ${C.cyan})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 4px 14px rgba(79,70,229,0.35)`,
            }}>
              <Brain style={{ width: 20, height: 20, color: C.white }} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, color: C.slate900, letterSpacing: '-0.3px' }}>
              Chat-<span style={{ color: C.indigo }}>BOT</span>
            </span>
          </div>

          {/* Nav pills */}
          <nav style={{ display: 'flex', gap: 4 }} className="hidden-mobile">
            {[
              { href: '#objetivo',      label: '¿Qué es?' },
              { href: '#personajes',    label: 'Personajes' },
              { href: '#como-funciona', label: '¿Cómo funciona?' },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                style={{
                  padding: '7px 18px', borderRadius: 99,
                  fontSize: 14, fontWeight: 600,
                  color: C.slate700, textDecoration: 'none',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLAnchorElement).style.background = C.indigoBg;
                  (e.currentTarget as HTMLAnchorElement).style.color = C.indigo;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLAnchorElement).style.background = 'transparent';
                  (e.currentTarget as HTMLAnchorElement).style.color = C.slate700;
                }}
              >
                {label}
              </a>
            ))}
          </nav>

          {/* CTA */}
          <button
            onClick={openLogin}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 22px', borderRadius: 10,
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              background: `linear-gradient(135deg, ${C.indigo}, #6366f1)`,
              color: C.white, border: 'none',
              boxShadow: `0 4px 16px rgba(79,70,229,0.3)`,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 6px 20px rgba(79,70,229,0.4)`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 4px 16px rgba(79,70,229,0.3)`; }}
          >
            <LogIn style={{ width: 15, height: 15 }} />
            Iniciar sesión
          </button>
        </div>
      </header>

      {/* ══════════════════════════════
          HERO
      ══════════════════════════════ */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 24px 80px', textAlign: 'center', overflow: 'hidden' }}>

        {/* Background gradient blobs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', width: 700, height: 700, top: '-15%', left: '-18%', background: `radial-gradient(circle, rgba(79,70,229,0.12) 0%, transparent 65%)`, filter: 'blur(40px)' }} />
          <div style={{ position: 'absolute', width: 600, height: 600, top: '10%', right: '-15%', background: `radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 65%)`, filter: 'blur(40px)' }} />
          <div style={{ position: 'absolute', width: 500, height: 500, bottom: '0%', left: '25%', background: `radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 65%)`, filter: 'blur(60px)' }} />
          {/* Subtle dot grid */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `radial-gradient(${C.slate200} 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
            opacity: 0.7,
          }} />
        </div>

        {/* Floating character cards */}
        <div style={{ position: 'absolute', top: '28%', left: '5%', background: C.white, borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.10)', border: `1px solid ${C.slate200}` }} className="hidden-mobile">
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg, #818cf8, ${C.cyan})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🧒</div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.slate900, margin: 0 }}>Teo</p>
            <p style={{ fontSize: 12, color: C.slate500, margin: 0 }}>9 años · DEA F81.0</p>
          </div>
        </div>

        <div style={{ position: 'absolute', top: '33%', right: '4%', background: C.white, borderRadius: 16, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.10)', border: `1px solid ${C.slate200}` }} className="hidden-mobile">
          <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg, #f472b6, #fb7185)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>👧</div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.slate900, margin: 0 }}>Jojo</p>
            <p style={{ fontSize: 12, color: C.slate500, margin: 0 }}>15 años · DIL</p>
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: '22%', left: '6%', background: C.white, borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 6px 24px rgba(0,0,0,0.08)', border: `1px solid ${C.slate200}` }} className="hidden-mobile">
          <BarChart2 style={{ width: 16, height: 16, color: '#10b981' }} />
          <p style={{ fontSize: 12, fontWeight: 600, color: C.slate700, margin: 0 }}>11 criterios evaluados ✓</p>
        </div>

        <div style={{ position: 'absolute', bottom: '25%', right: '5%', background: C.white, borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 6px 24px rgba(0,0,0,0.08)', border: `1px solid ${C.slate200}` }} className="hidden-mobile">
          <FileText style={{ width: 16, height: 16, color: C.indigo }} />
          <p style={{ fontSize: 12, fontWeight: 600, color: C.slate700, margin: 0 }}>Informe PDF listo</p>
        </div>

        {/* Hero content */}
        <div style={{ position: 'relative', zIndex: 10, maxWidth: 780, margin: '0 auto' }}>

          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: C.indigoBg, border: `1px solid rgba(79,70,229,0.25)`,
            borderRadius: 99, padding: '7px 18px', marginBottom: 36,
            fontSize: 13, fontWeight: 600, color: C.indigo,
          }}>
            <Sparkles style={{ width: 14, height: 14 }} />
            Powered by Google Gemini AI
          </div>

          <h1 style={{ fontSize: 'clamp(2.4rem, 6vw, 4.2rem)', fontWeight: 900, lineHeight: 1.08, letterSpacing: '-1.5px', color: C.slate900, marginBottom: 24 }}>
            Aprende a enseñar<br />
            <span style={{ background: `linear-gradient(135deg, ${C.indigo}, ${C.cyan})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              sin riesgo real.
            </span>
          </h1>

          <p style={{ fontSize: 18, color: C.slate500, maxWidth: 580, margin: '0 auto 40px', lineHeight: 1.7 }}>
            Simula conversaciones pedagógicas con estudiantes de IA que presentan necesidades educativas especiales reales.
            Practica, recibe retroalimentación y mejora antes de llegar al aula.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 56 }}>
            <button
              onClick={openLogin}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '14px 36px', borderRadius: 14,
                fontSize: 16, fontWeight: 700, cursor: 'pointer',
                background: `linear-gradient(135deg, ${C.indigo}, #6366f1)`,
                color: C.white, border: 'none',
                boxShadow: `0 8px 24px rgba(79,70,229,0.35)`,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 12px 28px rgba(79,70,229,0.45)`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 8px 24px rgba(79,70,229,0.35)`; }}
            >
              <LogIn style={{ width: 18, height: 18 }} />
              Ya tengo cuenta
            </button>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 460, margin: '0 auto' }}>
            {[
              { n: '2', label: 'Perfiles diagnósticos' },
              { n: '11', label: 'Criterios pedagógicos' },
              { n: '∞', label: 'Simulaciones disponibles' },
            ].map((s) => (
              <div key={s.label} style={{ background: C.white, border: `1px solid ${C.slate200}`, borderRadius: 14, padding: '18px 8px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
                <p style={{ fontSize: 28, fontWeight: 900, margin: '0 0 4px', background: `linear-gradient(135deg, ${C.indigo}, ${C.cyan})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.n}</p>
                <p style={{ fontSize: 11, color: C.slate500, margin: 0, fontWeight: 500 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <a href="#objetivo" style={{ position: 'absolute', bottom: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, color: C.slate500, textDecoration: 'none', fontSize: 12, fontWeight: 500, transition: 'color 0.2s' }}>
          Descubre más
          <ArrowDown style={{ width: 16, height: 16 }} />
        </a>
      </section>

      {/* ══════════════════════════════
          ¿QUÉ ES?
      ══════════════════════════════ */}
      <section id="objetivo" style={{ padding: '80px 24px', background: C.slate50, position: 'relative', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <FadeUp className="text-center" style={{ textAlign: 'center', marginBottom: 52 }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.indigo }}>¿Qué es Chat-BOT?</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, color: C.slate900, margin: '16px 0 16px', letterSpacing: '-0.5px' }}>
              Formación docente del siglo XXI
            </h2>
            <p style={{ color: C.slate500, fontSize: 17, maxWidth: 560, margin: '0 auto', lineHeight: 1.65 }}>
              Una plataforma de simulación donde los futuros profesores pueden cometer errores, aprender y mejorar
              sin afectar a estudiantes reales con necesidades educativas especiales.
            </p>
          </FadeUp>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
            {[
              {
                delay: 0,
                emoji: '🛡️',
                iconBg: 'linear-gradient(135deg, #10b981, #34d399)',
                glow: 'rgba(16,185,129,0.12)',
                border: 'rgba(16,185,129,0.2)',
                title: 'Entorno 100% seguro',
                desc: 'Practica estrategias pedagógicas sin consecuencias reales para estudiantes vulnerables. El error aquí es aprendizaje, no daño.',
              },
              {
                delay: 0.1,
                emoji: '🧠',
                iconBg: `linear-gradient(135deg, ${C.indigo}, #818cf8)`,
                glow: `rgba(79,70,229,0.1)`,
                border: `rgba(79,70,229,0.18)`,
                title: 'IA con perfil diagnóstico real',
                desc: 'Cada personaje está modelado sobre informes psicopedagógicos reales: reacciona auténticamente a tu tono, metodología y estrategias.',
              },
              {
                delay: 0.2,
                emoji: '📊',
                iconBg: `linear-gradient(135deg, ${C.cyan}, #67e8f9)`,
                glow: `rgba(6,182,212,0.1)`,
                border: `rgba(6,182,212,0.2)`,
                title: 'Evaluación con 11 criterios',
                desc: 'La IA evalúa cada sesión con criterios psicopedagógicos validados: andamiaje, validación emocional, autonomía, inclusión y más.',
              },
              {
                delay: 0.3,
                emoji: '📄',
                iconBg: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                glow: 'rgba(245,158,11,0.1)',
                border: 'rgba(245,158,11,0.2)',
                title: 'Informe PDF automático',
                desc: 'Al finalizar, descarga un reporte completo con la conversación, tabla de criterios y retroalimentación personalizada generada por IA.',
              },
            ].map((f) => (
              <FadeUp key={f.title} delay={f.delay}>
                <div
                  style={{
                    background: C.white,
                    border: `1px solid ${f.border}`,
                    borderRadius: 20,
                    padding: 28,
                    height: '100%',
                    boxSizing: 'border-box',
                    boxShadow: `0 4px 24px ${f.glow}`,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'default',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 36px ${f.glow}`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 24px ${f.glow}`; }}
                >
                  <div style={{ width: 52, height: 52, background: f.iconBg, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 18, boxShadow: `0 4px 12px ${f.glow}` }}>
                    {f.emoji}
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 700, color: C.slate900, margin: '0 0 10px' }}>{f.title}</h3>
                  <p style={{ fontSize: 14, color: C.slate500, lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          PERSONAJES
      ══════════════════════════════ */}
      <section id="personajes" style={{ padding: '80px 24px', background: C.white, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse 80% 50% at 50% 50%, rgba(79,70,229,0.04), transparent)` }} />
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <FadeUp style={{ textAlign: 'center', marginBottom: 52 }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: C.cyan }}>Estudiantes virtuales</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, color: C.slate900, margin: '16px 0 16px', letterSpacing: '-0.5px' }}>
              Conoce a quienes<br />vas a practicar
            </h2>
            <p style={{ color: C.slate500, fontSize: 17, maxWidth: 420, margin: '0 auto', lineHeight: 1.65 }}>
              Dos perfiles diagnósticos distintos. Cada uno responde de forma única según cómo lo trates.
            </p>
          </FadeUp>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
            {/* TEO */}
            <FadeUp delay={0}>
              <div style={{ background: C.white, borderRadius: 24, overflow: 'hidden', border: `1px solid rgba(79,70,229,0.18)`, boxShadow: '0 8px 40px rgba(79,70,229,0.1)', height: '100%' }}>
                <div style={{ height: 4, background: `linear-gradient(90deg, ${C.indigo}, ${C.cyan})` }} />
                <div style={{ padding: 32 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ position: 'relative' }}>
                        <div style={{ width: 72, height: 72, background: `linear-gradient(135deg, ${C.indigo}, ${C.cyan})`, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, boxShadow: `0 8px 20px rgba(79,70,229,0.3)` }}>🧒</div>
                        <div style={{ position: 'absolute', bottom: -3, right: -3, width: 16, height: 16, background: '#22c55e', borderRadius: '50%', border: `2px solid ${C.white}` }} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: 26, fontWeight: 900, color: C.slate900, margin: 0 }}>Teo</h3>
                        <p style={{ fontSize: 13, color: C.slate500, margin: 0 }}>9 años · 3º Básico</p>
                      </div>
                    </div>
                    <span style={{ background: C.indigoBg, color: C.indigo, fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 99, border: `1px solid rgba(79,70,229,0.25)` }}>F81.0</span>
                  </div>

                  <p style={{ fontSize: 14, color: C.slate700, lineHeight: 1.7, marginBottom: 20 }}>
                    Presenta una <strong style={{ color: C.slate900 }}>Dificultad Específica del Aprendizaje</strong> en lectura y escritura. Inteligente pero inseguro: responde brevemente, evade el error y florece con paciencia y refuerzo visual.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                    {[
                      'Lectura silábica y comprensión literal',
                      'Mejora con apoyos visuales y auditivos',
                      'Baja autoestima académica',
                      'Sensible al tono del docente',
                    ].map((t) => (
                      <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.indigo, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: C.slate500 }}>{t}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: C.indigoBg, border: `1px solid rgba(79,70,229,0.18)`, borderRadius: 12, padding: '14px 16px' }}>
                    <p style={{ fontSize: 13, color: C.slate700, fontStyle: 'italic', margin: '0 0 4px' }}>"Leo despacito... ¿me ayudas tú primero?"</p>
                    <p style={{ fontSize: 11, color: C.slate500, margin: 0 }}>— Teo, ante una pregunta de comprensión lectora</p>
                  </div>
                </div>
              </div>
            </FadeUp>

            {/* JOJO */}
            <FadeUp delay={0.15}>
              <div style={{ background: C.white, borderRadius: 24, overflow: 'hidden', border: `1px solid rgba(244,114,182,0.25)`, boxShadow: '0 8px 40px rgba(244,114,182,0.1)', height: '100%' }}>
                <div style={{ height: 4, background: 'linear-gradient(90deg, #ec4899, #fb7185)' }} />
                <div style={{ padding: 32 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ position: 'relative' }}>
                        <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg, #ec4899, #fb7185)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, boxShadow: '0 8px 20px rgba(236,72,153,0.3)' }}>👧</div>
                        <div style={{ position: 'absolute', bottom: -3, right: -3, width: 16, height: 16, background: '#22c55e', borderRadius: '50%', border: `2px solid ${C.white}` }} />
                      </div>
                      <div>
                        <h3 style={{ fontSize: 26, fontWeight: 900, color: C.slate900, margin: 0 }}>Jojo</h3>
                        <p style={{ fontSize: 13, color: C.slate500, margin: 0 }}>15 años · 1º Medio</p>
                      </div>
                    </div>
                    <span style={{ background: '#fdf2f8', color: '#ec4899', fontSize: 11, fontWeight: 700, padding: '5px 12px', borderRadius: 99, border: '1px solid rgba(236,72,153,0.25)' }}>DIL</span>
                  </div>

                  <p style={{ fontSize: 14, color: C.slate700, lineHeight: 1.7, marginBottom: 20 }}>
                    Presenta <strong style={{ color: C.slate900 }}>Discapacidad Intelectual Leve</strong> con enfoque en Transición a la Vida Adulta. Pensamiento concreto y literal: entiende con ejemplos del día a día, se bloquea ante la abstracción.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                    {[
                      'Excelente memoria para lo concreto',
                      'Aprende con ejemplos funcionales reales',
                      'Teme las burlas y la exclusión',
                      'Se motiva con actividades de vida cotidiana',
                    ].map((t) => (
                      <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ec4899', flexShrink: 0 }} />
                        <span style={{ fontSize: 13, color: C.slate500 }}>{t}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: '#fdf2f8', border: '1px solid rgba(236,72,153,0.2)', borderRadius: 12, padding: '14px 16px' }}>
                    <p style={{ fontSize: 13, color: C.slate700, fontStyle: 'italic', margin: '0 0 4px' }}>"¿Para qué sirve eso en la vida real?"</p>
                    <p style={{ fontSize: 11, color: C.slate500, margin: 0 }}>— Jojo, cuando el contexto no es funcional</p>
                  </div>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          CÓMO FUNCIONA
      ══════════════════════════════ */}
      <section id="como-funciona" style={{ padding: '80px 24px', background: C.slate50, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse 70% 60% at 50% 100%, rgba(6,182,212,0.07), transparent)` }} />
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <FadeUp style={{ textAlign: 'center', marginBottom: 52 }}>
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#10b981' }}>¿Cómo funciona?</span>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 900, color: C.slate900, margin: '16px 0 0', letterSpacing: '-0.5px' }}>
              Tres pasos. Una mejor práctica.
            </h2>
          </FadeUp>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              {
                n: '01', delay: 0,
                iconBg: `linear-gradient(135deg, ${C.indigo}, #818cf8)`,
                glow: 'rgba(79,70,229,0.08)',
                border: 'rgba(79,70,229,0.15)',
                title: 'Elige tu personaje',
                desc: 'Selecciona a Teo o Jojo. Revisa su ficha diagnóstica para entender su perfil antes de comenzar la simulación.',
                tag: 'Selección',
              },
              {
                n: '02', delay: 0.1,
                iconBg: `linear-gradient(135deg, ${C.cyan}, #67e8f9)`,
                glow: 'rgba(6,182,212,0.08)',
                border: 'rgba(6,182,212,0.18)',
                title: 'Simula la conversación',
                desc: 'Interactúa en tiempo real. El personaje responde con autenticidad psicopedagógica según tu tono, preguntas y estrategias. Cada decisión importa.',
                tag: 'Simulación',
              },
              {
                n: '03', delay: 0.2,
                iconBg: 'linear-gradient(135deg, #10b981, #34d399)',
                glow: 'rgba(16,185,129,0.08)',
                border: 'rgba(16,185,129,0.18)',
                title: 'Recibe tu evaluación PDF',
                desc: 'Gemini AI analiza tu desempeño en 11 criterios pedagógicos y genera un informe descargable con fortalezas, áreas de mejora y sugerencias concretas.',
                tag: 'Evaluación',
              },
            ].map((s) => (
              <FadeUp key={s.n} delay={s.delay}>
                <div
                  style={{
                    background: C.white,
                    border: `1px solid ${s.border}`,
                    borderRadius: 20,
                    padding: '24px 28px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 24,
                    boxShadow: `0 4px 20px ${s.glow}`,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'default',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateX(4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px ${s.glow}`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateX(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 20px ${s.glow}`; }}
                >
                  <div style={{ flexShrink: 0, width: 58, height: 58, background: s.iconBg, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: C.white, boxShadow: `0 4px 14px ${s.glow}` }}>
                    {s.n}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: C.slate900, margin: 0 }}>{s.title}</h3>
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.slate500, background: C.slate100, padding: '3px 10px', borderRadius: 99, border: `1px solid ${C.slate200}` }}>{s.tag}</span>
                    </div>
                    <p style={{ fontSize: 14, color: C.slate500, lineHeight: 1.65, margin: 0 }}>{s.desc}</p>
                  </div>
                  <ChevronRight style={{ flexShrink: 0, width: 18, height: 18, color: C.slate200 }} />
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          FOOTER
      ══════════════════════════════ */}
      <footer style={{ padding: '36px 24px', borderTop: `1px solid ${C.slate200}`, textAlign: 'center', background: C.white }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: `linear-gradient(135deg, ${C.indigo}, ${C.cyan})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Brain style={{ width: 16, height: 16, color: C.white }} />
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: C.slate900 }}>Chat-BOT</span>
        </div>
        <p style={{ fontSize: 12, color: C.slate500, margin: 0 }}>Plataforma de formación docente con IA · Universidad San Sebastián</p>
      </footer>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} initialMode={authMode} />
    </div>
  );
};

export default HomePageBlanco;
