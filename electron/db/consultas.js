/**
 * Consultas de lectura que combinan empleados + estudios + semáforo.
 * Es la capa que consume el Dashboard, los expedientes y la exportación a Excel.
 */

const { getDb } = require('./database');
const { evaluarEmpleado, ultimosPorTipo } = require('../services/semaforo');

const CAMPOS_EMPLEADO = `
  e.id, e.numero_empleado, e.nombre, e.apellido, e.departamento, e.puesto, e.estado, e.creado_en
`;

const SQL_HISTORIA = `
  SELECT em.id, em.empleado_id, em.tipo_estudio_id, em.fecha_realizacion, em.fecha_vencimiento,
         em.resultado, em.ruta_archivo, em.observaciones, em.creado_en,
         te.nombre AS tipo_estudio, te.vigencia_meses
  FROM estudios_medicos em
  JOIN tipos_estudio te ON te.id = em.tipo_estudio_id
`;

function construirEmpleado(empleado, historia = []) {
  const estudios = ultimosPorTipo(historia);
  const evaluacion = evaluarEmpleado(empleado, estudios);

  return {
    ...empleado,
    nombre_completo: `${empleado.nombre} ${empleado.apellido}`.trim(),
    historia,
    total_estudios: historia.length,
    ...evaluacion
  };
}

/** Devuelve todos los empleados con su estado de acceso calculado. */
function obtenerEmpleadosConEstado() {
  const db = getDb();
  const empleados = db
    .prepare(
      `SELECT ${CAMPOS_EMPLEADO} FROM empleados e
       ORDER BY e.apellido COLLATE NOCASE ASC, e.nombre COLLATE NOCASE ASC`
    )
    .all();

  const historia = db
    .prepare(`${SQL_HISTORIA} ORDER BY em.empleado_id ASC, em.fecha_realizacion DESC, em.id DESC`)
    .all();

  const historiaPorEmpleado = new Map();
  for (const estudio of historia) {
    if (!historiaPorEmpleado.has(estudio.empleado_id)) {
      historiaPorEmpleado.set(estudio.empleado_id, []);
    }
    historiaPorEmpleado.get(estudio.empleado_id).push(estudio);
  }

  return empleados.map((empleado) =>
    construirEmpleado(empleado, historiaPorEmpleado.get(empleado.id) || [])
  );
}

function obtenerEmpleadoPorId(id) {
  const db = getDb();
  const empleado = db
    .prepare(`SELECT ${CAMPOS_EMPLEADO} FROM empleados e WHERE e.id = ?`)
    .get(Number(id));
  if (!empleado) return null;

  const historia = db
    .prepare(`${SQL_HISTORIA} WHERE em.empleado_id = ? ORDER BY em.fecha_realizacion DESC, em.id DESC`)
    .all(empleado.id);

  return construirEmpleado(empleado, historia);
}

function resumenEstados(empleados = []) {
  const resumen = {
    total: empleados.length,
    vigente: 0,
    por_vencer: 0,
    bloqueado: 0,
    con_estudios: 0
  };

  for (const empleado of empleados) {
    if (empleado.estado_semaforo === 'VIGENTE') resumen.vigente += 1;
    else if (empleado.estado_semaforo === 'POR_VENCER') resumen.por_vencer += 1;
    else if (empleado.estado_semaforo === 'BLOQUEADO') resumen.bloqueado += 1;

    if ((empleado.total_estudios ?? 0) > 0) resumen.con_estudios += 1;
  }

  return resumen;
}

module.exports = {
  obtenerEmpleadosConEstado,
  obtenerEmpleadoPorId,
  resumenEstados
};
