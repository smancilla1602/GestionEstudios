import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

/**
 * Centraliza el catálogo de tipos de estudio: carga, formulario modal,
 * mutaciones y avisos. Se usa en la pantalla "Tipos de estudio".
 */
export function useTiposEstudio() {
  const [tipos, setTipos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState(null);

  const avisar = useCallback(
    (texto, tipo = 'exito') => setToast({ id: Date.now(), tipo, texto }),
    []
  );
  const cerrarToast = useCallback(() => setToast(null), []);

  const recargar = useCallback(async () => {
    if (!api) {
      setError('El bridge de Electron no está disponible.');
      setCargando(false);
      return [];
    }
    setCargando(true);
    try {
      const datos = await api.tiposEstudio.listar();
      setTipos(datos);
      setError(null);
      return datos;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  const abrirFormTipo = useCallback((tipo = null) => setForm({ tipo }), []);
  const cerrarFormTipo = useCallback(() => setForm(null), []);

  const guardarTipo = useCallback(
    async (datos) => {
      const esEdicion = Boolean(form?.tipo?.id);
      const resultado = esEdicion
        ? await api.tiposEstudio.actualizar(form.tipo.id, datos)
        : await api.tiposEstudio.crear(datos);

      const nombre = resultado?.tipo?.nombre ?? resultado?.nombre ?? datos.nombre;
      const actualizados = resultado?.estudios_actualizados ?? 0;

      setForm(null);
      await recargar();
      avisar(
        esEdicion
          ? `Tipo de estudio "${nombre}" actualizado${
              actualizados > 0 ? ` · ${actualizados} vencimiento(s) recalculado(s)` : ''
            }`
          : `Tipo de estudio "${nombre}" agregado al catálogo`
      );
      return resultado;
    },
    [form, recargar, avisar]
  );

  const eliminarTipo = useCallback(
    async (tipo) => {
      const confirmado = window.confirm(
        `¿Eliminar el tipo de estudio "${tipo.nombre}"?\n\n` +
          'Solo se pueden eliminar tipos sin estudios registrados. Esta acción no se puede deshacer.'
      );
      if (!confirmado) return;

      try {
        await api.tiposEstudio.eliminar(tipo.id);
        await recargar();
        avisar(`Tipo de estudio "${tipo.nombre}" eliminado`);
      } catch (err) {
        avisar(err.message, 'error');
      }
    },
    [recargar, avisar]
  );

  return {
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
  };
}
