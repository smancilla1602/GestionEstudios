const fs = require('node:fs');
const { app, dialog, shell } = require('electron');
const { handle } = require('./helpers');
const { obtenerEmpleadosConEstado } = require('../db/consultas');
const {
  generarArchivoExcel,
  nombreArchivoSugerido,
  formatearFechaHora
} = require('../services/excel');

function directorioDescargas() {
  try {
    return app.getPath('documents');
  } catch {
    return app.getPath('userData');
  }
}

function mensajeDeErrorArchivo(error) {
  const codigo = error?.code;
  if (codigo === 'EBUSY' || codigo === 'EPERM' || codigo === 'EACCES') {
    return 'No se pudo escribir el archivo. Verifique que no esté abierto en Excel y que tenga permisos en la carpeta destino.';
  }
  return error?.message || 'No se pudo generar el archivo de Excel';
}

function registrarExcelHandlers() {
  handle('excel:exportar', async () => {
    const empleados = obtenerEmpleadosConEstado();
    const sugerido = nombreArchivoSugerido();

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Exportar estudios médicos a Excel',
      defaultPath: `${directorioDescargas()}\\${sugerido}`,
      buttonLabel: 'Exportar',
      filters: [{ name: 'Libro de Excel', extensions: ['xlsx'] }]
    });

    if (canceled || !filePath) {
      return { cancelado: true };
    }

    try {
      const resultado = generarArchivoExcel(empleados, filePath);
      return {
        cancelado: false,
        ruta: resultado.ruta,
        bytes: resultado.bytes,
        resumen: resultado.resumen,
        total_empleados: empleados.length,
        generado_en: formatearFechaHora()
      };
    } catch (error) {
      throw new Error(mensajeDeErrorArchivo(error));
    }
  });

  handle('excel:revelar', (ruta) => {
    if (typeof ruta !== 'string' || !fs.existsSync(ruta)) {
      throw new Error('El archivo indicado no existe');
    }
    shell.showItemInFolder(ruta);
    return { revelado: true };
  });
}

module.exports = { registrarExcelHandlers };
