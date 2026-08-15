import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import ChatInterface from '../Chat/ChatInterface';

const API = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

interface Ramo {
  id: number;
  codigo: string;
  nombre: string;
  profesor_correo: string | null;
  num_alumnos: number;
}

interface AlumnoRow {
  id: number;
  correo: string;
  activo: boolean;
}

interface RamoDetalle extends Ramo {
  alumnos: AlumnoRow[];
}

const RamosPanel: React.FC = () => {
  const { token } = useAuth();
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const [ramos, setRamos] = useState<Ramo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [nuevoCodigo, setNuevoCodigo] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [creando, setCreando] = useState(false);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<RamoDetalle | null>(null);
  const [correoDocente, setCorreoDocente] = useState('');
  const [correosAlumnos, setCorreosAlumnos] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');

  const [chatCharacter, setChatCharacter] = useState<'Teo' | 'Jojo' | null>(null);
  const [chatEntregaId, setChatEntregaId] = useState<number | undefined>(undefined);

  const iniciarChatPrueba = async (character: 'Teo' | 'Jojo') => {
    if (!selectedId) return;
    try {
      const res = await fetch(`${API}/ramos/${selectedId}/chat-prueba`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ agente: character }),
      });
      if (!res.ok) throw new Error('No se pudo iniciar la sesión de prueba.');
      const data = await res.json();
      setChatEntregaId(data.entrega_id);
      setChatCharacter(character);
    } catch (e: any) {
      setFeedback(e.message);
    }
  };

  const cargarRamos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/admin/ramos`, { headers: authHeaders });
      if (!res.ok) throw new Error('No se pudo cargar la lista de ramos.');
      setRamos(await res.json());
    } catch (e: any) {
      setError(e.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const cargarDetalle = useCallback(async (id: number) => {
    const res = await fetch(`${API}/admin/ramos/${id}`, { headers: authHeaders });
    if (res.ok) setDetalle(await res.json());
  }, [token]);

  useEffect(() => { cargarRamos(); }, [cargarRamos]);
  useEffect(() => {
    if (selectedId !== null) cargarDetalle(selectedId);
    else setDetalle(null);
  }, [selectedId, cargarDetalle]);

  const crearRamo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoCodigo.trim() || !nuevoNombre.trim()) return;
    setCreando(true);
    setError('');
    try {
      const res = await fetch(`${API}/admin/ramos`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ codigo: nuevoCodigo.trim(), nombre: nuevoNombre.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'No se pudo crear el ramo.');
      }
      setNuevoCodigo('');
      setNuevoNombre('');
      await cargarRamos();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreando(false);
    }
  };

  const asignarProfesor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !correoDocente.trim()) return;
    setBusy(true);
    setFeedback('');
    try {
      const res = await fetch(`${API}/admin/ramos/${selectedId}/profesor`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ correo_docente: correoDocente.trim() }),
      });
      if (!res.ok) throw new Error('No se pudo asignar el profesor.');
      setCorreoDocente('');
      await Promise.all([cargarDetalle(selectedId), cargarRamos()]);
      setFeedback('Profesor asignado correctamente.');
    } catch (e: any) {
      setFeedback(e.message);
    } finally {
      setBusy(false);
    }
  };

  const importarAlumnos = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !correosAlumnos.trim()) return;
    const correos = correosAlumnos
      .split(/[\n,;]+/)
      .map((c) => c.trim())
      .filter(Boolean);
    if (correos.length === 0) return;

    setBusy(true);
    setFeedback('');
    try {
      const res = await fetch(`${API}/admin/ramos/${selectedId}/alumnos`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ correos }),
      });
      if (!res.ok) throw new Error('No se pudo importar la lista de alumnos.');
      const data = await res.json();
      setCorreosAlumnos('');
      await Promise.all([cargarDetalle(selectedId), cargarRamos()]);
      setFeedback(
        `${data.cuentas_creadas} cuenta(s) nueva(s), ${data.alumnos_matriculados} matriculado(s), ${data.omitidos_ya_matriculados} ya estaban.`
      );
    } catch (e: any) {
      setFeedback(e.message);
    } finally {
      setBusy(false);
    }
  };

  const quitarAlumno = async (alumnoId: number) => {
    if (!selectedId) return;
    await fetch(`${API}/admin/ramos/${selectedId}/alumnos/${alumnoId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    await Promise.all([cargarDetalle(selectedId), cargarRamos()]);
  };

  if (chatCharacter) {
    return (
      <ChatInterface
        character={chatCharacter}
        entregaId={chatEntregaId}
        onBack={() => { setChatCharacter(null); setChatEntregaId(undefined); }}
      />
    );
  }

  if (selectedId !== null && detalle) {
    return (
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => setSelectedId(null)}
          className="text-sm text-indigo-600 hover:text-indigo-800 mb-4 font-medium"
        >
          ← Volver a ramos
        </button>

        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900">{detalle.codigo} — {detalle.nombre}</h2>
          <p className="text-sm text-slate-500 mt-1">
            Profesor: {detalle.profesor_correo || <span className="italic">sin asignar</span>}
          </p>
        </div>

        {feedback && (
          <div className="mb-4 text-sm rounded-lg bg-indigo-50 text-indigo-700 px-4 py-2">{feedback}</div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <h3 className="font-medium text-slate-900 mb-1">Probar chat</h3>
          <p className="text-xs text-slate-500 mb-3">
            Abre una sesión de exploración con Teo o Jojo para este ramo — queda registrada como "Prueba" en Costos IA, separada de las sesiones reales de alumnos.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => iniciarChatPrueba('Teo')}
              className="flex-1 bg-white border border-indigo-200 text-indigo-700 rounded-lg py-2 text-sm font-medium hover:bg-indigo-50"
            >
              🧒 Probar con Teo
            </button>
            <button
              onClick={() => iniciarChatPrueba('Jojo')}
              className="flex-1 bg-white border border-indigo-200 text-indigo-700 rounded-lg py-2 text-sm font-medium hover:bg-indigo-50"
            >
              👧 Probar con Jojo
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <form onSubmit={asignarProfesor} className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-medium text-slate-900 mb-3">Asignar profesor</h3>
            <input
              type="email"
              placeholder="correo@docente.uss.cl"
              value={correoDocente}
              onChange={(e) => setCorreoDocente(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
            />
            <button
              disabled={busy}
              className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              Asignar
            </button>
          </form>

          <form onSubmit={importarAlumnos} className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-medium text-slate-900 mb-3">Importar alumnos</h3>
            <textarea
              placeholder={'un correo por línea\nalumno1@correo.uss.cl\nalumno2@correo.uss.cl'}
              value={correosAlumnos}
              onChange={(e) => setCorreosAlumnos(e.target.value)}
              rows={4}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3 font-mono"
            />
            <button
              disabled={busy}
              className="w-full bg-indigo-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              Importar
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-200 font-medium text-slate-900">
            Alumnos matriculados ({detalle.alumnos.length})
          </div>
          <table className="w-full text-sm">
            <tbody>
              {detalle.alumnos.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-2.5 text-slate-700">{a.correo}</td>
                  <td className="px-5 py-2.5 text-right">
                    <button
                      onClick={() => quitarAlumno(a.id)}
                      className="text-red-600 hover:text-red-800 text-xs font-medium"
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
              {detalle.alumnos.length === 0 && (
                <tr>
                  <td className="px-5 py-4 text-slate-400 italic">Sin alumnos matriculados aún.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={crearRamo} className="bg-white rounded-xl border border-slate-200 p-5 mb-6 flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-500 mb-1">Código</label>
          <input
            value={nuevoCodigo}
            onChange={(e) => setNuevoCodigo(e.target.value)}
            placeholder="EDU-301"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-[2]">
          <label className="block text-xs font-medium text-slate-500 mb-1">Nombre</label>
          <input
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder="Necesidades Educativas Especiales"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <button
          disabled={creando}
          className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          Crear ramo
        </button>
      </form>

      {error && <div className="mb-4 text-sm rounded-lg bg-red-50 text-red-700 px-4 py-2">{error}</div>}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-medium text-slate-500 uppercase">
              <th className="px-5 py-3">Ramo</th>
              <th className="px-5 py-3">Profesor</th>
              <th className="px-5 py-3">Alumnos</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={4} className="px-5 py-6 text-center text-slate-400">Cargando...</td></tr>
            )}
            {!loading && ramos.length === 0 && (
              <tr><td colSpan={4} className="px-5 py-6 text-center text-slate-400">Sin ramos creados aún.</td></tr>
            )}
            {ramos.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-5 py-3">
                  <div className="font-medium text-slate-900">{r.codigo}</div>
                  <div className="text-slate-500 text-xs">{r.nombre}</div>
                </td>
                <td className="px-5 py-3 text-slate-700">
                  {r.profesor_correo || <span className="italic text-slate-400">sin asignar</span>}
                </td>
                <td className="px-5 py-3 text-slate-700">{r.num_alumnos}</td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => setSelectedId(r.id)}
                    className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                  >
                    Gestionar →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RamosPanel;
