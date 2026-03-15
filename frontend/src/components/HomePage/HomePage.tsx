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
        transform: visible ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
};

const HomePage: React.FC = () => {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const openLogin    = () => { setAuthMode('login');    setShowAuth(true); };
  const openRegister = () => { setAuthMode('register'); setShowAuth(true); };

  return (
    <div className="min-h-screen bg-[#04091A] text-white overflow-x-hidden font-sans">

      {/* ══════════════════════════════
          NAVBAR
      ══════════════════════════════ */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
        style={{
          background: scrolled
            ? 'rgba(4,9,26,0.90)'
            : 'linear-gradient(to bottom, rgba(4,9,26,0.7), transparent)',
          backdropFilter: scrolled ? 'blur(24px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        }}
      >
        <div className="max-w-7xl mx-auto px-8 flex items-center justify-between" style={{ height: 72 }}>

          {/* ── Logo ── */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            <div className="relative animate-pulse-ring rounded-xl">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                <Brain className="w-5 h-5 text-white" />
              </div>
            </div>
            <span className="text-xl font-extrabold tracking-tight">
              Chat-<span className="text-gradient">BOT</span>
            </span>
          </div>

          {/* ── Nav pill (centro) ── */}
          <nav
            className="hidden md:flex items-center"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 99,
              padding: '6px 8px',
              gap: 4,
            }}
          >
            {[
              { href: '#objetivo',      label: '¿Qué es?' },
              { href: '#personajes',    label: 'Personajes' },
              { href: '#como-funciona', label: '¿Cómo funciona?' },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className="relative px-5 py-2 rounded-full text-sm font-semibold text-slate-300 hover:text-white transition-all duration-200 hover:bg-white/10 group"
              >
                {label}
                {/* dot indicator on hover */}
                <span
                  className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                />
              </a>
            ))}
          </nav>

          {/* ── Acción derecha ── */}
          <div className="flex items-center">
            <button
              onClick={openLogin}
              className="flex items-center space-x-2 font-semibold text-sm text-white px-6 py-2.5 rounded-xl transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(139,92,246,0.25))',
                border: '1px solid rgba(255,255,255,0.15)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'linear-gradient(135deg, rgba(59,130,246,0.45), rgba(139,92,246,0.45))';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.3)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  'linear-gradient(135deg, rgba(59,130,246,0.25), rgba(139,92,246,0.25))';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.15)';
              }}
            >
              <LogIn className="w-4 h-4" />
              <span>Iniciar sesión</span>
            </button>
          </div>

        </div>
      </header>

      {/* ══════════════════════════════
          HERO
      ══════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">

        {/* — Animated background blobs — */}
        <div className="absolute inset-0 pointer-events-none select-none">
          <div
            className="absolute animate-blob"
            style={{ width: 600, height: 600, top: '-10%', left: '-15%',
              background: 'radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)',
              filter: 'blur(60px)' }}
          />
          <div
            className="absolute animate-blob"
            style={{ width: 500, height: 500, top: '20%', right: '-10%', animationDelay: '2s',
              background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)',
              filter: 'blur(60px)' }}
          />
          <div
            className="absolute animate-blob"
            style={{ width: 400, height: 400, bottom: '-5%', left: '30%', animationDelay: '4s',
              background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)',
              filter: 'blur(60px)' }}
          />

          {/* Grid lines */}
          <div style={{
            position:'absolute', inset: 0,
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />

          {/* Floating nodes */}
          {[
            { top:'18%', left:'10%', size:12, delay:'0s', color:'#60a5fa' },
            { top:'28%', left:'88%', size:8,  delay:'1s', color:'#a78bfa' },
            { top:'65%', left:'7%',  size:10, delay:'2s', color:'#34d399' },
            { top:'72%', left:'85%', size:14, delay:'0.5s', color:'#f472b6' },
            { top:'45%', left:'92%', size:6,  delay:'3s', color:'#fbbf24' },
            { top:'12%', left:'55%', size:7,  delay:'1.5s', color:'#60a5fa' },
          ].map((n, i) => (
            <div
              key={i}
              className="absolute animate-float rounded-full"
              style={{
                top: n.top, left: n.left,
                width: n.size, height: n.size,
                background: n.color,
                animationDelay: n.delay,
                boxShadow: `0 0 ${n.size * 2}px ${n.color}`,
              }}
            />
          ))}

          {/* Floating cards (decorative) */}
          <div className="absolute animate-float-slow glass rounded-2xl p-4 hidden lg:flex items-center space-x-3"
            style={{ top:'25%', left:'5%', animationDelay:'1s' }}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center text-xl">🧒</div>
            <div className="text-left">
              <p className="text-xs font-bold text-white">Teo</p>
              <p className="text-xs text-slate-400">9 años · DEA F81.0</p>
            </div>
          </div>

          <div className="absolute animate-float glass rounded-2xl p-4 hidden lg:flex items-center space-x-3"
            style={{ top:'30%', right:'4%', animationDelay:'2.5s' }}>
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-400 rounded-xl flex items-center justify-center text-xl">👧</div>
            <div className="text-left">
              <p className="text-xs font-bold text-white">Jojo</p>
              <p className="text-xs text-slate-400">15 años · DIL</p>
            </div>
          </div>

          <div className="absolute animate-float-slow glass rounded-2xl px-4 py-3 hidden lg:block"
            style={{ bottom:'22%', left:'6%', animationDelay:'0.5s' }}>
            <div className="flex items-center space-x-2">
              <BarChart2 className="w-4 h-4 text-green-400" />
              <p className="text-xs font-semibold text-white">11 criterios evaluados ✓</p>
            </div>
          </div>

          <div className="absolute animate-float glass rounded-2xl px-4 py-3 hidden lg:block"
            style={{ bottom:'25%', right:'5%', animationDelay:'1.8s' }}>
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-violet-400" />
              <p className="text-xs font-semibold text-white">Informe PDF listo</p>
            </div>
          </div>
        </div>

        {/* — Hero content — */}
        <div className="relative z-10 max-w-4xl mx-auto" style={{ animation: 'fade-up 1s ease-out forwards' }}>
          <div className="inline-flex items-center space-x-2 glass rounded-full px-5 py-2 mb-10 text-sm font-medium text-slate-300">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span>Powered by Google Gemini AI</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black leading-none mb-8 tracking-tight">
            Aprende a enseñar<br />
            <span className="text-gradient">sin riesgo real.</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
            Simula conversaciones pedagógicas con estudiantes de IA que presentan necesidades educativas especiales reales.
            Practica, recibe retroalimentación y mejora antes de llegar al aula.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
            <button
              onClick={openLogin}
              className="flex items-center justify-center space-x-2 glass text-white font-semibold px-8 py-4 rounded-2xl text-lg hover:bg-white/10 transition-all"
            >
              <LogIn className="w-5 h-5" />
              <span>Ya tengo cuenta</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto">
            {[
              { n: '2', label: 'Perfiles diagnósticos' },
              { n: '11', label: 'Criterios pedagógicos' },
              { n: '∞', label: 'Simulaciones disponibles' },
            ].map((s) => (
              <div key={s.label} className="glass rounded-xl py-4 px-2 text-center">
                <p className="text-3xl font-black text-gradient">{s.n}</p>
                <p className="text-xs text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll hint */}
        <a href="#objetivo" className="absolute bottom-10 flex flex-col items-center text-slate-500 hover:text-slate-300 transition-colors" style={{ animation: 'float 2s ease-in-out infinite' }}>
          <span className="text-xs mb-1">Descubre más</span>
          <ArrowDown className="w-4 h-4" />
        </a>
      </section>

      {/* ══════════════════════════════
          ¿QUÉ ES?
      ══════════════════════════════ */}
      <section id="objetivo" className="py-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(59,130,246,0.08), transparent)' }} />
        <div className="max-w-6xl mx-auto">
          <FadeUp className="text-center mb-12">
            <span className="text-blue-400 text-sm font-semibold uppercase tracking-widest">¿Qué es Chat-BOT?</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mt-4 mb-6 leading-tight">
              Formación docente del siglo XXI
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Una plataforma de simulación donde los futuros profesores pueden cometer errores, aprender y mejorar
              sin afectar a estudiantes reales con necesidades educativas especiales.
            </p>
          </FadeUp>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                delay: 0,
                icon: <ShieldCheck className="w-7 h-7" />,
                gradient: 'from-green-400 to-emerald-500',
                glow: 'rgba(52,211,153,0.2)',
                title: 'Entorno 100% seguro',
                desc: 'Practica estrategias pedagógicas sin consecuencias reales para estudiantes vulnerables. El error aquí es aprendizaje, no daño.',
              },
              {
                delay: 0.1,
                icon: <Brain className="w-7 h-7" />,
                gradient: 'from-blue-400 to-cyan-400',
                glow: 'rgba(96,165,250,0.2)',
                title: 'IA con perfil diagnóstico real',
                desc: 'Cada personaje está modelado sobre informes psicopedagógicos reales: reacciona auténticamente a tu tono, metodología y estrategias.',
              },
              {
                delay: 0.2,
                icon: <BarChart2 className="w-7 h-7" />,
                gradient: 'from-violet-400 to-purple-500',
                glow: 'rgba(167,139,250,0.2)',
                title: 'Evaluación con 11 criterios',
                desc: 'La IA evalúa cada sesión con criterios psicopedagógicos validados: andamiaje, validación emocional, autonomía, inclusión y más.',
              },
              {
                delay: 0.3,
                icon: <FileText className="w-7 h-7" />,
                gradient: 'from-pink-400 to-rose-500',
                glow: 'rgba(244,114,182,0.2)',
                title: 'Informe PDF automático',
                desc: 'Al finalizar, descarga un reporte completo con la conversación, tabla de criterios y retroalimentación personalizada generada por IA.',
              },
            ].map((f) => (
              <FadeUp key={f.title} delay={f.delay}>
                <div
                  className="card-hover rounded-2xl p-8 h-full"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    boxShadow: `0 0 40px -10px ${f.glow}`,
                  }}
                >
                  <div className={`w-14 h-14 bg-gradient-to-br ${f.gradient} rounded-2xl flex items-center justify-center mb-5 text-white shadow-lg`}>
                    {f.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{f.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          PERSONAJES
      ══════════════════════════════ */}
      <section id="personajes" className="py-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(4,9,26,0) 0%, rgba(14,30,70,0.4) 50%, rgba(4,9,26,0) 100%)' }} />
        <div className="max-w-6xl mx-auto">
          <FadeUp className="text-center mb-12">
            <span className="text-violet-400 text-sm font-semibold uppercase tracking-widest">Estudiantes virtuales</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mt-4 mb-6 leading-tight">
              Conoce a quienes<br />vas a practicar
            </h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">
              Dos perfiles diagnósticos distintos. Cada uno responde de forma única según cómo lo trates.
            </p>
          </FadeUp>

          <div className="grid md:grid-cols-2 gap-8">
            {/* TEO */}
            <FadeUp delay={0}>
              <div
                className="card-hover rounded-3xl overflow-hidden h-full"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(96,165,250,0.2)', boxShadow: '0 0 60px -20px rgba(59,130,246,0.3)' }}
              >
                {/* top strip */}
                <div className="h-1 bg-gradient-to-r from-blue-500 to-cyan-400" />
                <div className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center text-4xl shadow-xl shadow-blue-500/30">
                          🧒
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-[#04091A]" />
                      </div>
                      <div>
                        <h3 className="text-3xl font-black text-white">Teo</h3>
                        <p className="text-slate-400 text-sm">9 años · 3º Básico</p>
                      </div>
                    </div>
                    <span className="bg-blue-500/15 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-full border border-blue-500/30">
                      F81.0
                    </span>
                  </div>

                  <p className="text-slate-300 leading-relaxed mb-6">
                    Presenta una <strong className="text-white">Dificultad Específica del Aprendizaje</strong> en lectura y escritura. Inteligente pero inseguro: responde brevemente, evade el error y florece con paciencia y refuerzo visual.
                  </p>

                  <div className="space-y-2.5">
                    {[
                      { label: 'Lectura silábica y comprensión literal', color: 'bg-blue-400' },
                      { label: 'Mejora con apoyos visuales y auditivos', color: 'bg-cyan-400' },
                      { label: 'Baja autoestima académica', color: 'bg-blue-400' },
                      { label: 'Sensible al tono del docente', color: 'bg-cyan-400' },
                    ].map((t) => (
                      <div key={t.label} className="flex items-center space-x-3">
                        <div className={`w-1.5 h-1.5 rounded-full ${t.color} flex-shrink-0`} />
                        <span className="text-sm text-slate-400">{t.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 p-4 rounded-xl" style={{ background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.15)' }}>
                    <p className="text-sm text-slate-300 italic">
                      "Leo despacito... ¿me ayudas tú primero?"
                    </p>
                    <p className="text-xs text-slate-500 mt-1">— Teo, ante una pregunta de comprensión lectora</p>
                  </div>
                </div>
              </div>
            </FadeUp>

            {/* JOJO */}
            <FadeUp delay={0.15}>
              <div
                className="card-hover rounded-3xl overflow-hidden h-full"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(244,114,182,0.2)', boxShadow: '0 0 60px -20px rgba(236,72,153,0.25)' }}
              >
                <div className="h-1 bg-gradient-to-r from-pink-500 to-rose-400" />
                <div className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-rose-400 rounded-2xl flex items-center justify-center text-4xl shadow-xl shadow-pink-500/30">
                          👧
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-[#04091A]" />
                      </div>
                      <div>
                        <h3 className="text-3xl font-black text-white">Jojo</h3>
                        <p className="text-slate-400 text-sm">15 años · 1º Medio</p>
                      </div>
                    </div>
                    <span className="bg-pink-500/15 text-pink-400 text-xs font-bold px-3 py-1.5 rounded-full border border-pink-500/30">
                      DIL
                    </span>
                  </div>

                  <p className="text-slate-300 leading-relaxed mb-6">
                    Presenta <strong className="text-white">Discapacidad Intelectual Leve</strong> con enfoque en Transición a la Vida Adulta. Pensamiento concreto y literal: entiende con ejemplos del día a día, se bloquea ante la abstracción.
                  </p>

                  <div className="space-y-2.5">
                    {[
                      { label: 'Excelente memoria para lo concreto', color: 'bg-pink-400' },
                      { label: 'Aprende con ejemplos funcionales reales', color: 'bg-rose-400' },
                      { label: 'Teme las burlas y la exclusión', color: 'bg-pink-400' },
                      { label: 'Se motiva con actividades de vida cotidiana', color: 'bg-rose-400' },
                    ].map((t) => (
                      <div key={t.label} className="flex items-center space-x-3">
                        <div className={`w-1.5 h-1.5 rounded-full ${t.color} flex-shrink-0`} />
                        <span className="text-sm text-slate-400">{t.label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-8 p-4 rounded-xl" style={{ background: 'rgba(244,114,182,0.07)', border: '1px solid rgba(244,114,182,0.15)' }}>
                    <p className="text-sm text-slate-300 italic">
                      "¿Para qué sirve eso en la vida real?"
                    </p>
                    <p className="text-xs text-slate-500 mt-1">— Jojo, cuando el contexto no es funcional</p>
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
      <section id="como-funciona" className="py-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 100%, rgba(139,92,246,0.08), transparent)' }} />
        <div className="max-w-5xl mx-auto">
          <FadeUp className="text-center mb-12">
            <span className="text-green-400 text-sm font-semibold uppercase tracking-widest">¿Cómo funciona?</span>
            <h2 className="text-4xl md:text-5xl font-black text-white mt-4 mb-6 leading-tight">
              Tres pasos. Una mejor práctica.
            </h2>
          </FadeUp>

          <div className="space-y-6">
            {[
              {
                n: '01', delay: 0,
                gradient: 'from-blue-500 to-cyan-400',
                glow: 'rgba(59,130,246,0.15)',
                border: 'rgba(96,165,250,0.2)',
                title: 'Elige tu personaje',
                desc: 'Selecciona a Teo o Jojo. Revisa su ficha diagnóstica para entender su perfil antes de comenzar la simulación.',
                tag: 'Selección',
              },
              {
                n: '02', delay: 0.1,
                gradient: 'from-violet-500 to-purple-500',
                glow: 'rgba(139,92,246,0.15)',
                border: 'rgba(167,139,250,0.2)',
                title: 'Simula la conversación',
                desc: 'Interactúa en tiempo real. El personaje responde con autenticidad psicopedagógica según tu tono, preguntas y estrategias. Cada decisión importa.',
                tag: 'Simulación',
              },
              {
                n: '03', delay: 0.2,
                gradient: 'from-green-400 to-emerald-500',
                glow: 'rgba(52,211,153,0.15)',
                border: 'rgba(52,211,153,0.2)',
                title: 'Recibe tu evaluación PDF',
                desc: 'Gemini AI analiza tu desempeño en 11 criterios pedagógicos y genera un informe descargable con fortalezas, áreas de mejora y sugerencias concretas.',
                tag: 'Evaluación',
              },
            ].map((s) => (
              <FadeUp key={s.n} delay={s.delay}>
                <div
                  className="card-hover rounded-2xl p-8 flex flex-col md:flex-row items-start md:items-center gap-6"
                  style={{ background: `rgba(255,255,255,0.03)`, border: `1px solid ${s.border}`, boxShadow: `0 0 40px -10px ${s.glow}` }}
                >
                  <div className={`flex-shrink-0 w-16 h-16 bg-gradient-to-br ${s.gradient} rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-lg`}>
                    {s.n}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">{s.title}</h3>
                      <span className="text-xs font-semibold text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">{s.tag}</span>
                    </div>
                    <p className="text-slate-400 leading-relaxed">{s.desc}</p>
                  </div>
                  <ChevronRight className="hidden md:block w-5 h-5 text-slate-600 flex-shrink-0" />
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════
          FOOTER
      ══════════════════════════════ */}
      <footer className="py-8 px-6 border-t border-white/5 text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-violet-500 rounded-lg flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-sm">Chat-BOT</span>
        </div>
        <p className="text-slate-600 text-xs">Plataforma de formación docente con IA · Universidad San Sebastián</p>
      </footer>

      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} initialMode={authMode} />
    </div>
  );
};

export default HomePage;
