import { Eye, FilePlus2, Pencil, Trash2, Users } from 'lucide-react';
import SemaforoBadge from './SemaforoBadge';
import { formatearDias, formatearFecha } from '../lib/fechas';
import {
  ETIQUETAS_RESULTADO,
  ESTILOS_RESULTADO,
  estiloSemaforo,
  iniciales
} from '../lib/format';

export default function EmpleadosTabla({
  empleados = [],
  onVer,
  onEditar,
  onEliminar,
  onAgregarEstudio
}) {
  if (empleados.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-500">
          <Users size={24} />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-200">No hay empleados que coincidan</p>
          <p className="mt-1 text-xs text-slate-500">
            Ajuste la búsqueda o registre un empleado nuevo para comenzar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="tabla-encabezado">Empleado</th>
            <th className="tabla-encabezado">Departamento / Puesto</th>
            <th className="tabla-encabezado">Estudios</th>
            <th className="tabla-encabezado">Próximo vencimiento</th>
            <th className="tabla-encabezado">Estado</th>
            <th className="tabla-encabezado text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80">
          {empleados.map((empleado) => {
            const estilo = estiloSemaforo(empleado.estado_semaforo);
            const critico = empleado.estudio_critico;
            const inactivo = empleado.estado !== 'ACTIVO';

            return (
              <tr key={empleado.id} className="group transition hover:bg-slate-800/30">
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onVer?.(empleado)}
                    className="flex items-center gap-3 text-left"
                  >
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-bold ring-1 ring-inset ring-white/5 ${estilo.suave} ${estilo.texto}`}
                    >
                      {iniciales(empleado.nombre, empleado.apellido)}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-100 group-hover:text-white">
                        {empleado.nombre_completo}
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className="font-mono text-[11px] text-slate-500">
                          {empleado.numero_empleado}
                        </span>
                        {inactivo ? (
                          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Inactivo
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>
                </td>

                <td className="px-4 py-3">
                  <p className="text-slate-300">{empleado.departamento || '—'}</p>
                  <p className="text-[11px] text-slate-500">{empleado.puesto || 'Sin puesto'}</p>
                </td>

                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-200">
                    {empleado.estudios.length} vigente{empleado.estudios.length === 1 ? '' : 's'}
                  </p>
                  <p className="max-w-[190px] truncate text-[11px] text-slate-500">
                    {critico
                      ? `${critico.tipo_estudio} · ${ETIQUETAS_RESULTADO[critico.resultado] || critico.resultado}`
                      : 'Sin estudios registrados'}
                  </p>
                </td>

                <td className="px-4 py-3">
                  {empleado.fecha_proximo_vencimiento ? (
                    <>
                      <p className="text-slate-300">
                        {formatearFecha(empleado.fecha_proximo_vencimiento)}
                      </p>
                      <p className={`text-[11px] font-medium ${estilo.texto}`}>
                        {formatearDias(empleado.dias_para_vencer)}
                      </p>
                    </>
                  ) : (
                    <span className="text-slate-500">—</span>
                  )}
                </td>

                <td className="px-4 py-3">
                  <SemaforoBadge estado={empleado.estado_semaforo} />
                  {critico ? (
                    <span
                      className={`badge mt-1 ${ESTILOS_RESULTADO[critico.resultado] || 'border-slate-700 bg-slate-800 text-slate-300'}`}
                    >
                      {ETIQUETAS_RESULTADO[critico.resultado] || critico.resultado}
                    </span>
                  ) : null}
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      className="icon-btn"
                      title="Ver detalle"
                      onClick={() => onVer?.(empleado)}
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Registrar estudio"
                      onClick={() => onAgregarEstudio?.(empleado)}
                    >
                      <FilePlus2 size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Editar empleado"
                      onClick={() => onEditar?.(empleado)}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-300"
                      title="Eliminar empleado"
                      onClick={() => onEliminar?.(empleado)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
