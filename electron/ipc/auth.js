const { handle } = require('./helpers');
const { autenticar, listarUsuarios } = require('../services/auth');

/**
 * Handlers listos para la fase de Login. La UI aún no los consume:
 * el interceptor de rutas y la pantalla de acceso están en el roadmap (fase 6).
 */
function registrarAuthHandlers() {
  handle('auth:login', ({ usuario, password } = {}) => autenticar(usuario, password));

  handle('auth:usuarios', () => listarUsuarios());
}

module.exports = { registrarAuthHandlers };
