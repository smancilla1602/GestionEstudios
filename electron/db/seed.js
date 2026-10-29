/**
 * Datos iniciales: catálogo de tipos de estudio y usuario administrador.
 * El login se implementa en la fase final del roadmap, pero la tabla `usuarios`
 * queda lista y con credenciales válidas desde el primer arranque.
 */

const bcrypt = require('bcryptjs');

const TIPOS_ESTUDIO_INICIALES = [
  { nombre: 'Examen médico general', vigencia_meses: 12 },
  { nombre: 'Audiometría', vigencia_meses: 12 },
  { nombre: 'Espirometría', vigencia_meses: 12 },
  { nombre: 'Visiometría', vigencia_meses: 12 },
  { nombre: 'Perfil de laboratorio', vigencia_meses: 12 },
  { nombre: 'Electrocardiograma', vigencia_meses: 12 },
  { nombre: 'Examen toxicológico', vigencia_meses: 6 }
];

const ADMIN_POR_DEFECTO = {
  usuario: 'admin',
  password: 'Admin123!',
  nombre: 'Administrador del sistema',
  rol: 'ADMIN'
};

function sembrarDatosIniciales(db) {
  const resultado = {
    tipos_creados: 0,
    admin_creado: false,
    admin_usuario: null,
    password_temporal: null
  };

  const totalTipos = db.prepare('SELECT COUNT(*) AS total FROM tipos_estudio').get().total;
  if (totalTipos === 0) {
    const insertar = db.prepare('INSERT INTO tipos_estudio (nombre, vigencia_meses) VALUES (?, ?)');
    const insertarTodos = db.transaction((tipos) => {
      for (const tipo of tipos) insertar.run(tipo.nombre, tipo.vigencia_meses);
    });
    insertarTodos(TIPOS_ESTUDIO_INICIALES);
    resultado.tipos_creados = TIPOS_ESTUDIO_INICIALES.length;
  }

  const totalUsuarios = db.prepare('SELECT COUNT(*) AS total FROM usuarios').get().total;
  if (totalUsuarios === 0) {
    const password = process.env.ADMIN_PASSWORD || ADMIN_POR_DEFECTO.password;
    const hash = bcrypt.hashSync(password, 10);
    db.prepare(
      'INSERT INTO usuarios (usuario, password_hash, nombre, rol) VALUES (?, ?, ?, ?)'
    ).run(ADMIN_POR_DEFECTO.usuario, hash, ADMIN_POR_DEFECTO.nombre, ADMIN_POR_DEFECTO.rol);

    resultado.admin_creado = true;
    resultado.admin_usuario = ADMIN_POR_DEFECTO.usuario;
    resultado.password_temporal = process.env.ADMIN_PASSWORD ? null : password;

    if (resultado.password_temporal) {
      console.warn(
        `[seed] Usuario administrador creado -> usuario: ${ADMIN_POR_DEFECTO.usuario} | ` +
          `contraseña temporal: ${resultado.password_temporal} (cámbiela cuando se habilite el Login)`
      );
    }
  }

  return resultado;
}

module.exports = { sembrarDatosIniciales, TIPOS_ESTUDIO_INICIALES, ADMIN_POR_DEFECTO };
