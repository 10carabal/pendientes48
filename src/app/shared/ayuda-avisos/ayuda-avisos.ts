import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { atraparFoco } from '../foco-dialogo';

/** Enlace de la ayuda de batería (design.md · "Avisos"). */
const URL_AYUDA = 'https://dontkillmyapp.com/';

/**
 * Hoja de ayuda de batería (design.md · "Avisos"): la primera vez que se registra
 * un pendiente en Android se abre con el enlace a dontkillmyapp.com. Solo texto de
 * UI: el enlace es documentación externa, no contenido legal.
 *
 * El foco entra al botón "Entendido" al abrirse, Tab no sale de la hoja y Escape
 * la cierra (es ayuda, no bloquea); al cerrar, el foco vuelve a quien lo tenía.
 */
@Component({
  selector: 'app-ayuda-avisos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ayuda-avisos.html',
  styleUrl: './ayuda-avisos.scss',
})
export class AyudaAvisos {
  readonly visible = input(false);
  readonly cerrado = output<void>();
  readonly urlAyuda = URL_AYUDA;

  /** Trampa de foco compartida (ver `shared/foco-dialogo.ts`). */
  readonly atraparFoco = atraparFoco;

  private readonly botonEntendido = viewChild<ElementRef<HTMLButtonElement>>('botonEntendido');
  private elementoPrevio: HTMLElement | null = null;

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.elementoPrevio = document.activeElement as HTMLElement | null;
        this.botonEntendido()?.nativeElement.focus();
      } else if (this.elementoPrevio) {
        this.elementoPrevio.focus();
        this.elementoPrevio = null;
      }
    });
  }
}
