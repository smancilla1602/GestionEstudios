/**
 * Repositorio de empleados: CRUD con validaciones y mensajes de error amigables.
 */

const { getDb } = require('./database');
const { texto, numeroEmpleado, unoDe } = require('../utils/validaciones');

const ESTADOS_EMPLEADO = ['ACTIVO', 'INACTIVO'];

const PREFIJO_NUMERO = 'EMP-';
const DIGITOS_NUMERO = 3;

const CAMPOS = `id, numero_empleado, nombre, apellido, departamento, puesto, estado, creado_en, actualizado_en`;

function formatearNumero(secuencia) {
  return `${PREFIJO_NUMERO}${String(secuencia).padStart(DIGITOS_NUMERO, '0')}`;
}

/** Toma la secuencia numérica final de un número existente ("EMP-012" -> 12). */
function extraerSecuencia(numero) {
  const coincidencia = String(numero ?? '').match(/(\d+)\s*$/);
  if (!coincidencia) return 0;
  const secuencia = Number.parseInt(coincidencia[1], 10);
  return Number.isSafeInteger(secuencia) ? secuencia : 0;
}

/**
 * Calcula el siguiente número de empleado disponible (EMP-001, EMP-002, …).
 * Se apoya en el mayor consecutivo ya registrado, sin importar el formato previo,
 * para que la numeración continúe donde se quedó aunque existan altas manuales.
 */
function siguienteNumeroEmpleado() {
  const filas = getDb().prepare('SELECT numero_empleado FROM empleados').all();
  const ocupados = new Set();
  let maximo = 0;

  for (const fila of filas) {
    const numero = String(fila.numero_empleado ?? '').trim();
    ocupados.add(numero.toUpperCase());
    maximo = Math.max(maximo, extraerSecuencia(numero));
  }

  let secuencia = maximo + 1;
  let candidato = formatearNumero(secuencia);
  while (ocupados.has(candidato.toUpperCase())) {
    secuencia += 1;
    candidato = formatearNumero(secuencia);
  }
  return candidato;
}

function listarEmpleados() {
  return getDb()
    .prepare(
      `SELECT ${CAMPOS} FROM empleados
       ORDER BY apellido COLLATE NOCASE ASC, nombre COLLATE NOCASE ASC`
    )
    .all();
}

function obtenerEmpleado(id) {
  return (
    getDb()
      .prepare(`SELECT ${CAMPOS} FROM empleados WHERE id = ?`)
      .get(Number(id)) || null
  );
}

function normalizarDatos(datos = {}) {
  return {
    numero_empleado: numeroEmpleado(datos.numero_empleado),
    nombre: texto(datos.nombre, 'Nombre', { max: 80 }),
    apellido: texto(datos.apellido, 'Apellido', { max: 80 }),
    departamento: texto(datos.departamento, 'Departamento', { requerido: false, max: 80 }),
    puesto: texto(datos.puesto, 'Puesto', { requerido: false, max: 80 }),
    estado: datos.estado ? unoDe(datos.estado, ESTADOS_EMPLEADO, 'Estado') : 'ACTIVO'
  };
}

function traducirErrorSqlite(error, numero) {
  const mensaje = String(error?.message || '');
  if (mensaje.includes('empleados.numero_empleado')) {
    return new Error(`Ya existe un empleado con el número "${numero}"`);
  }
  return error;
}

function crearEmpleado(datos = {}) {
  const numeroSolicitado = datos?.numero_empleado;
  const numero =
    typeof numeroSolicitado === 'string' && numeroSolicitado.trim().length > 0
      ? numeroSolicitado
      : siguienteNumeroEmpleado();

  const limpio = normalizarDatos({ ...datos, numero_empleado: numero });
  let info;
  try {
    info = getDb()
      .prepare(
        `INSERT INTO empleados (numero_empleado, nombre, apellido, departamento, puesto, estado)
         VALUES (@numero_empleado, @nombre, @apellido, @departamento, @puesto, @estado)`
      )
      .run(limpio);
  } catch (error) {
    throw traducirErrorSqlite(error, limpio.numero_empleado);
  }
  return obtenerEmpleado(info.lastInsertRowid);
}

function actualizarEmpleado(id, datos) {
  const empleadoId = Number(id);
  const actual = obtenerEmpleado(empleadoId);
  if (!actual) throw new Error('Empleado no encontrado');

  const limpio = normalizarDatos({ ...actual, ...datos });

  try {
    getDb()
      .prepare(
        `UPDATE empleados
         SET numero_empleado = @numero_empleado,
             nombre = @nombre,
             apellido = @apellido,
             departamento = @departamento,
             puesto = @puesto,
             estado = @estado,
             actualizado_en = datetime('now', 'localtime')
         WHERE id = @id`
      )
      .run({ ...limpio, id: empleadoId });
  } catch (error) {
    throw traducirErrorSqlite(error, limpio.numero_empleado);
  }

  return obtenerEmpleado(empleadoId);
}

function eliminarEmpleado(id) {
  const info = getDb().prepare('DELETE FROM empleados WHERE id = ?').run(Number(id));
  if (info.changes === 0) throw new Error('Empleado no encontrado');
  return { eliminado: true, id: Number(id) };
}

module.exports = {
  ESTADOS_EMPLEADO,
  siguienteNumeroEmpleado,
  listarEmpleados,
  obtenerEmpleado,
  crearEmpleado,
  actualizarEmpleado,
  eliminarEmpleado
};
