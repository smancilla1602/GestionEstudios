/**
 * Generación del reporte Excel (.xlsx) con SheetJS.
 *
 * Pestañas:
 *  - General              : todos los empleados y su estudio vigente por tipo.
 *  - Próximos a Vencer    : empleados cuyo estado global es POR_VENCER.
 *  - Bloqueados-Vencidos  : empleados BLOQUEADOS (vencidos, NO_APTO, inactivos, sin estudios).
 *  - Resumen              : totales y fecha de generación.
 *
 * Módulo puro (sin dependencias de Electron) para poder probarlo por separado.
 */

const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('xlsx');
const { formatearFecha } = require('./semaforo');

const COLUMNAS = [
  { key: 'numero_empleado', label: 'Número Empleado', width: 18 },
  { key: 'nombre_completo', label: 'Nombre Completo', width: 32 },
  { key: 'departamento', label: 'Departamento', width: 22 },
  { key: 'puesto', label: 'Puesto', width: 22 },
  { key: 'tipo_estudio', label: 'Estudio', width: 28 },
  { key: 'fecha_realizacion', label: 'Fecha Realización', width: 18 },
  { key: 'fecha_vencimiento', label: 'Fecha Vencimiento', width: 18 },
  { key: 'dias_para_vencer', label: 'Días para Vencer', width: 17 },
  { key: 'estado_semaforo', label: 'Estado del Semáforo', width: 20 },
  { key: 'resultado', label: 'Resultado', width: 16 },
  { key: 'motivo', label: 'Motivo / Observaciones', width: 52 }
];

function formatearFechaHora(fecha = new Date()) {
  const d = new Date(fecha);
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const hora = String(d.getHours()).padStart(2, '0');
  const minuto = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes}/${d.getFullYear()} ${hora}:${minuto}`;
}

function motivoDeEstudio(estudio) {
  return [estudio.motivo, estudio.observaciones].filter(Boolean).join(' · ');
}

function filaDeEstudio(empleado, estudio) {
  return {
    numero_empleado: empleado.numero_empleado,
    nombre_completo: empleado.nombre_completo,
    departamento: empleado.departamento || '—',
    puesto: empleado.puesto || '—',
    tipo_estudio: estudio ? estudio.tipo_estudio : 'Sin estudios registrados',
    fecha_realizacion: estudio ? formatearFecha(estudio.fecha_realizacion) : '',
    fecha_vencimiento: estudio ? formatearFecha(estudio.fecha_vencimiento) : '',
    dias_para_vencer:
      estudio && typeof estudio.dias_para_vencer === 'number' ? estudio.dias_para_vencer : '',
    estado_semaforo: estudio ? estudio.etiqueta_semaforo : empleado.etiqueta_semaforo,
    resultado: estudio ? estudio.resultado : '',
    motivo: estudio ? motivoDeEstudio(estudio) : (empleado.motivos || []).join(' · ')
  };
}

function filasDeEmpleado(empleado) {
  const estudios =
    Array.isArray(empleado.estudios) && empleado.estudios.length > 0 ? empleado.estudios : [null];
  return estudios.map((estudio) => filaDeEstudio(empleado, estudio));
}

function crearHoja(filas) {
  const encabezado = COLUMNAS.map((columna) => columna.label);
  const datos = filas.map((fila) =>
    COLUMNAS.map((columna) => {
      const valor = fila[columna.key];
      return valor === undefined || valor === null ? '' : valor;
    })
  );

  const hoja = XLSX.utils.aoa_to_sheet([encabezado, ...datos]);
  hoja['!cols'] = COLUMNAS.map((columna) => ({ wch: columna.width }));
  hoja['!autofilter'] = {
    ref: `A1:${XLSX.utils.encode_col(COLUMNAS.length - 1)}${filas.length + 1}`
  };
  return hoja;
}

function crearHojaResumen(resumen, generadoEn) {
  const filas = [
    ['REPORTE DE ESTUDIOS MÉDICOS', ''],
    ['Generado', formatearFechaHora(generadoEn)],
    ['', ''],
    ['Empleados registrados', resumen.total],
    ['Empleados vigentes', resumen.vigente],
    ['Empleados próximos a vencer', resumen.por_vencer],
    ['Empleados bloqueados / vencidos', resumen.bloqueado],
    ['Empleados con estudios capturados', resumen.con_estudios],
    ['', ''],
    ['Registros en pestaña General', resumen.filas_general],
    ['Registros en pestaña Próximos a Vencer', resumen.filas_por_vencer],
    ['Registros en pestaña Bloqueados-Vencidos', resumen.filas_bloqueados]
  ];

  const hoja = XLSX.utils.aoa_to_sheet(filas);
  hoja['!cols'] = [{ wch: 38 }, { wch: 34 }];
  return hoja;
}

/**
 * Construye el libro de Excel en memoria.
 * @param {Array} empleados salida de obtenerEmpleadosConEstado()
 */
function construirLibro(empleados = [], { generadoEn = new Date() } = {}) {
  const general = empleados.flatMap(filasDeEmpleado);
  const porVencer = empleados
    .filter((empleado) => empleado.estado_semaforo === 'POR_VENCER')
    .flatMap(filasDeEmpleado);
  const bloqueados = empleados
    .filter((empleado) => empleado.estado_semaforo === 'BLOQUEADO')
    .flatMap(filasDeEmpleado);

  const resumen = {
    total: empleados.length,
    vigente: empleados.filter((e) => e.estado_semaforo === 'VIGENTE').length,
    por_vencer: empleados.filter((e) => e.estado_semaforo === 'POR_VENCER').length,
    bloqueado: empleados.filter((e) => e.estado_semaforo === 'BLOQUEADO').length,
    con_estudios: empleados.filter((e) => (e.total_estudios ?? 0) > 0).length,
    filas_general: general.length,
    filas_por_vencer: porVencer.length,
    filas_bloqueados: bloqueados.length
  };

  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, crearHoja(general), 'General');
  XLSX.utils.book_append_sheet(libro, crearHoja(porVencer), 'Próximos a Vencer');
  XLSX.utils.book_append_sheet(libro, crearHoja(bloqueados), 'Bloqueados-Vencidos');
  XLSX.utils.book_append_sheet(libro, crearHojaResumen(resumen, generadoEn), 'Resumen');

  libro.Props = {
    Title: 'Reporte de estudios médicos',
    Subject: 'Control de estudios médicos',
    Author: 'Sistema de Estudios Médicos',
    CreatedDate: new Date(generadoEn)
  };

  return { libro, resumen };
}

function nombreArchivoSugerido(fecha = new Date()) {
  const d = new Date(fecha);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `estudios-medicos-${d.getFullYear()}-${mes}-${dia}.xlsx`;
}

/**
 * Genera el archivo .xlsx en disco.
 * @returns {{ ruta: string, bytes: number, resumen: object }}
 */
function generarArchivoExcel(empleados, rutaDestino, opciones = {}) {
  const { libro, resumen } = construirLibro(empleados, opciones);
  const buffer = XLSX.write(libro, { bookType: 'xlsx', type: 'buffer', compression: true });

  fs.mkdirSync(path.dirname(rutaDestino), { recursive: true });
  fs.writeFileSync(rutaDestino, buffer);

  return { ruta: rutaDestino, bytes: buffer.length, resumen };
}

module.exports = {
  COLUMNAS,
  construirLibro,
  generarArchivoExcel,
  nombreArchivoSugerido,
  formatearFechaHora,
  filaDeEstudio
};
