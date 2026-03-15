import React, { useState, useEffect } from 'react';
import { X, Brain } from 'lucide-react';
import LoginForm from './LoginForm';

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
        background: 'rgba(4,9,26,0.80)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
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
          background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      <div
        className="relative w-full max-w-md"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 24,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 40px 80px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05) inset',
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(24px) scale(0.97)',
          transition: 'transform 0.3s ease',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-7 pb-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-500 rounded-lg flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-extrabold text-sm tracking-tight">Chat-BOT</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Título */}
        <div className="px-8 pt-6 pb-0">
          <div
            className="flex items-center justify-center rounded-xl py-3 w-full"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.5), rgba(139,92,246,0.5))',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 2px 16px rgba(59,130,246,0.25)',
            }}
          >
            <span className="text-sm font-bold text-white tracking-wide">
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
