import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Layout/Header';
import HomePage from './components/HomePage/HomePage';
import StudentDashboard from './components/StudentDashboard/StudentDashboard';
import TeacherDashboard from './components/TeacherDashboard/TeacherDashboard';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E3F2FD] via-[#BBDEFB] to-[#90CAF9] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-[#1E88E5] to-[#42A5F5] rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <div className="w-8 h-8 bg-white rounded-lg"></div>
          </div>
          <p className="text-[#0D47A1] font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <HomePage />;
  }

  return (
    <div className="min-h-screen">
      <Header />
      {user.type === 'student' ? <StudentDashboard /> : <TeacherDashboard />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;