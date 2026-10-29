import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarClock, Loader2, Paperclip, Save, X } from 'lucide-react';
import { api } from '../lib/api';
import { formatearFecha, hoyISO, sumarMeses } from '../lib/fechas';
import { RESULTADOS, nombreArchivo } from '../lib/format';

function estadoInicial(estudio) {
  return {
    tipo_estudio_id: estudio?.tipo_estudio_id ? String(estudio.tipo_estudio_id) : '',
    fecha_realizacion: estudio?.fecha_realizacion ?? hoyISO(),
    resultado: estudio?.resultado ?? 'APTO',
    ruta_archivo: estudio?.ruta_archivo ?? null,
    observaciones: estudio?.observaciones ?? ''
  };
}

export default function EstudioForm({ empleado, estudio, onGuardar, onCancelar }) {
  const [formulario, setFormulario] = useState(() => estadoInicial(estudio));
  const [tipos, setTipos] = useState([]);
  const [cargandoTipos, setCargandoTipos] = useState(true);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [adjuntando, setAdjuntando] = useState(false);

  const esEdicion = Boolean(estudio?.id);

  useEffect(() => {
    let activo = true;

    api.tiposEstudio
      .listar()
      .then((datos) => {
        if (!activo) return;
        setTipos(datos);
        setFormulario((previo) => ({
          ...previo,
          tipo_estudio_id: previo.tipo_estudio_id || (datos[0] ? String(datos[0].id) : '')
        }));
      })
      .catch((err) => activo && setError(err.message))
      .finally(() => activo && setCargandoTipos(false));

    return () => {
      activo = false;
    };
  }, []);

  const tipoSeleccionado = useMemo(
    () => tipos.find((tipo) => String(tipo.id) === String(formulario.tipo_estudio_id)),
    [tipos, formulario.tipo_estudio_id]
  );

  const vencimiento = useMemo(() => {
    if (!tipoSeleccionado || !formulario.fecha_realizacion) return '';
    return sumarMeses(formulario.fecha_realizacion, tipoSeleccionado.vigencia_meses);
  }, [tipoSeleccionado, formulario.fecha_realizacion]);

  function actualizar(campo, valor) {
    setFormulario((previo) => ({ ...previo, [campo]: valor }));
  }

  async function seleccionarArchivo() {
    setAdjuntando(true);
    setError(null);
    try {
      const resultado = await api.archivos.seleccionar(empleado.id);
      if (!resultado?.cancelado) {
        actualizar('ruta_archivo', resultado.ruta);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setAdjuntando(false);
    }
  }

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await onGuardar({
        empleado_id: empleado.id,
        tipo_estudio_id: Number(formulario.tipo_estudio_id),
        fecha_realizacion: formulario.fecha_realizacion,
        resultado: formulario.resultado,
        ruta_archivo: formulario.ruta_archivo,
        observaciones: formulario.observaciones
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="space-y-5">
      <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-3.5 py-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400">
          <CalendarClock size={17} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-100">
            {empleado?.nombre_completo}
          </p>
          <p className="font-mono text-[11px] text-slate-500">{empleado?.numero_empleado}</p>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-200">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="tipo_estudio">
            Tipo de estudio *
          </label>
          <select
            id="tipo_estudio"
            className="input"
            value={formulario.tipo_estudio_id}
            onChange={(evento) => actualizar('tipo_estudio_id', evento.target.value)}
            disabled={cargandoTipos}
            required
          >
            {cargandoTipos ? <option value="">Cargando catálogo…</option> : null}
            {!cargandoTipos && tipos.length === 0 ? (
              <option value="">Sin tipos de estudio configurados</option>
            ) : null}
            {tipos.map((tipo) => (
              <option key={tipo.id} value={tipo.id}>
                {tipo.nombre} ({tipo.vigencia_meses} meses)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="fecha_realizacion">
            Fecha de realización *
          </label>
          <input
            id="fecha_realizacion"
            type="date"
            className="input"
            value={formulario.fecha_realizacion}
            max={hoyISO()}
            onChange={(evento) => actualizar('fecha_realizacion', evento.target.value)}
            required
          />
        </div>

        <div>
          <label className="label">Fecha de vencimiento (automática)</label>
          <div className="input flex items-center justify-between bg-slate-900/70 text-slate-300">
            <span className={vencimiento ? 'font-semibold' : 'text-slate-500'}>
              {vencimiento ? formatearFecha(vencimiento) : 'Seleccione tipo y fecha'}
            </span>
            {tipoSeleccionado ? (
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {tipoSeleccionado.vigencia_meses} meses
              </span>
            ) : null}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="resultado">
            Resultado *
          </label>
          <select
            id="resultado"
            className="input"
            value={formulario.resultado}
            onChange={(evento) => actualizar('resultado', evento.target.value)}
            required
          >
            {RESULTADOS.map((resultado) => (
              <option key={resultado.valor} value={resultado.valor}>
                {resultado.etiqueta}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
            Un resultado <span className="font-semibold text-rose-300">No apto</span> bloquea el
            acceso a planta de inmediato, sin importar la vigencia.
          </p>
        </div>

        <div className="sm:col-span-2">
          <label className="label">Archivo del estudio (opcional)</label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-secondary"
              onClick={seleccionarArchivo}
              disabled={adjuntando}
            >
              {adjuntando ? <Loader2 size={15} className="animate-spin" /> : <Paperclip size={15} />}
              Seleccionar archivo
            </button>
            {formulario.ruta_archivo ? (
              <span className="flex min-w-0 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/60 px-2.5 py-1.5 text-[11px] text-slate-300">
                <span className="max-w-[260px] truncate" title={formulario.ruta_archivo}>
                  {nombreArchivo(formulario.ruta_archivo)}
                </span>
                <button
                  type="button"
                  onClick={() => actualizar('ruta_archivo', null)}
                  className="text-slate-500 hover:text-rose-300"
                  title="Quitar archivo"
                >
                  <X size={13} />
                </button>
              </span>
            ) : (
              <span className="text-[11px] text-slate-500">Sin archivo adjunto</span>
            )}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="observaciones">
            Observaciones
          </label>
          <textarea
            id="observaciones"
            className="input min-h-[86px] resize-y"
            value={formulario.observaciones}
            onChange={(evento) => actualizar('observaciones', evento.target.value)}
            placeholder="Restricciones, recomendaciones o notas del médico…"
            maxLength={1000}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-4">
        <button type="button" className="btn-secondary" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={guardando || cargandoTipos}>
          {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {esEdicion ? 'Guardar cambios' : 'Registrar estudio'}
        </button>
      </div>
    </form>
  );
}
