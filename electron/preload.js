/**
 * Puente seguro entre el renderer (React) y el proceso principal.
 * contextIsolation: true + nodeIntegration: false => el renderer sólo ve `window.api`.
 */

const { contextBridge, ipcRenderer } = require('electron');

async function invocar(canal, ...args) {
  const respuesta = await ipcRenderer.invoke(canal, ...args);
  if (!respuesta || respuesta.ok !== true) {
    throw new Error(respuesta?.error || 'No se pudo completar la operación');
  }
  return respuesta.data;
}

const api = {
  app: {
    info: () => invocar('app:info'),
    revelar: (ruta) => invocar('excel:revelar', ruta)
  },
  empleados: {
    listar: () => invocar('empleados:listar'),
    obtener: (id) => invocar('empleados:obtener', id),
    crear: (datos) => invocar('empleados:crear', datos),
    siguienteNumero: () => invocar('empleados:siguiente-numero'),
    actualizar: (id, datos) => invocar('empleados:actualizar', id, datos),
    eliminar: (id) => invocar('empleados:eliminar', id)
  },
  tiposEstudio: {
    listar: () => invocar('tipos-estudio:listar'),
    crear: (datos) => invocar('tipos-estudio:crear', datos),
    actualizar: (id, datos) => invocar('tipos-estudio:actualizar', id, datos),
    eliminar: (id) => invocar('tipos-estudio:eliminar', id)
  },
  estudios: {
    listarPorEmpleado: (empleadoId) => invocar('estudios:listar-por-empleado', empleadoId),
    crear: (datos) => invocar('estudios:crear', datos),
    actualizar: (id, datos) => invocar('estudios:actualizar', id, datos),
    eliminar: (id) => invocar('estudios:eliminar', id)
  },
  excel: {
    exportar: () => invocar('excel:exportar')
  },
  archivos: {
    seleccionar: (empleadoId) => invocar('archivos:seleccionar', empleadoId),
    abrir: (ruta) => invocar('archivos:abrir', ruta)
  },
  auth: {
    login: (credenciales) => invocar('auth:login', credenciales),
    usuarios: () => invocar('auth:usuarios')
  }
};

contextBridge.exposeInMainWorld('api', api);
