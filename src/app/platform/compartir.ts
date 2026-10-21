import { Clipboard } from '@capacitor/clipboard';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { isNative } from './plataforma';
import { descargarArchivo } from './calendario-descarga';

/** En la PWA sin soporte para compartir archivos, el PDF se descarga (spec `reclamos`). */
export type ResultadoCompartir = 'compartido' | 'descargado';

/**
 * Copia texto sin formato al portapapeles (`reclamos` · "Generación de texto
 * corto"). La confirmación "Texto copiado" la muestra la pantalla, no el adaptador.
 */
export async function copiarTexto(texto: string): Promise<void> {
  await Clipboard.write({ string: texto });
}

/**
 * Comparte el PDF con las apps del dispositivo (`reclamos` · "Compartir"):
 * - Android: el menú nativo con el PDF adjunto (WhatsApp, correo…). El archivo
 *   se escribe en caché (el plugin comparte URL `file://`) y se borra al cerrar.
 * - PWA: Web Share con archivos si el navegador lo soporta y `share` completa;
 *   si no (sin soporte, sin UI o cancelado), se descarga como respaldo. (El
 *   WebView de Android ignora `<a download>`, por eso esa ruta de descarga solo
 *   aplica a la PWA.)
 */
export async function compartirPdf(
  pdf: Uint8Array,
  nombreArchivo: string,
): Promise<ResultadoCompartir> {
  if (isNative()) {
    const { uri } = await Filesystem.writeFile({
      path: nombreArchivo,
      data: aBase64(pdf),
      directory: Directory.Cache,
    });
    try {
      await Share.share({ files: [uri], dialogTitle: 'Compartir PDF' });
    } finally {
      await Filesystem.deleteFile({ path: nombreArchivo, directory: Directory.Cache }).catch(
        () => undefined,
      );
    }
    return 'compartido';
  }

  const archivo = new File(
    [pdf as Uint8Array<ArrayBuffer>], // en la práctica siempre viene de pdfmake (ArrayBuffer)
    nombreArchivo,
    { type: 'application/pdf' },
  );
  if (puedeCompartirArchivos(archivo)) {
    try {
      await navigator.share({ files: [archivo] });
      return 'compartido';
    } catch {
      // Share no completó (navegador sin UI, sin gesto o el usuario lo cerró):
      // el respaldo de la PWA es descargar el archivo.
    }
  }
  await descargarArchivo(nombreArchivo, archivo); // File extiende de Blob
  return 'descargado';
}

/** Compartir archivos es de móviles; en escritorio `canShare({files})` da false. */
function puedeCompartirArchivos(archivo: File): boolean {
  if (typeof navigator === 'undefined' || !navigator.canShare) return false;
  try {
    return navigator.canShare({ files: [archivo] });
  } catch {
    return false;
  }
}

/**
 * Si esta plataforma puede entregar un PDF compartido (la etiqueta del botón
 * lo distingue de una descarga simple). Android siempre, con la hoja nativa;
 * la PWA, solo si el navegador soporta Web Share con archivos. Existe para que
 * la hoja del documento no pregunte plataforma directo (design.md).
 */
export function comparteArchivosPdf(): boolean {
  if (isNative()) return true;
  const archivo = new File([''], 'queja.pdf', { type: 'application/pdf' });
  return puedeCompartirArchivos(archivo);
}

/** base64 para escribir binario en el Filesystem nativo (el soporte de Blob es solo web). */
function aBase64(bytes: Uint8Array): string {
  let bin = '';
  const TROZO = 0x8000;
  for (let i = 0; i < bytes.length; i += TROZO) {
    bin += String.fromCharCode(...bytes.subarray(i, i + TROZO));
  }
  return btoa(bin);
}
