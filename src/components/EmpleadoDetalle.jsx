import { useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  FilePlus2,
  FileText,
  Info,
  Paperclip,
  Pencil,
  Trash2,
  UserRound
} from 'lucide-react';
import SemaforoBadge from './SemaforoBadge';
import { api } from '../lib/api';
import { formatearDias, formatearFecha } from '../lib/fechas';
import {
  ETIQUETAS_RESULTADO,
  ESTILOS_RESULTADO,
  estiloSemaforo,
  iniciales,
  nombreArchivo
} from '../lib/format';

export default function EmpleadoDetalle({
  empleado,
  onAgregarEstudio,
  onEditarEstudio,
  onEliminarEstudio,
  onEditarEmpleado,
  onEliminarEmpleado
}) {
  const [errorArchivo, setErrorArchivo] = useState(null);
  const estilo = estiloSemaforo(empleado.estado_semaforo);

  async function abrirArchivo(estudio) {
    setErrorArchivo(null);
    try {
      await api.archivos.abrir(estudio.ruta_archivo);
    } catch (error) {
      setErrorArchivo(error.message);
    }
  }

  return (
    <div className="space-y-5">
      <div className={`rounded-2xl border p-4 ${estilo.badge}`}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-950/40 text-sm font-black">
            {iniciales(empleado.nombre, empleado.apellido)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold text-white">{empleado.nombre_completo}</p>
            <p className="font-mono text-xs opacity-80">{empleado.numero_empleado}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <SemaforoBadge estado={empleado.estado_semaforo} />
            <span className="text-[11px] font-medium opacity-80">
              {empleado.permite_acceso ? 'Sin restricciones' : 'Requiere regularización'}
            </span>
          </div>
        </div>

        {empleado.motivos.length > 0 ? (
          <ul className="mt-3 space-y-1 border-t border-current/10 pt-3">
            {empleado.motivos.map((motivo) => (
              <li key={motivo} className="flex items-start gap-2 text-xs leading-relaxed">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                <span>{motivo}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {empleado.restricciones.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {empleado.restricciones.map((restriccion) => (
              <li key={restriccion} className="flex items-start gap-2 text-xs text-amber-300">
                <Info size={13} className="mt-0.5 shrink-0" />
                <span>{restriccion}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { etiqueta: 'Departamento', valor: empleado.departamento || '—' },
          { etiqueta: 'Puesto', valor: empleado.puesto || '—' },
          { etiqueta: 'Estado', valor: empleado.estado },
          {
            etiqueta: 'Próximo vencimiento',
            valor: empleado.fecha_proximo_vencimiento
              ? formatearFecha(empleado.fecha_proximo_vencimiento)
              : '—'
          }
        ].map((item) => (
          <div key={item.etiqueta} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {item.etiqueta}
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-200" title={item.valor}>
              {item.valor}
            </p>
          </div>
        ))}
      </div>

      {errorArchivo ? (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{errorArchivo}</span>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-800">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-slate-400" />
            <h3 className="text-sm font-bold text-slate-200">
              Estudios vigentes ({empleado.estudios.length})
            </h3>
          </div>
          <button
            type="button"
            className="btn-secondary py-2"
            onClick={() => onAgregarEstudio(empleado)}
          >
            <FilePlus2 size={15} />
            Registrar estudio
          </button>
        </header>

        {empleado.estudios.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-slate-500">
            Este empleado no tiene estudios registrados y por lo tanto el acceso está bloqueado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr>
                  <th className="tabla-encabezado">Estudio</th>
                  <th className="tabla-encabezado">Realización</th>
                  <th className="tabla-encabezado">Vence</th>
                  <th className="tabla-encabezado">Resultado</th>
                  <th className="tabla-encabezado">Semáforo</th>
                  <th className="tabla-encabezado text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {empleado.estudios.map((estudio) => (
                  <tr key={estudio.id} className="hover:bg-slate-800/20">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-200">{estudio.tipo_estudio}</p>
                      {estudio.observaciones ? (
                        <p className="mt-0.5 max-w-[220px] truncate text-[11px] text-slate-500">
                          {estudio.observaciones}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {formatearFecha(estudio.fecha_realizacion)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-300">{formatearFecha(estudio.fecha_vencimiento)}</p>
                      <p className="text-[11px] text-slate-500">
                        {formatearDias(estudio.dias_para_vencer)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`badge ${ESTILOS_RESULTADO[estudio.resultado] || 'border-slate-700 bg-slate-800 text-slate-300'}`}
                      >
                        {ETIQUETAS_RESULTADO[estudio.resultado] || estudio.resultado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <SemaforoBadge estado={estudio.estado_semaforo} compacto />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {estudio.ruta_archivo ? (
                          <button
                            type="button"
                            className="icon-btn"
                            title={`Abrir ${nombreArchivo(estudio.ruta_archivo)}`}
                            onClick={() => abrirArchivo(estudio)}
                          >
                            <Paperclip size={14} />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="icon-btn"
                          title="Editar estudio"
                          onClick={() => onEditarEstudio(empleado, estudio)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-300"
                          title="Eliminar estudio"
                          onClick={() => onEliminarEstudio(estudio)}
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
      </section>

      {empleado.historia.length > empleado.estudios.length ? (
        <details className="rounded-2xl border border-slate-800 bg-slate-950/40 px-4 py-3">
          <summary className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-300">
            <CalendarClock size={14} />
            Historial completo ({empleado.historia.length} registros)
          </summary>
          <ul className="mt-3 space-y-1.5 border-t border-slate-800 pt-3">
            {empleado.historia.map((estudio) => (
              <li
                key={estudio.id}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400"
              >
                <span className="font-medium text-slate-300">{estudio.tipo_estudio}</span>
                <span>·</span>
                <span>{formatearFecha(estudio.fecha_realizacion)}</span>
                <span>→</span>
                <span>{formatearFecha(estudio.fecha_vencimiento)}</span>
                <span
                  className={`badge ${ESTILOS_RESULTADO[estudio.resultado] || 'border-slate-700 bg-slate-800 text-slate-300'}`}
                >
                  {ETIQUETAS_RESULTADO[estudio.resultado] || estudio.resultado}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-4">
        <button
          type="button"
          className="btn-ghost text-rose-300 hover:bg-rose-500/10"
          onClick={() => onEliminarEmpleado(empleado)}
        >
          <Trash2 size={15} />
          Eliminar empleado
        </button>
        <button type="button" className="btn-secondary" onClick={() => onEditarEmpleado(empleado)}>
          <UserRound size={15} />
          Editar datos
        </button>
      </div>
    </div>
  );
}
