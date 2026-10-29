import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Empleados from './pages/Empleados';
import TiposEstudio from './pages/TiposEstudio';
import { api } from './lib/api';

const VISTAS = {
  dashboard: Dashboard,
  empleados: Empleados,
  'tipos-estudio': TiposEstudio
};

export default function App() {
  const [vista, setVista] = useState('dashboard');
  const [info, setInfo] = useState(null);

  useEffect(() => {
    if (!api) return;
    api.app
      .info()
      .then(setInfo)
      .catch((error) => console.error('[app] No se pudo obtener la información', error));
  }, []);

  const Vista = VISTAS[vista] ?? Dashboard;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_55%),radial-gradient(circle_at_bottom_left,rgba(56,189,248,0.06),transparent_50%)]"
      />
      <Sidebar vista={vista} onCambiar={setVista} info={info} />
      <main className="relative flex-1 overflow-y-auto">
        <Vista />
      </main>
    </div>
  );
}
