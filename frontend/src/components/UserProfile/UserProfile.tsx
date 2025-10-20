import React from 'react';
import { X, User, Mail, Download, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface UserProfileProps {
  onClose: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ onClose }) => {
  const { user } = useAuth();

  const mockConversations = [
    { id: '1', character: 'Teo', date: '2024-01-15', score: 85 },
    { id: '2', character: 'Josefina', date: '2024-01-14', score: 92 },
    { id: '3', character: 'Teo', date: '2024-01-13', score: 78 },
  ];

  const handleDownload = (conversationId: string) => {
    const conversation = mockConversations.find(c => c.id === conversationId);
    if (conversation) {
      const data = `Conversación con ${conversation.character}\nFecha: ${conversation.date}\nPuntuación: ${conversation.score}/100\n\n[Contenido de la conversación...]`;
      const blob = new Blob([data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversacion-${conversation.character}-${conversation.date}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (!user) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[#0D47A1]">Perfil de Usuario</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-[#37474F]" />
            </button>
          </div>

          <div className="space-y-6">
            {/* User Info */}
            <div className="bg-gradient-to-r from-[#E3F2FD] to-[#BBDEFB] p-6 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-[#1E88E5] to-[#42A5F5] rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-[#0D47A1]">
                    {user.name} {user.lastName}
                  </h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <Mail className="w-4 h-4 text-[#37474F]" />
                    <span className="text-[#37474F]">{user.email}</span>
                  </div>
                  <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-[#1E88E5] rounded-full text-sm font-medium">
                    {user.type === 'teacher' ? 'Docente' : 'Alumno'}
                  </span>
                </div>
              </div>
            </div>

            {/* Conversation History */}
            <div>
              <h4 className="text-lg font-semibold text-[#0D47A1] mb-4 flex items-center space-x-2">
                <MessageSquare className="w-5 h-5" />
                <span>Historial de Conversaciones</span>
              </h4>
              
              <div className="space-y-3">
                {mockConversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className="bg-white border border-blue-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-10 h-10 bg-gradient-to-br from-[#42A5F5] to-[#90CAF9] rounded-full flex items-center justify-center">
                            <span className="text-white text-sm font-bold">
                              {conversation.character === 'Teo' ? '🧒' : '👧'}
                            </span>
                          </div>
                          <div>
                            <h5 className="font-medium text-[#0D47A1]">
                              Conversación con {conversation.character}
                            </h5>
                            <p className="text-sm text-[#37474F]">{conversation.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-[#37474F]">Puntuación:</span>
                          <span className={`font-bold ${
                            conversation.score >= 80 ? 'text-[#43A047]' : 
                            conversation.score >= 60 ? 'text-orange-500' : 'text-[#E53935]'
                          }`}>
                            {conversation.score}/100
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownload(conversation.id)}
                        className="p-2 text-[#1E88E5] hover:bg-blue-50 rounded-lg transition-colors"
                        title="Descargar conversación"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {mockConversations.length === 0 && (
                <div className="text-center py-8 text-[#37474F]">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No tienes conversaciones aún</p>
                  <p className="text-sm">¡Comienza a chatear con Teo y Josefina!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;