/**
 * Utilidades de fecha para la UI.
 * El cálculo de vencimientos "oficial" vive en electron/services/semaforo.js;
 * aquí sólo se replica para la vista previa del formulario.
 */

function pad2(numero) {
  return String(numero).padStart(2, '0');
}

export function hoyISO(fecha = new Date()) {
  return `${fecha.getFullYear()}-${pad2(fecha.getMonth() + 1)}-${pad2(fecha.getDate())}`;
}

export function sumarMeses(fechaISO, meses) {
  if (!fechaISO || !/^\d{4}-\d{2}-\d{2}$/.test(fechaISO)) return '';
  const [anio, mes, dia] = fechaISO.split('-').map(Number);
  const totalMeses = mes - 1 + Number(meses);
  const anioDestino = anio + Math.floor(totalMeses / 12);
  const mesDestino = ((totalMeses % 12) + 12) % 12;
  const ultimoDia = new Date(Date.UTC(anioDestino, mesDestino + 1, 0)).getUTCDate();
  const diaDestino = Math.min(dia, ultimoDia);
  return `${anioDestino}-${pad2(mesDestino + 1)}-${pad2(diaDestino)}`;
}

export function sumarDias(fechaISO, dias) {
  if (!fechaISO || !/^\d{4}-\d{2}-\d{2}$/.test(fechaISO)) return '';
  const fecha = new Date(`${fechaISO}T00:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() + (Number(dias) || 0));
  return fecha.toISOString().slice(0, 10);
}

/** Vencimiento de un estudio provisional: primero meses (fin de mes) y luego días. */
export function calcularVencimiento(fechaISO, { meses = 0, dias = 0 } = {}) {
  if (!fechaISO || !/^\d{4}-\d{2}-\d{2}$/.test(fechaISO)) return '';
  return sumarDias(sumarMeses(fechaISO, Number(meses) || 0), Number(dias) || 0);
}

/** "1 mes y 10 días", "10 días", "12 meses", "sin vigencia". */
export function describirVigencia(meses = 0, dias = 0) {
  const totalMeses = Number(meses) || 0;
  const totalDias = Number(dias) || 0;
  const partes = [];
  if (totalMeses > 0) partes.push(`${totalMeses} ${totalMeses === 1 ? 'mes' : 'meses'}`);
  if (totalDias > 0) partes.push(`${totalDias} ${totalDias === 1 ? 'día' : 'días'}`);
  return partes.length > 0 ? partes.join(' y ') : 'sin vigencia';
}

export function diasDesdeHoy(fechaISO, referencia = hoyISO()) {
  if (!fechaISO || !/^\d{4}-\d{2}-\d{2}$/.test(fechaISO)) return null;
  const a = Date.parse(`${fechaISO}T00:00:00Z`);
  const b = Date.parse(`${referencia}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((a - b) / 86400000);
}

export function formatearFecha(valor) {
  if (!valor) return '—';
  const fecha = String(valor).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return String(valor);
  const [anio, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${anio}`;
}

export function formatearFechaHora(valor) {
  if (!valor) return '—';
  const fecha = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '—';
  return `${pad2(fecha.getDate())}/${pad2(fecha.getMonth() + 1)}/${fecha.getFullYear()} ${pad2(
    fecha.getHours()
  )}:${pad2(fecha.getMinutes())}`;
}

export function formatearHora(fecha = new Date()) {
  return `${pad2(fecha.getHours())}:${pad2(fecha.getMinutes())}:${pad2(fecha.getSeconds())}`;
}

export function formatearFechaLarga(fecha = new Date()) {
  return fecha.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

export function formatearDias(dias) {
  if (dias === null || dias === undefined || Number.isNaN(Number(dias))) return '—';
  const valor = Number(dias);
  if (valor < 0) return `Vencido hace ${Math.abs(valor)} día${Math.abs(valor) === 1 ? '' : 's'}`;
  if (valor === 0) return 'Vence hoy';
  return `En ${valor} día${valor === 1 ? '' : 's'}`;
}
