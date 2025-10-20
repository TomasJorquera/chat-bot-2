import React from 'react';
import { MessageSquare, Heart, BookOpen } from 'lucide-react';

interface CharacterCardProps {
  name: 'Teo' | 'Josefina';
  age: number;
  grade: string;
  description: string;
  interests?: string[];
  onClick: () => void;
}

const CharacterCard: React.FC<CharacterCardProps> = ({
  name,
  age,
  grade,
  description,
  interests = [],
  onClick
}) => {
  const getCharacterEmoji = (name: string) => {
    return name === 'Teo' ? '🧒' : '👧';
  };

  const getCharacterGradient = (name: string) => {
    return name === 'Teo' 
      ? 'from-blue-400 to-cyan-500' 
      : 'from-pink-400 to-rose-500';
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer group p-6 border border-blue-100 hover:border-blue-300"
    >
      <div className="text-center mb-4">
        <div className={`w-20 h-20 bg-gradient-to-br ${getCharacterGradient(name)} rounded-full flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform`}>
          <span className="text-3xl">{getCharacterEmoji(name)}</span>
        </div>
        <h3 className="text-2xl font-bold text-[#0D47A1] mb-1">{name}</h3>
        <div className="flex items-center justify-center space-x-2 text-[#37474F] text-sm">
          <span>{age} años</span>
          <span>•</span>
          <span>{grade}</span>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[#37474F] text-sm leading-relaxed">
          {description}
        </p>

        {interests.length > 0 && (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <Heart className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium text-[#0D47A1]">Le gusta:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {interests.map((interest, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-50 text-[#1E88E5] text-xs rounded-full"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-blue-100">
          <button className="w-full bg-gradient-to-r from-[#1E88E5] to-[#42A5F5] hover:from-blue-700 hover:to-blue-600 text-white py-3 rounded-lg font-medium flex items-center justify-center space-x-2 transition-all group-hover:shadow-lg">
            <MessageSquare className="w-5 h-5" />
            <span>Conversar con {name}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CharacterCard;