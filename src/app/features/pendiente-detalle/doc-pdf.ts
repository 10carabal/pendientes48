import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';
import { atraparFoco } from '@shared/foco-dialogo';

/**
 * Subdiálogo del PDF editable dentro de la hoja `app-documento` (spec
 * `reclamos` · "Edición antes de generar", tarea 3.6): descarga el PDF con el
 * texto revisado por la persona o lo comparte, y se cierra con Escape.
 *
 * Puro de presentación: no pregunta la plataforma (recibe la etiqueta de
 * compartir y el texto editable por input, que compone la hoja, que es la que
 * sabe la plataforma) ni genera nada. Los botones quedan deshabilitados con
 * `generando`/`compartiendo` mientras la pantalla trabaja (doble toque).
 */
@Component({
  selector: 'app-doc-pdf',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './doc-pdf.html',
  styleUrl: './doc-pdf.scss',
})
export class DocPdf {
  readonly avisoNoAsesoria = input.required<string>();
  /** "Descargar y compartir" o "Descargar" según el soporte del navegador. */
  readonly etiquetaCompartir = input('Descargar y compartir');
  /** Copy de la versión editable, compuesto por la hoja (que conoce platform/). */
  readonly textoEditable = input.required<string>();
  readonly generando = input(false);
  readonly compartiendo = input(false);
  readonly error = input('');

  readonly descargarEditable = output<void>();
  readonly compartir = output<void>();
  readonly cerrar = output<void>();

  readonly atraparFoco = atraparFoco;
  readonly ocupado = computed(() => this.generando() || this.compartiendo());

  private readonly botonDescargar = viewChild<ElementRef<HTMLButtonElement>>('botonDescargar');
  private elementoPrevio: HTMLElement | null = null;

  constructor() {
    // El foco entra al botón principal apenas se abre el subdiálogo…
    effect(() => {
      if (this.botonDescargar()) {
        if (this.elementoPrevio === null) {
          this.elementoPrevio = document.activeElement as HTMLElement | null;
        }
        this.botonDescargar()?.nativeElement.focus();
      }
    });
  }

  // …y vuelve al botón que lo abrió al cerrarse.
  ngOnDestroy(): void {
    this.elementoPrevio?.focus();
  }
}
