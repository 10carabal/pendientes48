import { Capacitor } from '@capacitor/core';

/** true en la app Android (Capacitor); false en la PWA y en el navegador. */
export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Si la hoja de ayuda de avisos (`shared/ayuda-avisos`) aplica en esta
 * plataforma.
 *
 * Existe para que las pantallas pregunten a `platform/` sin llamar `isNative()`
 * directo (design.md · "Avisos": "`platform/plataforma.ts` (`isNative()`)
 * decide el camino; solo lo usan los adaptadores de `platform/`, nunca las
 * pantallas"). La ayuda de batería solo tiene sentido en Android: en la PWA el
 * aviso de vencimiento depende del `.ics` (D1) y no hay batería que optimizar
 * (D10: la ayuda se muestra una sola vez desde los flujos existentes).
 */
export function ayudaAvisosAplica(): boolean {
  return isNative();
}

/**
 * Si el PDF directo ("PDF" descarga con `<a download>` y "PDF editable") aplica
 * en esta plataforma.
 *
 * Existe para que la hoja del documento no pregunte `isNative()` directo
 * (mismo patrón que `ayudaAvisosAplica()`). En Android el WebView no instala
 * DownloadListener y `descargarArchivo()` escribiría el binario del PDF como
 * texto UTF-8 (lo corrompería), así que allí el documento solo se entrega con
 * la hoja nativa de compartir (`platform/compartir.ts`).
 */
export function pdfDirectoAplica(): boolean {
  return !isNative();
}
