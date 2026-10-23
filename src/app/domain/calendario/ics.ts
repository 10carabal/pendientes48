import { vencimiento } from '@domain/pendiente/plazo';
import type { Pendiente } from '@domain/pendiente/pendiente.model';

/** Fecha/hora en UTC formato iCalendar: 20261007T090000Z (RFC 5545). */
function icsUtc(fecha: Date): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return (
    `${fecha.getUTCFullYear()}${p(fecha.getUTCMonth() + 1)}${p(fecha.getUTCDate())}` +
    `T${p(fecha.getUTCHours())}${p(fecha.getUTCMinutes())}${p(fecha.getUTCSeconds())}Z`
  );
}

/** RFC 5545 §3.3.11: escapar \ ; , y saltos de línea. */
function escapar(texto: string): string {
  return texto
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Genera el texto del `.ics` con un VEVENT armado a mano (sin librería) y un
 * `UID` fijo por pendiente: un recordatorio duplicado depende del calendario
 * del usuario, no del archivo. `DTSTART` y el `VALARM` apuntan al vencimiento.
 * Las líneas se separan con CRLF; los textos son cortos, así que no se pliegan.
 */
export function generarIcs(p: Pendiente, ahora: Date = new Date()): string {
  const vence = vencimiento(p.horaReclamo);
  const resumen = `Vence el plazo de 48 horas - ${p.farmacia}`;
  const detalle = `Medicamentos: ${p.medicamentos.join(', ')}. Farmacia o dispensario: ${p.farmacia}.`;

  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Pendientes48//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:pendiente-${p.id}@pendientes48`,
    `DTSTAMP:${icsUtc(ahora)}`,
    `DTSTART:${icsUtc(vence)}`,
    `SUMMARY:${escapar(resumen)}`,
    `DESCRIPTION:${escapar(detalle)}`,
    `LOCATION:${escapar(p.farmacia)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:PT0S',
    `DESCRIPTION:${escapar(resumen)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lineas.join('\r\n') + '\r\n';
}
