import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { paraPaso } from '@data/normas-catalogo';
import { AVISO_NO_ASESORIA } from '@domain/norma/aviso';
import type { EstadoPendiente, Pendiente, Queja } from '@domain/pendiente/pendiente.model';
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
 * Si la escalera queda oculta para ese estado (en plazo o ya entregado). Es la
 * única fuente de la condición: la pantalla la reutiliza para el botón
 * "Regenerar documento" (decisión de Daniel, 3.6) sin duplicar la lógica.
 */
export function escaleraOculta(e: EstadoPendiente): boolean {
  return e === 'en-plazo' || e === 'entregado-a-tiempo' || e === 'entregado-tarde';
}

/**
 * Escalera de reclamo tipo stepper (spec `reclamos` · "Escalera de reclamo"):
 * paso 1 queja ante la EPS, paso 2 queja ante la Supersalud, paso 3 generar el
 * documento de la queja ante la EPS y paso 4 el de la Supersalud (tarea 3.6).
 *
 * Oculta mientras el pendiente está en plazo o ya se entregó, salvo que ya
 * exista una queja registrada: esa se ve como "Completado" con su fecha (el
 * documento de una queja ya radicada no se pierde al cerrar el plazo). La
 * generación del documento se habilita solo con la queja registrada y con la
 * fecha de ESA queja ya pasada (`plazoVigenteEps`/`plazoVigenteSupersalud`,
 * que aporta la pantalla con el reloj compartido); una queja con fecha futura
 * queda fuera de temporada y se anuncia con su fecha.
 *
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
  /** La queja de la EPS no es de fecha futura (la calcula la pantalla). */
  readonly plazoVigenteEps = input(true);
  /** La queja de la Supersalud tampoco: cada paso se protege con SU fecha. */
  readonly plazoVigenteSupersalud = input(true);

  /** La pantalla persiste la queja con `registrarQueja()` del dominio. */
  readonly registrar = output<RegistroQueja>();
  /** La pantalla abre la hoja del documento (`documento`) de ese paso. */
  readonly generar = output<1 | 2>();

  readonly avisoNoAsesoria = AVISO_NO_ASESORIA;
  /** Red alterna de dispensación (spec `reclamos` · "Paso 1 disponible"). */
  readonly normaRedAlterna = paraPaso('red-alterna')[0];

  /** Paso cuyo diálogo está abierto (null = cerrado). */
  readonly dialogoPaso = signal<1 | 2 | null>(null);
  readonly fecha = signal('');
  readonly radicado = signal('');

  readonly atraparFoco = atraparFoco;

  private readonly estado = computed(() => estado(this.pendiente(), this.ahora()));
  /** Sin acciones en plazo ni en pendientes ya entregados (helper compartido). */
  readonly oculta = computed(() => escaleraOculta(this.estado()));

  readonly paso1Completado = computed(() => this.pendiente().quejaEps !== undefined);
  readonly paso2Completado = computed(() => this.pendiente().quejaSupersalud !== undefined);
  /** Con una queja registrada la escalera ya no desaparece entera. */
  readonly hayQueja = computed(() => this.paso1Completado() || this.paso2Completado());

  readonly detallePaso1 = computed(() => this.detalleDe(this.pendiente().quejaEps));
  readonly detallePaso2 = computed(() => this.detalleDe(this.pendiente().quejaSupersalud));

  /** Paso 3 habilitado: queja de la EPS registrada y con fecha ya pasada. */
  readonly generarEpsDisponible = computed(
    () => this.paso1Completado() && this.plazoVigenteEps(),
  );
  /** Paso 4 con la MISMA guarda por queja que el paso 3: SU propia fecha. */
  readonly generarSupersaludDisponible = computed(
    () => this.paso2Completado() && this.plazoVigenteSupersalud(),
  );
  /**
   * Región viva: cada queja con fecha futura se anuncia con SU fecha (la de la
   * EPS, la de la Supersalud o las dos); el botón deshabilitado correspondiente
   * nunca queda sin explicación visible, ni en la escalera ni en "Regenerar
   * documento" (que regenera la queja más avanzada).
   */
  readonly fueraDeTemporada = computed(() => {
    const partes: string[] = [];
    const eps = this.pendiente().quejaEps;
    if (eps !== undefined && !this.plazoVigenteEps()) {
      partes.push(`Tu queja ante la EPS es para el ${fechaLegible(eps.radicadaEn)}`);
    }
    const sup = this.pendiente().quejaSupersalud;
    if (sup !== undefined && !this.plazoVigenteSupersalud()) {
      partes.push(
        partes.length === 0
          ? `Tu queja ante la Supersalud es para el ${fechaLegible(sup.radicadaEn)}`
          : `la de la Supersalud para el ${fechaLegible(sup.radicadaEn)}`,
      );
    }
    return partes.join('; ');
  });

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
