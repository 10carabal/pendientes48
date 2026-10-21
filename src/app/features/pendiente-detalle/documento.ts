import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { comparteArchivosPdf } from '@platform/compartir';
import { pdfDirectoAplica } from '@platform/plataforma';
import type { Paciente } from '@domain/paciente/paciente.model';
import type { EventoVista, Pendiente } from '@domain/pendiente/pendiente.model';
import { NOTA_AUTORIZACION_DOMICILIO, fechaLarga, textoCorto } from '@domain/reclamo/plantillas';
import {
  ANEXO_BITACORA,
  PIE_PDF,
  pdfReclamo,
  type DatosPdf,
} from '@domain/reclamo/plantillas-pdf';
import { atraparFoco } from '@shared/foco-dialogo';
import { DocPdf } from './doc-pdf';
import { fechaHoraLegible } from './fechas';

/** Apoyo de la hoja: el texto de la queja es de la persona, no de la app. */
const APOYO_EDICION =
  'Puedes corregir el texto antes de copiarlo. La aplicación usa los datos exactamente como los ' +
  'escribas.';

/**
 * Copy del PDF editable (decisión 3.6): dice que es una versión editable y
 * que no existe en Android (allí la hoja nunca abre el subdiálogo). La hoja
 * lo compone porque es la que sabe la plataforma; `app-doc-pdf` puro de
 * presentación solo lo muestra por input.
 */
const TEXTO_EDITABLE =
  'Esta versión es editable con cualquier lector de PDF; ábrela y ajusta el texto ' +
  '(no disponible en Android).';

/** Texto inicial de la hoja: la plantilla aprobada del paso (`plantillas.md`). */
export function componerQueja(paso: 1 | 2, paciente: Paciente, pendiente: Pendiente): string {
  return textoCorto({ paso, paciente, pendiente });
}

/** Nombre corto del PDF: `queja-eps-<id>.pdf` o `queja-supersalud-<id>-editable.pdf`. */
export function nombrePdf(paso: 1 | 2, id: string, editable = false): string {
  const seguro = id.replace(/[^A-Za-z0-9._-]/g, '-');
  return `queja-${paso === 1 ? 'eps' : 'supersalud'}-${seguro}${editable ? '-editable' : ''}.pdf`;
}

let fuentesListas = false;

/** D4: pdfmake en el dispositivo, con sus fuentes en el vfs del paquete. */
function prepararFuentes(): void {
  if (fuentesListas) return;
  pdfMake.addVirtualFileSystem(pdfFonts);
  fuentesListas = true;
}

/**
 * PDF del reclamo (spec `reclamos` · "Generación de PDF"): SIEMPRE pdfmake en
 * el dispositivo (nunca un servicio nativo), con el documento aprobado de
 * `domain/reclamo` — fundamento legal, bitácora y foto como anexos.
 */
export async function generarPdfReclamo(datos: DatosPdf): Promise<Blob> {
  prepararFuentes();
  return pdfMake.createPdf(pdfReclamo(datos)).getBlob();
}

/**
 * PDF editable (web-only): el cuerpo revisado por la persona más el Anexo 1 de
 * la bitácora. Sale en párrafos simples para poder seguir editándolo después.
 */
export async function generarPdfEditable(
  cuerpo: string,
  eventos: readonly EventoVista[],
  pie: string = PIE_PDF,
): Promise<Blob> {
  prepararFuentes();
  return pdfMake.createPdf(pdfEditable(cuerpo, eventos, pie)).getBlob();
}

/** Definición pdfmake del PDF editable (pura, para poder probarla sin pdfmake). */
export function pdfEditable(
  cuerpo: string,
  eventos: readonly EventoVista[],
  pie: string,
): TDocumentDefinitions {
  const bitacora = eventos.map((e) => `${fechaHoraLegible(e.en)} · ${e.texto}`);
  const contenido = cuerpo
    .split('\n')
    .map((linea) => ({ text: linea, margin: [0, 0, 0, 8] as [number, number, number, number] }));

  return {
    content: [
      ...contenido,
      { text: ANEXO_BITACORA, bold: true, margin: [0, 12, 0, 4] },
      bitacora.join('\n'),
    ],
    footer: pie,
    defaultStyle: { fontSize: 14 }, // ≈18.7 px: cumple el mínimo de 18 px del sistema de diseño
  };
}

/**
 * Hoja del documento de una queja ya registrada (spec `reclamos` ·
 * "Generación de texto corto" y "Edición antes de generar", tarea 3.6).
 *
 * La persona puede corregir el texto antes de copiarlo o de generar el PDF
 * editable; los cambios son locales y nunca se guardan (el pendiente no se
 * toca). El clipboard se lleva SOLO el cuerpo, sin el aviso de no asesoría
 * (el aviso vive en la pantalla junto al botón, D6). El PDF estructurado
 * ("PDF" y "Descargar y compartir") usa los datos del pendiente y el texto
 * legal aprobado, que no se edita.
 *
 * La hoja no pregunta la plataforma en su html: `pdfDirecto` (descarga
 * directa, solo PWA) y `etiquetaCompartir` vienen de `platform/`
 * (`pdfDirectoAplica()` y `comparteArchivosPdf()`); `textoEditable` lo compone
 * esta hoja (única que sabe la plataforma) y se lo pasa a `app-doc-pdf` por
 * input; el aviso del anexo llega por input desde `domain/reclamo` (D6). El
 * doble toque lo bloquea la
 * pantalla (`copiando`, `generandoPdf`, `compartiendo`); la hoja solo
 * deshabilita sus botones.
 */
@Component({
  selector: 'app-documento',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DocPdf],
  templateUrl: './documento.html',
  styleUrl: './documento.scss',
})
export class Documento {
  readonly pendiente = input.required<Pendiente>();
  readonly paciente = input.required<Paciente>();
  readonly paso = input<1 | 2>(1);
  /** Aviso de no asesoría inyectado por la pantalla (D6). */
  readonly avisoNoAsesoria = input.required<string>();
  /** Aviso del anexo, con los títulos exactos del PDF (D6, inyectado por la pantalla). */
  readonly avisoAnexo = input.required<string>();

  /** Confirmación y bloqueos que maneja la pantalla (doble toque). */
  readonly copiado = input(false);
  readonly aviso = input('');
  readonly error = input('');
  readonly copiando = input(false);
  readonly generandoPdf = input(false);
  readonly compartiendo = input(false);
  readonly confirmandoPdf = input(false);

  readonly cerrar = output<void>();
  /** Copia el cuerpo de la queja, sin avisos. */
  readonly copiar = output<string>();
  /** Genera el PDF del reclamo con pdfmake y lo descarga o lo comparte. */
  readonly descargar = output<void>();
  readonly compartir = output<void>();
  /** El PDF editable sí lleva el texto corregido en el textarea. */
  readonly descargarEditable = output<string>();
  readonly compartirEditable = output<string>();
  /** El 2.º PDF de la queja pide confirmación primero (la pantalla lo decide). */
  readonly confirmar = output<void>();
  readonly cancelarConfirmacion = output<void>();

  /** Descarga directa con `<a download>`: solo aplica en la PWA (platform decide). */
  readonly pdfDirecto = pdfDirectoAplica();
  /** Copy del PDF editable, compuesto acá (conocer platform/ es cosa de la hoja). */
  readonly textoEditable = TEXTO_EDITABLE;
  readonly APOYO_EDICION = APOYO_EDICION;
  readonly notaAutorizacion = NOTA_AUTORIZACION_DOMICILIO;
  readonly atraparFoco = atraparFoco;

  /** Texto aprobado del paso: base de la copia y del PDF editable. */
  readonly inicial = computed(() => componerQueja(this.paso(), this.paciente(), this.pendiente()));
  /** El textarea parte del texto aprobado; escribir lo reemplaza (local). */
  readonly texto = linkedSignal(() => this.inicial());
  readonly sinCambios = computed(() => this.texto() === this.inicial());
  /** Mientras una acción copia o genera, la hoja deshabilita sus botones. */
  readonly ocupado = computed(
    () => this.copiando() || this.generandoPdf() || this.compartiendo(),
  );
  readonly notaCambios =
    'Tus cambios locales se incluyen en la copia y en el PDF editable; el PDF descargado usa los ' +
    'datos del pendiente.';

  /** "La solicitud se registró el 20 de octubre de 2026" (fecha de la queja). */
  readonly radicacion = computed(() => {
    const q = this.paso() === 1 ? this.pendiente().quejaEps : this.pendiente().quejaSupersalud;
    return q === undefined ? '' : `La solicitud se registró el ${fechaLarga(new Date(q.radicadaEn))}`;
  });

  /** Etiqueta de compartir: la hoja nativa de Android siempre; en la PWA, si el
   * navegador comparte archivos; si no, la descarga directa (decision 3.6). */
  readonly etiquetaCompartir = computed(() =>
    comparteArchivosPdf() ? 'Descargar y compartir' : 'Descargar',
  );

  readonly reemplazando = signal(false);
  readonly busqueda = signal('');
  readonly reemplazo = signal('');
  readonly recuento = signal('');
  /** Subhoja del PDF editable (solo web; en Android nunca se abre). */
  readonly pdfEditableAbierto = signal(false);

  private readonly campoTexto = viewChild<ElementRef<HTMLTextAreaElement>>('campoTexto');
  private readonly botonConfirmar = viewChild<ElementRef<HTMLButtonElement>>('botonConfirmar');
  private readonly botonPdf = viewChild<ElementRef<HTMLButtonElement>>('botonPdf');
  private readonly botonCompartir = viewChild<ElementRef<HTMLButtonElement>>('botonCompartir');
  private elementoPrevio: HTMLElement | null = null;
  /** true mientras la confirmación del 2.º PDF tiene el foco pendiente de volver. */
  private esperabaConfirmacion = false;

  constructor() {
    effect(() => {
      if (this.campoTexto()) {
        if (this.elementoPrevio === null) {
          this.elementoPrevio = document.activeElement as HTMLElement | null;
        }
        this.campoTexto()?.nativeElement.focus();
      }
    });
    // El foco entra a la confirmación y, si se cancela, vuelve al botón que la pidió.
    effect(() => {
      if (this.confirmandoPdf()) {
        this.esperabaConfirmacion = true;
        this.botonConfirmar()?.nativeElement.focus();
      } else if (this.esperabaConfirmacion) {
        this.esperabaConfirmacion = false;
        (this.botonPdf() ?? this.botonCompartir())?.nativeElement.focus();
      }
    });
  }

  /** Al cerrarse (o al borrar el pendiente) el foco vuelve a quien abrió la hoja. */
  ngOnDestroy(): void {
    this.elementoPrevio?.focus();
  }

  escribirTexto(evento: Event): void {
    this.texto.set((evento.target as HTMLTextAreaElement).value);
  }

  abrirReemplazo(): void {
    const abierto = this.reemplazando();
    this.reemplazando.set(!abierto);
    if (abierto) {
      this.busqueda.set('');
      this.reemplazo.set('');
      this.recuento.set('');
    }
  }

  escribirBusqueda(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
  }

  escribirReemplazo(evento: Event): void {
    this.reemplazo.set((evento.target as HTMLInputElement).value);
  }

  /** Reemplazo simple, case-sensitive y sin regex: el texto es de la persona. */
  reemplazar(): void {
    const buscar = this.busqueda();
    if (buscar === '') {
      this.recuento.set('Escribe qué quieres reemplazar.');
      return;
    }
    const ocurrencias = this.texto().split(buscar).length - 1;
    if (ocurrencias === 0) {
      this.recuento.set('Sin coincidencias.');
      return;
    }
    this.texto.set(this.texto().split(buscar).join(this.reemplazo()));
    this.recuento.set(ocurrencias === 1 ? '1 texto reemplazado' : `${ocurrencias} textos reemplazados`);
  }

  abrirPdfEditable(): void {
    if (!this.pdfDirecto) return; // la versión editable es solo de la PWA
    this.pdfEditableAbierto.set(true);
  }

  cerrarPdfEditable(): void {
    this.pdfEditableAbierto.set(false);
  }
}
