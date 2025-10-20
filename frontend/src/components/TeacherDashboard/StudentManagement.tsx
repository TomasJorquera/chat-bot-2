import React, { useState } from 'react';
import { ArrowLeft, Search, TrendingUp, FileText, Eye, Download } from 'lucide-react';
import { Student } from '../../types';

interface StudentManagementProps {
  onBack: () => void;
}

const StudentManagement: React.FC<StudentManagementProps> = ({ onBack }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Mock data for students
  const mockStudents: Student[] = [
    {
      id: '1',
      name: 'Ana',
      lastName: 'García',
      email: 'ana.garcia@correo.uss.cl',
      conversations: [],
      averageScore: 88
    },
    {
      id: '2',
      name: 'Pedro',
      lastName: 'López',
      email: 'pedro.lopez@correo.uss.cl',
      conversations: [],
      averageScore: 76
    },
    {
      id: '3',
      name: 'María',
      lastName: 'González',
      email: 'maria.gonzalez@correo.uss.cl',
      conversations: [],
      averageScore: 92
    },
    {
      id: '4',
      name: 'Carlos',
      lastName: 'Rodríguez',
      email: 'carlos.rodriguez@correo.uss.cl',
      conversations: [],
      averageScore: 84
    }
  ];

  const mockReports = [
    { id: '1', date: '2024-01-15', character: 'Teo', score: 85, duration: '12 min' },
    { id: '2', date: '2024-01-14', character: 'Josefina', score: 92, duration: '18 min' },
    { id: '3', date: '2024-01-13', character: 'Teo', score: 78, duration: '15 min' },
  ];

  const filteredStudents = mockStudents.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-[#43A047]';
    if (score >= 70) return 'text-orange-500';
    return 'text-[#E53935]';
  };

  const handleViewReports = (student: Student) => {
    setSelectedStudent(student);
  };

  const handleDownloadReport = (reportId: string) => {
    const report = mockReports.find(r => r.id === reportId);
    if (report) {
      const data = `Reporte de Conversación\nFecha: ${report.date}\nPersonaje: ${report.character}\nPuntuación: ${report.score}/100\nDuración: ${report.duration}\n\n[Contenido detallado del reporte...]`;
      const blob = new Blob([data], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-${report.character}-${report.date}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (selectedStudent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E3F2FD] via-[#BBDEFB] to-[#90CAF9] pt-20 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-4 mb-8">
            <button
              onClick={() => setSelectedStudent(null)}
              className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-[#1E88E5]" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-[#0D47A1]">
                {selectedStudent.name} {selectedStudent.lastName}
              </h1>
              <p className="text-[#37474F]">{selectedStudent.email}</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-blue-200">
                <h3 className="text-xl font-semibold text-[#0D47A1] mb-6">Historial de Reportes</h3>
                
                <div className="space-y-4">
                  {mockReports.map((report) => (
                    <div
                      key={report.id}
                      className="bg-white border border-blue-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#42A5F5] to-[#90CAF9] rounded-full flex items-center justify-center">
                              <span className="text-white text-sm font-bold">
                                {report.character === 'Teo' ? '🧒' : '👧'}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-medium text-[#0D47A1]">
                                Conversación con {report.character}
                              </h4>
                              <p className="text-sm text-[#37474F]">
                                {report.date} • {report.duration}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-[#37474F]">Puntuación:</span>
                              <span className={`font-bold ${getScoreColor(report.score)}`}>
                                {report.score}/100
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDownloadReport(report.id)}
                          className="p-2 text-[#1E88E5] hover:bg-blue-50 rounded-lg transition-colors"
                          title="Descargar reporte"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-[#0D47A1] mb-4">Estadísticas</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[#37474F]">Promedio General</span>
                    <span className={`font-bold text-xl ${getScoreColor(selectedStudent.averageScore)}`}>
                      {selectedStudent.averageScore}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#37474F]">Total Conversaciones</span>
                    <span className="font-bold text-[#1E88E5]">
                      {mockReports.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#37474F]">Con Teo</span>
                    <span className="text-[#37474F]">
                      {mockReports.filter(r => r.character === 'Teo').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#37474F]">Con Josefina</span>
                    <span className="text-[#37474F]">
                      {mockReports.filter(r => r.character === 'Josefina').length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-[#0D47A1] mb-4">Progreso</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#37474F]">Comprensión</span>
                      <span className="text-[#0D47A1]">85%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-[#1E88E5] h-2 rounded-full" style={{ width: '85%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#37474F]">Interacción</span>
                      <span className="text-[#0D47A1]">92%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-[#43A047] h-2 rounded-full" style={{ width: '92%' }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#37474F]">Participación</span>
                      <span className="text-[#0D47A1]">78%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full" style={{ width: '78%' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E3F2FD] via-[#BBDEFB] to-[#90CAF9] pt-20 pb-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-4 mb-8">
          <button
            onClick={onBack}
            className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-[#1E88E5]" />
          </button>
          <h1 className="text-3xl font-bold text-[#0D47A1]">
            Administrar Estudiantes
          </h1>
        </div>

        <div className="mb-8">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-[#37474F]" />
            <input
              type="text"
              placeholder="Buscar estudiante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-[#1E88E5] focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        <div className="grid lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredStudents.map((student) => (
            <div
              key={student.id}
              className="bg-white/90 backdrop-blur-sm rounded-xl p-6 border border-blue-200 hover:shadow-lg transition-all"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-[#42A5F5] to-[#90CAF9] rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {student.name[0]}{student.lastName[0]}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-[#0D47A1]">
                    {student.name} {student.lastName}
                  </h3>
                  <p className="text-xs text-[#37474F] truncate">
                    {student.email}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#37474F]">Promedio</span>
                  <span className={`font-bold ${getScoreColor(student.averageScore)}`}>
                    {student.averageScore}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#37474F]">Conversaciones</span>
                  <span className="text-[#1E88E5] font-medium">
                    {Math.floor(Math.random() * 10) + 1}
                  </span>
                </div>

                <div className="pt-3 border-t border-blue-100">
                  <button
                    onClick={() => handleViewReports(student)}
                    className="w-full bg-[#1E88E5] hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center space-x-2 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Ver Reportes</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredStudents.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 mx-auto mb-4 text-[#37474F] opacity-50" />
            <p className="text-[#37474F] text-lg">No se encontraron estudiantes</p>
            <p className="text-[#37474F] text-sm">
              Intenta con un término de búsqueda diferente
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentManagement;