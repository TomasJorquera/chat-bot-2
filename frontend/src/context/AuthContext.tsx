import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const determineUserType = (email: string): 'student' | 'teacher' => {
    if (email.endsWith('@docente.uss.cl')) return 'teacher';
    if (email.endsWith('@correo.uss.cl')) return 'student';
    return 'student'; // default
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock validation - in real app, this would be API call
    if (password.length >= 6) {
      const userType = determineUserType(email);
      const newUser: User = {
        id: Date.now().toString(),
        name: 'Usuario',
        lastName: 'Demo',
        email,
        type: userType,
      };
      
      setUser(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
      setLoading(false);
      return true;
    }
    
    setLoading(false);
    return false;
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const userType = determineUserType(userData.email);
    const newUser: User = {
      id: Date.now().toString(),
      name: userData.name,
      lastName: userData.lastName,
      email: userData.email,
      type: userType,
    };
    
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
    setLoading(false);
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};