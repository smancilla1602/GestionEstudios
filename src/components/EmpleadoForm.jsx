import { useEffect, useState } from 'react';
import { AlertCircle, Loader2, Save } from 'lucide-react';
import { api } from '../lib/api';

const FORMULARIO_VACIO = {
  nombre: '',
  apellido: '',
  departamento: '',
  puesto: '',
  estado: 'ACTIVO'
};

function desdeEmpleado(empleado) {
  if (!empleado) return FORMULARIO_VACIO;
  return {
    nombre: empleado.nombre ?? '',
    apellido: empleado.apellido ?? '',
    departamento: empleado.departamento ?? '',
    puesto: empleado.puesto ?? '',
    estado: empleado.estado ?? 'ACTIVO'
  };
}

export default function EmpleadoForm({ empleado, onGuardar, onCancelar }) {
  const [formulario, setFormulario] = useState(() => desdeEmpleado(empleado));
  const [error, setError] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [siguienteNumero, setSiguienteNumero] = useState('');
  const [cargandoNumero, setCargandoNumero] = useState(!empleado?.id);

  const esEdicion = Boolean(empleado?.id);

  // El número de empleado nunca se captura: en altas se calcula y asigna solo (EMP-001, EMP-002, …).
  useEffect(() => {
    if (esEdicion) return undefined;

    if (!api) {
      setCargandoNumero(false);
      return undefined;
    }

    let activo = true;
    setCargandoNumero(true);
    api.empleados
      .siguienteNumero()
      .then((numero) => activo && setSiguienteNumero(numero))
      .catch((err) => activo && setError(err.message))
      .finally(() => activo && setCargandoNumero(false));

    return () => {
      activo = false;
    };
  }, [esEdicion]);

  function actualizar(campo, valor) {
    setFormulario((previo) => ({ ...previo, [campo]: valor }));
  }

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setGuardando(true);
    setError(null);
    try {
      await onGuardar(formulario);
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

      <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-3.5 py-3">
        <span className="badge shrink-0 border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
          Automático
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-200">
            Número de empleado:{' '}
            {esEdicion
              ? empleado.numero_empleado
              : cargandoNumero
                ? 'calculando…'
                : siguienteNumero || 'pendiente'}
          </p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
            {esEdicion
              ? 'El número se asigna solo y no se captura a mano.'
              : 'Se asigna automáticamente al guardar; no necesita capturarlo.'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="nombre">
            Nombre(s) *
          </label>
          <input
            id="nombre"
            className="input"
            value={formulario.nombre}
            onChange={(evento) => actualizar('nombre', evento.target.value)}
            placeholder="Ana"
            maxLength={80}
            required
            autoFocus={!esEdicion}
          />
        </div>

        <div>
          <label className="label" htmlFor="apellido">
            Apellidos *
          </label>
          <input
            id="apellido"
            className="input"
            value={formulario.apellido}
            onChange={(evento) => actualizar('apellido', evento.target.value)}
            placeholder="López Herrera"
            maxLength={80}
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="departamento">
            Departamento
          </label>
          <input
            id="departamento"
            className="input"
            value={formulario.departamento}
            onChange={(evento) => actualizar('departamento', evento.target.value)}
            placeholder="Producción"
            maxLength={80}
          />
        </div>

        <div>
          <label className="label" htmlFor="puesto">
            Puesto
          </label>
          <input
            id="puesto"
            className="input"
            value={formulario.puesto}
            onChange={(evento) => actualizar('puesto', evento.target.value)}
            placeholder="Operadora de línea"
            maxLength={80}
          />
        </div>

        <div>
          <label className="label" htmlFor="estado">
            Estado
          </label>
          <select
            id="estado"
            className="input"
            value={formulario.estado}
            onChange={(evento) => actualizar('estado', evento.target.value)}
          >
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-4">
        <button type="button" className="btn-secondary" onClick={onCancelar} disabled={guardando}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={guardando}>
          {guardando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {esEdicion ? 'Guardar cambios' : 'Registrar empleado'}
        </button>
      </div>
    </form>
  );
}
