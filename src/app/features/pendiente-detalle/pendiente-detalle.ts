import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { paraPaso } from '@data/normas-catalogo';
import { leerPaciente } from '@data/pacientes-store';
import { borrarPendiente, guardarPendiente, leerFoto, leerPendiente } from '@data/pendientes-store';
import { generarIcs } from '@domain/calendario/ics';
import { AVISO_NO_ASESORIA } from '@domain/norma/aviso';
import type { Paciente } from '@domain/paciente/paciente.model';
import { registrarQueja as aplicarQueja } from '@domain/pendiente/bitacora';
import type { Pendiente } from '@domain/pendiente/pendiente.model';
import { descargarArchivo } from '@platform/calendario-descarga';
import {
  cancelarAviso,
  permisoAvisos,
  solicitarPermisoAvisos,
  type PermisoAvisos,
} from '@platform/notificaciones';
import { atraparFoco } from '@shared/foco-dialogo';
import { NormaCard } from '@shared/norma-card/norma-card';
import { BitacoraLista } from './bitacora-lista';
import { Contador } from './contador';
import { Escalera, type RegistroQueja } from './escalera';
import { fechaHoraLegible, fechaLegible } from './fechas';

/** Fallo de lectura (IndexedDB no disponible o ruta inválida), igual que en `inicio`. */
const ERROR_LECTURA = 'No se pudo leer la información. Intenta de nuevo.';

const mensajeDe = (causa: unknown): string =>
  causa instanceof Error ? causa.message : 'Ocurrió un error inesperado';

/**
 * Pantalla de detalle del pendiente (spec `pendientes` · "Plazo de 48 horas",
 * "Bitácora", "Cierre del pendiente" y "Edición y borrado del pendiente"; spec
 * `reclamos` · "Escalera de reclamo"): contador y estado, banner de permiso
 * denegado, datos del pendiente con la foto del comprobante, "Ya me llegó",
 * el `.ics` con su aviso "Ya agregaste este recordatorio", la escalera de
 * reclamo, la bitácora con notas y "Borrar" con confirmación.
 *
 * Reglas de la pantalla: persiste siempre esparciendo el pendiente tal cual está
 * guardado (D9: el estado y el evento "vencido" nunca se guardan); el doble
 * toque queda bloqueado en cada acción persistente; no pregunta si está en
 * nativo: los avisos pasan por `platform/` (`permisoAvisos`).
 */
@Component({
  selector: 'app-pendiente-detalle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    BitacoraLista,
    Contador,
    Escalera,
    NormaCard,
  ],
  templateUrl: './pendiente-detalle.html',
  styleUrl: './pendiente-detalle.scss',
})
export class PendienteDetalle implements OnDestroy {
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);

  readonly avisoNoAsesoria = AVISO_NO_ASESORIA;
  /** Norma del plazo, desde el catálogo empaquetado (`normas.json`). */
  readonly normaPlazo = paraPaso('plazo')[0];

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly pendiente = signal<Pendiente | null>(null);
  readonly paciente = signal<Paciente | null>(null);
  /** URL de la foto del comprobante; se revoca al destruir la pantalla. */
  readonly fotoUrl = signal<string | null>(null);
  readonly permiso = signal<PermisoAvisos | null>(null);

  /** Regiones vivas SIEMPRE en el DOM: aviso breve y fallo de escritura. */
  readonly aviso = signal<string | null>(null);
  readonly errorAccion = signal<string | null>(null);

  /** 'borrar' o 'ics': el diálogo abierto (null = ninguno). */
  readonly dialogo = signal<'borrar' | 'ics' | null>(null);

  /** Doble toque bloqueado en cada acción persistente. */
  readonly entregando = signal(false);
  readonly guardandoNota = signal(false);
  readonly guardandoQueja = signal(false);
  readonly descargando = signal(false);
  readonly borrando = signal(false);

  /** La nota se guardó: la región viva de la bitácora lo anuncia. */
  readonly notaGuardada = signal(false);
  /** Texto del campo de nota; se vacía solo después de persistir con éxito (M2, QA 3.5). */
  readonly notaTexto = signal('');

  /** Reloj compartido: el contador se refresca cada minuto (design · "Estado derivado"). */
  readonly ahora = signal(new Date());
  private readonly reloj = setInterval(() => this.ahora.set(new Date()), 60_000);

  readonly fechaDeIcs = computed(() => {
    const iso = this.pendiente()?.icsAgregadoEn;
    return iso === undefined ? '' : fechaLegible(iso);
  });

  readonly fechaHora = fechaHoraLegible;
  readonly atraparFoco = atraparFoco;

  private readonly botonBorrar = viewChild<ElementRef<HTMLButtonElement>>('botonBorrar');
  private readonly botonDescargar = viewChild<ElementRef<HTMLButtonElement>>('botonDescargar');
  private elementoPrevio: HTMLElement | null = null;
  /** Id de la carga vigente: un resultado tardío de otra ruta no se aplica. */
  private cargaId: string | null = null;

  constructor() {
    effect(() => {
      const abierto = this.dialogo();
      if (abierto === 'borrar') this.enfocar(this.botonBorrar());
      else if (abierto === 'ics') this.enfocar(this.botonDescargar());
      else if (this.elementoPrevio !== null) {
        this.elementoPrevio.focus();
        this.elementoPrevio = null;
      }
    });
    // Ruta viva (m1, QA 3.5): si cambia el id, la pantalla recarga.
    this.ruta.paramMap.pipe(takeUntilDestroyed()).subscribe((parametros) => {
      this.recargar(parametros.get('id')); // la carga atrapa sus fallos
    });
    void this.consultarPermiso();
  }

  ngOnDestroy(): void {
    clearInterval(this.reloj);
    const url = this.fotoUrl();
    if (url !== null) URL.revokeObjectURL(url); // la foto no queda colgada en memoria
  }

  volver(): void {
    void this.router.navigateByUrl('/').catch(() => undefined);
  }

  abrirEdicion(): void {
    const id = this.pendiente()?.id;
    if (id === undefined) return;
    void this.router.navigateByUrl(`/pendientes/${id}/editar`).catch(() => undefined);
  }

  /** Spec `pendientes` · "Cierre del pendiente": entrega + evento + aviso cancelado. */
  async entregar(): Promise<void> {
    const p = this.pendiente();
    if (p === null || p.entregadoEn !== undefined || this.entregando()) return;
    this.entregando.set(true);
    try {
      const en = new Date().toISOString();
      const actualizado: Pendiente = {
        ...p,
        entregadoEn: en,
        bitacora: [
          ...p.bitacora,
          { en, tipo: 'entregado', texto: 'Marcaste el pendiente como entregado' },
        ],
      };
      await guardarPendiente(actualizado);
      this.pendiente.set(actualizado);
      this.errorAccion.set(null);
      // El aviso ya no aplica; cancelar no falla si no había ninguno.
      await cancelarAviso(p.id).catch(() => undefined);
    } catch (causa) {
      this.errorAccion.set(mensajeDe(causa));
    } finally {
      this.entregando.set(false);
    }
  }

  /** Spec `pendientes` · "Bitácora": el usuario agrega notas manuales. */
  async agregarNota(texto: string): Promise<void> {
    const p = this.pendiente();
    const nota = texto.trim();
    if (p === null || nota === '' || this.guardandoNota()) return;
    this.guardandoNota.set(true);
    this.notaGuardada.set(false); // se vacía antes: así la 2.ª nota vuelve a anunciarse (m2)
    try {
      const actualizado: Pendiente = {
        ...p,
        bitacora: [...p.bitacora, { en: new Date().toISOString(), tipo: 'nota', texto: nota }],
      };
      await guardarPendiente(actualizado);
      this.pendiente.set(actualizado);
      this.notaGuardada.set(true);
      this.errorAccion.set(null);
      // Solo si el usuario no siguió escribiendo mientras se guardaba (M2).
      if (this.notaTexto().trim() === nota) this.notaTexto.set('');
    } catch (causa) {
      // Falló el guardado: el texto del campo se conserva tal cual (M2, QA 3.5).
      this.errorAccion.set(mensajeDe(causa));
    } finally {
      this.guardandoNota.set(false);
    }
  }

  /** Registra (o vuelve a registrar) la queja de un paso de la escalera. */
  async registrarQueja(registro: RegistroQueja): Promise<void> {
    const p = this.pendiente();
    if (p === null || this.guardandoQueja()) return;
    this.guardandoQueja.set(true);
    try {
      const actualizado = aplicarQueja(p, registro.paso === 1 ? 'eps' : 'supersalud', {
        radicadaEn: registro.radicadaEn,
        radicado: registro.radicado,
      });
      await guardarPendiente(actualizado);
      this.pendiente.set(actualizado);
      this.errorAccion.set(null);
    } catch (causa) {
      this.errorAccion.set(mensajeDe(causa));
    } finally {
      this.guardandoQueja.set(false);
    }
  }

  /** El `.ics` se ofrece en la PWA y en Android; el segundo toque avisa primero. */
  async agregarRecordatorio(): Promise<void> {
    const p = this.pendiente();
    if (p === null) return;
    if (p.icsAgregadoEn !== undefined) {
      this.dialogo.set('ics');
      return;
    }
    await this.descargarRecordatorio(p);
  }

  /** "Descargar de nuevo" del diálogo "Ya agregaste este recordatorio". */
  async descargarRecordatorioNuevamente(): Promise<void> {
    this.dialogo.set(null);
    const p = this.pendiente();
    if (p !== null) await this.descargarRecordatorio(p);
  }

  pedirBorrado(): void {
    this.errorAccion.set(null);
    this.dialogo.set('borrar');
  }

  cerrarDialogo(): void {
    this.dialogo.set(null);
  }

  /** Spec `pendientes` · "Borrar un pendiente": aviso, foto y datos, en ese orden. */
  async borrar(): Promise<void> {
    const p = this.pendiente();
    if (p === null || this.borrando()) return;
    this.borrando.set(true);
    try {
      await cancelarAviso(p.id).catch(() => undefined); // nunca quedan avisos huérfanos
      await borrarPendiente(p.id); // borra también la foto del comprobante
      this.dialogo.set(null);
      await this.router.navigateByUrl('/').catch(() => undefined);
    } catch (causa) {
      this.dialogo.set(null);
      this.errorAccion.set(mensajeDe(causa));
    } finally {
      this.borrando.set(false);
    }
  }

  /** Spec `pendientes` · "Permiso de notificaciones denegado". */
  async activarNotificaciones(): Promise<void> {
    const resultado = await solicitarPermisoAvisos().catch(() => 'denegado' as const);
    this.permiso.set(resultado);
    this.aviso.set(resultado === 'concedido' ? 'Notificaciones activadas' : null);
  }

  private async descargarRecordatorio(p: Pendiente): Promise<void> {
    if (this.descargando()) return;
    this.descargando.set(true);
    try {
      const contenido = new Blob([generarIcs(p, new Date())], {
        type: 'text/calendar;charset=utf-8',
      });
      await descargarArchivo(`pendiente-${p.id}.ics`, contenido);
      const actualizado: Pendiente = { ...p, icsAgregadoEn: new Date().toISOString() };
      await guardarPendiente(actualizado);
      this.pendiente.set(actualizado);
      this.errorAccion.set(null);
    } catch (causa) {
      this.errorAccion.set(mensajeDe(causa));
    } finally {
      this.descargando.set(false);
    }
  }

  /**
   * Limpia lo que quedó de la carga anterior (foto, datos, borrador de nota) y
   * carga el pendiente de la ruta: la primera llamada viene del constructor y
   * cada cambio de `id` la repite.
   */
  private recargar(id: string | null): void {
    const url = this.fotoUrl();
    if (url !== null) {
      URL.revokeObjectURL(url); // la foto vieja no queda colgada en memoria
      this.fotoUrl.set(null);
    }
    this.cargando.set(true);
    this.error.set(null);
    this.pendiente.set(null);
    this.paciente.set(null);
    this.notaTexto.set('');
    this.cargaId = id;
    void this.cargar(id);
  }

  private async cargar(id: string | null): Promise<void> {
    // Si la ruta cambia a mitad de esta carga, sus resultados ya no aplican.
    const vigente = (): boolean => this.cargaId === id;
    try {
      const pendiente = id === null ? undefined : await leerPendiente(id);
      if (!vigente()) return;
      if (pendiente === undefined) {
        this.error.set(ERROR_LECTURA); // ruta inválida o dato ilegible: volver al inicio
        return;
      }
      this.pendiente.set(pendiente);
      const paciente = await leerPaciente(pendiente.pacienteId).catch(() => undefined);
      if (!vigente()) return;
      this.paciente.set(paciente ?? null);
      const url = await this.cargarFoto(pendiente);
      if (!vigente()) {
        if (url !== null) URL.revokeObjectURL(url);
        return;
      }
      if (url !== null) this.fotoUrl.set(url);
    } catch {
      if (vigente()) this.error.set(ERROR_LECTURA);
    } finally {
      if (vigente()) this.cargando.set(false);
    }
  }

  /** Devuelve la URL de la foto; si la ruta cambia, no se llega a usar. */
  private async cargarFoto(pendiente: Pendiente): Promise<string | null> {
    if (pendiente.fotoComprobanteKey === undefined) return null;
    try {
      const foto = await leerFoto(pendiente.fotoComprobanteKey);
      // Si la foto no se puede leer, el pendiente se ve igual sin ella.
      return foto === undefined ? null : URL.createObjectURL(foto);
    } catch {
      return null;
    }
  }

  private async consultarPermiso(): Promise<void> {
    // En la PWA esto devuelve 'no-aplica' y el banner no existe.
    this.permiso.set(await permisoAvisos().catch(() => 'no-aplica' as const));
  }

  private enfocar(boton: ElementRef<HTMLButtonElement> | undefined): void {
    if (this.elementoPrevio === null) {
      this.elementoPrevio = document.activeElement as HTMLElement | null;
    }
    boton?.nativeElement.focus();
  }
}
