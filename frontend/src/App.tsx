import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import HomePage from './components/HomePage/HomePage_Blanco';
import InterfaceStudent from './components/InterfaceStudent/InterfaceStudent';
import InterfaceTeacher from './components/InterfaceTeacher/InterfaceTeacher';
import AdminDashboard from './components/AdminDashboard/AdminDashboard';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8fafc' }}>
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #06b6d4)' }}>
            <div className="w-7 h-7 bg-white/30 rounded-lg" />
          </div>
          <p className="text-sm font-medium" style={{ color: '#64748b' }}>Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) return <HomePage />;

  if (user.type === 'admin') return <AdminDashboard />;
  return user.type === 'student' ? <InterfaceStudent /> : <InterfaceTeacher />;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;