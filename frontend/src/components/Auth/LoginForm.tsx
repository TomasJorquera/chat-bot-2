import React, { useState } from 'react';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LoginFormProps {
  onSwitchToRegister: () => void;
  onClose: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();

  const validateEmail = (email: string) => {
    return email.endsWith('@correo.uss.cl') || email.endsWith('@docente.uss.cl');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError('El correo debe terminar en @correo.uss.cl o @docente.uss.cl');
      return;
    }

    const success = await login(email, password);
    if (success) {
      onClose();
    } else {
      setError('Credenciales incorrectas');
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-[#0D47A1] mb-2">Iniciar Sesión</h2>
        <p className="text-[#37474F]">Accede a tu cuenta educativa</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[#0D47A1] mb-2">
            Correo electrónico
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#37474F]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-[#1E88E5] focus:border-transparent outline-none transition-all"
              placeholder="usuario@correo.uss.cl"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#0D47A1] mb-2">
            Contraseña
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#37474F]" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-[#1E88E5] focus:border-transparent outline-none transition-all"
              placeholder="Tu contraseña"
              required
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-[#E53935]" />
            <span className="text-[#E53935] text-sm">{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#1E88E5] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors"
        >
          <LogIn className="w-5 h-5" />
          <span>{loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}</span>
        </button>

        <div className="text-center">
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-[#1E88E5] hover:text-blue-700 text-sm font-medium transition-colors"
          >
            ¿No tienes cuenta? Regístrate aquí
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;