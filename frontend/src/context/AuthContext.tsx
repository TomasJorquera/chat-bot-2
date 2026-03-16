import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
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
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const determineUserType = (email: string): 'student' | 'teacher' => {
  if (email.endsWith('@docente.uss.cl')) return 'teacher';
  if (email.endsWith('@correo.uss.cl')) return 'student';
  return 'student';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    if (savedUser) setUser(JSON.parse(savedUser));
    if (savedToken) setToken(savedToken);
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: email, contrasena: password }),
      });

      if (!res.ok) {
        setLoading(false);
        return false;
      }

      const data = await res.json();
      const accessToken: string = data.access_token;

      const userType = determineUserType(email);
      const newUser: User = {
        id: email,
        name: email,
        lastName: '',
        email,
        type: userType,
      };

      setUser(newUser);
      setToken(accessToken);
      localStorage.setItem('user', JSON.stringify(newUser));
      localStorage.setItem('token', accessToken);
      setLoading(false);
      return true;
    } catch {
      setLoading(false);
      return false;
    }
  };

  const register = async (_userData: RegisterData): Promise<boolean> => {
    return false;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
