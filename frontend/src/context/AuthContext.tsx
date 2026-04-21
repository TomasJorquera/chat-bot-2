import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

const API = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  loading: boolean;
}

interface RegisterData {
  name: string;
  lastName: string;
  email: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// Determina el rol a partir del dominio del correo
const determineUserType = (email: string): 'student' | 'teacher' => {
  if (email.endsWith('@docente.uss.cl')) return 'teacher';
  return 'student';
};

// Extrae un nombre legible del correo (e.g. "profesora@..." → "Profesora")
const nameFromEmail = (email: string): string => {
  const prefix = email.split('@')[0];
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user,    setUser]    = useState<User | null>(null);
  const [token,   setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restaurar sesión al recargar
  useEffect(() => {
    const savedUser  = localStorage.getItem('user');
    const savedToken = localStorage.getItem('authToken');
    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setToken(savedToken);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: email, contrasena: password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLoading(false);
        return { ok: false, error: data.detail || 'Correo o contraseña incorrectos.' };
      }

      const data = await res.json();
      // data = { access_token, token_type, correo, grupo }

      const userType = determineUserType(data.correo);
      const displayName = nameFromEmail(data.correo);

      const newUser: User = {
        id:       data.correo,
        name:     displayName,
        lastName: '',
        email:    data.correo,
        type:     userType,
      };

      setUser(newUser);
      setToken(data.access_token);
      localStorage.setItem('user',      JSON.stringify(newUser));
      localStorage.setItem('authToken', data.access_token);
      setLoading(false);
      return { ok: true };

    } catch (e) {
      setLoading(false);
      return { ok: false, error: 'No se pudo conectar con el servidor.' };
    }
  };

  // Mantener compatibilidad con código que llame login y espere boolean
  const loginCompat = async (email: string, password: string): Promise<boolean> => {
    const result = await login(email, password);
    return result.ok;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
  };

  return (
    <AuthContext.Provider value={{ user, token, login: loginCompat as any, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Helper para que otros módulos puedan registrar alumnos (no expuesto en UI aún)
export const registerAlumno = async (_userData: RegisterData): Promise<boolean> => {
  // Reservado para futura implementación
  console.warn('registerAlumno: not implemented against real backend');
  return false;
};
