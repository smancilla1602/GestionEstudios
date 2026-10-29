/**
 * Conexión única (singleton) a SQLite con better-sqlite3.
 * La base vive en <userData>/data/estudios.db.
 */

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const { aplicarEsquema } = require('./schema');
const { sembrarDatosIniciales } = require('./seed');

let db = null;
let rutaBaseDatos = null;
let directorioDatos = null;
let resultadoSeed = null;

function initDatabase(userDataDir) {
  if (db) return db;
  if (!userDataDir || typeof userDataDir !== 'string') {
    throw new Error('No se recibió el directorio de datos de la aplicación');
  }

  directorioDatos = path.join(userDataDir, 'data');
  fs.mkdirSync(directorioDatos, { recursive: true });
  rutaBaseDatos = path.join(directorioDatos, 'estudios.db');

  db = new Database(rutaBaseDatos);
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');

  aplicarEsquema(db);
  resultadoSeed = sembrarDatosIniciales(db);

  return db;
}

function getDb() {
  if (!db) {
    throw new Error('La base de datos no ha sido inicializada');
  }
  return db;
}

function getDbPath() {
  return rutaBaseDatos;
}

function getDirectorioDatos() {
  return directorioDatos;
}

function getResultadoSeed() {
  return resultadoSeed;
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  initDatabase,
  getDb,
  getDbPath,
  getDirectorioDatos,
  getResultadoSeed,
  closeDatabase
};
