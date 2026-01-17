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
    doc.text(`INTERACTION REPORT WITH ${character.toUpperCase()}`, 40, 50);

    doc.setFontSize(11);
    doc.text(`Character: ${character} (${info.age} years, ${info.grade})`, 40, 72);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 40, 88);

    // Conversación
  const convBody = conversation.map((m: any) => [m.sender === 'user' ? 'Teacher' : character, m.content]);
    autoTable(doc, {
      startY: 110,
      head: [['Participant', 'Message']],
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
      head: [['Criterion', 'Description', 'Compliance', 'Analysis', 'Justification']],
      body: evalBody,
      theme: 'grid',
      headStyles: { fillColor: [76, 175, 80] },
      styles: { fontSize: 10 }
    });

    const afterEval = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 30 : afterConv + 180;

    // Conclusions — calculate text height, handle page breaks and bottom margin
    const pageHeight = (doc as any).internal?.pageSize?.getHeight ? (doc as any).internal.pageSize.getHeight() : (doc as any).internal.pageSize.height;
    const topMargin = 40;
    const bottomMargin = 50;
    let currentY = afterEval;
    const maxWidth = 520;

    conclusion.forEach((c: { title: string; text: string }) => {
      // Measure split text to calculate real height
      doc.setFontSize(12);
      const titleHeight = 14; // aprox

      doc.setFontSize(10);
      const splitText = doc.splitTextToSize(c.text, maxWidth);
      const lineHeight = 12; // pts per line for fontSize 10
      const textHeight = splitText.length * lineHeight;
      const blockHeight = titleHeight + 6 + textHeight + 12; // title + separator + text + padding

      // Si no cabe en la página actual, agregar nueva página
      if (currentY + blockHeight > pageHeight - bottomMargin) {
        doc.addPage();
        currentY = topMargin;
      }

      // Escribir título
      doc.setFontSize(12);
      doc.text(c.title, 40, currentY);

      // Escribir texto partido
      doc.setFontSize(10);
      doc.text(splitText, 40, currentY + 16, { maxWidth });

      // Avanzar cursor
      currentY = currentY + blockHeight;
    });

    // Save PDF
    doc.save(`evaluation_${character.toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4">
      <div className="w-[880px] max-w-full bg-white rounded-lg shadow-xl overflow-auto max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Preview: Evaluation Report</h3>
          <div className="flex items-center space-x-2">
            <button onClick={handleDownloadPdf} className="flex items-center space-x-2 px-3 py-2 bg-[#1E88E5] text-white rounded">
              <FileText className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
            <button onClick={onClose} className="p-2 text-gray-600 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {evaluationError && (
            <div className="p-3 bg-red-50 border-l-4 border-red-400 text-red-700 rounded">
              <strong>Error generating automatic evaluation:</strong>
              <div className="text-sm mt-1">{evaluationError}</div>
            </div>
          )}
          {/* Header info */}
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 rounded bg-gradient-to-br from-blue-400 to-blue-200 flex items-center justify-center text-2xl">{info.emoji}</div>
            <div>
              <h4 className="text-xl font-bold">{character}</h4>
              <p className="text-sm text-gray-600">{info.age} years · {info.grade}</p>
              <p className="text-sm text-gray-600">Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Conversación */}
          <div>
            <h5 className="font-semibold mb-2">1. Interaction</h5>
            <div className="border rounded overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-blue-50">
                    <tr>
                    <th className="px-4 py-2">Participant</th>
                    <th className="px-4 py-2">Message</th>
                  </tr>
                </thead>
                <tbody>
                      {conversation.map((m: any) => (
                    <tr key={m.id} className="odd:bg-white even:bg-gray-50">
                      <td className="px-4 py-2 align-top font-medium">{m.sender === 'user' ? 'Teacher' : character}</td>
                      <td className="px-4 py-2">{m.content}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Evaluación */}
          <div>
            <h5 className="font-semibold mb-2">2. Evaluation Table</h5>
            <div className="border rounded overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-green-50">
                    <tr>
                    <th className="px-4 py-2">Criterion</th>
                    <th className="px-4 py-2">Description</th>
                    <th className="px-4 py-2">Compliance</th>
                    <th className="px-4 py-2">Analysis</th>
                    <th className="px-4 py-2">Justification</th>
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
                    <th className="px-4 py-2">Total Score</th>
                    <th className="px-4 py-2">Performance Range</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="px-4 py-2 font-medium">{conclusion.find(c => c.title === 'Total Score')?.text}</td>
                    <td className="px-4 py-2">{conclusion.find(c => c.title === 'Total Score')?.text.split(' - Performance: ')[1]}</td>
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
                .filter(c => c.title !== 'Total Score' && c.title !== 'Areas for Improvement')
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
            <button onClick={onConfirm} className="px-4 py-2 bg-green-600 text-white rounded">Confirm and Return</button>
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvaluationPdfPreview;
