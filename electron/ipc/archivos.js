const fs = require('node:fs');
const path = require('node:path');
const { app, dialog, shell } = require('electron');
const { handle } = require('./helpers');
const { entero } = require('../utils/validaciones');

const EXTENSIONES = ['pdf', 'png', 'jpg', 'jpeg', 'webp'];

/** Copia el archivo elegido a <userData>/documentos/<empleado_id>/ para que la ruta no dependa del origen. */
function registrarArchivosHandlers() {
  handle('archivos:seleccionar', async (empleadoId) => {
    const id = entero(empleadoId, 'Empleado');

    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Seleccionar estudio médico (PDF o imagen)',
      properties: ['openFile'],
      filters: [
        { name: 'Documentos', extensions: EXTENSIONES },
        { name: 'Todos los archivos', extensions: ['*'] }
      ]
    });

    if (canceled || !filePaths?.length) {
      return { cancelado: true };
    }

    const origen = filePaths[0];
    const extension = path.extname(origen).toLowerCase();
    const destinoDir = path.join(app.getPath('userData'), 'documentos', String(id));
    fs.mkdirSync(destinoDir, { recursive: true });

    const base = path
      .basename(origen, extension)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '_')
      .slice(0, 60) || 'estudio';

    const destino = path.join(destinoDir, `${Date.now()}-${base}${extension}`);
    fs.copyFileSync(origen, destino);

    return {
      cancelado: false,
      ruta: destino,
      nombre_original: path.basename(origen)
    };
  });

  handle('archivos:abrir', async (ruta) => {
    if (typeof ruta !== 'string' || !ruta.trim()) {
      throw new Error('No hay archivo adjunto para este estudio');
    }
    if (!fs.existsSync(ruta)) {
      throw new Error('El archivo adjunto ya no existe en disco');
    }
    const error = await shell.openPath(ruta);
    if (error) throw new Error(`No se pudo abrir el archivo: ${error}`);
    return { abierto: true };
  });
}

module.exports = { registrarArchivosHandlers };
