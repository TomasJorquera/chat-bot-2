import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileText, X } from 'lucide-react';
import { Message } from '../../types';

interface EvalRow {
  criterio: string;
  descripcion: string;
  cumplimiento: 'SÍ' | 'NO';
  analisis: string;
  justificacion: string;
}

interface Props {
  character: string;
  info: { emoji: string; age: number; grade: string };
  conversation: Message[];
  evaluation: EvalRow[];
  conclusion: { title: string; text: string }[];
  evaluationError?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

const EvaluationPdfPreview: React.FC<Props> = (props: Props) => {
  const { character, info, conversation, evaluation, conclusion, onClose, onConfirm, evaluationError } = props;

  const handleDownloadPdf = () => {
    const doc = new jsPDF({ unit: 'pt' });

    doc.setFontSize(18);
    doc.text(`REPORTE DE INTERACCIÓN CON ${character.toUpperCase()}`, 40, 50);

    doc.setFontSize(11);
    doc.text(`Personaje: ${character} (${info.age} años, ${info.grade})`, 40, 72);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 40, 88);

    // Conversación
  const convBody = conversation.map((m: any) => [m.sender === 'user' ? 'Docente' : character, m.content]);
    autoTable(doc, {
      startY: 110,
      head: [['Participante', 'Mensaje']],
      body: convBody,
      theme: 'striped',
      headStyles: { fillColor: [66, 165, 245] },
      styles: { fontSize: 10 }
    });

    // Posicionar la tabla de evaluación debajo de la conversación
    const afterConv = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 20 : 300;

  const evalBody = evaluation.map((e: EvalRow) => [e.criterio, e.descripcion, e.cumplimiento, e.analisis, e.justificacion]);
    autoTable(doc, {
      startY: afterConv,
      head: [['Criterio', 'Descripción', 'Cumplimiento', 'Análisis', 'Justificación']],
      body: evalBody,
      theme: 'grid',
      headStyles: { fillColor: [76, 175, 80] },
      styles: { fontSize: 10 }
    });

    const afterEval = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 20 : afterConv + 160;

    // Conclusiones
    conclusion.forEach((c: { title: string; text: string }, idx: number) => {
      doc.setFontSize(12);
      doc.text(c.title, 40, afterEval + idx * 40);
      doc.setFontSize(10);
      doc.text(c.text, 40, afterEval + 16 + idx * 40, { maxWidth: 520 });
    });

    doc.save(`evaluacion_${character.toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
      <div className="w-[880px] max-w-full bg-white rounded-lg shadow-xl overflow-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Vista previa: Reporte de Evaluación</h3>
          <div className="flex items-center space-x-2">
            <button onClick={handleDownloadPdf} className="flex items-center space-x-2 px-3 py-2 bg-[#1E88E5] text-white rounded">
              <FileText className="w-4 h-4" />
              <span>Descargar PDF</span>
            </button>
            <button onClick={onClose} className="p-2 text-gray-600 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {evaluationError && (
            <div className="p-3 bg-red-50 border-l-4 border-red-400 text-red-700 rounded">
              <strong>Error al generar la evaluación automática:</strong>
              <div className="text-sm mt-1">{evaluationError}</div>
            </div>
          )}
          {/* Header info */}
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 rounded bg-gradient-to-br from-blue-400 to-blue-200 flex items-center justify-center text-2xl">{info.emoji}</div>
            <div>
              <h4 className="text-xl font-bold">{character}</h4>
              <p className="text-sm text-gray-600">{info.age} años · {info.grade}</p>
              <p className="text-sm text-gray-600">Fecha: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Conversación */}
          <div>
            <h5 className="font-semibold mb-2">1. Interacción</h5>
            <div className="border rounded overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-4 py-2">Participante</th>
                    <th className="px-4 py-2">Mensaje</th>
                  </tr>
                </thead>
                <tbody>
                      {conversation.map((m: any) => (
                    <tr key={m.id} className="odd:bg-white even:bg-gray-50">
                      <td className="px-4 py-2 align-top font-medium">{m.sender === 'user' ? 'Docente' : character}</td>
                      <td className="px-4 py-2">{m.content}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Evaluación */}
          <div>
            <h5 className="font-semibold mb-2">2. Tabla de Evaluación</h5>
            <div className="border rounded overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-green-50">
                  <tr>
                    <th className="px-4 py-2">Criterio</th>
                    <th className="px-4 py-2">Descripción</th>
                    <th className="px-4 py-2">Cumplimiento</th>
                    <th className="px-4 py-2">Análisis</th>
                    <th className="px-4 py-2">Justificación</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluation.map((e: EvalRow, i: number) => (
                    <tr key={i} className="odd:bg-white even:bg-gray-50">
                      <td className="px-4 py-2 align-top font-medium">{e.criterio}</td>
                      <td className="px-4 py-2 align-top">{e.descripcion}</td>
                      <td className="px-4 py-2 align-top font-medium">{e.cumplimiento}</td>
                      <td className="px-4 py-2">{e.analisis}</td>
                      <td className="px-4 py-2">{e.justificacion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Range Table */}
          <div className="mb-6">
            <h5 className="font-semibold mb-2">3. Rango de Desempeño</h5>
            <div className="border rounded overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="px-4 py-2">Puntuación Total</th>
                    <th className="px-4 py-2">Rango de Desempeño</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="px-4 py-2 font-medium">{conclusion.find(c => c.title === 'Puntuación Total')?.text}</td>
                    <td className="px-4 py-2">{conclusion.find(c => c.title === 'Puntuación Total')?.text.split(' - Desempeño ')[1]}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Conclusión */}
          <div>
            <h5 className="font-semibold mb-2">4. Conclusión de la evaluación del desempeño</h5>
            <div className="space-y-3">
              {conclusion
                .filter(c => c.title !== 'Puntuación Total' && c.title !== 'Aspectos a Mejorar')
                .map((c: { title: string; text: string }, i: number) => (
                  <div key={i} className="p-3 border rounded bg-gray-50">
                    <strong className="block mb-1">{c.title}</strong>
                    <p className="text-sm text-gray-700">{c.text}</p>
                  </div>
                ))
              }
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button onClick={onConfirm} className="px-4 py-2 bg-green-600 text-white rounded">Confirmar y volver</button>
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationPdfPreview;
