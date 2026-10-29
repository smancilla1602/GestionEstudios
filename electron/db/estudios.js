/**
 * Repositorio de estudios médicos y catálogo de tipos de estudio.
 * La fecha de vencimiento SIEMPRE se calcula en el backend a partir de la
 * vigencia del tipo de estudio, nunca se confía en el valor que envía la UI.
 */

const { getDb } = require('./database');
const { entero, fechaISO, unoDe, rutaArchivo, texto } = require('../utils/validaciones');
const { RESULTADOS, hoyISO, sumarMeses } = require('../services/semaforo');

const SQL_ESTUDIO = `
  SELECT em.id, em.empleado_id, em.tipo_estudio_id, em.fecha_realizacion, em.fecha_vencimiento,
         em.resultado, em.ruta_archivo, em.observaciones, em.creado_en,
         te.nombre AS tipo_estudio, te.vigencia_meses
  FROM estudios_medicos em
  JOIN tipos_estudio te ON te.id = em.tipo_estudio_id
`;

function listarTiposEstudio() {
  return getDb()
    .prepare(
      `SELECT te.id, te.nombre, te.vigencia_meses, COUNT(em.id) AS total_estudios
       FROM tipos_estudio te
       LEFT JOIN estudios_medicos em ON em.tipo_estudio_id = te.id
       GROUP BY te.id
       ORDER BY te.nombre COLLATE NOCASE ASC`
    )
    .all();
}

function obtenerTipoEstudio(id) {
  return getDb().prepare('SELECT id, nombre, vigencia_meses FROM tipos_estudio WHERE id = ?').get(Number(id)) || null;
}

function normalizarTipoEstudio(datos = {}) {
  return {
    nombre: texto(datos.nombre, 'Nombre del estudio', { max: 80, min: 2 }),
    vigencia_meses: entero(datos.vigencia_meses, 'Vigencia en meses', { min: 1, max: 120 })
  };
}

function traducirErrorTipo(error, nombre) {
  const mensaje = String(error?.message || '');
  if (mensaje.includes('tipos_estudio.nombre')) {
    return new Error(`Ya existe un tipo de estudio con el nombre "${nombre}"`);
  }
  return error;
}

function crearTipoEstudio(datos = {}) {
  const limpio = normalizarTipoEstudio(datos);
  let info;
  try {
    info = getDb()
      .prepare('INSERT INTO tipos_estudio (nombre, vigencia_meses) VALUES (@nombre, @vigencia_meses)')
      .run(limpio);
  } catch (error) {
    throw traducirErrorTipo(error, limpio.nombre);
  }
  return obtenerTipoEstudio(info.lastInsertRowid);
}

/**
 * Actualiza nombre y/o vigencia de un tipo de estudio.
 * Si `recalcular_vencimientos` es true y la vigencia cambió, se recalculan las fechas
 * de vencimiento de todos los estudios ya registrados con ese tipo.
 */
function actualizarTipoEstudio(id, datos = {}) {
  const tipoId = entero(id, 'Tipo de estudio');
  const actual = obtenerTipoEstudio(tipoId);
  if (!actual) throw new Error('Tipo de estudio no encontrado');

  const limpio = normalizarTipoEstudio({ ...actual, ...datos });
  const recalcular = datos.recalcular_vencimientos === true;
  const db = getDb();

  const ejecutar = db.transaction(() => {
    try {
      db.prepare(
        `UPDATE tipos_estudio
         SET nombre = @nombre, vigencia_meses = @vigencia_meses
         WHERE id = @id`
      ).run({ ...limpio, id: tipoId });
    } catch (error) {
      throw traducirErrorTipo(error, limpio.nombre);
    }

    if (!recalcular || limpio.vigencia_meses === actual.vigencia_meses) return 0;

    const estudios = db
      .prepare('SELECT id, fecha_realizacion FROM estudios_medicos WHERE tipo_estudio_id = ?')
      .all(tipoId);
    const actualizarFecha = db.prepare('UPDATE estudios_medicos SET fecha_vencimiento = ? WHERE id = ?');

    for (const estudio of estudios) {
      actualizarFecha.run(sumarMeses(estudio.fecha_realizacion, limpio.vigencia_meses), estudio.id);
    }
    return estudios.length;
  });

  const estudiosActualizados = ejecutar();
  return { tipo: obtenerTipoEstudio(tipoId), estudios_actualizados: estudiosActualizados };
}

function eliminarTipoEstudio(id) {
  const tipoId = entero(id, 'Tipo de estudio');
  const tipo = obtenerTipoEstudio(tipoId);
  if (!tipo) throw new Error('Tipo de estudio no encontrado');

  const total = getDb()
    .prepare('SELECT COUNT(*) AS total FROM estudios_medicos WHERE tipo_estudio_id = ?')
    .get(tipoId).total;

  if (total > 0) {
    throw new Error(
      `No se puede eliminar "${tipo.nombre}" porque tiene ${total} estudio(s) registrados. ` +
        'Puede cambiarle el nombre o la vigencia.'
    );
  }

  getDb().prepare('DELETE FROM tipos_estudio WHERE id = ?').run(tipoId);
  return { eliminado: true, id: tipoId };
}

function listarEstudiosPorEmpleado(empleadoId) {
  return getDb()
    .prepare(`${SQL_ESTUDIO} WHERE em.empleado_id = ? ORDER BY em.fecha_realizacion DESC, em.id DESC`)
    .all(Number(empleadoId));
}

function obtenerEstudio(id) {
  return getDb().prepare(`${SQL_ESTUDIO} WHERE em.id = ?`).get(Number(id)) || null;
}

function normalizarDatos(datos = {}, empleadoId) {
  const tipoEstudioId = entero(datos.tipo_estudio_id, 'Tipo de estudio');
  const tipo = obtenerTipoEstudio(tipoEstudioId);
  if (!tipo) throw new Error('El tipo de estudio seleccionado no existe');

  const fechaRealizacion = fechaISO(datos.fecha_realizacion, 'Fecha de realización');
  if (fechaRealizacion > hoyISO()) {
    throw new Error('La fecha de realización no puede ser futura');
  }

  return {
    empleado_id: empleadoId,
    tipo_estudio_id: tipo.id,
    fecha_realizacion: fechaRealizacion,
    fecha_vencimiento: sumarMeses(fechaRealizacion, tipo.vigencia_meses),
    resultado: unoDe(datos.resultado, RESULTADOS, 'Resultado'),
    ruta_archivo: rutaArchivo(datos.ruta_archivo),
    observaciones: texto(datos.observaciones, 'Observaciones', { requerido: false, max: 1000 }) || null,
    vigencia_meses: tipo.vigencia_meses
  };
}

function crearEstudio(datos = {}) {
  const empleadoId = entero(datos.empleado_id, 'Empleado');
  const empleado = getDb().prepare('SELECT id FROM empleados WHERE id = ?').get(empleadoId);
  if (!empleado) throw new Error('El empleado indicado no existe');

  const limpio = normalizarDatos(datos, empleadoId);

  const info = getDb()
    .prepare(
      `INSERT INTO estudios_medicos
         (empleado_id, tipo_estudio_id, fecha_realizacion, fecha_vencimiento, resultado, ruta_archivo, observaciones)
       VALUES
         (@empleado_id, @tipo_estudio_id, @fecha_realizacion, @fecha_vencimiento, @resultado, @ruta_archivo, @observaciones)`
    )
    .run(limpio);

  return obtenerEstudio(info.lastInsertRowid);
}

function actualizarEstudio(id, datos = {}) {
  const estudioId = entero(id, 'Estudio');
  const actual = getDb().prepare('SELECT * FROM estudios_medicos WHERE id = ?').get(estudioId);
  if (!actual) throw new Error('Estudio no encontrado');

  const limpio = normalizarDatos({ ...actual, ...datos }, actual.empleado_id);

  getDb()
    .prepare(
      `UPDATE estudios_medicos
       SET tipo_estudio_id = @tipo_estudio_id,
           fecha_realizacion = @fecha_realizacion,
           fecha_vencimiento = @fecha_vencimiento,
           resultado = @resultado,
           ruta_archivo = @ruta_archivo,
           observaciones = @observaciones
       WHERE id = @id`
    )
    .run({ ...limpio, id: estudioId });

  return obtenerEstudio(estudioId);
}

function eliminarEstudio(id) {
  const info = getDb().prepare('DELETE FROM estudios_medicos WHERE id = ?').run(Number(id));
  if (info.changes === 0) throw new Error('Estudio no encontrado');
  return { eliminado: true, id: Number(id) };
}

module.exports = {
  listarTiposEstudio,
  obtenerTipoEstudio,
  crearTipoEstudio,
  actualizarTipoEstudio,
  eliminarTipoEstudio,
  listarEstudiosPorEmpleado,
  obtenerEstudio,
  crearEstudio,
  actualizarEstudio,
  eliminarEstudio
};
