import { useMemo, useState } from 'react';
import {
  CalendarClock,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X
} from 'lucide-react';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import TipoEstudioForm from '../components/TipoEstudioForm';
import { useTiposEstudio } from '../hooks/useTiposEstudio';
import { normalizar } from '../lib/format';

export default function TiposEstudio() {
  const {
    tipos,
    cargando,
    error,
    recargar,
    toast,
    cerrarToast,
    form,
    abrirFormTipo,
    cerrarFormTipo,
    guardarTipo,
    eliminarTipo
  } = useTiposEstudio();

  const [busqueda, setBusqueda] = useState('');

  const filtrados = useMemo(() => {
    const consulta = normalizar(busqueda);
    if (!consulta) return tipos;
    return tipos.filter((tipo) => normalizar(tipo.nombre).includes(consulta));
  }, [tipos, busqueda]);

  const metricas = useMemo(() => {
    const total = tipos.length;
    const estudios = tipos.reduce((acumulado, tipo) => acumulado + (tipo.total_estudios ?? 0), 0);
    const conEstudios = tipos.filter((tipo) => (tipo.total_estudios ?? 0) > 0).length;
    const vigenciaPromedio =
      total > 0
        ? Math.round(
            tipos.reduce((acumulado, tipo) => acumulado + Number(tipo.vigencia_meses ?? 0), 0) / total
          )
        : 0;
    return { total, estudios, conEstudios, vigenciaPromedio };
  }, [tipos]);

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-6 lg:px-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400">
            Catálogo
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Tipos de estudio</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Modifique el nombre y la vigencia de los estudios. La vigencia define el vencimiento
            automático de cada registro.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-secondary" onClick={recargar} disabled={cargando}>
            <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <button type="button" className="btn-primary" onClick={() => abrirFormTipo()}>
            <Plus size={16} />
            Nuevo tipo de estudio
          </button>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { etiqueta: 'Tipos en catálogo', valor: metricas.total, color: 'text-slate-100' },
          { etiqueta: 'Con estudios', valor: metricas.conEstudios, color: 'text-sky-300' },
          { etiqueta: 'Estudios registrados', valor: metricas.estudios, color: 'text-emerald-300' },
          {
            etiqueta: 'Vigencia promedio',
            valor: `${metricas.vigenciaPromedio} m`,
            color: 'text-amber-300'
          }
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
              placeholder="Buscar tipo de estudio por nombre…"
              aria-label="Buscar tipos de estudio"
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
            {filtrados.length} tipo{filtrados.length === 1 ? '' : 's'} de estudio
          </span>
        </div>

        {error ? (
          <div className="border-b border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-xs text-rose-200">
            {error}
          </div>
        ) : null}

        {cargando && tipos.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
            <Loader2 size={18} className="animate-spin" />
            Cargando catálogo…
          </div>
        ) : filtrados.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <CalendarClock size={28} className="mx-auto text-slate-600" />
            <p className="mt-3 text-sm font-semibold text-slate-300">
              {tipos.length === 0
                ? 'El catálogo está vacío'
                : 'No hay tipos de estudio que coincidan con la búsqueda'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {tipos.length === 0
                ? 'Agregue el primer tipo de estudio para poder registrar expedientes.'
                : 'Pruebe con otro nombre o limpie el buscador.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr>
                  <th className="tabla-encabezado">Estudio</th>
                  <th className="tabla-encabezado">Vigencia</th>
                  <th className="tabla-encabezado">Estudios registrados</th>
                  <th className="tabla-encabezado text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filtrados.map((tipo) => (
                  <tr key={tipo.id} className="transition hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-100">{tipo.nombre}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge border-sky-500/25 bg-sky-500/10 text-sky-300">
                        {tipo.vigencia_meses} mes{tipo.vigencia_meses === 1 ? '' : 'es'}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-400">
                      {tipo.total_estudios ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          className="icon-btn"
                          title="Editar tipo de estudio"
                          onClick={() => abrirFormTipo(tipo)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-300"
                          title="Eliminar tipo de estudio"
                          onClick={() => eliminarTipo(tipo)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 px-4 py-3 text-[11px] text-slate-500">
          <span>
            Cambiar el nombre no altera los estudios registrados. Al cambiar la vigencia puede
            recalcular sus vencimientos.
          </span>
          <span>Los tipos con estudios registrados no se pueden eliminar</span>
        </footer>
      </section>

      <Modal
        abierto={Boolean(form)}
        onCerrar={cerrarFormTipo}
        titulo={form?.tipo ? 'Editar tipo de estudio' : 'Nuevo tipo de estudio'}
        descripcion="Los campos con * son obligatorios."
        ancho="max-w-xl"
      >
        {form ? (
          <TipoEstudioForm
            key={form.tipo?.id ?? 'nuevo-tipo-estudio'}
            tipo={form.tipo}
            onGuardar={guardarTipo}
            onCancelar={cerrarFormTipo}
          />
        ) : null}
      </Modal>

      <Toast toast={toast} onCerrar={cerrarToast} />
    </div>
  );
}
