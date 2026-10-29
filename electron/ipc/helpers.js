/**
 * Envoltorio de ipcMain.handle que normaliza la respuesta a { ok, data } / { ok, error }.
 * Así el renderer recibe siempre un objeto serializable y los errores llegan como texto.
 */

const { ipcMain } = require('electron');

function handle(canal, fn) {
  ipcMain.handle(canal, async (_evento, ...args) => {
    try {
      const data = await fn(...args);
      return { ok: true, data: data === undefined ? null : data };
    } catch (error) {
      console.error(`[IPC:${canal}] ${error?.message || error}`);
      return { ok: false, error: error?.message || 'Ocurrió un error inesperado' };
    }
  });
}

module.exports = { handle };
