import {
  CalendarClock,
  Database,
  HeartPulse,
  LayoutDashboard,
  ShieldCheck,
  Users
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const NAVEGACION = [
  {
    id: 'dashboard',
    etiqueta: 'Dashboard',
    descripcion: 'Revisión de RH y vencimientos',
    Icono: LayoutDashboard
  },
  {
    id: 'empleados',
    etiqueta: 'Empleados',
    descripcion: 'Altas, edición y estudios',
    Icono: Users
  },
  {
    id: 'tipos-estudio',
    etiqueta: 'Tipos de estudio',
    descripcion: 'Catálogo y vigencias',
    Icono: CalendarClock
  }
];

export default function Sidebar({ vista, onCambiar, info }) {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900/95 dark:bg-slate-950/90">
      <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-5">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
          <HeartPulse size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold tracking-tight text-white">Estudios Médicos</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Control de estudios médicos
          </p>
        </div>
        <ThemeToggle />
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAVEGACION.map(({ id, etiqueta, descripcion, Icono }) => {
          const activo = vista === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onCambiar(id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                activo
                  ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-inset ring-emerald-500/25'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Icono size={18} className="shrink-0" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{etiqueta}</span>
                <span className="block truncate text-[11px] text-slate-500">{descripcion}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 px-4 py-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <ShieldCheck size={13} className="text-emerald-400" />
            Base local
          </div>
          <div className="mt-2 flex items-start gap-2 text-[11px] text-slate-500">
            <Database size={13} className="mt-0.5 shrink-0" />
            <span className="break-all" title={info?.ruta_db || 'Base de datos SQLite'}>
              {info?.ruta_db ? 'SQLite conectada' : 'Conectando…'}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-slate-800 pt-2 text-[11px] text-slate-500">
            <span>Sin sesión iniciada</span>
            <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[10px] text-slate-400">
              v{info?.version || '1.0.0'}
            </span>
          </div>
        </div>
        <p className="mt-3 px-1 text-[10px] leading-relaxed text-slate-500">
          Los datos nunca salen de este equipo.
        </p>
      </div>
    </aside>
  );
}
