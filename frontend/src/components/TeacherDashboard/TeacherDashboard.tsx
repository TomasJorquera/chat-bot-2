import React, { useState } from 'react';
import { BookOpen, Users, UserCheck, BarChart3, MessageSquare } from 'lucide-react';
import CharacterCard from '../CharacterCard/CharacterCard';
import ChatInterface from '../Chat/ChatInterface';
import StudentManagement from './StudentManagement';

type ViewType = 'dashboard' | 'chat' | 'students';

const TeacherDashboard: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedCharacter, setSelectedCharacter] = useState<'Teo' | 'Jojo' | null>(null);

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
            Teacher Dashboard
          </h1>
            <p className="text-lg text-[#37474F] max-w-2xl mx-auto">
            Manage your students, monitor their progress, and chat with Teo and Jojo to better understand the learning experience.
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
              Manage Students
            </h3>
            <p className="text-[#37474F] text-sm">
              View student progress, review reports, and monitor their development.
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-blue-200">
            <div className="w-12 h-12 bg-gradient-to-br from-[#1E88E5] to-[#42A5F5] rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[#0D47A1] mb-2">
              Class Reports
            </h3>
            <p className="text-[#37474F] text-sm">
              Access class-wide statistics and analyses.
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-blue-200">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[#0D47A1] mb-2">
              Teaching Resources
            </h3>
            <p className="text-[#37474F] text-sm">
              Find materials and strategies to improve the learning experience.
            </p>
          </div>
        </div>

        {/* Character Experience Section */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-3 mb-8">
            <MessageSquare className="w-6 h-6 text-[#1E88E5]" />
            <h2 className="text-2xl font-bold text-[#0D47A1]">
              Experience the Conversation
            </h2>
          </div>
            <p className="text-center text-[#37474F] mb-8 max-w-2xl mx-auto">
            As a teacher, you can also chat with Teo and Jojo to better understand how your students interact and gain valuable insights.
          </p>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <CharacterCard
              name="Teo"
              age={9}
              grade="4th Grade"
              description="Experience how Teo interacts with reading and writing difficulties, preferring visual support and concrete examples."
              interests={['Drawing', 'Colors', 'Visual games']}
              onClick={() => {
                setSelectedCharacter('Teo');
                setCurrentView('chat');
              }}
            />

            <CharacterCard
              name="Jojo"
              age={15}
              grade="10th Grade"
              description="See how Jojo, with mild intellectual difficulties, responds better to concrete examples and topics of personal interest."
              interests={['Music', 'Soccer', 'Practical examples']}
              onClick={() => {
                setSelectedCharacter('Jojo');
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