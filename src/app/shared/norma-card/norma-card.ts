import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import type { Norma } from '@domain/norma/norma.model';

/** "Verificado el 04/10/2026" a partir de la fecha ISO del catálogo (acepta ISO con hora). */
function fechaLegible(iso: string): string {
  const [anio, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${anio}`;
}

/**
 * Tarjeta "¿Por qué tienes derecho?" (spec normas · "Norma visible en cada pendiente"):
 * nombre, artículo, explicación en lenguaje sencillo, enlace a la fuente oficial y
 * "Verificado el DD/MM/AAAA", más el aviso de no asesoría.
 *
 * El texto legal lo pasa la pantalla por input (`@domain/norma/aviso`): el componente
 * no hardcodea contenido legal. Sin conexión, solo el enlace queda inactivo.
 */
@Component({
  selector: 'app-norma-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './norma-card.html',
  styleUrl: './norma-card.scss',
})
export class NormaCard {
  readonly norma = input.required<Norma>();
  readonly aviso = input.required<string>();

  /** Navegador conectado: sin conexión solo el enlace queda inactivo (spec normas). */
  readonly enLinea = signal(navigator.onLine);

  readonly verificado = computed(() => fechaLegible(this.norma().verificadoEl));

  constructor() {
    const conectar = () => this.enLinea.set(true);
    const desconectar = () => this.enLinea.set(false);
    window.addEventListener('online', conectar);
    window.addEventListener('offline', desconectar);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('online', conectar);
      window.removeEventListener('offline', desconectar);
    });
  }
}
