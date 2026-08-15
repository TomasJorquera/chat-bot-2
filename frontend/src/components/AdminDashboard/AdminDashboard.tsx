import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import RamosPanel from './RamosPanel';
import CostosPanel from './CostosPanel';

type View = 'ramos' | 'costos';

const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [view, setView] = useState<View>('ramos');

  const tabs: { id: View; label: string }[] = [
    { id: 'ramos', label: 'Ramos' },
    { id: 'costos', label: 'Costos IA' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Panel de Administrador</h1>
          <p className="text-sm text-slate-500">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-100"
        >
          Cerrar sesión
        </button>
      </header>

      <nav className="bg-white border-b border-slate-200 px-6">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                view === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="p-6">
        {view === 'ramos' ? <RamosPanel /> : <CostosPanel />}
      </main>
    </div>
  );
};

export default AdminDashboard;
