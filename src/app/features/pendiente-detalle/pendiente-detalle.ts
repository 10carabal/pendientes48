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
import { IonContent, IonHeader, IonTitle, IonToolbar, ToastController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { paraPaso, NORMAS } from '@data/normas-catalogo';
import { leerPaciente } from '@data/pacientes-store';
import { borrarPendiente, guardarPendiente, leerFoto, leerPendiente } from '@data/pendientes-store';
import { generarIcs } from '@domain/calendario/ics';
import { AVISO_NO_ASESORIA } from '@domain/norma/aviso';
import type { Paciente } from '@domain/paciente/paciente.model';
import {
  bitacoraVista,
  registrarQueja as aplicarQueja,
} from '@domain/pendiente/bitacora';
import type { Pendiente } from '@domain/pendiente/pendiente.model';
import { estado } from '@domain/pendiente/plazo';
import { AVISO_ANEXO } from '@domain/reclamo/plantillas-pdf';
import { descargarArchivo } from '@platform/calendario-descarga';
import { compartirPdf, copiarTexto } from '@platform/compartir';
import {
  cancelarAviso,
  permisoAvisos,
  solicitarPermisoAvisos,
  type PermisoAvisos,
} from '@platform/notificaciones';
import { atraparFoco } from '@shared/foco-dialogo';
import { NormaCard } from '@shared/norma-card/norma-card';
import { mostrarToast } from '@shared/toast';
import { BitacoraLista } from './bitacora-lista';
import { Contador } from './contador';
import {
  Documento,
  generarPdfEditable,
  generarPdfReclamo,
  nombrePdf,
} from './documento';
import { Escalera, escaleraOculta, type RegistroQueja } from './escalera';
import { esFechaPasada, fechaHoraLegible, fechaLegible } from './fechas';

/** Fallo de lectura (IndexedDB no disponible o ruta inválida), igual que en `inicio`. */
const ERROR_LECTURA = 'No se pudo leer la información. Intenta de nuevo.';

const mensajeDe = (causa: unknown): string =>
  causa instanceof Error ? causa.message : 'Ocurrió un error inesperado';

/**
 * Fallo al generar o compartir el PDF. El cierre de la hoja nativa de
 * compartir (Capacitor lo rechaza con "Share canceled") no es un fallo:
 * se queda en el respaldo silencioso y no se anuncia.
 */
const mensajePdfDe = (causa: unknown): string => {
  const texto =
    typeof causa === 'object' && causa !== null && 'message' in causa
      ? String((causa as { message: unknown }).message)
      : causa instanceof Error
        ? causa.message
        : '';
  if (/cancel/i.test(texto)) return '';
  return texto === '' ? 'Ocurrió un error inesperado' : texto;
};

/**
 * Pantalla de detalle del pendiente (spec `pendientes` · "Plazo de 48 horas",
 * "Bitácora", "Cierre del pendiente" y "Edición y borrado del pendiente"; spec
 * `reclamos` · "Escalera de reclamo", "Generación de texto corto", "Generación
 * de PDF", "Compartir" y "Edición antes de generar"): contador y estado,
 * banner de permiso denegado, datos del pendiente con la foto del comprobante,
 * "Ya me llegó", el `.ics` con su aviso "Ya agregaste este recordatorio", la
 * escalera de reclamo, la bitácora con notas, "Borrar" con confirmación y la
 * hoja del documento de la queja (tarea 3.6).
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
    Documento,
    Escalera,
    NormaCard,
  ],
  templateUrl: './pendiente-detalle.html',
  styleUrl: './pendiente-detalle.scss',
})
export class PendienteDetalle implements OnDestroy {
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private readonly toast = inject(ToastController);

  readonly avisoNoAsesoria = AVISO_NO_ASESORIA;
  /** Aviso del anexo del PDF, con los títulos exactos del documento (D6). */
  readonly avisoAnexo = AVISO_ANEXO;
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

  /* Hoja del documento (tarea 3.6): copiar, PDF con pdfmake y compartir. */
  /** Paso cuya hoja está abierta (null = cerrada). */
  readonly hojaDocumento = signal<1 | 2 | null>(null);
  /** Regiones vivas de la hoja: copia hecha, aviso breve y fallo. */
  readonly copiadoHoja = signal(false);
  readonly avisoHoja = signal<string | null>(null);
  readonly errorHoja = signal<string | null>(null);
  /** Doble toque bloqueado también en copiar y en generar el PDF. */
  readonly copiando = signal(false);
  readonly generandoPdf = signal(false);
  readonly compartiendo = signal(false);
  /** Confirmación cuando el PDF de esa queja ya se generó antes. */
  readonly confirmandoPdf = signal(false);
  private readonly pdfsGenerados = signal<ReadonlySet<1 | 2>>(new Set());
  private accionPdfPendiente: 'descargar' | 'compartir' = 'descargar';

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

  /**
   * Cada queja se protege con la fecha de SU radicación (hallazgo 8): la
   * pantalla calcula ambos valores con el reloj compartido, la escalera los
   * recibe por input y "Regenerar documento" usa el de la queja que regenera.
   */
  readonly plazoVigenteEps = computed(() => {
    const q = this.pendiente()?.quejaEps;
    return q === undefined || esFechaPasada(q.radicadaEn, this.ahora());
  });
  readonly plazoVigenteSupersalud = computed(() => {
    const q = this.pendiente()?.quejaSupersalud;
    return q === undefined || esFechaPasada(q.radicadaEn, this.ahora());
  });

  /**
   * Paso de la queja más avanzada registrada: Supersalud si existe, si no EPS
   * (spec `reclamos` · "Paso 1 completado": el documento se puede volver a
   * generar). La hoja del documento no distingue el origen del clic.
   */
  readonly quejaParaRegenerar = computed<1 | 2 | null>(() => {
    const p = this.pendiente();
    if (p === null) return null;
    if (p.quejaSupersalud !== undefined) return 2;
    return p.quejaEps !== undefined ? 1 : null;
  });

  /**
   * "Regenerar documento" (decisión de Daniel, 3.6): terciario visible solo
   * con queja registrada y la escalera oculta (en plazo o entregado); en
   * vencido o escalado los pasos 3–4 de la escalera ya regeneran. La
   * visibilidad reutiliza `escaleraOculta()`, la MISMA condición de la
   * escalera, sin duplicar la lógica.
   */
  readonly regenerarVisible = computed(() => {
    const p = this.pendiente();
    return (
      p !== null &&
      this.quejaParaRegenerar() !== null &&
      escaleraOculta(estado(p, this.ahora()))
    );
  });

  /**
   * "Regenerar documento" se bloquea con la fecha futura de SU queja (la más
   * avanzada); el aviso vivo de la escalera anuncia cuál está fuera de
   * temporada, así el botón deshabilitado nunca queda sin explicación.
   */
  readonly regenerarVigente = computed(() =>
    this.quejaParaRegenerar() === 2 ? this.plazoVigenteSupersalud() : this.plazoVigenteEps(),
  );

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
      // La región viva "Nota guardada" sigue anunciando (D2): el toast la complementa.
      void mostrarToast(this.toast, 'nota-guardada');
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
      // Es otra queja: su PDF todavía no existe, no pide confirmación.
      this.olvidarPdf(registro.paso);
    } catch (causa) {
      this.errorAccion.set(mensajeDe(causa));
    } finally {
      this.guardandoQueja.set(false);
    }
  }

  /* — Hoja del documento (spec `reclamos`, tarea 3.6) ————————————————— */

  /** Abre la hoja del documento de un paso con el estado limpio. */
  abrirDocumento(paso: 1 | 2): void {
    if (this.paciente() === null || this.pendiente() === null) {
      // Sin el perfil no se puede componer la queja: el fallo se anuncia aquí.
      this.errorAccion.set(ERROR_LECTURA);
      return;
    }
    this.copiadoHoja.set(false);
    this.avisoHoja.set(null);
    this.errorHoja.set(null);
    this.confirmandoPdf.set(false);
    this.hojaDocumento.set(paso);
  }

  /** Escape, "Cerrar" o una ruta nueva: la hoja se cierra sin generar nada. */
  cerrarHojaDocumento(): void {
    this.hojaDocumento.set(null);
    this.confirmandoPdf.set(false);
    this.copiadoHoja.set(false);
  }

  /** Copia SOLO el cuerpo de la queja: el aviso de no asesoría vive en la hoja. */
  async copiarEnHoja(texto: string): Promise<void> {
    if (this.copiando()) return;
    this.copiando.set(true);
    try {
      await copiarTexto(texto);
      this.errorHoja.set(null);
      // Cada acción anuncia lo suyo: la copia reemplaza el aviso del PDF.
      this.avisoHoja.set(null);
      this.copiadoHoja.set(true);
    } catch (causa) {
      this.errorHoja.set(mensajeDe(causa));
    } finally {
      this.copiando.set(false);
    }
  }

  /**
   * "PDF" (descarga directa) o "Descargar y compartir": siempre pdfmake en el
   * dispositivo (D4); el 2.º PDF de la misma queja pide confirmación primero.
   */
  async pedirPdf(accion: 'descargar' | 'compartir'): Promise<void> {
    const paso = this.hojaDocumento();
    if (paso === null || this.generandoPdf() || this.compartiendo() || this.confirmandoPdf()) {
      return;
    }
    if (this.pdfsGenerados().has(paso)) {
      this.accionPdfPendiente = accion;
      this.confirmandoPdf.set(true);
      return;
    }
    await this.emitirPdf(accion, paso);
  }

  /** "Generar otra" de la confirmación: repite la acción que la pidió. */
  confirmarPdf(): void {
    const paso = this.hojaDocumento();
    if (!this.confirmandoPdf() || paso === null) return;
    this.confirmandoPdf.set(false);
    void this.emitirPdf(this.accionPdfPendiente, paso);
  }

  cancelarConfirmacion(): void {
    this.confirmandoPdf.set(false);
  }

  /** El PDF editable (web) sí lleva el texto corregido en la hoja. */
  async descargarPdfEditable(texto: string): Promise<void> {
    await this.emitirPdfEditable('descargar', texto);
  }

  async compartirPdfEditable(texto: string): Promise<void> {
    await this.emitirPdfEditable('compartir', texto);
  }

  private async emitirPdf(accion: 'descargar' | 'compartir', paso: 1 | 2): Promise<void> {
    await this.procesarPdf(
      accion,
      async (p, px) =>
        generarPdfReclamo({
          paso,
          paciente: px,
          pendiente: p,
          ahora: new Date(),
          normas: NORMAS,
          fotoBase64: await this.fotoBase64(p),
        }),
      (p) => nombrePdf(paso, p.id),
      paso,
    );
  }

  private async emitirPdfEditable(
    accion: 'descargar' | 'compartir',
    texto: string,
  ): Promise<void> {
    const paso = this.hojaDocumento();
    if (paso === null) return;
    await this.procesarPdf(
      accion,
      async (p) => generarPdfEditable(texto, bitacoraVista(p, new Date())),
      (p) => nombrePdf(paso, p.id, true),
      paso,
    );
  }

  /** Genera con pdfmake y entrega: descarga directa o hoja de compartir. */
  private async procesarPdf(
    accion: 'descargar' | 'compartir',
    generar: (p: Pendiente, px: Paciente) => Promise<Blob>,
    nombre: (p: Pendiente) => string,
    paso: 1 | 2,
  ): Promise<void> {
    const directo = accion === 'descargar';
    if (directo ? this.generandoPdf() : this.compartiendo()) return;
    if (directo) this.generandoPdf.set(true);
    else this.compartiendo.set(true);
    try {
      const p = this.pendiente();
      const px = this.paciente();
      if (p === null || px === null) return;
      const blob = await generar(p, px);
      // Cada acción anuncia lo suyo: el PDF reemplaza "Texto copiado".
      this.copiadoHoja.set(false);
      if (directo) {
        await descargarArchivo(nombre(p), blob);
        this.avisoHoja.set('PDF descargado');
      } else {
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const resultado = await compartirPdf(bytes, nombre(p));
        // Compartido: la hoja nativa ya fue el feedback; descargado: se anuncia.
        this.avisoHoja.set(resultado === 'descargado' ? 'PDF descargado' : null);
      }
      this.errorHoja.set(null);
      this.marcarPdf(paso);
    } catch (causa) {
      const fallo = mensajePdfDe(causa);
      if (fallo !== '') this.errorHoja.set(fallo);
    } finally {
      if (directo) this.generandoPdf.set(false);
      else this.compartiendo.set(false);
    }
  }

  /** Tras un PDF exitoso, el siguiente del mismo paso pide confirmación. */
  private marcarPdf(paso: 1 | 2): void {
    this.pdfsGenerados.update((s) => new Set(s).add(paso));
  }

  /** Una queja re-registrada es otra queja: su PDF se genera sin confirmar. */
  private olvidarPdf(paso: 1 | 2): void {
    this.pdfsGenerados.update((s) => {
      if (!s.has(paso)) return s;
      const sinPaso = new Set(s);
      sinPaso.delete(paso);
      return sinPaso;
    });
  }

  /** Anexo 2 del PDF: la foto como data URI; sin ella el PDF sale igual. */
  private async fotoBase64(p: Pendiente): Promise<string | undefined> {
    if (p.fotoComprobanteKey === undefined) return undefined;
    try {
      const foto = await leerFoto(p.fotoComprobanteKey);
      if (foto === undefined) return undefined;
      const bytes = new Uint8Array(await foto.arrayBuffer());
      let binario = '';
      const TROZO = 0x8000;
      for (let i = 0; i < bytes.length; i += TROZO) {
        binario += String.fromCharCode(...bytes.subarray(i, i + TROZO));
      }
      return `data:${foto.type || 'image/jpeg'};base64,${btoa(binario)}`;
    } catch {
      return undefined;
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
      void mostrarToast(this.toast, 'pendiente-borrado');
      this.cerrarHojaDocumento();
      this.dialogo.set(null);
      await this.router.navigateByUrl('/').catch(() => undefined);
    } catch (causa) {
      this.cerrarHojaDocumento();
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
    // La hoja del documento y sus PDFs son del pendiente anterior.
    this.cerrarHojaDocumento();
    this.pdfsGenerados.set(new Set());
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
