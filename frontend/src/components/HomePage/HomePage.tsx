import React, { useState } from 'react';
import { MessageSquare, Users, BookOpen, Brain, LogIn, UserPlus } from 'lucide-react';
import AuthModal from '../Auth/AuthModal';

const HomePage: React.FC = () => {
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const handleShowLogin = () => {
    setAuthMode('login');
    setShowAuth(true);
  };

  const handleShowRegister = () => {
    setAuthMode('register');
    setShowAuth(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E3F2FD] via-[#BBDEFB] to-[#90CAF9]">
      {/* Header */}
      <header className="relative z-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#1E88E5] to-[#42A5F5] rounded-lg flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-[#0D47A1]">Chat Educativo</h1>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleShowLogin}
                className="px-4 py-2 text-[#1E88E5] hover:bg-blue-50 rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <LogIn className="w-4 h-4" />
                <span>Iniciar sesión</span>
              </button>
              <button
                onClick={handleShowRegister}
                className="px-4 py-2 bg-[#1E88E5] hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Registrarse</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="px-4 sm:px-6 lg:px-8 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gradient-to-br from-[#1E88E5] to-[#42A5F5] rounded-2xl flex items-center justify-center mx-auto mb-8">
              <Brain className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-[#0D47A1] mb-6 leading-tight">
              Bienvenido al
              <br />
              <span className="bg-gradient-to-r from-[#1E88E5] to-[#42A5F5] bg-clip-text text-transparent">
                Chat Educativo
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-[#37474F] mb-12 max-w-3xl mx-auto leading-relaxed">
              para conversar con <strong className="text-[#1E88E5]">Teo</strong> y{' '}
              <strong className="text-[#1E88E5]">Josefina</strong>
            </p>

            <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <button
                onClick={handleShowRegister}
                className="px-8 py-4 bg-[#1E88E5] hover:bg-blue-700 text-white rounded-xl font-semibold text-lg transition-all hover:shadow-lg flex items-center space-x-3"
              >
                <UserPlus className="w-6 h-6" />
                <span>Comenzar Ahora</span>
              </button>
              <button
                onClick={handleShowLogin}
                className="px-8 py-4 bg-white/80 backdrop-blur-sm hover:bg-white text-[#1E88E5] border-2 border-[#1E88E5] rounded-xl font-semibold text-lg transition-all hover:shadow-lg flex items-center space-x-3"
              >
                <LogIn className="w-6 h-6" />
                <span>Ya tengo cuenta</span>
              </button>
            </div>
          </div>

          {/* Features Section */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-blue-200 text-center hover:shadow-lg transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-[#43A047] to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-[#0D47A1] mb-2">
                Conversación Interactiva
              </h3>
              <p className="text-[#37474F] text-sm">
                Chatea en tiempo real con personajes diseñados para diferentes niveles educativos
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-blue-200 text-center hover:shadow-lg transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-[#0D47A1] mb-2">
                Aprendizaje Adaptativo
              </h3>
              <p className="text-[#37474F] text-sm">
                Cada personaje se adapta a diferentes estilos y necesidades de aprendizaje
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-blue-200 text-center hover:shadow-lg transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-[#0D47A1] mb-2">
                Evaluación Inteligente
              </h3>
              <p className="text-[#37474F] text-sm">
                Sistema de reportes que evalúa el progreso y comprensión del estudiante
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-blue-200 text-center hover:shadow-lg transition-all">
              <div className="w-16 h-16 bg-gradient-to-br from-[#1E88E5] to-[#42A5F5] rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-[#0D47A1] mb-2">
                Gestión Educativa
              </h3>
              <p className="text-[#37474F] text-sm">
                Los docentes pueden monitorear el progreso y descargar reportes detallados
              </p>
            </div>
          </div>

          {/* Characters Preview */}
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#0D47A1] mb-8">
              Conoce a nuestros personajes
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 border border-blue-200">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">🧒</span>
                </div>
                <h3 className="text-2xl font-bold text-[#0D47A1] mb-2">Teo</h3>
                <p className="text-[#37474F] mb-4">9 años • 4º Básico</p>
                <p className="text-[#37474F] text-sm leading-relaxed">
                  Teo tiene dificultades en lectura y escritura. Le encantan los colores 
                  y aprende mejor con ejemplos visuales y mucha paciencia.
                </p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 border border-blue-200">
                <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">👧</span>
                </div>
                <h3 className="text-2xl font-bold text-[#0D47A1] mb-2">Josefina</h3>
                <p className="text-[#37474F] mb-4">15 años • 1º Medio</p>
                <p className="text-[#37474F] text-sm leading-relaxed">
                  Josefina es tímida y tiene dificultades intelectuales leves. 
                  Le gusta la música y el fútbol, y aprende mejor con ejemplos concretos.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-12 text-center border border-blue-200">
            <h2 className="text-3xl font-bold text-[#0D47A1] mb-4">
              ¿Listo para comenzar?
            </h2>
            <p className="text-[#37474F] text-lg mb-8 max-w-2xl mx-auto">
              Únete a nuestra plataforma educativa y descubre una nueva forma 
              de aprender y enseñar a través de la conversación.
            </p>
            <button
              onClick={handleShowRegister}
              className="px-10 py-4 bg-[#1E88E5] hover:bg-blue-700 text-white rounded-xl font-semibold text-xl transition-all hover:shadow-lg"
            >
              Crear cuenta gratuita
            </button>
          </div>
        </div>
      </main>

      <AuthModal 
        isOpen={showAuth}
        onClose={() => setShowAuth(false)}
        initialMode={authMode}
      />
    </div>
  );
};

export default HomePage;