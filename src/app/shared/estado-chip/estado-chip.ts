import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { EstadoPendiente } from '@domain/pendiente/pendiente.model';

/** Etiqueta visible de cada estado (design.md · "Etiquetas y colores de estado"). */
const ETIQUETAS: Record<EstadoPendiente, string> = {
  'en-plazo': 'En plazo',
  vencido: 'Vencido',
  'escalado-eps': 'Queja ante EPS',
  'escalado-supersalud': 'Queja ante Supersalud',
  'entregado-a-tiempo': 'Entregado a tiempo',
  'entregado-tarde': 'Entregado tarde',
};

/**
 * Etiqueta de estado (patrón 5): fondo suave + texto oscuro del mismo tono.
 * El color nunca va solo: la etiqueta de texto siempre acompaña (design.md D14).
 */
@Component({
  selector: 'app-estado-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './estado-chip.html',
  styleUrl: './estado-chip.scss',
})
export class EstadoChip {
  readonly estado = input.required<EstadoPendiente>();
  readonly etiqueta = computed(() => ETIQUETAS[this.estado()]);
}
