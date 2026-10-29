/**
 * Servicio de autenticación (tabla `usuarios`).
 * Se implementa desde ya a nivel de backend; la pantalla de Login y el
 * interceptor de rutas quedan para la fase final del roadmap.
 */

const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { texto, unoDe } = require('../utils/validaciones');

const ROLES = ['ADMIN', 'RH', 'GUARDIA'];
// Hash señuelo para mantener un tiempo de comparación similar cuando el usuario no existe.
const HASH_SEÑUELO = '$2b$10$CwTycUXWue0Thq9StjUM0uJ8Lk0cKjG5Xt7Tq0l4boPq2m0bG6G1S';

function autenticar(usuario, password) {
  const nombreUsuario = texto(usuario, 'Usuario', { max: 60 });
  const contrasena = typeof password === 'string' ? password : '';
  if (!contrasena) throw new Error('La contraseña es obligatoria');

  const fila = getDb()
    .prepare('SELECT id, usuario, password_hash, nombre, rol FROM usuarios WHERE usuario = ? COLLATE NOCASE')
    .get(nombreUsuario);

  const hash = fila ? fila.password_hash : HASH_SEÑUELO;
  const valido = bcrypt.compareSync(contrasena, hash);

  if (!fila || !valido) {
    throw new Error('Credenciales inválidas');
  }

  return {
    id: fila.id,
    usuario: fila.usuario,
    nombre: fila.nombre,
    rol: fila.rol
  };
}

function listarUsuarios() {
  return getDb()
    .prepare('SELECT id, usuario, nombre, rol, creado_en FROM usuarios ORDER BY usuario COLLATE NOCASE ASC')
    .all();
}

function crearUsuario({ usuario, password, nombre = '', rol = 'GUARDIA' } = {}) {
  const nombreUsuario = texto(usuario, 'Usuario', { max: 60 });
  const contrasena = typeof password === 'string' ? password : '';
  if (contrasena.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres');
  }
  const rolValido = unoDe(rol, ROLES, 'Rol');

  const hash = bcrypt.hashSync(contrasena, 10);
  const info = getDb()
    .prepare('INSERT INTO usuarios (usuario, password_hash, nombre, rol) VALUES (?, ?, ?, ?)')
    .run(nombreUsuario, hash, texto(nombre, 'Nombre', { requerido: false, max: 80 }), rolValido);

  return { id: info.lastInsertRowid, usuario: nombreUsuario, rol: rolValido };
}

module.exports = { ROLES, autenticar, listarUsuarios, crearUsuario };
