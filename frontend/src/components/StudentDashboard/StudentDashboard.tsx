import React, { useState } from 'react';
import { BookOpen, Users } from 'lucide-react';
import CharacterCard from '../CharacterCard/CharacterCard';
import ChatInterface from '../Chat/ChatInterface';

const StudentDashboard: React.FC = () => {
  const [selectedCharacter, setSelectedCharacter] = useState<'Teo' | 'Jojo' | null>(null);

  if (selectedCharacter) {
    return (
      <ChatInterface
        character={selectedCharacter}
        onBack={() => setSelectedCharacter(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E3F2FD] via-[#BBDEFB] to-[#90CAF9] pt-20 pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 bg-gradient-to-br from-[#1E88E5] to-[#42A5F5] rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
            <h1 className="text-4xl font-bold text-[#0D47A1] mb-4">
              Bienvenido al Chat Educativo
            </h1>
            <p className="text-lg text-[#37474F] max-w-2xl mx-auto">
              Chatea con Teo y Jojo para practicar y mejorar tus habilidades de comunicación. Cada conversación es una oportunidad para aprender.
            </p>
        </div>

        {/* Character Selection */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-3 mb-8">
            <Users className="w-6 h-6 text-[#1E88E5]" />
            <h2 className="text-2xl font-bold text-[#0D47A1]">
                Elige con quién quieres chatear
              </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <CharacterCard
              name="Teo"
              age={9}
                grade="4º Básico"
                description="Teo tiene dificultades con la lectura y la escritura y puede evitar tareas de lenguaje. Responde mejor con soporte visual y ejemplos concretos."
                interests={['Dibujo', 'Colores', 'Juegos visuales']}
              onClick={() => setSelectedCharacter('Teo')}
            />

            <CharacterCard
              name="Jojo"
              age={15}
                grade="10º Medio"
                description="Jojo presenta leves desafíos intelectuales y es tímida. Aprende mejor con ejemplos concretos y disfruta actividades relacionadas con sus intereses."
                interests={['Música', 'Fútbol', 'Ejemplos prácticos']}
              onClick={() => setSelectedCharacter('Jojo')}
            />
          </div>
        </div>

        {/* Tips Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 max-w-4xl mx-auto border border-blue-200">
          <h3 className="text-lg font-semibold text-[#0D47A1] mb-4">
            💡 Tips for a better conversation
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-[#37474F]">
            <div className="space-y-2">
              <p><strong>For Teo:</strong></p>
              <ul className="space-y-1 pl-4">
                <li>• Use visual, concrete examples</li>
                <li>• Be patient with responses</li>
                <li>• Mention colors and shapes</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p><strong>For Jojo:</strong></p>
              <ul className="space-y-1 pl-4">
                <li>• Connect with music and sports</li>
                <li>• Use real-life examples</li>
                <li>• Give time to process</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;