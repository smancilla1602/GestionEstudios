/**
 * Etiquetas, colores y helpers de presentación compartidos por las pantallas.
 */

export const ESTILOS_SEMAFORO = {
  VIGENTE: {
    etiqueta: 'Vigente',
    badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    punto: 'bg-emerald-400',
    texto: 'text-emerald-300',
    barra: 'bg-emerald-400',
    suave: 'bg-emerald-500/10'
  },
  POR_VENCER: {
    etiqueta: 'Próximo a vencer',
    badge: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
    punto: 'bg-amber-400',
    texto: 'text-amber-300',
    barra: 'bg-amber-400',
    suave: 'bg-amber-500/10'
  },
  BLOQUEADO: {
    etiqueta: 'Bloqueado',
    badge: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
    punto: 'bg-rose-400',
    texto: 'text-rose-300',
    barra: 'bg-rose-400',
    suave: 'bg-rose-500/10'
  }
};

export const RESULTADOS = [
  { valor: 'APTO', etiqueta: 'Apto' },
  { valor: 'RESTRICCION', etiqueta: 'Apto con restricción' },
  { valor: 'NO_APTO', etiqueta: 'No apto' }
];

export const ETIQUETAS_RESULTADO = Object.fromEntries(
  RESULTADOS.map((resultado) => [resultado.valor, resultado.etiqueta])
);

export const ESTILOS_RESULTADO = {
  APTO: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
  RESTRICCION: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
  NO_APTO: 'border-rose-500/25 bg-rose-500/10 text-rose-300'
};

export function estiloSemaforo(estado) {
  return ESTILOS_SEMAFORO[estado] ?? ESTILOS_SEMAFORO.BLOQUEADO;
}

/** Quita acentos y pasa a minúsculas para búsquedas tolerantes. */
export function normalizar(valor) {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function iniciales(nombre, apellido = '') {
  const partes = `${nombre ?? ''} ${apellido ?? ''}`.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
}

export function formatearNumero(valor) {
  return new Intl.NumberFormat('es-MX').format(Number(valor) || 0);
}

export function nombreArchivo(ruta) {
  if (!ruta) return '';
  const partes = String(ruta).split(/[\\/]/);
  return partes[partes.length - 1] || ruta;
}

export function resumirEmpleados(empleados = []) {
  return empleados.reduce(
    (acumulado, empleado) => {
      acumulado.total += 1;
      if (empleado.estado_semaforo === 'VIGENTE') acumulado.vigente += 1;
      else if (empleado.estado_semaforo === 'POR_VENCER') acumulado.porVencer += 1;
      else acumulado.bloqueado += 1;
      return acumulado;
    },
    { total: 0, vigente: 0, porVencer: 0, bloqueado: 0 }
  );
}
