import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
} from '@angular/core';
import { bitacoraVista } from '@domain/pendiente/bitacora';
import type { Pendiente } from '@domain/pendiente/pendiente.model';
import { fechaHoraLegible } from './fechas';

/**
 * Bitácora del pendiente (spec `pendientes` · "Bitácora"): los eventos de
 * `bitacoraVista()` —los guardados más el derivado "Venció el plazo", que aquí
 * nunca se persiste (D9)— con su fecha y hora, en orden ascendente, más el
 * campo para agregar notas manuales.
 *
 * El campo de nota vive aquí pero lo maneja la pantalla: solo se vacía cuando
 * el guardado termina bien (si falla, el texto se conserva). La región viva del
 * aviso "Nota guardada" existe siempre en el DOM y su texto aparece dentro
 * (hallazgo menor 2, QA 3.3). El doble toque en "Guardar nota" lo bloquea la
 * pantalla contenedora (`guardando`).
 */
@Component({
  selector: 'app-bitacora-lista',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './bitacora-lista.html',
  styleUrl: './bitacora-lista.scss',
})
export class BitacoraLista {
  readonly pendiente = input.required<Pendiente>();
  /** Reloj compartido de la pantalla (señal `ahora`). */
  readonly ahora = input.required<Date>();
  /** La pantalla la activa tras persistir la nota ("Nota guardada"). */
  readonly notaGuardada = input(false);
  /** Doble toque en "Guardar nota": mientras guarda, el botón queda deshabilitado. */
  readonly guardando = input(false);

  /**
   * Texto del campo, con doble vía con la pantalla: aquí se escribe al teclear
   * y allí se vacía recién cuando el guardado termina bien (M2, QA 3.5).
   */
  readonly nota = model('');

  /** Pide a la pantalla que persista el evento `{ tipo: 'nota' }`. */
  readonly notaPedida = output<string>();

  /** Ascendente, con el evento "vencido" derivado insertado a su hora. */
  readonly eventos = computed(() => bitacoraVista(this.pendiente(), this.ahora()));

  readonly etiquetaDe = fechaHoraLegible;

  enviar(): void {
    const texto = this.nota().trim();
    if (texto === '') return;
    // No se limpia aquí: lo hace la pantalla solo si el guardado sale bien.
    this.notaPedida.emit(texto);
  }

  escribirNota(evento: Event): void {
    this.nota.set((evento.target as HTMLInputElement).value);
  }
}
