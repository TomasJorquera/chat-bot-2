import React, { useState } from 'react';
import { User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import UserProfile from '../UserProfile/UserProfile';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  if (!user) return null;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 bg-white/90 backdrop-blur-sm border-b border-blue-200 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#1E88E5] to-[#42A5F5] rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-[#0D47A1]">Chat Educativo</h1>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowProfile(true)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-[#42A5F5] to-[#90CAF9] rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="text-[#0D47A1] font-medium">
                  {user.name} {user.lastName}
                </span>
                <span className="text-xs px-2 py-1 bg-blue-100 text-[#1E88E5] rounded-full">
                  {user.type === 'teacher' ? 'Docente' : 'Alumno'}
                </span>
              </button>

              <button
                onClick={logout}
                className="p-2 text-[#37474F] hover:text-[#E53935] hover:bg-red-50 rounded-lg transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {showProfile && (
        <UserProfile onClose={() => setShowProfile(false)} />
      )}
    </>
  );
};

export default Header;