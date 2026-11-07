import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  output,
  viewChild,
  ElementRef,
} from '@angular/core';
import { atraparFoco } from '../foco-dialogo';

/**
 * Diálogo "¿Salir de la app?" (spec `navegacion` · "En la raíz de la app";
 * tarea 5.2). Presentacional: no decide nada, solo emite `salir` o `cancelar`;
 * quién hace qué vive en `app.ts`.
 *
 * Se abre con el retroceso del sistema estando en la raíz (`app.ts`). El foco
 * entra a "Salir" al abrirse, Tab no sale del diálogo y Escape o el toque en el
 * scrim cierran con `cancelar` (cancelar es la salida segura: vuelve a la raíz
 * sin salir); al cerrar, el foco vuelve a quien lo tenía. Mismo calco que
 * `ayuda-avisos`.
 */
@Component({
  selector: 'app-salida-app',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './salida-app.html',
  styleUrl: './salida-app.scss',
})
export class SalidaApp {
  /** open/closed del diálogo (lo controla la raíz, `app.ts`). */
  readonly visible = input(false);
  readonly salir = output<void>();
  readonly cancelar = output<void>();

  /** Trampa de foco compartida (ver `shared/foco-dialogo.ts`). */
  readonly atraparFoco = atraparFoco;

  private readonly botonSalir = viewChild<ElementRef<HTMLButtonElement>>('botonSalir');
  private elementoPrevio: HTMLElement | null = null;

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.elementoPrevio = document.activeElement as HTMLElement | null;
        this.botonSalir()?.nativeElement.focus();
      } else if (this.elementoPrevio) {
        this.elementoPrevio.focus();
        this.elementoPrevio = null;
      }
    });
  }

  /**
   * Toque fuera de la caja: cancela solo si el toque cae en el propio scrim,
   * nunca al tocar (o seleccionar texto) dentro del diálogo.
   */
  tocarFuera(event: Event): void {
    if (event.target === event.currentTarget) {
      this.cancelar.emit();
    }
  }
}
