import { ArrowRight, CalendarClock, CheckCircle2, FilePlus2, ShieldAlert } from 'lucide-react';
import { formatearDias, formatearFecha } from '../lib/fechas';
import { iniciales } from '../lib/format';

function Avatar({ empleado, tono }) {
  return (
    <span
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-[11px] font-bold ring-1 ring-inset ring-white/5 ${
        tono === 'amber' ? 'bg-amber-500/10 text-amber-300' : 'bg-rose-500/10 text-rose-300'
      }`}
    >
      {iniciales(empleado.nombre, empleado.apellido)}
    </span>
  );
}

function motivoCorto(empleado) {
  if (!empleado.estudios || empleado.estudios.length === 0) return 'Sin estudios registrados';
  if (empleado.estado !== 'ACTIVO') return 'Empleado inactivo';
  const critico = empleado.estudio_critico;
  if (critico?.resultado === 'NO_APTO') return 'Resultado No apto';
  if (critico && typeof critico.dias_para_vencer === 'number' && critico.dias_para_vencer < 0) {
    return 'Estudio vencido';
  }
  return 'Acceso bloqueado';
}

function ListaVacia({ mensaje }) {
  return (
    <div className="flex items-center gap-2 px-4 py-6 text-xs text-slate-500">
      <CheckCircle2 size={14} className="shrink-0 text-emerald-500/70" />
      {mensaje}
    </div>
  );
}

/**
 * Bandeja de trabajo de Recursos Humanos: lo primero que debe ver el administrador
 * al entrar. Prioriza renovaciones y regularizaciones, no la tabla completa.
 */
export default function PanelRevision({
  porVencer = [],
  bloqueados = [],
  onVer,
  onRegistrarEstudio,
  onVerTodosPorVencer,
  onVerTodosBloqueados
}) {
  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Bandeja de trabajo
          </p>
          <h2 className="mt-0.5 text-sm font-bold text-slate-200">
            Pendientes de revisión de Recursos Humanos
          </h2>
        </div>
        <p className="text-[11px] text-slate-500">
          Ordenado por urgencia · haz clic en un empleado para ver su expediente
        </p>
      </div>

      <div className="mt-3 grid gap-4 xl:grid-cols-2">
        <article className="card overflow-hidden">
          <header className="flex items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-400">
                <CalendarClock size={16} />
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-slate-100">
                  Próximos a vencer
                  <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                    {porVencer.length}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">Estudios que vencen en 30 días o menos</p>
              </div>
            </div>
            <button
              type="button"
              className="btn-ghost shrink-0 whitespace-nowrap text-[11px]"
              onClick={onVerTodosPorVencer}
            >
              Ver todos
              <ArrowRight size={13} />
            </button>
          </header>

          {porVencer.length === 0 ? (
            <ListaVacia mensaje="No hay estudios por vencer en los próximos 30 días." />
          ) : (
            <ul className="divide-y divide-slate-800/70">
              {porVencer.slice(0, 5).map((empleado) => {
                const critico = empleado.estudio_critico;
                return (
                  <li
                    key={empleado.id}
                    className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-slate-800/30"
                  >
                    <Avatar empleado={empleado} tono="amber" />
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => onVer(empleado)}
                      title="Ver expediente"
                    >
                      <span className="block truncate text-sm font-medium text-slate-200">
                        {empleado.nombre_completo}
                      </span>
                      <span className="block truncate text-[11px] text-slate-500">
                        {empleado.numero_empleado} · {critico?.tipo_estudio || 'Estudio'}
                      </span>
                    </button>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] font-bold text-amber-300">
                        {formatearDias(empleado.dias_para_vencer)}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {formatearFecha(empleado.fecha_proximo_vencimiento)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="icon-btn shrink-0"
                      title="Registrar renovación"
                      onClick={() => onRegistrarEstudio(empleado)}
                    >
                      <FilePlus2 size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {porVencer.length > 5 ? (
            <div className="border-t border-slate-800 px-4 py-2 text-[11px] text-slate-500">
              y {porVencer.length - 5} empleado(s) más…
            </div>
          ) : null}
        </article>

        <article className="card overflow-hidden">
          <header className="flex items-center justify-between gap-2 border-b border-slate-800 px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-rose-400">
                <ShieldAlert size={16} />
              </span>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-slate-100">
                  Vencidos y bloqueados
                  <span className="ml-2 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                    {bloqueados.length}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Vencidos, No aptos, inactivos o sin estudios
                </p>
              </div>
            </div>
            <button
              type="button"
              className="btn-ghost shrink-0 whitespace-nowrap text-[11px]"
              onClick={onVerTodosBloqueados}
            >
              Ver todos
              <ArrowRight size={13} />
            </button>
          </header>

          {bloqueados.length === 0 ? (
            <ListaVacia mensaje="Todos los empleados están al día." />
          ) : (
            <ul className="divide-y divide-slate-800/70">
              {bloqueados.slice(0, 5).map((empleado) => {
                const critico = empleado.estudio_critico;
                return (
                  <li
                    key={empleado.id}
                    className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-slate-800/30"
                  >
                    <Avatar empleado={empleado} tono="rose" />
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => onVer(empleado)}
                      title="Ver expediente"
                    >
                      <span className="block truncate text-sm font-medium text-slate-200">
                        {empleado.nombre_completo}
                      </span>
                      <span className="block truncate text-[11px] text-slate-500">
                        {empleado.numero_empleado} · {motivoCorto(empleado)}
                      </span>
                    </button>
                    <div className="shrink-0 text-right">
                      {critico?.fecha_vencimiento ? (
                        <>
                          <p className="text-[11px] font-semibold text-rose-300">
                            {formatearFecha(critico.fecha_vencimiento)}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {formatearDias(critico.dias_para_vencer)}
                          </p>
                        </>
                      ) : (
                        <p className="text-[10px] text-slate-500">Regularizar</p>
                      )}
                    </div>
                    <button
                      type="button"
                      className="icon-btn shrink-0"
                      title="Registrar estudio"
                      onClick={() => onRegistrarEstudio(empleado)}
                    >
                      <FilePlus2 size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {bloqueados.length > 5 ? (
            <div className="border-t border-slate-800 px-4 py-2 text-[11px] text-slate-500">
              y {bloqueados.length - 5} empleado(s) más…
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
