import { useMemo, useState } from 'react';
import {
  FileSpreadsheet,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Users,
  X
} from 'lucide-react';
import StatCard from '../components/StatCard';
import EmpleadosTabla from '../components/EmpleadosTabla';
import GestionModales from '../components/GestionModales';
import PanelRevision from '../components/PanelRevision';
import { api } from '../lib/api';
import { normalizar, resumirEmpleados } from '../lib/format';
import { useGestionEmpleados } from '../hooks/useGestionEmpleados';

const FILTROS = [
  { id: 'TODOS', etiqueta: 'Todos' },
  { id: 'VIGENTE', etiqueta: 'Vigentes' },
  { id: 'POR_VENCER', etiqueta: 'Próximos a vencer' },
  { id: 'BLOQUEADO', etiqueta: 'Bloqueados' },
  { id: 'VENCIDOS', etiqueta: 'Vencidos' }
];

export default function Dashboard() {
  const gestion = useGestionEmpleados();
  const {
    empleados,
    cargando,
    error,
    recargar,
    avisar,
    abrirDetalle,
    abrirFormEmpleado,
    abrirFormEstudio,
    eliminarEmpleado
  } = gestion;

  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState('TODOS');
  const [exportando, setExportando] = useState(false);

  const buscados = useMemo(() => {
    const consulta = normalizar(busqueda);
    if (!consulta) return empleados;
    return empleados.filter((empleado) =>
      [empleado.nombre_completo, empleado.numero_empleado, empleado.departamento, empleado.puesto].some(
        (valor) => normalizar(valor).includes(consulta)
      )
    );
  }, [empleados, busqueda]);

  const resumen = useMemo(() => resumirEmpleados(buscados), [buscados]);

  const porVencer = useMemo(
    () =>
      empleados
        .filter((empleado) => empleado.estado_semaforo === 'POR_VENCER')
        .sort((a, b) => (a.dias_para_vencer ?? 999) - (b.dias_para_vencer ?? 999)),
    [empleados]
  );

  const bloqueados = useMemo(() => {
    const prioridad = (empleado) => {
      const tieneVencido = empleado.estudios.some(
        (estudio) => typeof estudio.dias_para_vencer === 'number' && estudio.dias_para_vencer < 0
      );
      if (tieneVencido) return 0;
      if (empleado.estudios.length === 0) return 1;
      if (empleado.estado !== 'ACTIVO') return 2;
      if (empleado.estudios.some((estudio) => estudio.resultado === 'NO_APTO')) return 3;
      return 4;
    };

    return empleados
      .filter((empleado) => empleado.estado_semaforo === 'BLOQUEADO')
      .sort(
        (a, b) =>
          prioridad(a) - prioridad(b) ||
          String(a.nombre_completo).localeCompare(String(b.nombre_completo), 'es')
      );
  }, [empleados]);

  const filtrados = useMemo(() => {
    if (filtro === 'TODOS') return buscados;
    if (filtro === 'VENCIDOS') {
      return buscados.filter((empleado) =>
        empleado.estudios.some(
          (estudio) => typeof estudio.dias_para_vencer === 'number' && estudio.dias_para_vencer < 0
        )
      );
    }
    return buscados.filter((empleado) => empleado.estado_semaforo === filtro);
  }, [buscados, filtro]);

  const alternarFiltro = (estado) => setFiltro((actual) => (actual === estado ? 'TODOS' : estado));

  const verTodosPorVencer = () => {
    setBusqueda('');
    setFiltro('POR_VENCER');
  };

  const verTodosBloqueados = () => {
    setBusqueda('');
    setFiltro('BLOQUEADO');
  };

  async function exportarExcel() {
    setExportando(true);
    try {
      const resultado = await api.excel.exportar();
      if (resultado?.cancelado) return;

      avisar(`Excel generado con ${resultado.total_empleados} empleados en ${resultado.ruta}`, 'exito', {
        accion: {
          etiqueta: 'Abrir carpeta',
          onClick: () => api.app.revelar(resultado.ruta)
        },
        duracion: 15000
      });
    } catch (err) {
      avisar(err.message, 'error');
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400">
            Panel de control
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white">
            Control de estudios médicos
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Vista de Recursos Humanos: revisa quién está próximo a vencer, a quién se le venció y
            quién sigue vigente. Registra estudios y exporta el reporte cuando lo necesites.
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
          <button
            type="button"
            className="btn-primary bg-sky-500 text-sky-950 shadow-sky-500/20 hover:brightness-110"
            onClick={exportarExcel}
            disabled={exportando}
          >
            {exportando ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileSpreadsheet size={16} />
            )}
            Exportar a Excel
          </button>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          titulo="Empleados"
          valor={resumen.total}
          descripcion="Total en el filtro actual"
          Icono={Users}
          tono="slate"
          activo={filtro === 'TODOS'}
          onClick={() => setFiltro('TODOS')}
        />
        <StatCard
          titulo="Vigentes"
          valor={resumen.vigente}
          descripcion="Estudios al día"
          Icono={ShieldCheck}
          tono="emerald"
          activo={filtro === 'VIGENTE'}
          onClick={() => alternarFiltro('VIGENTE')}
        />
        <StatCard
          titulo="Próximos a vencer"
          valor={resumen.porVencer}
          descripcion="Vencen en 30 días o menos"
          Icono={Clock}
          tono="amber"
          activo={filtro === 'POR_VENCER'}
          onClick={() => alternarFiltro('POR_VENCER')}
        />
        <StatCard
          titulo="Bloqueados"
          valor={resumen.bloqueado}
          descripcion="Vencidos, No aptos, inactivos o sin estudios"
          Icono={ShieldAlert}
          tono="rose"
          activo={filtro === 'BLOQUEADO'}
          onClick={() => alternarFiltro('BLOQUEADO')}
        />
      </section>

      <PanelRevision
        porVencer={porVencer}
        bloqueados={bloqueados}
        onVer={abrirDetalle}
        onRegistrarEstudio={(empleado) => abrirFormEstudio(empleado)}
        onVerTodosPorVencer={verTodosPorVencer}
        onVerTodosBloqueados={verTodosBloqueados}
      />

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
              placeholder="Buscar por nombre, número de empleado, departamento o puesto…"
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

          <div className="flex flex-wrap items-center gap-1">
            {FILTROS.map((opcion) => (
              <button
                key={opcion.id}
                type="button"
                onClick={() => setFiltro(opcion.id)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  filtro === opcion.id
                    ? 'bg-slate-800 text-white ring-1 ring-inset ring-slate-700'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                {opcion.etiqueta}
              </button>
            ))}
          </div>

          <span className="ml-auto whitespace-nowrap text-[11px] font-medium text-slate-500">
            {filtrados.length} resultado{filtrados.length === 1 ? '' : 's'}
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

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 px-4 py-3 text-[11px] text-slate-500">
          <span>
            El reporte de Excel incluye las pestañas General, Próximos a Vencer y
            Bloqueados-Vencidos.
          </span>
          <span>Semáforo calculado al momento de cada consulta</span>
        </footer>
      </section>

      <GestionModales gestion={gestion} />
    </div>
  );
}
