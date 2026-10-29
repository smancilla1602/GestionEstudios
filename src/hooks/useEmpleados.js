import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';

/** Carga la lista de empleados con su estado de semáforo calculado en el backend. */
export function useEmpleados() {
  const [empleados, setEmpleados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const recargar = useCallback(async () => {
    if (!api) {
      setError('El bridge de Electron no está disponible.');
      setCargando(false);
      return [];
    }
    setCargando(true);
    try {
      const datos = await api.empleados.listar();
      setEmpleados(datos);
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

  return { empleados, cargando, error, recargar, setEmpleados };
}
