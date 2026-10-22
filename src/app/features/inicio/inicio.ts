import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  computed,
  inject,
  signal,
} from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar, type ViewWillEnter } from '@ionic/angular';
import { Router } from '@angular/router';
import { listarPendientes } from '@data/pendientes-store';
import { actualizarPreferencias, leerPreferencias } from '@data/preferencias-store';
import { AVISO_NO_ASESORIA } from '@domain/norma/aviso';
import type { Pendiente } from '@domain/pendiente/pendiente.model';
import { estado, textoContador } from '@domain/pendiente/plazo';
import { AvisoLegal } from '@shared/aviso-legal/aviso-legal';
import { ComoFunciona } from '@shared/como-funciona/como-funciona';
import { EstadoChip } from '@shared/estado-chip/estado-chip';

/** Fallo de lectura (IndexedDB no disponible), igual que en `pacientes`. */
const ERROR_LECTURA = 'No se pudo leer la información. Intenta de nuevo.';

/**
 * Pantalla de inicio (spec `pendientes` · "Plazo de 48 horas" e "Introducción
 * de la app"; `normas` · "Aviso de no asesoría legal"; `ventanilla` · "Guía de
 * ventanilla"): lista cada pendiente con su contador y su estado (etiqueta +
 * color), ofrece el botón principal "Me dejaron un pendiente" que abre la
 * guía de la farmacia (tarea 3.3), muestra el aviso legal como modal en la
 * primera apertura y como línea fija al pie en cada apertura siguiente, y en
 * el estado vacío presenta la introducción de la app junto al enlace terciario
 * "¿Cómo funciona?", que abre la hoja con el mismo copy (tarea 3.8).
 *
 * El almacén se lee en el constructor **y** en `ionViewWillEnter` (ver ahí).
 */
@Component({
  selector: 'app-inicio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, AvisoLegal, ComoFunciona, EstadoChip],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss',
})
export class Inicio implements OnDestroy, ViewWillEnter {
  private readonly router = inject(Router);

  readonly avisoLegal = AVISO_NO_ASESORIA;
  readonly pendientes = signal<Pendiente[]>([]);
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  /** null mientras carga; false = primera apertura (modal); true = línea al pie. */
  readonly avisoAceptado = signal<boolean | null>(null);
  /** Hoja de la introducción (tarea 3.8): abierta desde "¿Cómo funciona?". */
  readonly comoFunciona = signal(false);

  /** Reloj compartido: el contador se refresca cada minuto (design · "Estado derivado"). */
  private readonly ahora = signal(new Date());
  private readonly reloj = setInterval(() => this.ahora.set(new Date()), 60_000);

  /** Una fila por tarjeta, con contador y estado recalculados con el reloj. */
  readonly filas = computed(() =>
    this.pendientes().map((pendiente) => ({
      pendiente,
      estado: estado(pendiente, this.ahora()),
      contador: textoContador(pendiente, this.ahora()),
    })),
  );

  /**
   * El constructor se conserva (es la carga de la primera creación y el patrón
   * que sostienen los tests existentes); la lectura fresca al navegar vive en
   * `ionViewWillEnter`.
   */
  constructor() {
    void this.cargar();
  }

  /**
   * Ciclo de vida: `<ion-router-outlet>` apila las pantallas y al volver con
   * "atrás" re-muestra **la misma instancia** sin ejecutar de nuevo el
   * constructor (bug confirmado en el S22: la lista quedaba con datos
   * viejos). La primera entrada también dispara este hook, así que la carga se
   * ejecuta dos veces: es el mismo método y es inocua (reescribe las mismas
   * señales, sin efectos visibles duplicados). Relee también las preferencias,
   * de modo que tras "Borrar todos mis datos" el modal de primera apertura
   * vuelve a aparecer (spec `normas` · "Primera apertura").
   */
  ionViewWillEnter(): void {
    void this.cargar();
  }

  ngOnDestroy(): void {
    clearInterval(this.reloj);
  }

  abrirPacientes(): void {
    void this.router.navigateByUrl('/pacientes').catch(() => undefined);
  }

  /** Abre la pantalla de detalle del pendiente (tarea 3.5). */
  abrirDetalle(id: string): void {
    void this.router.navigateByUrl(`/pendientes/${id}`).catch(() => undefined);
  }

  /**
   * Abre la guía "Me dejaron un pendiente" (spec `ventanilla` · "Guía de
   * ventanilla"): desde ahí se llega al formulario de registro.
   */
  abrirGuia(): void {
    void this.router.navigateByUrl('/ventanilla').catch(() => undefined);
  }

  /**
   * Acepta el aviso legal: la línea reemplaza al modal de inmediato y la
   * escritura es a prueba de fallos (si falla, la próxima apertura vuelve a
   * mostrar el modal: el aviso nunca se salta en silencio).
   */
  async aceptarAviso(): Promise<void> {
    this.avisoAceptado.set(true);
    try {
      await actualizarPreferencias({ avisoLegalAceptado: true });
    } catch {
      /* reintento en la próxima apertura */
    }
  }

  private async cargar(): Promise<void> {
    const [pendientes, preferencias] = await Promise.all([
      listarPendientes().catch(() => undefined),
      leerPreferencias().catch(() => undefined),
    ]);
    if (pendientes === undefined) {
      this.error.set(ERROR_LECTURA);
    } else {
      this.pendientes.set(pendientes);
    }
    // Sin preferencia legible se asume no aceptada (spec `normas` ·
    // "Primera apertura": el aviso exige "Entiendo" la primera vez).
    this.avisoAceptado.set(preferencias?.avisoLegalAceptado ?? false);
    this.cargando.set(false);
  }
}
