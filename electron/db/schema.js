/**
 * DDL de la base de datos local (SQLite).
 * Se ejecuta en cada arranque con IF NOT EXISTS y se versiona con PRAGMA user_version.
 */

const VERSION_ESQUEMA = 1;

const ESQUEMA = `
CREATE TABLE IF NOT EXISTS usuarios (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario       TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  nombre        TEXT NOT NULL DEFAULT '',
  rol           TEXT NOT NULL DEFAULT 'GUARDIA' CHECK (rol IN ('ADMIN', 'RH', 'GUARDIA')),
  creado_en     TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS empleados (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_empleado TEXT NOT NULL COLLATE NOCASE UNIQUE,
  nombre          TEXT NOT NULL,
  apellido        TEXT NOT NULL DEFAULT '',
  departamento    TEXT NOT NULL DEFAULT '',
  puesto          TEXT NOT NULL DEFAULT '',
  estado          TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO', 'INACTIVO')),
  creado_en       TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  actualizado_en  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS tipos_estudio (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre         TEXT NOT NULL COLLATE NOCASE UNIQUE,
  vigencia_meses INTEGER NOT NULL CHECK (vigencia_meses > 0 AND vigencia_meses <= 120)
);

CREATE TABLE IF NOT EXISTS estudios_medicos (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  empleado_id       INTEGER NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  tipo_estudio_id   INTEGER NOT NULL REFERENCES tipos_estudio(id) ON DELETE RESTRICT,
  fecha_realizacion TEXT NOT NULL,
  fecha_vencimiento TEXT NOT NULL,
  resultado         TEXT NOT NULL CHECK (resultado IN ('APTO', 'RESTRICCION', 'NO_APTO')),
  ruta_archivo      TEXT,
  observaciones     TEXT,
  creado_en         TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_estudios_empleado
  ON estudios_medicos (empleado_id);

CREATE INDEX IF NOT EXISTS idx_estudios_vencimiento
  ON estudios_medicos (fecha_vencimiento);

CREATE INDEX IF NOT EXISTS idx_empleados_estado
  ON empleados (estado);
`;

function aplicarEsquema(db) {
  const versionActual = db.pragma('user_version', { simple: true });
  db.exec(ESQUEMA);
  if (versionActual < VERSION_ESQUEMA) {
    db.pragma(`user_version = ${VERSION_ESQUEMA}`);
  }
  return VERSION_ESQUEMA;
}

module.exports = { ESQUEMA, VERSION_ESQUEMA, aplicarEsquema };
