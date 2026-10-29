import { useState } from 'react';
import { AlertCircle, Loader2, Save } from 'lucide-react';

const FORMULARIO_VACIO = {
  nombre: '',
  vigencia_meses: 12
};

function desdeTipo(tipo) {
  if (!tipo) return FORMULARIO_VACIO;
  return {
    nombre: tipo.nombre ?? '',
    vigencia_meses: tipo.vigencia_meses ?? 12
  };
}

export default function TipoEstudioForm({ tipo, onGuardar, onCancelar }) {
  const [formulario, setFormulario] = useState(() => desdeTipo(tipo));
  const [recalcular, setRecalcular] = useState(true);
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const esEdicion = Boolean(tipo?.id);
  const totalEstudios = tipo?.total_estudios ?? 0;
  const cambioVigencia =
    esEdicion && Number(formulario.vigencia_meses) !== Number(tipo?.vigencia_meses);

  function actualizar(campo, valor) {
    setFormulario((previo) => ({ ...previo, [campo]: valor }));
  }

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await onGuardar({
        nombre: formulario.nombre,
        vigencia_meses: Number(formulario.vigencia_meses),
        recalcular_vencimientos: Boolean(esEdicion && recalcular && cambioVigencia)
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={manejarEnvio} className="space-y-5">
      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-200">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="nombre_tipo">
            Nombre del estudio *
          </label>
          <input
            id="nombre_tipo"
            className="input"
            value={formulario.nombre}
            onChange={(evento) => actualizar('nombre', evento.target.value)}
            placeholder="Examen médico general"
            maxLength={80}
            required
            autoFocus
          />
        </div>

        <div>
          <label className="label" htmlFor="vigencia_meses">
            Vigencia en meses *
          </label>
          <input
            id="vigencia_meses"
            type="number"
            className="input"
            value={formulario.vigencia_meses}
            onChange={(evento) => actualizar('vigencia_meses', evento.target.value)}
            min={1}
            max={120}
            step={1}
            required
          />
        </div>

        <div className="flex items-end">
          <p className="rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-[11px] leading-relaxed text-slate-400">
            La fecha de vencimiento de cada estudio se calcula como{' '}
            <span className="font-semibold text-slate-200">fecha de realización + vigencia</span>.
          </p>
        </div>
      </div>

      {esEdicion && totalEstudios > 0 ? (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3.5 py-3">
          <label className="flex items-start gap-2.5 text-xs text-slate-200">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500/30"
              checked={recalcular && cambioVigencia}
              onChange={(evento) => setRecalcular(evento.target.checked)}
              disabled={!cambioVigencia}
            />
            <span>
              Recalcular las fechas de vencimiento de los{' '}
              <span className="font-bold text-amber-200">{totalEstudios}</span> estudio(s) ya
              registrados con este tipo.
              <span className="mt-1 block text-[11px] text-slate-400">
                {cambioVigencia
                  ? 'Si lo desmarca, los estudios existentes conservan su vencimiento actual y solo se aplicará a los nuevos registros.'
                  : 'Cambie la vigencia para habilitar esta opción.'}
              </span>
            </span>
          </label>
        </div>
      ) : null}

      <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-4">
        <button type="button" className="btn-secondary" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={guardando}>
          {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {esEdicion ? 'Guardar cambios' : 'Agregar al catálogo'}
        </button>
      </div>
    </form>
  );
}
