import { useCallback, useEffect, useState } from 'react';
import {
  ALMACEN_TEMA,
  TEMA_CLARO,
  TEMA_OSCURO,
  aplicarTema,
  esTemaValido,
  guardarTema,
  resolverTemaInicial
} from '../lib/theme';

/**
 * Administra el tema claro/oscuro de la aplicación.
 * - Estado inicial: preferencia guardada en localStorage (por defecto `dark`).
 * - Efecto: agrega o quita la clase `dark` en <html>.
 * - Sincroniza cambios hechos desde otra ventana de Electron.
 */
export function useTheme() {
  const [tema, setTema] = useState(resolverTemaInicial);

  useEffect(() => {
    aplicarTema(tema);
  }, [tema]);

  const alternarTema = useCallback(() => {
    setTema((actual) => {
      const siguiente = actual === TEMA_OSCURO ? TEMA_CLARO : TEMA_OSCURO;
      guardarTema(siguiente);
      return siguiente;
    });
  }, []);

  const establecerTema = useCallback((nuevoTema) => {
    if (!esTemaValido(nuevoTema)) return;
    guardarTema(nuevoTema);
    setTema(nuevoTema);
  }, []);

  useEffect(() => {
    const sincronizar = (evento) => {
      if (evento.key !== ALMACEN_TEMA || !esTemaValido(evento.newValue)) return;
      setTema(evento.newValue);
    };

    window.addEventListener('storage', sincronizar);
    return () => window.removeEventListener('storage', sincronizar);
  }, []);

  return {
    tema,
    esOscuro: tema === TEMA_OSCURO,
    alternarTema,
    establecerTema
  };
}
