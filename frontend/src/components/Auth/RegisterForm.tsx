import React, { useState } from 'react';
import { User, Mail, Lock, UserPlus, AlertCircle, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
  onClose: () => void;
}

const inputBase: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 12,
  color: '#fff',
  fontSize: 14,
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const DarkInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { iconLeft?: boolean }> = ({
  iconLeft = true, ...props
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{
        ...inputBase,
        padding: iconLeft ? '11px 14px 11px 40px' : '11px 14px',
        borderColor: focused ? 'rgba(96,165,250,0.6)' : 'rgba(255,255,255,0.10)',
        boxShadow: focused ? '0 0 0 3px rgba(59,130,246,0.15)' : 'none',
      }}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e)  => { setFocused(false); props.onBlur?.(e); }}
    />
  );
};

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
    {children}
  </label>
);

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin, onClose }) => {
  const [formData, setFormData] = useState({
    name: '', lastName: '', email: '', password: '', confirmPassword: '',
  });
  const [error, setError] = useState('');
  const { register, loading } = useAuth();

  const validatePassword = (p: string) =>
    p.length >= 6 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /\d/.test(p);

  const validateEmail = (e: string) =>
    e.endsWith('@correo.uss.cl') || e.endsWith('@docente.uss.cl');

  const requirements = [
    { text: 'Al menos 6 caracteres',   met: formData.password.length >= 6 },
    { text: 'Una letra mayúscula',      met: /[A-Z]/.test(formData.password) },
    { text: 'Una letra minúscula',      met: /[a-z]/.test(formData.password) },
    { text: 'Un número',                met: /\d/.test(formData.password) },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(formData.email)) {
      setError('El correo debe terminar en @correo.uss.cl o @docente.uss.cl');
      return;
    }
    if (!validatePassword(formData.password)) {
      setError('La contraseña no cumple los requisitos mínimos');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    const success = await register(formData);
    if (success) {
      onClose();
    } else {
      setError('Error al crear la cuenta. Intenta de nuevo.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Nombre + Apellido */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Nombre</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <DarkInput type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Nombre" required />
          </div>
        </div>
        <div>
          <Label>Apellido</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            <DarkInput type="text" name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Apellido" required />
          </div>
        </div>
      </div>

      {/* Email */}
      <div>
        <Label>Correo electrónico</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <DarkInput type="email" name="email" value={formData.email} onChange={handleChange} placeholder="usuario@correo.uss.cl" required />
        </div>
      </div>

      {/* Password */}
      <div>
        <Label>Contraseña</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <DarkInput type="password" name="password" value={formData.password} onChange={handleChange} placeholder="••••••••" required />
        </div>

        {formData.password && (
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
            {requirements.map((r) => (
              <div key={r.text} className="flex items-center space-x-1.5">
                {r.met
                  ? <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  : <div className="w-3.5 h-3.5 rounded-full border border-slate-600 flex-shrink-0" />
                }
                <span className={`text-xs ${r.met ? 'text-emerald-400' : 'text-slate-500'}`}>{r.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm password */}
      <div>
        <Label>Confirmar contraseña</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <DarkInput type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" required />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-center space-x-2.5 px-4 py-3 rounded-xl text-sm"
          style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center space-x-2 font-bold py-3 rounded-xl text-white transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        style={{
          background: loading
            ? 'rgba(96,165,250,0.4)'
            : 'linear-gradient(135deg, #3b82f6, #7c3aed)',
          boxShadow: loading ? 'none' : '0 8px 24px rgba(59,130,246,0.35)',
        }}
      >
        <UserPlus className="w-4 h-4" />
        <span>{loading ? 'Creando cuenta…' : 'Crear cuenta'}</span>
      </button>

      {/* Switch */}
      <p className="text-center text-sm text-slate-500">
        ¿Ya tienes cuenta?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
        >
          Inicia sesión aquí
        </button>
      </p>
    </form>
  );
};

export default RegisterForm;
