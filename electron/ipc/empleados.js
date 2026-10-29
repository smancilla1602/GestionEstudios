const { handle } = require('./helpers');
const repositorio = require('../db/empleados');
const { obtenerEmpleadoPorId, obtenerEmpleadosConEstado } = require('../db/consultas');

function registrarEmpleadosHandlers() {
  handle('empleados:listar', () => obtenerEmpleadosConEstado());

  handle('empleados:obtener', (id) => {
    const empleado = obtenerEmpleadoPorId(id);
    if (!empleado) throw new Error('Empleado no encontrado');
    return empleado;
  });

  handle('empleados:crear', (datos) => repositorio.crearEmpleado(datos));

  handle('empleados:siguiente-numero', () => repositorio.siguienteNumeroEmpleado());

  handle('empleados:actualizar', (id, datos) => repositorio.actualizarEmpleado(id, datos));

  handle('empleados:eliminar', (id) => repositorio.eliminarEmpleado(id));
}

module.exports = { registrarEmpleadosHandlers };
