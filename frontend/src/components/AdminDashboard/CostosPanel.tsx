import React, { useEffect, useState, useCallback } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, LabelList,
} from 'recharts';
import { useAuth } from '../../context/AuthContext';

const API = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

// Paleta categórica validada (orden fijo, no ciclar) — ver skill dataviz.
const SERIES_COLORS = ['#2a78d6', '#1baf7a', '#eda100', '#e34948'];
const INK_PRIMARY = '#0b0b0b';
const INK_SECONDARY = '#52514e';
const INK_MUTED = '#898781';
const GRID = '#e1e0d9';

interface Resumen {
  total_cost_usd: number;
  num_sesiones: number;
  num_alumnos: number;
  costo_promedio_sesion: number;
  costo_promedio_alumno: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cached_tokens: number;
}

interface PorRamo { ramo_codigo: string; num_sesiones: number; total_cost_usd: number; }
interface PorModelo { modelo: string; num_mensajes: number; total_cost_usd: number; }
interface PorDia { fecha: string; total_cost_usd: number; }
interface SesionRow {
  entrega_id: number;
  alumno_correo: string;
  ramo_codigo: string | null;
  simulacion_nombre: string | null;
  es_prueba: boolean;
  agente_usado: string;
  estado: string;
  total_cost_usd: number;
  total_input_tokens: number;
  total_output_tokens: number;
  fecha_inicio: string | null;
}

interface CostosData {
  resumen: Resumen;
  por_ramo: PorRamo[];
  por_modelo: PorModelo[];
  por_dia: PorDia[];
  sesiones: SesionRow[];
}

const StatTile: React.FC<{ label: string; value: string; hint?: string }> = ({ label, value, hint }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5">
    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</div>
    <div className="text-2xl font-semibold text-slate-900 mt-1 tabular-nums">{value}</div>
    {hint && <div className="text-xs text-slate-400 mt-1">{hint}</div>}
  </div>
);

const fmtUsd = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;

const CostosPanel: React.FC = () => {
  const { token } = useAuth();
  const [data, setData] = useState<CostosData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/admin/costos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('No se pudo cargar el resumen de costos.');
      setData(await res.json());
    } catch (e: any) {
      setError(e.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { cargar(); }, [cargar]);

  if (loading) return <div className="text-slate-400 text-sm">Cargando...</div>;
  if (error) return <div className="text-sm rounded-lg bg-red-50 text-red-700 px-4 py-2 max-w-md">{error}</div>;
  if (!data) return null;

  const { resumen, por_modelo, por_dia, sesiones } = data;
  const sinDatos = resumen.num_sesiones === 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile label="Gasto total" value={fmtUsd(resumen.total_cost_usd)} />
        <StatTile label="Sesiones" value={String(resumen.num_sesiones)} hint={`${resumen.num_alumnos} alumnos`} />
        <StatTile label="Promedio / sesión" value={fmtUsd(resumen.costo_promedio_sesion)} />
        <StatTile label="Promedio / alumno" value={fmtUsd(resumen.costo_promedio_alumno)} />
      </div>

      {sinDatos ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
          Aún no hay sesiones con costo registrado. Los datos aparecerán apenas los estudiantes empiecen a interactuar con Teo/Jojo.
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-medium text-slate-900 mb-4 text-sm">Costo por modelo</h3>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={por_modelo} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="modelo" tick={{ fontSize: 11, fill: INK_MUTED }} axisLine={{ stroke: GRID }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: INK_MUTED }} axisLine={false} tickLine={false} width={70}
                    tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v: number) => fmtUsd(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="total_cost_usd" name="Costo (USD)" fill={SERIES_COLORS[0]} radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="total_cost_usd" position="top" formatter={(v: number) => fmtUsd(v)}
                      style={{ fontSize: 11, fill: INK_SECONDARY }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-medium text-slate-900 mb-4 text-sm">Gasto acumulado por día</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={por_dia} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: INK_MUTED }} axisLine={{ stroke: GRID }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: INK_MUTED }} axisLine={false} tickLine={false} width={70}
                    tickFormatter={(v) => `$${v}`} />
                  <Tooltip formatter={(v: number) => fmtUsd(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Line type="monotone" dataKey="total_cost_usd" name="Costo (USD)"
                    stroke={SERIES_COLORS[0]} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 font-medium text-slate-900 text-sm">
              Detalle por sesión ({sesiones.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-medium text-slate-500 uppercase">
                    <th className="px-4 py-2.5">Alumno</th>
                    <th className="px-4 py-2.5">Ramo</th>
                    <th className="px-4 py-2.5">Agente</th>
                    <th className="px-4 py-2.5">Estado</th>
                    <th className="px-4 py-2.5 text-right">Tokens in/out</th>
                    <th className="px-4 py-2.5 text-right">Costo</th>
                    <th className="px-4 py-2.5">Inicio</th>
                  </tr>
                </thead>
                <tbody>
                  {sesiones.map((s) => (
                    <tr key={s.entrega_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-700">
                        {s.alumno_correo}
                        {s.es_prueba && (
                          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 align-middle">
                            Prueba
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{s.ramo_codigo || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-700">{s.agente_usado}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          s.estado === 'completada' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {s.estado}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-500 tabular-nums">
                        {s.total_input_tokens}/{s.total_output_tokens}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-900 tabular-nums">
                        {fmtUsd(s.total_cost_usd)}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 text-xs">
                        {s.fecha_inicio ? new Date(s.fecha_inicio).toLocaleString('es-CL') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CostosPanel;
