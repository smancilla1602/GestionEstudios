/**
 * Utilidades de tema compartidas por la aplicación.
 * El tema vive en localStorage y se refleja con la clase `dark` en <html>,
 * que es la que Tailwind usa (darkMode: 'class').
 */

export const TEMA_OSCURO = 'dark';
export const TEMA_CLARO = 'light';
export const ALMACEN_TEMA = 'estudiosmedicos.tema';

const TEMAS_VALIDOS = [TEMA_OSCURO, TEMA_CLARO];

export function esTemaValido(valor) {
  return TEMAS_VALIDOS.includes(valor);
}

/** Tema inicial: el guardado por el usuario o `dark` (diseño original). */
export function resolverTemaInicial() {
  if (typeof window === 'undefined') return TEMA_OSCURO;

  try {
    const guardado = window.localStorage.getItem(ALMACEN_TEMA);
    if (esTemaValido(guardado)) return guardado;
  } catch {
    // localStorage puede estar deshabilitado; se usa el tema por defecto.
  }

  return TEMA_OSCURO;
}

/** Aplica el tema al nodo raíz sin recargar la interfaz. */
export function aplicarTema(tema) {
  if (typeof document === 'undefined') return;

  const raiz = document.documentElement;
  const oscuro = tema === TEMA_OSCURO;
  raiz.classList.toggle('dark', oscuro);
  raiz.dataset.tema = oscuro ? TEMA_OSCURO : TEMA_CLARO;
}

/** Persiste la preferencia del usuario. */
export function guardarTema(tema) {
  if (typeof window === 'undefined' || !esTemaValido(tema)) return;

  try {
    window.localStorage.setItem(ALMACEN_TEMA, tema);
  } catch {
    // Si el almacenamiento falla, el tema sigue funcionando en memoria.
  }
}
