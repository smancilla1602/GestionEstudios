/**
 * Motor del semáforo de acceso.
 *
 * Reglas de negocio (fuente única de verdad, ejecutada en el proceso main):
 *  - BLOQUEADO  : algún estudio vigente tiene resultado NO_APTO o fecha_vencimiento < hoy,
 *                 el empleado está INACTIVO o no tiene estudios registrados.
 *  - POR_VENCER : no está bloqueado y algún estudio vence entre hoy y los próximos 30 días.
 *  - VIGENTE    : no está bloqueado ni próximo a vencer.
 *
 * Sólo se evalúa el estudio MÁS RECIENTE de cada tipo (por fecha_realizacion, luego id),
 * para que una renovación no quede bloqueada por un estudio anterior ya vencido.
 *
 * RESTRICCION no bloquea el acceso (no es NO_APTO), pero se reporta como advertencia.
 */

const DIAS_ALERTA = 30;

const ESTADOS_SEMAFORO = {
  VIGENTE: 'VIGENTE',
  POR_VENCER: 'POR_VENCER',
  BLOQUEADO: 'BLOQUEADO'
};

const ETIQUETAS_SEMAFORO = {
  VIGENTE: 'VIGENTE',
  POR_VENCER: 'PRÓXIMO A VENCER',
  BLOQUEADO: 'BLOQUEADO'
};

const RESULTADOS = ['APTO', 'RESTRICCION', 'NO_APTO'];

function pad2(numero) {
  return String(numero).padStart(2, '0');
}

function hoyISO(fecha = new Date()) {
  return `${fecha.getFullYear()}-${pad2(fecha.getMonth() + 1)}-${pad2(fecha.getDate())}`;
}

function esFechaISO(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === valor;
}

/** Diferencia en días de calendario entre dos fechas ISO (hasta - desde). */
function diffDias(desdeISO, hastaISO) {
  if (!esFechaISO(desdeISO) || !esFechaISO(hastaISO)) return null;
  const desde = Date.parse(`${desdeISO}T00:00:00Z`);
  const hasta = Date.parse(`${hastaISO}T00:00:00Z`);
  return Math.round((hasta - desde) / 86400000);
}

/** Suma meses a una fecha ISO respetando el último día del mes (31/01 + 1 mes = 28/02). */
function sumarMeses(fechaISO, meses) {
  if (!esFechaISO(fechaISO)) {
    throw new Error(`Fecha inválida: ${fechaISO}`);
  }
  const cantidad = Number(meses);
  if (!Number.isInteger(cantidad)) {
    throw new Error('La vigencia en meses debe ser un número entero');
  }
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  const totalMeses = mes - 1 + cantidad;
  const anioDestino = anio + Math.floor(totalMeses / 12);
  const mesDestino = ((totalMeses % 12) + 12) % 12;
  const ultimoDia = new Date(Date.UTC(anioDestino, mesDestino + 1, 0)).getUTCDate();
  const diaDestino = Math.min(dia, ultimoDia);
  return `${anioDestino}-${pad2(mesDestino + 1)}-${pad2(diaDestino)}`;
}

function formatearFecha(fechaISO) {
  if (!esFechaISO(fechaISO)) return '—';
  const [anio, mes, dia] = fechaISO.split('-');
  return `${dia}/${mes}/${anio}`;
}

/** Evalúa un estudio individual. */
function evaluarEstudio(estudio, hoy = hoyISO()) {
  const nombre = estudio?.tipo_estudio || 'Estudio';
  const fechaVencimiento = estudio?.fecha_vencimiento;
  const dias = esFechaISO(fechaVencimiento) ? diffDias(hoy, fechaVencimiento) : null;

  let estado = ESTADOS_SEMAFORO.VIGENTE;
  let motivo = null;

  if (estudio?.resultado === 'NO_APTO') {
    estado = ESTADOS_SEMAFORO.BLOQUEADO;
    motivo = `${nombre}: resultado NO APTO`;
  } else if (dias === null) {
    estado = ESTADOS_SEMAFORO.BLOQUEADO;
    motivo = `${nombre}: sin fecha de vencimiento válida`;
  } else if (dias < 0) {
    estado = ESTADOS_SEMAFORO.BLOQUEADO;
    motivo = `${nombre}: vencido el ${formatearFecha(fechaVencimiento)} (hace ${Math.abs(dias)} día${Math.abs(dias) === 1 ? '' : 's'})`;
  } else if (dias <= DIAS_ALERTA) {
    estado = ESTADOS_SEMAFORO.POR_VENCER;
    motivo = `${nombre}: vence en ${dias} día${dias === 1 ? '' : 's'}`;
  }

  return {
    ...estudio,
    estado_semaforo: estado,
    etiqueta_semaforo: ETIQUETAS_SEMAFORO[estado],
    motivo,
    dias_para_vencer: dias
  };
}

/** Toma el estudio más reciente de cada tipo (la historia llega ordenada desc). */
function ultimosPorTipo(estudios = []) {
  const mapa = new Map();
  for (const estudio of estudios) {
    if (!mapa.has(estudio.tipo_estudio_id)) {
      mapa.set(estudio.tipo_estudio_id, estudio);
    }
  }
  return [...mapa.values()].sort((a, b) =>
    String(a.tipo_estudio || '').localeCompare(String(b.tipo_estudio || ''), 'es')
  );
}

/**
 * Evalúa el estado global de acceso de un empleado.
 * @param {object} empleado fila de la tabla empleados
 * @param {Array} estudios estudios vigentes (el más reciente de cada tipo)
 * @param {string} hoy fecha ISO de referencia
 */
function evaluarEmpleado(empleado = {}, estudios = [], hoy = hoyISO()) {
  const evaluados = estudios.map((estudio) => evaluarEstudio(estudio, hoy));
  const motivos = [];
  const restricciones = [];

  const estadoEmpleado = String(empleado.estado || 'ACTIVO').toUpperCase();
  if (estadoEmpleado !== 'ACTIVO') {
    motivos.push(`Empleado con estado ${estadoEmpleado}`);
  }
  if (evaluados.length === 0) {
    motivos.push('Sin estudios médicos registrados');
  }

  for (const estudio of evaluados) {
    if (estudio.estado_semaforo === ESTADOS_SEMAFORO.BLOQUEADO) {
      motivos.push(estudio.motivo);
    } else if (estudio.resultado === 'RESTRICCION') {
      restricciones.push(`${estudio.tipo_estudio}: apto con restricción`);
    }
  }

  const bloqueado = motivos.length > 0;
  const porVencer =
    !bloqueado && evaluados.some((estudio) => estudio.estado_semaforo === ESTADOS_SEMAFORO.POR_VENCER);

  const estadoSemaforo = bloqueado
    ? ESTADOS_SEMAFORO.BLOQUEADO
    : porVencer
      ? ESTADOS_SEMAFORO.POR_VENCER
      : ESTADOS_SEMAFORO.VIGENTE;

  const diasDisponibles = evaluados
    .map((estudio) => estudio.dias_para_vencer)
    .filter((dias) => typeof dias === 'number');

  const diasParaVencer = diasDisponibles.length > 0 ? Math.min(...diasDisponibles) : null;

  const fechasVencimiento = evaluados
    .map((estudio) => estudio.fecha_vencimiento)
    .filter((fecha) => esFechaISO(fecha))
    .sort();

  const estudioCritico =
    evaluados.find((estudio) => estudio.estado_semaforo === ESTADOS_SEMAFORO.BLOQUEADO) ||
    [...evaluados].sort((a, b) => {
      const diasA = a.dias_para_vencer ?? Number.MAX_SAFE_INTEGER;
      const diasB = b.dias_para_vencer ?? Number.MAX_SAFE_INTEGER;
      return diasA - diasB;
    })[0] ||
    null;

  return {
    estado_semaforo: estadoSemaforo,
    etiqueta_semaforo: ETIQUETAS_SEMAFORO[estadoSemaforo],
    permite_acceso: estadoSemaforo !== ESTADOS_SEMAFORO.BLOQUEADO,
    motivos: [...new Set(motivos.filter(Boolean))],
    restricciones: [...new Set(restricciones)],
    dias_para_vencer: diasParaVencer,
    fecha_proximo_vencimiento: fechasVencimiento[0] || null,
    estudio_critico: estudioCritico,
    estudios: evaluados
  };
}

module.exports = {
  DIAS_ALERTA,
  ESTADOS_SEMAFORO,
  ETIQUETAS_SEMAFORO,
  RESULTADOS,
  hoyISO,
  esFechaISO,
  diffDias,
  sumarMeses,
  formatearFecha,
  evaluarEstudio,
  evaluarEmpleado,
  ultimosPorTipo
};
