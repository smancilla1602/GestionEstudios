/**
 * Verificación automatizada del backend.
 * Se ejecuta con `npm run verify` (Electron, para usar el binario nativo de better-sqlite3).
 *
 * Cubre: reglas del semáforo, DDL/seed, CRUD, renovaciones, consultas, exportación a Excel y auth.
 * No abre ninguna ventana y trabaja sobre una base de datos temporal.
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const XLSX = require('xlsx');

const semaforo = require('../electron/services/semaforo');
const { initDatabase, getDb, closeDatabase } = require('../electron/db/database');
const empleadosRepo = require('../electron/db/empleados');
const estudiosRepo = require('../electron/db/estudios');
const { obtenerEmpleadosConEstado, obtenerEmpleadoPorId } = require('../electron/db/consultas');
const { generarArchivoExcel } = require('../electron/services/excel');
const { autenticar } = require('../electron/services/auth');

const directorioTemporal = fs.mkdtempSync(path.join(os.tmpdir(), 'estudios-verify-'));
const resumenPruebas = [];
let fallos = 0;

function prueba(nombre, fn) {
  try {
    fn();
    resumenPruebas.push({ nombre, ok: true });
    console.log(`  [OK]    ${nombre}`);
  } catch (error) {
    fallos += 1;
    resumenPruebas.push({ nombre, ok: false, error: error?.message });
    console.error(`  [FALLA] ${nombre}\n          ${error?.message}`);
  }
}

function sumarDias(fechaISO, dias) {
  const fecha = new Date(`${fechaISO}T00:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

function fechaParaVencerEn(tipo, dias) {
  return sumarDias(semaforo.sumarMeses(semaforo.hoyISO(), -tipo.vigencia_meses), dias);
}

console.log('\n=== 1. Reglas del semáforo (fechas deterministas) ===');
const hoyFijo = '2026-03-15';

prueba('sumarMeses respeta el último día del mes', () => {
  assert.equal(semaforo.sumarMeses('2026-01-31', 1), '2026-02-28');
  assert.equal(semaforo.sumarMeses('2024-01-31', 1), '2024-02-29');
  assert.equal(semaforo.sumarMeses('2026-12-15', 12), '2027-12-15');
});

prueba('diffDias calcula días de calendario', () => {
  assert.equal(semaforo.diffDias(hoyFijo, '2026-04-14'), 30);
  assert.equal(semaforo.diffDias(hoyFijo, '2026-03-14'), -1);
});

prueba('APTO con 31 días -> VIGENTE', () => {
  const estudio = semaforo.evaluarEstudio(
    { tipo_estudio: 'Examen general', fecha_vencimiento: '2026-04-15', resultado: 'APTO' },
    hoyFijo
  );
  assert.equal(estudio.estado_semaforo, 'VIGENTE');
  assert.equal(estudio.dias_para_vencer, 31);
});

prueba('APTO con 30 días -> POR_VENCER (límite inclusivo)', () => {
  const estudio = semaforo.evaluarEstudio(
    { tipo_estudio: 'Examen general', fecha_vencimiento: '2026-04-14', resultado: 'APTO' },
    hoyFijo
  );
  assert.equal(estudio.estado_semaforo, 'POR_VENCER');
});

prueba('Vence hoy -> POR_VENCER', () => {
  const estudio = semaforo.evaluarEstudio(
    { tipo_estudio: 'Examen general', fecha_vencimiento: hoyFijo, resultado: 'APTO' },
    hoyFijo
  );
  assert.equal(estudio.estado_semaforo, 'POR_VENCER');
  assert.equal(estudio.dias_para_vencer, 0);
});

prueba('Vencido ayer -> BLOQUEADO', () => {
  const estudio = semaforo.evaluarEstudio(
    { tipo_estudio: 'Examen general', fecha_vencimiento: '2026-03-14', resultado: 'APTO' },
    hoyFijo
  );
  assert.equal(estudio.estado_semaforo, 'BLOQUEADO');
  assert.match(estudio.motivo, /vencido el 14\/03\/2026/);
});

prueba('NO_APTO futuro -> BLOQUEADO', () => {
  const estudio = semaforo.evaluarEstudio(
    { tipo_estudio: 'Audiometría', fecha_vencimiento: '2027-01-01', resultado: 'NO_APTO' },
    hoyFijo
  );
  assert.equal(estudio.estado_semaforo, 'BLOQUEADO');
});

prueba('RESTRICCION vigente no bloquea pero se advierte', () => {
  const evaluacion = semaforo.evaluarEmpleado(
    { estado: 'ACTIVO' },
    [{ tipo_estudio: 'Laboratorio', fecha_vencimiento: '2026-09-01', resultado: 'RESTRICCION' }],
    hoyFijo
  );
  assert.equal(evaluacion.estado_semaforo, 'VIGENTE');
  assert.equal(evaluacion.permite_acceso, true);
  assert.equal(evaluacion.restricciones.length, 1);
});

prueba('Empleado INACTIVO -> BLOQUEADO', () => {
  const evaluacion = semaforo.evaluarEmpleado({ estado: 'INACTIVO' }, [], hoyFijo);
  assert.equal(evaluacion.estado_semaforo, 'BLOQUEADO');
  assert.ok(evaluacion.motivos.some((motivo) => /INACTIVO/.test(motivo)));
});

prueba('Empleado sin estudios -> BLOQUEADO', () => {
  const evaluacion = semaforo.evaluarEmpleado({ estado: 'ACTIVO' }, [], hoyFijo);
  assert.equal(evaluacion.estado_semaforo, 'BLOQUEADO');
  assert.deepEqual(evaluacion.motivos, ['Sin estudios médicos registrados']);
});

prueba('Un estudio NO_APTO domina sobre uno vigente', () => {
  const evaluacion = semaforo.evaluarEmpleado(
    { estado: 'ACTIVO' },
    [
      { tipo_estudio: 'General', fecha_vencimiento: '2027-01-01', resultado: 'APTO' },
      { tipo_estudio: 'Audiometría', fecha_vencimiento: '2027-01-01', resultado: 'NO_APTO' }
    ],
    hoyFijo
  );
  assert.equal(evaluacion.estado_semaforo, 'BLOQUEADO');
  assert.equal(evaluacion.permite_acceso, false);
  assert.equal(evaluacion.estudio_critico.tipo_estudio, 'Audiometría');
});

console.log('\n=== 2. Base de datos SQLite (archivo temporal) ===');
initDatabase(directorioTemporal);

prueba('Se crean las 4 tablas del esquema', () => {
  const tablas = getDb()
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((fila) => fila.name);
  for (const tabla of ['usuarios', 'empleados', 'tipos_estudio', 'estudios_medicos']) {
    assert.ok(tablas.includes(tabla), `Falta la tabla ${tabla}`);
  }
  assert.equal(getDb().pragma('user_version', { simple: true }), 1);
  assert.equal(getDb().pragma('foreign_keys', { simple: true }), 1);
});

prueba('Se siembra el usuario admin con hash bcrypt', () => {
  const usuario = getDb().prepare('SELECT * FROM usuarios WHERE usuario = ?').get('admin');
  assert.ok(usuario, 'No existe el usuario admin');
  assert.equal(usuario.rol, 'ADMIN');
  assert.match(usuario.password_hash, /^\$2[aby]\$/);
  const sesion = autenticar('admin', 'Admin123!');
  assert.equal(sesion.rol, 'ADMIN');
  assert.equal(sesion.password_hash, undefined);
  assert.throws(() => autenticar('admin', 'incorrecta'), /Credenciales inválidas/);
  assert.throws(() => autenticar('fantasma', 'Admin123!'), /Credenciales inválidas/);
});

prueba('Se siembra el catálogo de tipos de estudio', () => {
  const tipos = estudiosRepo.listarTiposEstudio();
  assert.ok(tipos.length >= 5);
  assert.ok(tipos.every((tipo) => tipo.vigencia_meses > 0));
});

console.log('\n=== 3. CRUD, renovaciones y consultas ===');
const tipos = estudiosRepo.listarTiposEstudio();
const tipoGeneral = tipos.find((tipo) => /general/i.test(tipo.nombre));
const tipoAudio = tipos.find((tipo) => /audiometr/i.test(tipo.nombre));
const tipoLab = tipos.find((tipo) => /laboratorio/i.test(tipo.nombre));
assert.ok(tipoGeneral && tipoAudio && tipoLab, 'No se encontraron los tipos de estudio base');

function crearEmpleadoDemo(numero, extra = {}) {
  return empleadosRepo.crearEmpleado({
    numero_empleado: numero,
    nombre: 'Empleado',
    apellido: `Prueba ${numero}`,
    departamento: 'Calidad',
    puesto: 'Analista',
    estado: 'ACTIVO',
    ...extra
  });
}

function agregarEstudio(empleado, tipo, dias, resultado = 'APTO', observaciones = '') {
  return estudiosRepo.crearEstudio({
    empleado_id: empleado.id,
    tipo_estudio_id: tipo.id,
    fecha_realizacion: fechaParaVencerEn(tipo, dias),
    resultado,
    observaciones
  });
}

const empPorVencer = crearEmpleadoDemo('VER-001');
const empVencido = crearEmpleadoDemo('VER-002');
const empNoApto = crearEmpleadoDemo('VER-003');
const empVigente = crearEmpleadoDemo('VER-004');
const empSinEstudios = crearEmpleadoDemo('VER-005');
const empInactivo = crearEmpleadoDemo('VER-006', { estado: 'INACTIVO' });
const empRenovado = crearEmpleadoDemo('VER-007');

agregarEstudio(empPorVencer, tipoGeneral, 10);
agregarEstudio(empVencido, tipoGeneral, -20);
agregarEstudio(empNoApto, tipoAudio, 200, 'NO_APTO', 'Hipoacusia leve');
const estudioVigente = agregarEstudio(empVigente, tipoGeneral, 200);
agregarEstudio(empVigente, tipoLab, 100, 'RESTRICCION', 'Control trimestral');
agregarEstudio(empInactivo, tipoGeneral, 200);
agregarEstudio(empRenovado, tipoGeneral, -60);
agregarEstudio(empRenovado, tipoGeneral, 200);

prueba('La fecha de vencimiento se calcula con la vigencia del tipo', () => {
  const realizacion = '2025-05-10';
  const creado = estudiosRepo.crearEstudio({
    empleado_id: empVigente.id,
    tipo_estudio_id: tipoAudio.id,
    fecha_realizacion: realizacion,
    resultado: 'APTO'
  });
  const esperado = semaforo.sumarMeses(realizacion, tipoAudio.vigencia_meses);
  assert.equal(creado.fecha_vencimiento, esperado);
  estudiosRepo.eliminarEstudio(creado.id);
});

prueba('Rechaza fechas de realización futuras', () => {
  const futura = sumarDias(semaforo.hoyISO(), 3);
  assert.throws(
    () =>
      estudiosRepo.crearEstudio({
        empleado_id: empVigente.id,
        tipo_estudio_id: tipoGeneral.id,
        fecha_realizacion: futura,
        resultado: 'APTO'
      }),
    /no puede ser futura/
  );
});

prueba('Número de empleado duplicado se rechaza (sin distinguir mayúsculas)', () => {
  assert.throws(() => crearEmpleadoDemo('ver-001'), /Ya existe un empleado con el número "ver-001"/);
  assert.throws(() => empleadosRepo.crearEmpleado({ numero_empleado: 'X-1', nombre: '' }), /obligatorio/);
});

prueba('Obtener expediente por id devuelve el semáforo calculado', () => {
  const encontrado = obtenerEmpleadoPorId(empPorVencer.id);
  assert.ok(encontrado);
  assert.equal(encontrado.numero_empleado, 'VER-001');
  assert.equal(encontrado.estado_semaforo, 'POR_VENCER');
  assert.ok(encontrado.estudios.length >= 1);
  assert.ok(encontrado.historia.length >= 1);
  assert.equal(obtenerEmpleadoPorId(999999), null);
});

prueba('Semáforo agregado por empleado sobre datos reales', () => {
  const lista = obtenerEmpleadosConEstado();
  const porNumero = new Map(lista.map((empleado) => [empleado.numero_empleado, empleado]));

  assert.equal(porNumero.get('VER-001').estado_semaforo, 'POR_VENCER');
  assert.equal(porNumero.get('VER-002').estado_semaforo, 'BLOQUEADO');
  assert.equal(porNumero.get('VER-003').estado_semaforo, 'BLOQUEADO');
  assert.equal(porNumero.get('VER-003').estudio_critico.resultado, 'NO_APTO');
  assert.equal(porNumero.get('VER-004').estado_semaforo, 'VIGENTE');
  assert.equal(porNumero.get('VER-004').restricciones.length, 1);
  assert.equal(porNumero.get('VER-005').estado_semaforo, 'BLOQUEADO');
  assert.deepEqual(porNumero.get('VER-005').motivos, ['Sin estudios médicos registrados']);
  assert.equal(porNumero.get('VER-006').estado_semaforo, 'BLOQUEADO');
  assert.equal(porNumero.get('VER-007').estado_semaforo, 'VIGENTE');
  assert.equal(porNumero.get('VER-007').total_estudios, 2);
  assert.equal(porNumero.get('VER-007').estudios.length, 1);
  assert.ok(porNumero.get('VER-004').nombre_completo.includes('VER-004'));
});

prueba('Edición de empleado y borrado en cascada de estudios', () => {
  const actualizado = empleadosRepo.actualizarEmpleado(empVigente.id, { puesto: 'Analista senior' });
  assert.equal(actualizado.puesto, 'Analista senior');

  const empleadoTemporal = crearEmpleadoDemo('VER-CASCADE');
  agregarEstudio(empleadoTemporal, tipoGeneral, 100);
  assert.equal(estudiosRepo.listarEstudiosPorEmpleado(empleadoTemporal.id).length, 1);

  empleadosRepo.eliminarEmpleado(empleadoTemporal.id);
  const restantes = getDb()
    .prepare('SELECT COUNT(*) AS total FROM estudios_medicos WHERE empleado_id = ?')
    .get(empleadoTemporal.id).total;
  assert.equal(restantes, 0);
});

prueba('Un estudio mal capturado se puede actualizar y recalcular', () => {
  const estudio = estudiosRepo.obtenerEstudio(estudioVigente.id);
  const actualizado = estudiosRepo.actualizarEstudio(estudio.id, {
    resultado: 'NO_APTO',
    observaciones: 'Requiere valoración'
  });
  assert.equal(actualizado.resultado, 'NO_APTO');
  assert.equal(actualizado.fecha_vencimiento, estudio.fecha_vencimiento);

  const restaurado = estudiosRepo.actualizarEstudio(estudio.id, {
    resultado: 'APTO',
    observaciones: ''
  });
  assert.equal(restaurado.resultado, 'APTO');
});

console.log('\n=== 4. Exportación a Excel ===');
const empleadosParaExportar = obtenerEmpleadosConEstado();
const rutaExcel = path.join(directorioTemporal, 'reporte-verificacion.xlsx');
const exportado = generarArchivoExcel(empleadosParaExportar, rutaExcel, {
  generadoEn: new Date(2026, 2, 15, 10, 30)
});

prueba('El archivo .xlsx se escribe en disco', () => {
  assert.ok(fs.existsSync(rutaExcel));
  assert.ok(exportado.bytes > 5000, `Tamaño inesperado: ${exportado.bytes} bytes`);
});

prueba('Contiene las pestañas General, Próximos a Vencer y Bloqueados-Vencidos', () => {
  const libro = XLSX.readFile(rutaExcel);
  assert.deepEqual(libro.SheetNames, ['General', 'Próximos a Vencer', 'Bloqueados-Vencidos', 'Resumen']);
});

prueba('La pestaña General tiene encabezados y una fila por estudio vigente', () => {
  const libro = XLSX.readFile(rutaExcel);
  const general = XLSX.utils.sheet_to_json(libro.Sheets['General'], { header: 1, blankrows: true });
  const esperado = empleadosParaExportar.reduce(
    (total, empleado) => total + Math.max(1, empleado.estudios.length),
    0
  );

  assert.equal(general[0][0], 'Número Empleado');
  assert.ok(general[0].includes('Estado del Semáforo'));
  assert.ok(general[0].includes('Resultado'));
  assert.equal(general.length - 1, esperado);
});

prueba('La pestaña Próximos a Vencer sólo incluye empleados por vencer', () => {
  const libro = XLSX.readFile(rutaExcel);
  const filas = XLSX.utils.sheet_to_json(libro.Sheets['Próximos a Vencer'], { header: 1, blankrows: true });
  assert.equal(filas.length, 2);
  assert.equal(filas[1][0], 'VER-001');
  assert.equal(filas[1][8], 'PRÓXIMO A VENCER');
});

prueba('La pestaña Bloqueados-Vencidos incluye los 4 casos bloqueados', () => {
  const libro = XLSX.readFile(rutaExcel);
  const filas = XLSX.utils.sheet_to_json(libro.Sheets['Bloqueados-Vencidos'], { header: 1, blankrows: true });
  const numeros = filas.slice(1).map((fila) => fila[0]).sort();
  assert.deepEqual(numeros, ['VER-002', 'VER-003', 'VER-005', 'VER-006']);

  const sinEstudios = filas.find((fila) => fila[0] === 'VER-005');
  assert.match(String(sinEstudios[10]), /Sin estudios médicos registrados/);
});

prueba('La pestaña Resumen cuadra con los totales calculados', () => {
  const libro = XLSX.readFile(rutaExcel);
  const resumen = XLSX.utils.sheet_to_json(libro.Sheets['Resumen'], { header: 1, blankrows: true });
  assert.equal(resumen[0][0], 'REPORTE DE ESTUDIOS MÉDICOS');
  assert.equal(exportado.resumen.total, empleadosParaExportar.length);
  assert.equal(exportado.resumen.por_vencer, 1);
  assert.equal(exportado.resumen.bloqueado, 4);
});

console.log('\n=== 5. Número automático de empleado y catálogo de estudios ===');

prueba('El número de empleado se genera automáticamente (EMP-###)', () => {
  const primero = empleadosRepo.crearEmpleado({ nombre: 'Auto', apellido: 'Generado' });
  assert.match(primero.numero_empleado, /^EMP-\d{3,}$/);

  const previsto = empleadosRepo.siguienteNumeroEmpleado();
  assert.match(previsto, /^EMP-\d{3,}$/);

  const segundo = empleadosRepo.crearEmpleado({
    numero_empleado: '',
    nombre: 'Auto',
    apellido: 'Siguiente'
  });

  assert.equal(segundo.numero_empleado, previsto);
  assert.equal(
    Number.parseInt(segundo.numero_empleado.slice(4), 10),
    Number.parseInt(primero.numero_empleado.slice(4), 10) + 1
  );

  empleadosRepo.eliminarEmpleado(primero.id);
  empleadosRepo.eliminarEmpleado(segundo.id);
});

prueba('El catálogo permite crear, renombrar y eliminar tipos de estudio', () => {
  const creado = estudiosRepo.crearTipoEstudio({ nombre: 'Prueba de esfuerzo', vigencia_meses: 6 });
  assert.equal(creado.nombre, 'Prueba de esfuerzo');
  assert.equal(creado.vigencia_meses, 6);

  assert.throws(
    () => estudiosRepo.crearTipoEstudio({ nombre: 'prueba de esfuerzo', vigencia_meses: 12 }),
    /Ya existe un tipo de estudio/
  );
  assert.throws(
    () => estudiosRepo.crearTipoEstudio({ nombre: 'Tipo inválido', vigencia_meses: 0 }),
    /número entero válido/
  );

  const actualizado = estudiosRepo.actualizarTipoEstudio(creado.id, {
    nombre: 'Prueba de esfuerzo controlada',
    vigencia_meses: 12
  });
  assert.equal(actualizado.tipo.nombre, 'Prueba de esfuerzo controlada');
  assert.equal(actualizado.tipo.vigencia_meses, 12);
  assert.equal(actualizado.estudios_actualizados, 0);

  estudiosRepo.eliminarTipoEstudio(creado.id);
  assert.equal(estudiosRepo.obtenerTipoEstudio(creado.id), null);
});

prueba('Cambiar la vigencia puede recalcular los vencimientos existentes', () => {
  const tipo = estudiosRepo.crearTipoEstudio({
    nombre: 'Tipo temporal de verificación',
    vigencia_meses: 3
  });
  const empleado = empleadosRepo.crearEmpleado({ nombre: 'Vigencia', apellido: 'Recalculada' });
  const estudio = estudiosRepo.crearEstudio({
    empleado_id: empleado.id,
    tipo_estudio_id: tipo.id,
    fecha_realizacion: '2025-01-15',
    resultado: 'APTO'
  });
  assert.equal(estudio.fecha_vencimiento, '2025-04-15');

  const enCatalogo = estudiosRepo.listarTiposEstudio().find((item) => item.id === tipo.id);
  assert.equal(enCatalogo.total_estudios, 1);

  const sinRecalcular = estudiosRepo.actualizarTipoEstudio(tipo.id, {
    vigencia_meses: 6,
    recalcular_vencimientos: false
  });
  assert.equal(sinRecalcular.estudios_actualizados, 0);
  assert.equal(estudiosRepo.obtenerEstudio(estudio.id).fecha_vencimiento, '2025-04-15');

  const recalculado = estudiosRepo.actualizarTipoEstudio(tipo.id, {
    vigencia_meses: 12,
    recalcular_vencimientos: true
  });
  assert.equal(recalculado.estudios_actualizados, 1);
  assert.equal(estudiosRepo.obtenerEstudio(estudio.id).fecha_vencimiento, '2026-01-15');

  assert.throws(() => estudiosRepo.eliminarTipoEstudio(tipo.id), /estudio\(s\) registrados/);

  empleadosRepo.eliminarEmpleado(empleado.id);
  estudiosRepo.eliminarTipoEstudio(tipo.id);
  assert.equal(estudiosRepo.obtenerTipoEstudio(tipo.id), null);
});

console.log('\n=== RESULTADO FINAL ===');
const exitosas = resumenPruebas.filter((item) => item.ok).length;
console.log(`Pruebas ejecutadas: ${resumenPruebas.length} | Correctas: ${exitosas} | Fallidas: ${fallos}`);

closeDatabase();
fs.rmSync(directorioTemporal, { recursive: true, force: true });
process.exit(fallos === 0 ? 0 : 1);
