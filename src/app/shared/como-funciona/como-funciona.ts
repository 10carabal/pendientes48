import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  input,
  output,
  viewChild,
} from '@angular/core';
import { atraparFoco } from '../foco-dialogo';

/** Ruta de la guía "Me dejaron un pendiente" (tarea 3.3; ver `app.routes.ts`). */
const RUTA_GUIA = '/ventanilla';

/** Una sección de la introducción: un párrafo o una lista (con o sin orden). */
interface Seccion {
  readonly titulo: string;
  readonly parrafo?: string;
  readonly items?: readonly string[];
  readonly ordenada?: boolean;
}

/**
 * Copy aprobado de la introducción, verbatim y en 3ª persona
 * (memory.md · "Copy aprobado de la introducción"; decisiones de Daniel,
 * 2026-10-14 y 2026-10-19). **Única fuente del copy**: la usa la versión en
 * línea (estado vacío de Inicio) y la hoja "¿Cómo funciona?". Sin contenido
 * legal (D6): el texto vive aquí, no en `normas.json`.
 */
export const SECCIONES: readonly Seccion[] = [
  {
    titulo: '¿Qué es Pendientes48?',
    parrafo:
      'Pendientes48 es una aplicación que lleva el control de los medicamentos pendientes en la ' +
      'farmacia. Cuenta 48 horas desde el reclamo y muestra al paciente el plazo que le queda.',
  },
  {
    titulo: 'Qué puede hacer',
    items: [
      'Registrar cada pendiente con sus medicamentos, la farmacia y la hora del reclamo',
      'Mostrar el tiempo que queda y la fecha de vencimiento',
      'Avisar al paciente cuando se acaben las 48 horas',
      'Preparar el texto y el PDF para reclamar ante la EPS o Supersalud',
      'Guardar los datos del paciente para no volver a pedirlos.',
    ],
  },
  {
    titulo: 'Cómo funciona',
    ordenada: true,
    items: [
      'El paciente registra su pendiente con la hora del reclamo.',
      'La aplicación descuenta las 48 horas y avisa cuando el plazo vence.',
      'Si el plazo vence sin entrega, la aplicación prepara la queja ante la EPS o Supersalud.',
    ],
  },
];

/**
 * Introducción de la app (spec `pendientes` · "Introducción de la app";
 * tarea 3.8). Dos modos con **el mismo copy** (fuente única `SECCIONES`):
 *
 * - **En línea** (`hoja` en false): las tres secciones con `h2` dentro del
 *   estado vacío de Inicio. Sin scrim ni diálogo (la pantalla ya tiene `h1`;
 *   saltar de `h1` a `h3` rompe `heading-order` en Lighthouse).
 * - **Hoja** (`hoja` en true + `visible`): diálogo con `h2` "¿Cómo funciona?",
 *   las mismas secciones como `h3`, enlace al pie a la guía de la 3.3 y
 *   crédito de la marca. El pie completo (enlace, crédito y Cerrar) es
 *   `position: sticky` sobre el scrollport, así que **Cerrar queda siempre
 *   visible sin hacer scroll** (decisión de Daniel: "Cerrar siempre
 *   visible"); también cierran Escape y el toque fuera. Quien navega desde el
 *   pie es la pantalla que instancia el componente (y ahí se cierra la hoja). Dentro de la hoja no hay botón principal (un sólido por capa).
 *
 * El foco entra a "Cerrar" al abrirse, Tab no sale de la hoja y al cerrar
 * vuelve a quien lo tenía (mismo calco que `ayuda-avisos`).
 */
@Component({
  selector: 'app-como-funciona',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  templateUrl: './como-funciona.html',
  styleUrl: './como-funciona.scss',
})
export class ComoFunciona {
  /** true = hoja (diálogo); false = en línea (estado vacío). */
  readonly hoja = input(false);
  /** Solo importa en modo hoja: open/closed del diálogo. */
  readonly visible = input(false);
  readonly cerrado = output<void>();
  /** La pantalla resuelve la navegación a la guía (ver `features/inicio`). */
  readonly abrirGuia = output<void>();

  readonly secciones = SECCIONES;
  readonly rutaGuia = RUTA_GUIA;

  /** Trampa de foco compartida (ver `shared/foco-dialogo.ts`). */
  readonly atraparFoco = atraparFoco;

  private readonly botonCerrar = viewChild<ElementRef<HTMLButtonElement>>('botonCerrar');
  private elementoPrevio: HTMLElement | null = null;

  constructor() {
    effect(() => {
      if (this.hoja() && this.visible()) {
        this.elementoPrevio = document.activeElement as HTMLElement | null;
        this.botonCerrar()?.nativeElement.focus();
      } else if (this.elementoPrevio) {
        this.elementoPrevio.focus();
        this.elementoPrevio = null;
      }
    });
  }

  /**
   * Toque fuera de la caja: cierra solo si el toque cae en el propio scrim,
   * nunca al tocar (o seleccionar texto) dentro de la hoja.
   */
  tocarFuera(event: Event): void {
    if (event.target === event.currentTarget) {
      this.cerrado.emit();
    }
  }

  /**
   * El enlace del pie navega dentro de la app (sin recarga completa): la
   * resolución queda en la pantalla que instancia el componente.
   */
  irAGuia(event: Event): void {
    event.preventDefault();
    this.abrirGuia.emit();
  }
}
