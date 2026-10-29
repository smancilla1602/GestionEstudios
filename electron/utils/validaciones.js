/**
 * Helpers de validación compartidos por los repositorios y los handlers IPC.
 * Lanzan `Error` con mensajes en español listos para mostrarse en la UI.
 */

function texto(valor, campo, { requerido = true, max = 150, min = 0 } = {}) {
  const limpio = typeof valor === 'string' ? valor.trim().replace(/\s+/g, ' ') : '';
  if (requerido && limpio.length === 0) {
    throw new Error(`El campo "${campo}" es obligatorio`);
  }
  if (limpio.length > 0 && limpio.length < min) {
    throw new Error(`El campo "${campo}" debe tener al menos ${min} caracteres`);
  }
  if (limpio.length > max) {
    throw new Error(`El campo "${campo}" no puede superar ${max} caracteres`);
  }
  return limpio;
}

function numeroEmpleado(valor) {
  const limpio = texto(valor, 'Número de empleado', { max: 30 });
  if (!/^[\w.\- ]+$/.test(limpio)) {
    throw new Error('El número de empleado solo admite letras, números, punto, guion, guion bajo y espacios');
  }
  return limpio;
}

function entero(valor, campo, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < min || numero > max) {
    throw new Error(`El campo "${campo}" debe ser un número entero válido`);
  }
  return numero;
}

function fechaISO(valor, campo, { requerida = true } = {}) {
  if (valor === null || valor === undefined || valor === '') {
    if (requerida) throw new Error(`El campo "${campo}" es obligatorio`);
    return null;
  }
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new Error(`El campo "${campo}" debe tener el formato AAAA-MM-DD`);
  }
  const fecha = new Date(`${valor}T00:00:00Z`);
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== valor) {
    throw new Error(`El campo "${campo}" no es una fecha válida`);
  }
  return valor;
}

function unoDe(valor, permitidos, campo) {
  const limpio = typeof valor === 'string' ? valor.trim().toUpperCase() : '';
  if (!permitidos.includes(limpio)) {
    throw new Error(`El campo "${campo}" debe ser uno de: ${permitidos.join(', ')}`);
  }
  return limpio;
}

function rutaArchivo(valor) {
  return texto(valor, 'Archivo adjunto', { requerido: false, max: 600 }) || null;
}

module.exports = {
  texto,
  numeroEmpleado,
  entero,
  fechaISO,
  unoDe,
  rutaArchivo
};
