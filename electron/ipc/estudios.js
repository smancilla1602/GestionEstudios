const { handle } = require('./helpers');
const repositorio = require('../db/estudios');

function registrarEstudiosHandlers() {
  handle('tipos-estudio:listar', () => repositorio.listarTiposEstudio());

  handle('tipos-estudio:crear', (datos) => repositorio.crearTipoEstudio(datos));

  handle('tipos-estudio:actualizar', (id, datos) => repositorio.actualizarTipoEstudio(id, datos));

  handle('tipos-estudio:eliminar', (id) => repositorio.eliminarTipoEstudio(id));

  handle('estudios:listar-por-empleado', (empleadoId) =>
    repositorio.listarEstudiosPorEmpleado(empleadoId)
  );

  handle('estudios:crear', (datos) => repositorio.crearEstudio(datos));

  handle('estudios:actualizar', (id, datos) => repositorio.actualizarEstudio(id, datos));

  handle('estudios:eliminar', (id) => repositorio.eliminarEstudio(id));
}

module.exports = { registrarEstudiosHandlers };
