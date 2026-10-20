import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Pendiente } from '@domain/pendiente/pendiente.model';
import { estado, textoContador, vencimiento } from '@domain/pendiente/plazo';
import { EstadoChip } from '@shared/estado-chip/estado-chip';
import { fechaLegible } from './fechas';

/**
 * Cabecera del detalle (spec `pendientes` · "Plazo de 48 horas"): medicamentos
 * como título, farmacia, el contador grande (vacío cuando el pendiente ya se
 * entregó), el chip de estado con etiqueta y color (D14) y la línea de fechas
 * "Reclamaste el … · Vence el …".
 *
 * El estado y el contador se recalculan con `ahora`, que la pantalla refresca
 * cada minuto (design.md · "Estado derivado"): aquí no se guarda estado alguno.
 */
@Component({
  selector: 'app-contador',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EstadoChip],
  templateUrl: './contador.html',
  styleUrl: './contador.scss',
})
export class Contador {
  readonly pendiente = input.required<Pendiente>();
  /** Reloj compartido de la pantalla (señal `ahora`). */
  readonly ahora = input.required<Date>();

  readonly estado = computed(() => estado(this.pendiente(), this.ahora()));
  readonly texto = computed(() => textoContador(this.pendiente(), this.ahora()));

  readonly reclamasteEl = computed(() => fechaLegible(this.pendiente().horaReclamo));
  readonly venceEl = computed(() => fechaLegible(vencimiento(this.pendiente().horaReclamo).toISOString()));
}
