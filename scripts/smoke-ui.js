/**
 * Smoke test de interfaz: arranca Electron con una base temporal + datos demo,
 * carga el build de React, verifica el DOM, prueba el bridge IPC y guarda capturas.
 *
 * Uso: npm run smoke:ui   (requiere `npm run build` previo)
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { app, BrowserWindow } = require('electron');

app.disableHardwareAcceleration();

const directorioTemporal = fs.mkdtempSync(path.join(os.tmpdir(), 'estudios-ui-'));
const directorioCapturas = path.join(__dirname, '..', 'tmp');
fs.mkdirSync(directorioCapturas, { recursive: true });

app.setName('EstudiosMedicosSmoke');
app.setPath('userData', directorioTemporal);

const { initDatabase, closeDatabase } = require('../electron/db/database');
const { crearEmpleado } = require('../electron/db/empleados');
const { crearEstudio, listarTiposEstudio } = require('../electron/db/estudios');
const { registrarIpc } = require('../electron/ipc');
const { hoyISO, sumarMeses } = require('../electron/services/semaforo');

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fallos = [];

function comprobar(nombre, condicion, detalle = '') {
  if (condicion) {
    console.log(`  [OK]    ${nombre}`);
  } else {
    fallos.push(nombre);
    console.error(`  [FALLA] ${nombre}${detalle ? ` -> ${detalle}` : ''}`);
  }
}

function sumarDias(fechaISO, dias) {
  const fecha = new Date(`${fechaISO}T00:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

function fechaParaVencerEn(tipo, dias) {
  return sumarDias(sumarMeses(hoyISO(), -tipo.vigencia_meses), dias);
}

function sembrarDemo() {
  const tipos = listarTiposEstudio();
  const general = tipos.find((tipo) => /general/i.test(tipo.nombre));
  const audiometria = tipos.find((tipo) => /audiometr/i.test(tipo.nombre));

  const ana = crearEmpleado({
    numero_empleado: 'EMP-001',
    nombre: 'Ana',
    apellido: 'López Herrera',
    departamento: 'Producción',
    puesto: 'Operadora de línea',
    estado: 'ACTIVO'
  });
  const carlos = crearEmpleado({
    numero_empleado: 'EMP-002',
    nombre: 'Carlos',
    apellido: 'Méndez Rivas',
    departamento: 'Almacén',
    puesto: 'Montacarguista',
    estado: 'ACTIVO'
  });
  const maria = crearEmpleado({
    numero_empleado: 'EMP-003',
    nombre: 'María',
    apellido: 'Ruiz Salas',
    departamento: 'Calidad',
    puesto: 'Analista de calidad',
    estado: 'ACTIVO'
  });
  const jose = crearEmpleado({
    numero_empleado: 'EMP-004',
    nombre: 'José',
    apellido: 'Pérez Núñez',
    departamento: 'Mantenimiento',
    puesto: 'Técnico electromecánico',
    estado: 'ACTIVO'
  });

  crearEstudio({
    empleado_id: ana.id,
    tipo_estudio_id: general.id,
    fecha_realizacion: fechaParaVencerEn(general, 10),
    resultado: 'APTO',
    observaciones: 'Sin hallazgos'
  });
  crearEstudio({
    empleado_id: carlos.id,
    tipo_estudio_id: general.id,
    fecha_realizacion: fechaParaVencerEn(general, -30),
    resultado: 'APTO'
  });
  crearEstudio({
    empleado_id: maria.id,
    tipo_estudio_id: audiometria.id,
    fecha_realizacion: fechaParaVencerEn(audiometria, 120),
    resultado: 'NO_APTO',
    observaciones: 'Hipoacusia bilateral leve'
  });
  crearEstudio({
    empleado_id: jose.id,
    tipo_estudio_id: general.id,
    fecha_realizacion: fechaParaVencerEn(general, 180),
    resultado: 'APTO'
  });

  return { empleados: 4, jose };
}

async function capturar(ventana, nombre) {
  const imagen = await ventana.webContents.capturePage();
  const ruta = path.join(directorioCapturas, nombre);
  fs.writeFileSync(ruta, imagen.toPNG());
  console.log(`  [IMG]   ${ruta}`);
}

async function ejecutar() {
  initDatabase(directorioTemporal);
  registrarIpc();
  sembrarDemo();

  const ventana = new BrowserWindow({
    width: 1440,
    height: 950,
    show: false,
    backgroundColor: '#020617',
    webPreferences: {
      preload: path.join(__dirname, '..', 'electron', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  ventana.webContents.on('console-message', (...args) => {
    const detalle = args[1];
    if (detalle && typeof detalle === 'object') {
      console.log(`  [renderer:${detalle.level}] ${detalle.message}`);
    } else {
      console.log(`  [renderer] ${args[2] ?? detalle}`);
    }
  });
  ventana.webContents.on('render-process-gone', (_evento, detalles) => {
    console.error('  [renderer] Proceso terminado:', detalles);
  });

  await ventana.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  ventana.showInactive();
  await esperar(1200);

  console.log('\n=== Dashboard ===');
  const textoDashboard = await ventana.webContents.executeJavaScript('document.body.innerText');
  const filas = await ventana.webContents.executeJavaScript(
    "document.querySelectorAll('tbody tr').length"
  );
  const apiDisponible = await ventana.webContents.executeJavaScript(
    "typeof window.api?.empleados?.listar === 'function'"
  );
  const datosBridge = await ventana.webContents.executeJavaScript(
    "window.api.empleados.listar().then((lista) => lista.length)"
  );

  comprobar('El bridge IPC está expuesto en window.api', apiDisponible);
  comprobar('El IPC devuelve los 4 empleados demo', datosBridge === 4, String(datosBridge));
  comprobar('El Dashboard renderiza el título', textoDashboard.includes('Control de estudios médicos'));
  comprobar('El Dashboard muestra a Ana López', textoDashboard.includes('Ana López Herrera'));
  comprobar('La tabla tiene 4 filas', filas === 4, String(filas));
  const kioscoEliminado = await ventana.webContents.executeJavaScript(
    "typeof window.api.kiosco === 'undefined' && !document.body.innerText.includes('Kiosco')"
  );
  comprobar('El módulo Kiosco fue eliminado de la aplicación', kioscoEliminado);
  comprobar('Se muestran las tarjetas de estado', /Vigentes[\s\S]*Próximos a vencer[\s\S]*Bloqueados/.test(textoDashboard));
  comprobar(
    'El Dashboard muestra la bandeja de pendientes de RH',
    textoDashboard.includes('Pendientes de revisión de Recursos Humanos')
  );
  comprobar(
    'La bandeja separa próximos a vencer de vencidos/bloqueados',
    textoDashboard.includes('Vencidos y bloqueados') && textoDashboard.includes('Próximos a vencer')
  );
  await capturar(ventana, '01-dashboard.png');

  console.log('\n=== Tema claro / oscuro ===');
  const estadoTemaInicial = await ventana.webContents.executeJavaScript(`(() => {
    const boton = document.querySelector('button[data-tema]');
    return {
      existe: Boolean(boton),
      titulo: boton?.getAttribute('title'),
      oscuro: document.documentElement.classList.contains('dark')
    };
  })()`);
  comprobar(
    'El botón de cambio de tema está en el encabezado',
    estadoTemaInicial.existe && estadoTemaInicial.titulo === 'Cambiar a modo claro',
    JSON.stringify(estadoTemaInicial)
  );
  comprobar('La aplicación inicia en modo oscuro', estadoTemaInicial.oscuro);

  const estadoClaro = await ventana.webContents.executeJavaScript(`(() => {
    document.querySelector('button[data-tema]')?.click();
    return new Promise((resolve) => setTimeout(() => {
      const boton = document.querySelector('button[data-tema]');
      resolve({
        oscuro: document.documentElement.classList.contains('dark'),
        guardado: localStorage.getItem('estudiosmedicos.tema'),
        titulo: boton?.getAttribute('title'),
        fondo: getComputedStyle(document.body).backgroundColor
      });
    }, 250));
  })()`);
  const rgbFondoClaro = (estadoClaro.fondo.match(/\d+/g) || []).map(Number);
  comprobar(
    'El botón cambia a modo claro y lo guarda en localStorage',
    !estadoClaro.oscuro &&
      estadoClaro.guardado === 'light' &&
      estadoClaro.titulo === 'Cambiar a modo oscuro',
    JSON.stringify(estadoClaro)
  );
  comprobar(
    'El fondo del modo claro es legible (brillante)',
    rgbFondoClaro.length >= 3 && rgbFondoClaro.slice(0, 3).every((valor) => valor > 200),
    estadoClaro.fondo
  );
  await capturar(ventana, '01b-dashboard-modo-claro.png');
  await ventana.webContents.executeJavaScript(`(() => {
    const principal = document.querySelector('main');
    principal?.scrollTo({ top: principal.scrollHeight });
  })()`);
  await esperar(300);
  await capturar(ventana, '01c-tabla-modo-claro.png');
  await ventana.webContents.executeJavaScript(`document.querySelector('main')?.scrollTo({ top: 0 })`);
  await esperar(200);

  const estadoOscuro = await ventana.webContents.executeJavaScript(`(() => {
    document.querySelector('button[data-tema]')?.click();
    return new Promise((resolve) => setTimeout(() => resolve({
      oscuro: document.documentElement.classList.contains('dark'),
      guardado: localStorage.getItem('estudiosmedicos.tema')
    }), 250));
  })()`);
  comprobar(
    'El botón regresa al modo oscuro',
    estadoOscuro.oscuro && estadoOscuro.guardado === 'dark',
    JSON.stringify(estadoOscuro)
  );

  console.log('\n=== Modal de detalle ===');
  const abrioDetalle = await ventana.webContents.executeJavaScript(`(() => {
    const boton = document.querySelector('button[title="Ver detalle"]');
    if (!boton) return false;
    boton.click();
    return true;
  })()`);
  await esperar(500);
  const textoDetalle = await ventana.webContents.executeJavaScript('document.body.innerText');
  comprobar('Se abre el detalle del empleado', abrioDetalle);
  comprobar('El detalle lista los estudios vigentes', textoDetalle.includes('Estudios vigentes (1)'));
  await capturar(ventana, '02-detalle-empleado.png');

  await ventana.webContents.executeJavaScript(`(() => {
    const estilo = document.createElement('style');
    estilo.id = 'smoke-sin-transiciones';
    estilo.textContent = '*,*::before,*::after{transition:none !important}';
    document.head.appendChild(estilo);
    document.querySelector('button[data-tema]')?.click();
  })()`);
  await esperar(300);
  await capturar(ventana, '02b-detalle-modo-claro.png');

  const estilosModalClaro = await ventana.webContents.executeJavaScript(`(() => {
    const dialogo = document.querySelector('[role="dialog"]');
    const secundario = [...dialogo.querySelectorAll('button')].find((b) =>
      b.textContent.includes('Registrar estudio')
    );
    const icono = dialogo.querySelector('button[title="Editar estudio"]');
    const leer = (el) =>
      el
        ? { fondo: getComputedStyle(el).backgroundColor, texto: getComputedStyle(el).color }
        : null;
    return {
      clasesHtml: document.documentElement.className,
      fondoDialogo: getComputedStyle(dialogo).backgroundColor,
      secundario: leer(secundario),
      icono: leer(icono)
    };
  })()`);

  const brillo = (color) => {
    const [r = 0, g = 0, b = 0] = (color.match(/\d+/g) || []).map(Number);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  comprobar(
    'El modal mantiene contraste en modo claro',
    !estilosModalClaro.clasesHtml.split(/\s+/).includes('dark') &&
      brillo(estilosModalClaro.fondoDialogo) > 240 &&
      brillo(estilosModalClaro.secundario.fondo) > 180 &&
      brillo(estilosModalClaro.secundario.texto) < 80 &&
      brillo(estilosModalClaro.icono.fondo) > 180 &&
      brillo(estilosModalClaro.icono.texto) < 80,
    JSON.stringify(estilosModalClaro)
  );

  await ventana.webContents.executeJavaScript(`(() => {
    document.getElementById('smoke-sin-transiciones')?.remove();
    document.querySelector('button[data-tema]')?.click();
  })()`);
  await esperar(300);

  await ventana.webContents.executeJavaScript(`(() => {
    const cerrar = document.querySelector('button[title="Cerrar"]');
    cerrar?.click();
  })()`);
  await esperar(300);

  console.log('\n=== Filtros y formularios ===');
  const abrioFiltroVencidos = await ventana.webContents.executeJavaScript(`(() => {
    const boton = [...document.querySelectorAll('button')].find(
      (b) => b.textContent.trim() === 'Vencidos'
    );
    if (!boton) return false;
    boton.click();
    return true;
  })()`);
  await esperar(500);
  const filasVencidos = await ventana.webContents.executeJavaScript(
    "document.querySelectorAll('tbody tr').length"
  );
  const textoVencidos = await ventana.webContents.executeJavaScript('document.body.innerText');
  comprobar(
    'El filtro "Vencidos" deja sólo estudios vencidos',
    abrioFiltroVencidos && filasVencidos === 1,
    `filas=${filasVencidos}`
  );
  comprobar('El filtro muestra a Carlos Méndez', textoVencidos.includes('Carlos Méndez Rivas'));
  await capturar(ventana, '03-filtro-vencidos.png');

  await ventana.webContents.executeJavaScript(`(() => {
    const boton = [...document.querySelectorAll('button')].find(
      (b) => b.textContent.trim() === 'Todos'
    );
    boton?.click();
  })()`);
  await esperar(300);

  const abrioFormulario = await ventana.webContents.executeJavaScript(`(() => {
    const boton = [...document.querySelectorAll('button')].find((b) =>
      b.textContent.includes('Nuevo empleado')
    );
    if (!boton) return false;
    boton.click();
    return true;
  })()`);
  await esperar(500);
  const textoFormulario = await ventana.webContents.executeJavaScript('document.body.innerText');
  comprobar(
    'Se abre el formulario de alta de empleado',
    abrioFormulario && textoFormulario.includes('Registrar empleado')
  );

  const numeroAutomatico = await ventana.webContents.executeJavaScript(`(() => {
    const campo = document.querySelector('#numero_empleado');
    return { hayCampo: Boolean(campo), texto: document.body.innerText };
  })()`);
  comprobar(
    'El formulario de alta no pide el número de empleado',
    numeroAutomatico?.hayCampo === false &&
      /NÚMERO DE EMPLEADO/i.test(numeroAutomatico?.texto || '') &&
      (numeroAutomatico?.texto || '').includes('EMP-005'),
    JSON.stringify(numeroAutomatico)
  );

  await capturar(ventana, '04-formulario-empleado.png');

  await ventana.webContents.executeJavaScript(
    `document.querySelector('button[title="Cerrar"]')?.click()`
  );
  await esperar(300);

  console.log('\n=== Panel de tipos de estudio ===');
  const abrioCatalogo = await ventana.webContents.executeJavaScript(`(() => {
    const boton = [...document.querySelectorAll('button')].find((b) =>
      b.textContent.includes('Tipos de estudio')
    );
    if (!boton) return false;
    boton.click();
    return true;
  })()`);
  await esperar(700);

  const textoCatalogo = await ventana.webContents.executeJavaScript('document.body.innerText');
  const filasCatalogo = await ventana.webContents.executeJavaScript(
    "document.querySelectorAll('tbody tr').length"
  );
  comprobar(
    'El panel de tipos de estudio está disponible',
    abrioCatalogo &&
      textoCatalogo.includes('Tipos de estudio') &&
      textoCatalogo.includes('Nuevo tipo de estudio')
  );
  comprobar(
    'El catálogo lista los 7 tipos sembrados',
    filasCatalogo === 7,
    `filas=${filasCatalogo}`
  );
  await capturar(ventana, '05-tipos-estudio.png');

  const abrioEdicionTipo = await ventana.webContents.executeJavaScript(`(() => {
    const boton = document.querySelector('button[title="Editar tipo de estudio"]');
    if (!boton) return false;
    boton.click();
    return true;
  })()`);
  await esperar(500);
  const textoEdicionTipo = await ventana.webContents.executeJavaScript('document.body.innerText');
  comprobar(
    'El formulario permite editar nombre y vigencia del estudio',
    abrioEdicionTipo &&
      /VIGENCIA EN MESES/i.test(textoEdicionTipo) &&
      textoEdicionTipo.includes('Guardar cambios')
  );
  await capturar(ventana, '06-editar-tipo-estudio.png');

  await ventana.webContents.executeJavaScript(
    `document.querySelector('button[title="Cerrar"]')?.click()`
  );
  await esperar(300);

  console.log('\n=== Formulario de estudio provisional ===');
  await ventana.webContents.executeJavaScript(`(() => {
    const boton = [...document.querySelectorAll('button')].find((b) =>
      b.textContent.trim().startsWith('Empleados')
    );
    boton?.click();
  })()`);
  await esperar(700);

  const abrioFormEstudio = await ventana.webContents.executeJavaScript(`(() => {
    const boton = document.querySelector('button[title="Registrar estudio"]');
    if (!boton) return false;
    boton.click();
    return true;
  })()`);
  await esperar(500);

  const estadoProvisional = await ventana.webContents.executeJavaScript(`(() => {
    const casilla = [...document.querySelectorAll('input[type="checkbox"]')].find((c) =>
      (c.closest('label')?.textContent || '').includes('Estudio provisional')
    );
    if (!casilla) return { hayCasilla: false };
    casilla.click();
    return { hayCasilla: true, marcada: casilla.checked };
  })()`);
  await esperar(300);

  const textoProvisional = await ventana.webContents.executeJavaScript(`(() => ({
    campos: document.querySelectorAll('#vigencia_meses, #vigencia_dias').length,
    texto: document.body.innerText
  }))()`);

  comprobar(
    'El formulario de estudio ofrece la casilla de estudio provisional',
    abrioFormEstudio && estadoProvisional.hayCasilla === true && estadoProvisional.marcada === true,
    JSON.stringify({ abrioFormEstudio, estadoProvisional })
  );
  comprobar(
    'Al marcar provisional aparecen meses, días y la vista previa',
    textoProvisional.campos === 2 &&
      /vigencia provisional: 30 d[ií]as/i.test(textoProvisional.texto),
    `campos=${textoProvisional.campos}`
  );
  await capturar(ventana, '07-estudio-provisional.png');

  await ventana.webContents.executeJavaScript(
    `document.querySelector('button[title="Cerrar"]')?.click()`
  );
  await esperar(300);

  console.log('\n=== Resultado del smoke test UI ===');
  if (fallos.length > 0) {
    console.error(`Fallos (${fallos.length}): ${fallos.join(' | ')}`);
  } else {
    console.log('Todas las comprobaciones de interfaz pasaron.');
  }

  closeDatabase();
  ventana.destroy();
  await esperar(400);
  limpiarTemporal();
  app.exit(fallos.length === 0 ? 0 : 1);
}

function limpiarTemporal() {
  try {
    fs.rmSync(directorioTemporal, { recursive: true, force: true, maxRetries: 3 });
  } catch (error) {
    console.warn(`[smoke-ui] No se pudo eliminar ${directorioTemporal}: ${error.code || error.message}`);
  }
}

app.whenReady().then(() =>
  ejecutar().catch((error) => {
    console.error('[smoke-ui] Error fatal:', error);
    closeDatabase();
    limpiarTemporal();
    app.exit(1);
  })
);
