import React, { useState } from 'react';
import { Users } from 'lucide-react';
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
    <div className="min-h-screen bg-[#C9E8F5] flex items-center justify-center pt-20 pb-8 px-4">
      <div className="w-full max-w-4xl">
        <div className="flex items-center justify-center space-x-3 mb-10">
          <Users className="w-7 h-7 text-[#1565C0]" />
          <h2 className="text-3xl font-bold text-[#0D47A1]">
            Elige con quién quieres chatear
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
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
    </div>
  );
};

export default StudentDashboard;