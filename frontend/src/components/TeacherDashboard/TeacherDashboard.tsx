import React, { useState } from 'react';
import { BookOpen, Users, UserCheck, BarChart3, MessageSquare } from 'lucide-react';
import CharacterCard from '../CharacterCard/CharacterCard';
import ChatInterface from '../Chat/ChatInterface';
import StudentManagement from './StudentManagement';

type ViewType = 'dashboard' | 'chat' | 'students';

const TeacherDashboard: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedCharacter, setSelectedCharacter] = useState<'Teo' | 'Josefina' | null>(null);

  if (currentView === 'chat' && selectedCharacter) {
    return (
      <ChatInterface
        character={selectedCharacter}
        onBack={() => {
          setSelectedCharacter(null);
          setCurrentView('dashboard');
        }}
      />
    );
  }

  if (currentView === 'students') {
    return (
      <StudentManagement onBack={() => setCurrentView('dashboard')} />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E3F2FD] via-[#BBDEFB] to-[#90CAF9] pt-20 pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-br from-[#1E88E5] to-[#42A5F5] rounded-full flex items-center justify-center mx-auto mb-6">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-[#0D47A1] mb-4">
            Panel del Docente
          </h1>
          <p className="text-lg text-[#37474F] max-w-2xl mx-auto">
            Gestiona a tus estudiantes, monitorea su progreso y también puedes conversar 
            con Teo y Josefina para entender mejor la experiencia educativa.
          </p>
        </div>

        {/* Teacher Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div 
            onClick={() => setCurrentView('students')}
            className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-blue-200 hover:shadow-lg transition-all cursor-pointer group"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-[#43A047] to-green-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <UserCheck className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[#0D47A1] mb-2">
              Administrar Estudiantes
            </h3>
            <p className="text-[#37474F] text-sm">
              Ve el progreso de tus estudiantes, revisa sus reportes y monitorea su desarrollo.
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-blue-200">
            <div className="w-12 h-12 bg-gradient-to-br from-[#1E88E5] to-[#42A5F5] rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[#0D47A1] mb-2">
              Reportes Generales
            </h3>
            <p className="text-[#37474F] text-sm">
              Accede a estadísticas generales y análisis de la clase completa.
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-blue-200">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[#0D47A1] mb-2">
              Recursos Educativos
            </h3>
            <p className="text-[#37474F] text-sm">
              Encuentra materiales y estrategias para mejorar la experiencia de aprendizaje.
            </p>
          </div>
        </div>

        {/* Character Experience Section */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-3 mb-8">
            <MessageSquare className="w-6 h-6 text-[#1E88E5]" />
            <h2 className="text-2xl font-bold text-[#0D47A1]">
              Experimenta la Conversación
            </h2>
          </div>
          <p className="text-center text-[#37474F] mb-8 max-w-2xl mx-auto">
            Como docente, también puedes conversar con Teo y Josefina para entender mejor 
            cómo interactúan tus estudiantes y obtener insights valiosos.
          </p>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <CharacterCard
              name="Teo"
              age={9}
              grade="4º Básico"
              description="Experimenta cómo Teo interactúa con dificultades en lectura y escritura, prefiriendo apoyo visual y ejemplos concretos."
              interests={['Dibujos', 'Colores', 'Juegos visuales']}
              onClick={() => {
                setSelectedCharacter('Teo');
                setCurrentView('chat');
              }}
            />

            <CharacterCard
              name="Josefina"
              age={15}
              grade="1º Medio"
              description="Conoce cómo Josefina, con dificultades intelectuales leves, responde mejor a ejemplos concretos y temas de su interés."
              interests={['Música', 'Fútbol', 'Ejemplos prácticos']}
              onClick={() => {
                setSelectedCharacter('Josefina');
                setCurrentView('chat');
              }}
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-[#0D47A1] mb-4">
            📊 Resumen de la Clase
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-[#1E88E5]">12</div>
              <div className="text-sm text-[#37474F]">Estudiantes Activos</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#43A047]">85</div>
              <div className="text-sm text-[#37474F]">Promedio General</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#42A5F5]">47</div>
              <div className="text-sm text-[#37474F]">Conversaciones Totales</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-500">23</div>
              <div className="text-sm text-[#37474F]">Reportes Generados</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;