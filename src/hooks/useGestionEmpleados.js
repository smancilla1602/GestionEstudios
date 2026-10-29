import { useCallback, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { formatearFecha } from '../lib/fechas';
import { useEmpleados } from './useEmpleados';

/**
 * Centraliza el estado de los modales (empleado / estudio / detalle), los avisos
 * y las mutaciones contra el backend para reutilizarlo en Dashboard y Empleados.
 */
export function useGestionEmpleados() {
  const { empleados, cargando, error, recargar } = useEmpleados();
  const [toast, setToast] = useState(null);
  const [detalleId, setDetalleId] = useState(null);
  const [formEmpleado, setFormEmpleado] = useState(null);
  const [formEstudio, setFormEstudio] = useState(null);

  const detalle = useMemo(
    () => empleados.find((empleado) => empleado.id === detalleId) ?? null,
    [empleados, detalleId]
  );

  const avisar = useCallback((texto, tipo = 'exito', extra = {}) => {
    setToast({ id: Date.now(), tipo, texto, ...extra });
  }, []);

  const cerrarToast = useCallback(() => setToast(null), []);

  const abrirDetalle = useCallback((empleado) => setDetalleId(empleado.id), []);
  const cerrarDetalle = useCallback(() => setDetalleId(null), []);

  const abrirFormEmpleado = useCallback((empleado = null) => {
    setFormEmpleado({ empleado });
  }, []);
  const cerrarFormEmpleado = useCallback(() => setFormEmpleado(null), []);

  const abrirFormEstudio = useCallback((empleado, estudio = null) => {
    setFormEstudio({ empleado, estudio });
  }, []);
  const cerrarFormEstudio = useCallback(() => setFormEstudio(null), []);

  const guardarEmpleado = useCallback(
    async (datos) => {
      const esEdicion = Boolean(formEmpleado?.empleado?.id);
      const guardado = esEdicion
        ? await api.empleados.actualizar(formEmpleado.empleado.id, datos)
        : await api.empleados.crear(datos);

      setFormEmpleado(null);
      await recargar();
      avisar(
        esEdicion
          ? `Empleado ${guardado.numero_empleado} actualizado correctamente`
          : `Empleado ${guardado.numero_empleado} registrado correctamente`
      );
      return guardado;
    },
    [formEmpleado, recargar, avisar]
  );

  const eliminarEmpleado = useCallback(
    async (empleado) => {
      const confirmado = window.confirm(
        `¿Eliminar a ${empleado.nombre_completo}?\n\nTambién se eliminarán sus ${empleado.total_estudios} estudio(s) registrados. Esta acción no se puede deshacer.`
      );
      if (!confirmado) return;

      try {
        await api.empleados.eliminar(empleado.id);
        setDetalleId((actual) => (actual === empleado.id ? null : actual));
        await recargar();
        avisar(`Empleado ${empleado.numero_empleado} eliminado`);
      } catch (err) {
        avisar(err.message, 'error');
      }
    },
    [recargar, avisar]
  );

  const guardarEstudio = useCallback(
    async (datos) => {
      const esEdicion = Boolean(formEstudio?.estudio?.id);
      if (esEdicion) {
        await api.estudios.actualizar(formEstudio.estudio.id, datos);
      } else {
        await api.estudios.crear(datos);
      }

      const nombre = formEstudio?.empleado?.nombre_completo ?? 'el empleado';
      setFormEstudio(null);
      await recargar();
      avisar(
        esEdicion ? 'Estudio actualizado correctamente' : `Estudio registrado para ${nombre}`
      );
    },
    [formEstudio, recargar, avisar]
  );

  const eliminarEstudio = useCallback(
    async (estudio) => {
      const confirmado = window.confirm(
        `¿Eliminar el estudio "${estudio.tipo_estudio}" realizado el ${formatearFecha(
          estudio.fecha_realizacion
        )}?\n\nEl semáforo del empleado se recalculará automáticamente.`
      );
      if (!confirmado) return;

      try {
        await api.estudios.eliminar(estudio.id);
        await recargar();
        avisar('Estudio eliminado correctamente');
      } catch (err) {
        avisar(err.message, 'error');
      }
    },
    [recargar, avisar]
  );

  return {
    empleados,
    cargando,
    error,
    recargar,
    toast,
    avisar,
    cerrarToast,
    detalle,
    abrirDetalle,
    cerrarDetalle,
    formEmpleado,
    abrirFormEmpleado,
    cerrarFormEmpleado,
    formEstudio,
    abrirFormEstudio,
    cerrarFormEstudio,
    guardarEmpleado,
    eliminarEmpleado,
    guardarEstudio,
    eliminarEstudio
  };
}
