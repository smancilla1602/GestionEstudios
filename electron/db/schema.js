/**
 * DDL de la base de datos local (SQLite).
 * Se ejecuta en cada arranque con IF NOT EXISTS y se versiona con PRAGMA user_version.
 */

const VERSION_ESQUEMA = 2;

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
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  empleado_id             INTEGER NOT NULL REFERENCES empleados(id) ON DELETE CASCADE,
  tipo_estudio_id         INTEGER NOT NULL REFERENCES tipos_estudio(id) ON DELETE RESTRICT,
  fecha_realizacion       TEXT NOT NULL,
  fecha_vencimiento       TEXT NOT NULL,
  resultado               TEXT NOT NULL CHECK (resultado IN ('APTO', 'RESTRICCION', 'NO_APTO')),
  ruta_archivo            TEXT,
  observaciones           TEXT,
  -- Estudio provisional: usa el tipo del catálogo pero con vigencia capturada en meses + días.
  es_provisional          INTEGER NOT NULL DEFAULT 0 CHECK (es_provisional IN (0, 1)),
  vigencia_meses_aplicada INTEGER NOT NULL DEFAULT 0 CHECK (vigencia_meses_aplicada BETWEEN 0 AND 120),
  vigencia_dias_aplicada  INTEGER NOT NULL DEFAULT 0 CHECK (vigencia_dias_aplicada BETWEEN 0 AND 365),
  provisional_motivo      TEXT,
  creado_en               TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_estudios_empleado
  ON estudios_medicos (empleado_id);

CREATE INDEX IF NOT EXISTS idx_estudios_vencimiento
  ON estudios_medicos (fecha_vencimiento);

CREATE INDEX IF NOT EXISTS idx_empleados_estado
  ON empleados (estado);
`;

/**
 * Columnas que se agregaron al esquema 2 (estudio provisional).
 * `CREATE TABLE IF NOT EXISTS` no altera tablas existentes, así que se agregan aquí.
 */
const COLUMNAS_NUEVAS_ESTUDIOS = [
  { nombre: 'es_provisional', ddl: 'INTEGER NOT NULL DEFAULT 0 CHECK (es_provisional IN (0, 1))' },
  { nombre: 'vigencia_meses_aplicada', ddl: 'INTEGER NOT NULL DEFAULT 0' },
  { nombre: 'vigencia_dias_aplicada', ddl: 'INTEGER NOT NULL DEFAULT 0' },
  { nombre: 'provisional_motivo', ddl: 'TEXT' }
];

/**
 * Migración idempotente: agrega las columnas que falten y rellena la vigencia aplicada de los
 * registros históricos (que siempre fue la del catálogo). No modifica fechas de vencimiento.
 */
function migrarEsquema(db) {
  const existentes = new Set(db.pragma('table_info(estudios_medicos)').map((columna) => columna.name));
  const faltantes = COLUMNAS_NUEVAS_ESTUDIOS.filter((columna) => !existentes.has(columna.nombre));
  if (faltantes.length === 0) return 0;

  const migrar = db.transaction(() => {
    for (const columna of faltantes) {
      db.exec(`ALTER TABLE estudios_medicos ADD COLUMN ${columna.nombre} ${columna.ddl}`);
    }

    db.prepare(
      `UPDATE estudios_medicos
          SET vigencia_meses_aplicada = COALESCE(
                (SELECT te.vigencia_meses FROM tipos_estudio te
                  WHERE te.id = estudios_medicos.tipo_estudio_id), 0)
        WHERE es_provisional = 0
          AND vigencia_meses_aplicada = 0
          AND vigencia_dias_aplicada = 0`
    ).run();
  });

  migrar();
  return faltantes.length;
}

function aplicarEsquema(db) {
  const versionActual = db.pragma('user_version', { simple: true });
  db.exec(ESQUEMA);
  migrarEsquema(db);
  if (versionActual < VERSION_ESQUEMA) {
    db.pragma(`user_version = ${VERSION_ESQUEMA}`);
  }
  return VERSION_ESQUEMA;
}

module.exports = {
  ESQUEMA,
  VERSION_ESQUEMA,
  COLUMNAS_NUEVAS_ESTUDIOS,
  migrarEsquema,
  aplicarEsquema
};
