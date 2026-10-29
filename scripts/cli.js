/**
 * CLI auxiliar del proyecto.
 *
 * Uso:
 *   npm run seed            -> asegura el usuario administrador
 *   npm run seed:demo       -> carga empleados/estudios de demostración
 *
 * Se ejecuta con Electron (`electron scripts/cli.js <comando>`) para reutilizar
 * el binario nativo de better-sqlite3 y la misma carpeta userData que la app.
 */

const { app } = require('electron');
const { initDatabase, getDbPath, closeDatabase } = require('../electron/db/database');
const { crearEmpleado } = require('../electron/db/empleados');
const { crearEstudio, listarTiposEstudio } = require('../electron/db/estudios');
const { hoyISO, sumarMeses } = require('../electron/services/semaforo');

const comando = (process.argv[2] || 'admin').toLowerCase();

function sumarDias(fechaISO, dias) {
  const fecha = new Date(`${fechaISO}T00:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

/** Fecha de realización que produce un vencimiento a `dias` de hoy (aprox., respeta fin de mes). */
function realizacionParaVencerEn(tipo, dias) {
  const base = sumarMeses(hoyISO(), -tipo.vigencia_meses);
  return sumarDias(base, dias);
}

function buscarTipo(tipos, texto) {
  return tipos.find((tipo) => tipo.nombre.toLowerCase().includes(texto.toLowerCase()));
}

function cargarDemo() {
  const db = require('../electron/db/database').getDb();
  const total = db.prepare('SELECT COUNT(*) AS total FROM empleados').get().total;
  if (total > 0) {
    console.log(`[demo] Ya existen ${total} empleados. No se insertan datos de demostración.`);
    return;
  }

  const tipos = listarTiposEstudio();
  const general = buscarTipo(tipos, 'general');
  const audiometria = buscarTipo(tipos, 'audiometr');
  const laboratorio = buscarTipo(tipos, 'laboratorio');

  const empleadosDemo = [
    {
      numero_empleado: 'EMP-001',
      nombre: 'Ana',
      apellido: 'López Herrera',
      departamento: 'Producción',
      puesto: 'Operadora de línea',
      estado: 'ACTIVO'
    },
    {
      numero_empleado: 'EMP-002',
      nombre: 'Carlos',
      apellido: 'Méndez Rivas',
      departamento: 'Almacén',
      puesto: 'Montacarguista',
      estado: 'ACTIVO'
    },
    {
      numero_empleado: 'EMP-003',
      nombre: 'María',
      apellido: 'Ruiz Salas',
      departamento: 'Calidad',
      puesto: 'Analista de calidad',
      estado: 'ACTIVO'
    },
    {
      numero_empleado: 'EMP-004',
      nombre: 'José',
      apellido: 'Pérez Núñez',
      departamento: 'Mantenimiento',
      puesto: 'Técnico electromecánico',
      estado: 'ACTIVO'
    },
    {
      numero_empleado: 'EMP-005',
      nombre: 'Lucía',
      apellido: 'Gómez Ortiz',
      departamento: 'Recursos Humanos',
      puesto: 'Coordinadora de RH',
      estado: 'ACTIVO'
    },
    {
      numero_empleado: 'EMP-006',
      nombre: 'Pedro',
      apellido: 'Ramírez Cano',
      departamento: 'Producción',
      puesto: 'Supervisor de turno',
      estado: 'INACTIVO'
    }
  ];

  const ids = {};
  for (const empleado of empleadosDemo) {
    const creado = crearEmpleado(empleado);
    ids[empleado.numero_empleado] = creado.id;
  }

  const estudiosDemo = [
    // Próximo a vencer dentro de 8 días
    { numero: 'EMP-001', tipo: general, dias: 8, resultado: 'APTO', observaciones: 'Sin hallazgos relevantes' },
    // Vencido hace 25 días
    { numero: 'EMP-002', tipo: general, dias: -25, resultado: 'APTO', observaciones: '' },
    // NO_APTO -> bloqueo inmediato
    { numero: 'EMP-003', tipo: audiometria, dias: 120, resultado: 'NO_APTO', observaciones: 'Hipoacusia bilateral leve' },
    { numero: 'EMP-003', tipo: general, dias: 180, resultado: 'APTO', observaciones: '' },
    // Todo vigente
    { numero: 'EMP-004', tipo: general, dias: 200, resultado: 'APTO', observaciones: '' },
    { numero: 'EMP-004', tipo: audiometria, dias: 160, resultado: 'APTO', observaciones: '' },
    { numero: 'EMP-004', tipo: laboratorio, dias: 90, resultado: 'RESTRICCION', observaciones: 'Control de glucosa cada 6 meses' },
    // Empleado inactivo con estudios vigentes
    { numero: 'EMP-006', tipo: general, dias: 150, resultado: 'APTO', observaciones: '' }
  ];

  for (const estudio of estudiosDemo) {
    crearEstudio({
      empleado_id: ids[estudio.numero],
      tipo_estudio_id: estudio.tipo.id,
      fecha_realizacion: realizacionParaVencerEn(estudio.tipo, estudio.dias),
      resultado: estudio.resultado,
      observaciones: estudio.observaciones
    });
  }

  console.log(`[demo] ${empleadosDemo.length} empleados y ${estudiosDemo.length} estudios de demostración insertados.`);
  console.log('[demo] EMP-001 próximo a vencer · EMP-002 vencido · EMP-003 NO_APTO · EMP-004 vigente · EMP-005 sin estudios · EMP-006 inactivo');
}

app.setName('EstudiosMedicos');

app.whenReady().then(() => {
  try {
    initDatabase(app.getPath('userData'));
    console.log(`[db] ${getDbPath()}`);

    if (comando === 'demo') {
      cargarDemo();
    } else {
      console.log('[seed] Base de datos inicializada. Usuario administrador garantizado (admin / Admin123!).');
    }

    closeDatabase();
    app.exit(0);
  } catch (error) {
    console.error('[cli] Error:', error?.message || error);
    closeDatabase();
    app.exit(1);
  }
});
