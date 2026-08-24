import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import LoginForm from './LoginForm';
import { C, LOGO_ICON_SMALL } from './theme';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        background: 'rgba(43,42,40,0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.25s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Blob decorativo */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 500, height: 500,
          background: `radial-gradient(circle, rgba(30,158,140,0.18) 0%, transparent 70%)`,
          filter: 'blur(60px)',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      <div
        className="relative w-full max-w-md"
        style={{
          background: C.white,
          border: `1px solid ${C.borde}`,
          borderRadius: 24,
          boxShadow: '0 40px 80px -20px rgba(43,42,40,0.35)',
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
          transition: 'transform 0.3s ease',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-7 pb-0">
          <div className="flex items-center space-x-2.5">
            <img src={LOGO_ICON_SMALL} alt="SimulAula" style={{ width: 28, height: 28, display: 'block' }} />
            <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.3px', color: C.texto }}>
              Simul<span style={{ color: C.azulSimbolo }}>Aula</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
            style={{ color: C.textoMuted }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = C.papelAlt; (e.currentTarget as HTMLButtonElement).style.color = C.texto; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = C.textoMuted; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Título */}
        <div className="px-8 pt-6 pb-0">
          <div
            className="flex items-center justify-center rounded-xl py-3 w-full"
            style={{
              background: `linear-gradient(135deg, ${C.turquesa}, ${C.azulSimbolo})`,
              boxShadow: `0 4px 16px rgba(30,158,140,0.3)`,
            }}
          >
            <span className="text-sm font-bold tracking-wide" style={{ color: C.white }}>
              Iniciar sesión
            </span>
          </div>
        </div>

        {/* Formulario */}
        <div className="px-8 py-7">
          <LoginForm onSwitchToRegister={() => {}} onClose={onClose} />
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
