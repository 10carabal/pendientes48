import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
// Rutas profundas de `@ionic/angular` (no el barril): ver comentario en `app.config.ts`.
import { IonApp } from '@ionic/angular/ion-app';
import { IonRouterOutlet } from '@ionic/angular/ion-router-outlet';
import { Platform } from '@ionic/angular/platform';
import { retroceder } from '@shared/retroceder';
import { SalidaApp } from '@shared/salida-app/salida-app';
import { salirDeLaApp } from '@platform/salida';

/**
 * Prioridad del retroceso de la app en `Platform.backButton`. Queda **por
 * debajo** de `OVERLAY_BACK_BUTTON_PRIORITY` (100) y `MENU_BACK_BUTTON_PRIORITY`
 * (99) de `@ionic/core`, así que un overlay o el menú abierto se cierran
 * primero; solo cuando no hay ninguno corre el retroceso de la app (tarea 5.2).
 */
const PRIORIDAD_RETROCESO = 50;

/**
 * Raíz de la app (`/` o aún sin navegar, `''`), sin query ni hash: ahí el
 * retroceso **no** tiene adónde ir dentro de la app y por eso abre el
 * diálogo de salida.
 */
function esRaiz(url: string): boolean {
  const [ruta] = url.split(/[?#]/);
  return ruta === '/' || ruta === '';
}

/**
 * Composición raíz: el outlet de Ionic más el manejo del retroceso del
 * sistema (spec `navegacion`, tarea 5.2).
 *
 * `Platform.backButton` recibe el evento `ionBackButton` que Ionic dispara con
 * el botón físico/gesto de Android. El manejador decide en este orden y
 * **siempre consume el evento** (nunca llama `processNextHandler`, así que
 * ningún manejador de menor prioridad corre después):
 *
 * 1. El diálogo de salida está abierto → lo cierra (retroceder cierra, no sale).
 * 2. Estamos en la raíz → abre el diálogo "¿Salir de la app?".
 * 3. Cualquier otra pantalla → `retroceder()` (la historia de la app).
 *
 * La suscripción se limpia con `DestroyRef` al destruirse la raíz.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonApp, IonRouterOutlet, SalidaApp],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly platform = inject(Platform);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);

  /** Diálogo "¿Salir de la app?" abierto (lo controla solo la raíz). */
  readonly salidaAbierta = signal(false);

  constructor() {
    const suscripcion = this.platform.backButton.subscribeWithPriority(
      PRIORIDAD_RETROCESO,
      (processNextHandler) => {
        if (this.salidaAbierta()) {
          this.cerrarSalida();
          return;
        }
        if (esRaiz(this.router.url)) {
          this.abrirSalida();
          return;
        }
        retroceder(this.location, this.router);
      },
    );
    this.destroyRef.onDestroy(() => suscripcion.unsubscribe());
  }

  abrirSalida(): void {
    this.salidaAbierta.set(true);
  }

  cerrarSalida(): void {
    this.salidaAbierta.set(false);
  }

  /**
   * "Salir" del diálogo: la APK termina la Activity; en la PWA
   * `window.close()` casi nunca puede cerrar la pestaña del usuario, así que
   * si no se cerró se cierra el diálogo y la app queda en la raíz.
   */
  async salir(): Promise<void> {
    const cerro = await salirDeLaApp();
    if (!cerro) this.cerrarSalida();
  }
}
