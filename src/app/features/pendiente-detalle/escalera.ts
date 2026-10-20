import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { paraPaso } from '@data/normas-catalogo';
import { AVISO_NO_ASESORIA } from '@domain/norma/aviso';
import type { Pendiente, Queja } from '@domain/pendiente/pendiente.model';
import { estado } from '@domain/pendiente/plazo';
import { atraparFoco } from '@shared/foco-dialogo';
import { NormaCard } from '@shared/norma-card/norma-card';
import { aFechaInput, deFechaInput, fechaLegible } from './fechas';

/** Lo que la pantalla registra al confirmar el diálogo de un paso. */
export interface RegistroQueja {
  paso: 1 | 2;
  /** ISO: hoy a esta hora si la fecha elegida es la de hoy, si no el inicio de ese día. */
  radicadaEn: string;
  radicado?: string;
}

/**
 * Escalera de reclamo tipo stepper (spec `reclamos` · "Escalera de reclamo"):
 * paso 1 queja ante la EPS, paso 2 queja ante la Supersalud. Solo registra
 * que la persona radicó la queja (fecha y radicado opcional); la generación
 * del documento es la tarea 3.6.
 *
 * Oculta mientras el pendiente está en plazo o ya se entregó: la escalera se
 * habilita al vencer las 48 horas (spec `pendientes` · "Plazo de 48 horas").
 * La norma de red alterna se lee de `normas.json` y el aviso de no asesoría
 * llega por input (D6): el componente no hardcodea contenido legal.
 */
@Component({
  selector: 'app-escalera',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NormaCard],
  templateUrl: './escalera.html',
  styleUrl: './escalera.scss',
})
export class Escalera {
  readonly pendiente = input.required<Pendiente>();
  /** Reloj compartido de la pantalla (señal `ahora`). */
  readonly ahora = input.required<Date>();

  /** La pantalla persiste la queja con `registrarQueja()` del dominio. */
  readonly registrar = output<RegistroQueja>();

  readonly avisoNoAsesoria = AVISO_NO_ASESORIA;
  /** Red alterna de dispensación (spec `reclamos` · "Paso 1 disponible"). */
  readonly normaRedAlterna = paraPaso('red-alterna')[0];

  /** Paso cuyo diálogo está abierto (null = cerrado). */
  readonly dialogoPaso = signal<1 | 2 | null>(null);
  readonly fecha = signal('');
  readonly radicado = signal('');

  readonly atraparFoco = atraparFoco;

  private readonly estado = computed(() => estado(this.pendiente(), this.ahora()));
  /** Sin escalera en plazo ni en pendientes ya entregados. */
  readonly oculta = computed(() => {
    const e = this.estado();
    return e === 'en-plazo' || e === 'entregado-a-tiempo' || e === 'entregado-tarde';
  });

  readonly paso1Completado = computed(() => this.pendiente().quejaEps !== undefined);
  readonly paso2Completado = computed(() => this.pendiente().quejaSupersalud !== undefined);

  readonly detallePaso1 = computed(() => this.detalleDe(this.pendiente().quejaEps));
  readonly detallePaso2 = computed(() => this.detalleDe(this.pendiente().quejaSupersalud));

  private readonly campoFecha = viewChild<ElementRef<HTMLInputElement>>('campoFecha');
  private elementoPrevio: HTMLElement | null = null;

  constructor() {
    effect(() => {
      if (this.dialogoPaso() !== null) {
        if (this.elementoPrevio === null) {
          this.elementoPrevio = document.activeElement as HTMLElement | null;
        }
        this.campoFecha()?.nativeElement.focus();
      } else if (this.elementoPrevio !== null) {
        this.elementoPrevio.focus();
        this.elementoPrevio = null;
      }
    });
  }

  /** Abre el diálogo del paso; si ya hay queja, la precarga para corregirla. */
  abrirDialogo(paso: 1 | 2): void {
    const q = paso === 1 ? this.pendiente().quejaEps : this.pendiente().quejaSupersalud;
    this.fecha.set(q === undefined ? aFechaInput(new Date()) : aFechaInput(new Date(q.radicadaEn)));
    this.radicado.set(q?.radicado ?? '');
    this.dialogoPaso.set(paso);
  }

  cerrarDialogo(): void {
    this.dialogoPaso.set(null);
  }

  escribirFecha(evento: Event): void {
    this.fecha.set((evento.target as HTMLInputElement).value);
  }

  escribirRadicado(evento: Event): void {
    this.radicado.set((evento.target as HTMLInputElement).value);
  }

  guardar(): void {
    const paso = this.dialogoPaso();
    const valor = this.fecha();
    if (paso === null || valor === '') return;
    const radicado = this.radicado().trim();
    this.registrar.emit({ paso, radicadaEn: aIso(valor), radicado: radicado || undefined });
    this.cerrarDialogo();
  }

  /** "Completado el 18/10/2026 · radicado n.° PQR-123" (radicado solo si existe). */
  private detalleDe(q: Queja | undefined): string {
    if (q === undefined) return '';
    const radicado = q.radicado === undefined ? '' : ` · radicado n.° ${q.radicado}`;
    return `Completado el ${fechaLegible(q.radicadaEn)}${radicado}`;
  }
}

/**
 * Fecha del input `type="date"` a ISO: si es la de hoy se usa la hora actual
 * (la queja se radica "hoy"), si no el inicio de ese día en hora local.
 */
function aIso(valor: string): string {
  return valor === aFechaInput(new Date()) ? new Date().toISOString() : deFechaInput(valor);
}
