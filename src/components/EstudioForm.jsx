import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarClock, Loader2, Paperclip, Save, X } from 'lucide-react';
import { api } from '../lib/api';
import { formatearFecha, hoyISO, sumarMeses, calcularVencimiento, describirVigencia } from '../lib/fechas';
import { RESULTADOS, nombreArchivo } from '../lib/format';

const VIGENCIA_PROVISIONAL_POR_DEFECTO = { meses: '0', dias: '30' };

function estadoInicial(estudio) {
  const esProvisional = Boolean(estudio?.es_provisional);
  return {
    tipo_estudio_id: estudio?.tipo_estudio_id ? String(estudio.tipo_estudio_id) : '',
    fecha_realizacion: estudio?.fecha_realizacion ?? hoyISO(),
    resultado: estudio?.resultado ?? 'APTO',
    ruta_archivo: estudio?.ruta_archivo ?? null,
    observaciones: estudio?.observaciones ?? '',
    es_provisional: esProvisional,
    vigencia_meses: esProvisional
      ? String(estudio?.vigencia_meses_aplicada ?? 0)
      : VIGENCIA_PROVISIONAL_POR_DEFECTO.meses,
    vigencia_dias: esProvisional
      ? String(estudio?.vigencia_dias_aplicada ?? 0)
      : VIGENCIA_PROVISIONAL_POR_DEFECTO.dias,
    provisional_motivo: estudio?.provisional_motivo ?? ''
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

  const vigenciaProvisional = useMemo(
    () => ({
      meses: Number(formulario.vigencia_meses) || 0,
      dias: Number(formulario.vigencia_dias) || 0
    }),
    [formulario.vigencia_meses, formulario.vigencia_dias]
  );

  const vencimiento = useMemo(() => {
    if (!tipoSeleccionado || !formulario.fecha_realizacion) return '';
    if (formulario.es_provisional) {
      return calcularVencimiento(formulario.fecha_realizacion, vigenciaProvisional);
    }
    return sumarMeses(formulario.fecha_realizacion, tipoSeleccionado.vigencia_meses);
  }, [
    tipoSeleccionado,
    formulario.fecha_realizacion,
    formulario.es_provisional,
    vigenciaProvisional
  ]);

  const etiquetaVigencia = formulario.es_provisional
    ? describirVigencia(vigenciaProvisional.meses, vigenciaProvisional.dias)
    : tipoSeleccionado
      ? `${tipoSeleccionado.vigencia_meses} ${tipoSeleccionado.vigencia_meses === 1 ? 'mes' : 'meses'}`
      : '';

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
        observaciones: formulario.observaciones,
        es_provisional: formulario.es_provisional,
        vigencia_meses: formulario.es_provisional ? vigenciaProvisional.meses : 0,
        vigencia_dias: formulario.es_provisional ? vigenciaProvisional.dias : 0,
        provisional_motivo: formulario.es_provisional ? formulario.provisional_motivo : ''
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

        <div className="sm:col-span-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-3.5 py-3 transition hover:border-slate-700">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-500"
              checked={formulario.es_provisional}
              onChange={(evento) => actualizar('es_provisional', evento.target.checked)}
            />
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-200">
                Estudio provisional
                <span className="badge border-amber-500/25 bg-amber-500/10 text-amber-300">
                  Vigencia manual
                </span>
              </span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
                Usa el tipo de estudio del catálogo, pero la vigencia se captura en meses y días
                (por ejemplo 1 mes y 10 días, o sólo 10 días).
              </span>
            </span>
          </label>
        </div>

        {formulario.es_provisional ? (
          <>
            <div>
              <label className="label" htmlFor="vigencia_meses">
                Meses de vigencia
              </label>
              <input
                id="vigencia_meses"
                type="number"
                className="input"
                min={0}
                max={120}
                step={1}
                value={formulario.vigencia_meses}
                onChange={(evento) => actualizar('vigencia_meses', evento.target.value)}
              />
            </div>

            <div>
              <label className="label" htmlFor="vigencia_dias">
                Días de vigencia
              </label>
              <input
                id="vigencia_dias"
                type="number"
                className="input"
                min={0}
                max={365}
                step={1}
                value={formulario.vigencia_dias}
                onChange={(evento) => actualizar('vigencia_dias', evento.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2.5 text-[11px] leading-relaxed text-amber-200">
                <CalendarClock size={14} className="mt-0.5 shrink-0" />
                <span>
                  Vigencia provisional: <span className="font-bold">{etiquetaVigencia}</span>
                  {vencimiento ? (
                    <>
                      {' · '}vence el <span className="font-bold">{formatearFecha(vencimiento)}</span>
                    </>
                  ) : null}
                  . La fecha definitiva la confirma el sistema al guardar.
                </span>
              </div>
            </div>
          </>
        ) : null}

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
          <label className="label">
            {formulario.es_provisional
              ? 'Fecha de vencimiento (provisional)'
              : 'Fecha de vencimiento (automática)'}
          </label>
          <div className="input flex items-center justify-between bg-slate-900/70 text-slate-300">
            <span className={vencimiento ? 'font-semibold' : 'text-slate-500'}>
              {vencimiento ? formatearFecha(vencimiento) : 'Seleccione tipo y fecha'}
            </span>
            {etiquetaVigencia ? (
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                {etiquetaVigencia}
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

        {formulario.es_provisional ? (
          <div className="sm:col-span-2">
            <label className="label" htmlFor="provisional_motivo">
              Motivo del estudio provisional (opcional)
            </label>
            <input
              id="provisional_motivo"
              className="input"
              value={formulario.provisional_motivo}
              onChange={(evento) => actualizar('provisional_motivo', evento.target.value)}
              placeholder="Ej. En espera de resultados de laboratorio, valoración pendiente…"
              maxLength={200}
            />
          </div>
        ) : null}

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
