import { useMemo, useState } from 'react';
import { Loader2, Plus, RefreshCw, Search, X } from 'lucide-react';
import EmpleadosTabla from '../components/EmpleadosTabla';
import GestionModales from '../components/GestionModales';
import { normalizar } from '../lib/format';
import { useGestionEmpleados } from '../hooks/useGestionEmpleados';

export default function Empleados() {
  const gestion = useGestionEmpleados();
  const {
    empleados,
    cargando,
    error,
    recargar,
    abrirDetalle,
    abrirFormEmpleado,
    abrirFormEstudio,
    eliminarEmpleado
  } = gestion;

  const [busqueda, setBusqueda] = useState('');

  const filtrados = useMemo(() => {
    const consulta = normalizar(busqueda);
    if (!consulta) return empleados;
    return empleados.filter((empleado) =>
      [empleado.nombre_completo, empleado.numero_empleado, empleado.departamento, empleado.puesto].some(
        (valor) => normalizar(valor).includes(consulta)
      )
    );
  }, [empleados, busqueda]);

  const metricas = useMemo(() => {
    const activos = empleados.filter((empleado) => empleado.estado === 'ACTIVO').length;
    return {
      total: empleados.length,
      activos,
      inactivos: empleados.length - activos,
      conEstudios: empleados.filter((empleado) => empleado.total_estudios > 0).length
    };
  }, [empleados]);

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400">
            Expedientes
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white">
            Gestión de empleados
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Alta, edición y registro de estudios. Cada estudio nuevo recalcula el semáforo del
            empleado.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-secondary" onClick={recargar} disabled={cargando}>
            <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button type="button" className="btn-primary" onClick={() => abrirFormEmpleado()}>
            <Plus size={16} />
            Nuevo empleado
          </button>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { etiqueta: 'Total', valor: metricas.total, color: 'text-slate-100' },
          { etiqueta: 'Activos', valor: metricas.activos, color: 'text-emerald-300' },
          { etiqueta: 'Inactivos', valor: metricas.inactivos, color: 'text-rose-300' },
          { etiqueta: 'Con estudios', valor: metricas.conEstudios, color: 'text-sky-300' }
        ].map((metrica) => (
          <div key={metrica.etiqueta} className="card px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {metrica.etiqueta}
            </p>
            <p className={`mt-1 text-2xl font-black tabular-nums ${metrica.color}`}>
              {metrica.valor}
            </p>
          </div>
        ))}
      </section>

      <section className="card mt-5 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 px-4 py-3">
          <div className="relative min-w-[240px] flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="search"
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
              className="input pl-10 pr-9"
              placeholder="Buscar empleado por nombre, número, departamento o puesto…"
              aria-label="Buscar empleados"
            />
            {busqueda ? (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
                title="Limpiar búsqueda"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
          <span className="ml-auto whitespace-nowrap text-[11px] font-medium text-slate-500">
            {filtrados.length} empleado{filtrados.length === 1 ? '' : 's'}
          </span>
        </div>

        {error ? (
          <div className="border-b border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200">
            {error}
          </div>
        ) : null}

        {cargando && empleados.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
            <Loader2 size={18} className="animate-spin" />
            Cargando empleados…
          </div>
        ) : (
          <EmpleadosTabla
            empleados={filtrados}
            onVer={abrirDetalle}
            onEditar={abrirFormEmpleado}
            onAgregarEstudio={(empleado) => abrirFormEstudio(empleado)}
            onEliminar={eliminarEmpleado}
          />
        )}
      </section>

      <GestionModales gestion={gestion} />
    </div>
  );
}
