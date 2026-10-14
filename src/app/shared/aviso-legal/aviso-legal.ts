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

/**
 * Aviso de no asesoría legal (spec normas · "Aviso de no asesoría legal").
 * El texto lo pasa la pantalla por input (`@domain/norma/aviso`): el componente
 * no hardcodea contenido legal.
 *
 * - Línea fija (default): queda al pie de la pantalla de inicio después de "Entiendo".
 * - Modal: primera apertura; el usuario debe tocar "Entiendo" para continuar.
 *   El foco entra al diálogo al abrirse, Tab no sale de él y Escape no lo cierra
 *   (el spec exige tocar "Entiendo"); al cerrar, el foco vuelve a quien lo tenía.
 */
@Component({
  selector: 'app-aviso-legal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './aviso-legal.html',
  styleUrl: './aviso-legal.scss',
})
export class AvisoLegal {
  readonly texto = input.required<string>();
  /** true = modal bloqueante de primera apertura; false = línea fija al pie. */
  readonly modal = input(false);
  readonly entendido = output<void>();

  /** Trampa de foco compartida (ver `shared/foco-dialogo.ts`). */
  readonly atraparFoco = atraparFoco;

  private readonly botonEntiendo = viewChild<ElementRef<HTMLButtonElement>>('botonEntiendo');
  private elementoPrevio: HTMLElement | null = null;

  constructor() {
    effect(() => {
      if (this.modal()) {
        this.elementoPrevio = document.activeElement as HTMLElement | null;
        this.botonEntiendo()?.nativeElement.focus();
      } else if (this.elementoPrevio) {
        this.elementoPrevio.focus();
        this.elementoPrevio = null;
      }
    });
  }
}
