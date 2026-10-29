/**
 * Acceso al bridge expuesto por el preload de Electron.
 * Si se abre la app en un navegador (sin Electron) se avisa por consola.
 */

const api = window.api ?? null;

if (!api) {
  console.warn(
    '[api] window.api no está disponible. Ejecute la aplicación con Electron (npm run dev) y no en un navegador.'
  );
}

export { api };
export default api;
