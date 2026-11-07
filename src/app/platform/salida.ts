import { App } from '@capacitor/app';
import { isNative } from './plataforma';

/**
 * Sale de la aplicación (spec `navegacion` · "Salir" de diálogo "¿Salir de la
 * app?"; tarea 5.2, decisiones D1-A y D2).
 *
 * - **Android (APK)**: `App.exitApp()` termina la Activity. Es la única forma
 *   real de cerrar una app de Capacitor; `window.close()` no hace nada en el
 *   WebView.
 * - **PWA**: `window.close()` solo cierra la pestaña si la abrió el script
 *   (los navegadores lo ignoran cuando la pestaña es del usuario). Por eso el
 *   resultado se devuelve: `false` significa "no se cerró" y la raíz cierra el
 *   diálogo y se queda en la raíz, sin salir ni dejar la app en un estado
 *   raro. `true` = la app terminó (o terminará) y no hay nada que repintar.
 *
 * Solo `platform/` importa `@capacitor/*`: la raíz llama a esta función sin
 * preguntar si está en nativo (design.md · "Estructura de carpetas").
 */
export async function salirDeLaApp(): Promise<boolean> {
  if (isNative()) {
    await App.exitApp();
    return true; // en la APK la Activity ya no existe; no hay nada más que hacer
  }
  window.close();
  return false;
}
