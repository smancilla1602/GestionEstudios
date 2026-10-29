const { registrarAppHandlers } = require('./app');
const { registrarEmpleadosHandlers } = require('./empleados');
const { registrarEstudiosHandlers } = require('./estudios');
const { registrarExcelHandlers } = require('./excel');
const { registrarArchivosHandlers } = require('./archivos');
const { registrarAuthHandlers } = require('./auth');

let registrados = false;

/** Registra todos los canales IPC una sola vez (idempotente). */
function registrarIpc() {
  if (registrados) return;
  registrados = true;

  registrarAppHandlers();
  registrarEmpleadosHandlers();
  registrarEstudiosHandlers();
  registrarExcelHandlers();
  registrarArchivosHandlers();
  registrarAuthHandlers();
}

module.exports = { registrarIpc };
