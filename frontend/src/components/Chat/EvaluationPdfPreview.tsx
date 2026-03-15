import React from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Download, X, CheckCircle, XCircle } from 'lucide-react';
import { Message } from '../../types';

const C = {
  navy:     '#1a2744',
  navyDark: '#111b33',
  red:      '#c0392b',
  gold:     '#c9a84c',
  gray50:   '#f8f9fb',
  gray100:  '#eef0f5',
  gray200:  '#d8dce8',
  gray400:  '#8892aa',
  gray600:  '#4a5568',
  white:    '#ffffff',
};

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

const EvaluationPdfPreview: React.FC<Props> = ({
  character, info, conversation, evaluation, conclusion,
  onClose, onConfirm, evaluationError,
}) => {

  const handleDownloadPdf = () => {
    const doc = new jsPDF({ unit: 'pt' });
    const navy = [26, 39, 68]   as [number, number, number];
    const red  = [192, 57, 43]  as [number, number, number];
    const gold = [201, 168, 76] as [number, number, number];
    const gray = [248, 249, 251] as [number, number, number];

    doc.setFillColor(...navy);
    doc.rect(0, 0, 595, 72, 'F');
    doc.setFontSize(17);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('UNIVERSIDAD SAN SEBASTIÁN', 40, 28);
    doc.setFontSize(10);
    doc.setTextColor(...gold);
    doc.text('Plataforma educativa CHAT-BOT · Informe de Evaluación Pedagógica', 40, 45);
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    doc.text(`Personaje: ${character} (${info.age} años, ${info.grade})   ·   Fecha: ${new Date().toLocaleDateString()}`, 40, 60);

    doc.setTextColor(...navy);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Registro de la interacción', 40, 94);

    autoTable(doc, {
      startY: 102,
      head: [['Participante', 'Mensaje']],
      body: conversation.map((m: any) => [m.sender === 'user' ? 'Docente' : character, m.content]),
      theme: 'striped',
      headStyles: { fillColor: navy, textColor: [255,255,255], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 80 } },
      styles: { fontSize: 9, cellPadding: 6 },
      alternateRowStyles: { fillColor: gray },
    });

    const y1 = ((doc as any).lastAutoTable?.finalY ?? 276) + 24;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...navy);
    doc.text('2. Tabla de evaluación por criterios', 40, y1);

    autoTable(doc, {
      startY: y1 + 8,
      head: [['Criterio', 'Descripción', 'Cumplimiento', 'Análisis', 'Justificación']],
      body: evaluation.map(e => [e.criterio, e.descripcion, e.cumplimiento, e.analisis, e.justificacion]),
      theme: 'grid',
      headStyles: { fillColor: red, textColor: [255,255,255], fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 5 },
      alternateRowStyles: { fillColor: gray },
    });

    const y2 = ((doc as any).lastAutoTable?.finalY ?? (y1 + 176)) + 24;
    const pageH = (doc as any).internal.pageSize.getHeight();
    let y = y2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...navy);
    doc.text('3. Conclusión de la evaluación', 40, y);
    y += 16;

    conclusion.forEach(c => {
      const split = doc.splitTextToSize(c.text, 515);
      const blockH = 14 + split.length * 12 + 14;
      if (y + blockH > pageH - 50) { doc.addPage(); y = 40; }
      doc.setFillColor(...gray);
      doc.roundedRect(35, y - 2, 525, blockH, 4, 4, 'F');
      doc.setDrawColor(...gold);
      doc.setLineWidth(2);
      doc.line(35, y - 2, 35, y - 2 + blockH);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...navy);
      doc.text(c.title, 46, y + 11);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(74, 85, 104);
      doc.text(split, 46, y + 24);
      y += blockH + 10;
    });

    const pages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFillColor(...navy);
      doc.rect(0, pageH - 28, 595, 28, 'F');
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 180);
      doc.text('Universidad San Sebastián · Plataforma CHAT-BOT', 40, pageH - 11);
      doc.text(`Página ${i} de ${pages}`, 520, pageH - 11);
    }

    doc.save(`informe_${character.toLowerCase()}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const cumplidos = evaluation.filter(e => e.cumplimiento === 'SÍ').length;
  const pct = evaluation.length > 0 ? Math.round((cumplidos / evaluation.length) * 100) : 0;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      background: 'rgba(17,27,51,0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 920, maxHeight: '92vh',
        background: C.white, borderRadius: 16,
        boxShadow: '0 24px 64px rgba(17,27,51,0.35)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${C.navyDark} 0%, ${C.navy} 100%)`,
          padding: '0 24px', height: 72, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 8, padding: '6px 10px' }}>
              <img
                src="/LogoUniversidadSanSebastian.jpg"
                alt="USS"
                style={{ height: 32, width: 'auto', objectFit: 'contain', display: 'block' }}
                onError={e => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = 'none'; }}
              />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: C.white, fontFamily: "'Georgia', serif" }}>
                Informe de Evaluación Pedagógica
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
                {character} · {info.age} años · {info.grade} · {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={handleDownloadPdf}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: C.red, color: C.white,
                fontSize: 13, fontWeight: 700, fontFamily: "'Georgia', serif", transition: 'all 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#a93226'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = C.red; }}
            >
              <Download style={{ width: 15, height: 15 }} />
              Descargar PDF
            </button>
            <button onClick={onClose}
              style={{
                width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
                background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              <X style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.7)' }} />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 28, background: C.gray50 }}>

          {evaluationError && (
            <div style={{
              marginBottom: 20, padding: '10px 16px', borderRadius: 8,
              background: '#fef9c3', border: '1px solid #fde047', fontSize: 12, color: '#854d0e',
            }}>
              <strong>Nota:</strong> Se muestra evaluación de ejemplo. · {evaluationError}
            </div>
          )}

          {/* Score banner */}
          <div style={{
            background: `linear-gradient(135deg, ${C.navy} 0%, #243459 100%)`,
            borderRadius: 12, padding: '20px 24px', marginBottom: 24,
            display: 'flex', alignItems: 'center', gap: 24,
          }}>
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: C.white, fontFamily: "'Georgia', serif", lineHeight: 1 }}>{cumplidos}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>de {evaluation.length} criterios</div>
            </div>
            <div style={{ width: 1, height: 48, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.12)', overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: pct >= 73 ? '#22c55e' : pct >= 45 ? C.gold : C.red }} />
              </div>
              <div style={{ fontSize: 13, color: C.white, fontWeight: 700 }}>
                {pct}% cumplimiento
                {conclusion.find(c => c.title === 'Puntaje total') &&
                  ` · ${conclusion.find(c => c.title === 'Puntaje total')!.text.split(' - Desempeño: ')[1] ?? ''}`}
              </div>
            </div>
          </div>

          {/* 1. Conversación */}
          <Section title="1. Registro de la interacción" accent={C.navy}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.navy }}>
                  <th style={{ ...thS, width: 100 }}>Participante</th>
                  <th style={thS}>Mensaje</th>
                </tr>
              </thead>
              <tbody>
                {conversation.map((m: any, i: number) => (
                  <tr key={m.id} style={{ background: i % 2 === 0 ? C.white : C.gray50 }}>
                    <td style={{ ...tdS, fontWeight: 700, color: m.sender === 'user' ? C.navy : C.red }}>
                      {m.sender === 'user' ? 'Docente' : character}
                    </td>
                    <td style={tdS}>{m.content}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          {/* 2. Evaluación */}
          <Section title="2. Tabla de evaluación por criterios" accent={C.red}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: C.red }}>
                  {['Criterio', 'Descripción', 'Cumplimiento', 'Análisis', 'Justificación'].map(h => (
                    <th key={h} style={thS}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {evaluation.map((e: EvalRow, i: number) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? C.white : C.gray50 }}>
                    <td style={{ ...tdS, fontWeight: 600, color: C.navyDark }}>{e.criterio}</td>
                    <td style={tdS}>{e.descripcion}</td>
                    <td style={{ ...tdS, textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: e.cumplimiento === 'SÍ' ? '#dcfce7' : '#fee2e2',
                        color: e.cumplimiento === 'SÍ' ? '#16a34a' : '#dc2626',
                      }}>
                        {e.cumplimiento === 'SÍ'
                          ? <CheckCircle style={{ width: 12, height: 12 }} />
                          : <XCircle style={{ width: 12, height: 12 }} />}
                        {e.cumplimiento}
                      </span>
                    </td>
                    <td style={tdS}>{e.analisis}</td>
                    <td style={tdS}>{e.justificacion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          {/* 3. Conclusión */}
          <Section title="3. Conclusión de la evaluación" accent={C.gold}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16 }}>
              {conclusion.filter(c => c.title !== 'Puntaje total').map((c, i) => (
                <div key={i} style={{
                  padding: '12px 16px', borderRadius: 8,
                  background: C.white, border: `1px solid ${C.gray200}`,
                  borderLeft: `4px solid ${C.gold}`,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: C.navyDark, fontFamily: "'Georgia', serif", marginBottom: 5 }}>
                    {c.title}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: C.gray600, lineHeight: 1.6, whiteSpace: 'pre-line' }}>{c.text}</p>
                </div>
              ))}
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div style={{
          background: C.white, borderTop: `1px solid ${C.gray200}`,
          padding: '14px 24px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10,
        }}>
          <button onClick={onClose}
            style={{
              padding: '9px 20px', borderRadius: 8, border: `1px solid ${C.gray200}`,
              background: C.white, color: C.gray600, cursor: 'pointer',
              fontSize: 13, fontFamily: "'Georgia', serif", transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = C.gray100; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = C.white; }}
          >Cerrar</button>
          <button onClick={onConfirm}
            style={{
              padding: '9px 20px', borderRadius: 8, border: 'none',
              background: C.navy, color: C.white, cursor: 'pointer',
              fontSize: 13, fontWeight: 700, fontFamily: "'Georgia', serif", transition: 'all 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#243459'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = C.navy; }}
          >Confirmar y volver</button>
        </div>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; accent: string; children: React.ReactNode }> = ({ title, accent, children }) => (
  <div style={{ marginBottom: 22 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
      <div style={{ width: 4, height: 20, borderRadius: 2, background: accent, flexShrink: 0 }} />
      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: '#111b33', fontFamily: "'Georgia', serif" }}>{title}</h3>
    </div>
    <div style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #d8dce8' }}>
      {children}
    </div>
  </div>
);

const thS: React.CSSProperties = {
  padding: '10px 14px', textAlign: 'left', fontSize: 11,
  fontWeight: 700, color: '#ffffff', textTransform: 'uppercase',
  letterSpacing: 0.8, fontFamily: "'Georgia', serif",
};

const tdS: React.CSSProperties = {
  padding: '10px 14px', fontSize: 12, color: '#4a5568',
  borderBottom: '1px solid #eef0f5', verticalAlign: 'top',
};

export default EvaluationPdfPreview;
