const { app } = require('electron');
const paquete = require('../../package.json');
const { handle } = require('./helpers');
const { getDbPath, getDirectorioDatos, getResultadoSeed } = require('../db/database');
const { resumenEstados, obtenerEmpleadosConEstado } = require('../db/consultas');

function registrarAppHandlers() {
  handle('app:info', () => ({
    nombre: app.getName(),
    version: paquete.version,
    plataforma: process.platform,
    directorio_datos: getDirectorioDatos(),
    ruta_db: getDbPath(),
    entorno: app.isPackaged ? 'produccion' : 'desarrollo',
    seed: getResultadoSeed(),
    resumen: resumenEstados(obtenerEmpleadosConEstado())
  }));
}

module.exports = { registrarAppHandlers };
