import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { isNative } from './plataforma';

/** Datos del recordatorio; el texto visible lo aporta la pantalla. */
export interface DatosRecordatorio {
  /** ID del pendiente: forma parte del UID, que no cambia entre descargas. */
  id: string;
  /** Hora de vencimiento en ISO (la calcula quien llama). */
  vencimiento: string;
  /** Nombre del pendiente; si falta se usa un texto por defecto. */
  titulo?: string;
}

const PRODID = '-//Pendientes48//Recordatorio//ES';
const TEXTO_POR_DEFECTO = 'Recordatorio Pendientes48';

/**
 * `.ics` armado a mano (RFC 5545, sin librería) según `design.md` · "Avisos":
 * UID fijo por pendiente, DTSTART al vencimiento y VALARM a la misma hora.
 */
export function construirIcs(datos: DatosRecordatorio, ahora = new Date()): string {
  const titulo = datos.titulo ?? TEXTO_POR_DEFECTO;
  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'BEGIN:VEVENT',
    `UID:pendiente-${datos.id}@pendientes48`,
    `DTSTAMP:${aFormatoUtc(ahora.toISOString())}`,
    `DTSTART:${aFormatoUtc(datos.vencimiento)}`,
    `SUMMARY:${escapar(titulo)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:PT0S',
    `DESCRIPTION:${escapar(titulo)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lineas.map(plegar).join('\r\n')}\r\n`;
}

/**
 * Descarga el `.ics`. En la PWA usa `<a download>`; en Android, donde el
 * WebView ignora ese atributo (Capacitor no instala un DownloadListener),
 * el archivo se guarda en la carpeta pública Documentos.
 */
export async function descargarIcs(datos: DatosRecordatorio): Promise<void> {
  const contenido = new Blob([construirIcs(datos)], { type: 'text/calendar;charset=utf-8' });
  await descargarArchivo(`pendiente-${aNombreSeguro(datos.id)}.ics`, contenido);
}

/**
 * Descarga `contenido` con el nombre dado (respaldo compartido de la PWA y
 * del `.ics` en Android, que es donde la descarga del navegador no aplica).
 */
export async function descargarArchivo(nombre: string, contenido: Blob): Promise<void> {
  if (isNative()) {
    await Filesystem.writeFile({
      path: nombre,
      data: await contenido.text(),
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });
    return;
  }
  const url = URL.createObjectURL(contenido);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** '2026-10-08T10:00:00.000Z' → '20261008T100000Z' (formato UTC de iCalendar). */
function aFormatoUtc(iso: string): string {
  const fecha = new Date(iso);
  if (!Number.isFinite(fecha.getTime())) {
    throw new Error(`Fecha inválida para el recordatorio: ${iso}`);
  }
  return fecha
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

/** Escapa un valor TEXT (RFC 5545 §3.3.11). */
function escapar(texto: string): string {
  return texto
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Pliega líneas de más de 75 octetos (RFC 5545 §3.1): CRLF seguido de un espacio. */
function plegar(linea: string): string {
  const trozos: string[] = [];
  let actual = '';
  let octetos = 0;
  let tope = 75;
  for (const caracter of linea) {
    const codigo = caracter.codePointAt(0) ?? 0;
    const ancho = codigo < 0x80 ? 1 : codigo < 0x800 ? 2 : codigo < 0x10000 ? 3 : 4;
    if (octetos + ancho > tope) {
      trozos.push(actual);
      actual = '';
      octetos = 0;
      tope = 74; // cada continuación "pierde" un octeto en el espacio inicial
    }
    actual += caracter;
    octetos += ancho;
  }
  trozos.push(actual);
  return trozos.join('\r\n ');
}

/** Id apto para nombre de archivo en cualquier sistema. */
function aNombreSeguro(id: string): string {
  return id.replace(/[^A-Za-z0-9._-]/g, '-');
}
