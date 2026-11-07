import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { Router } from '@angular/router';
import { guardarBorrador, leerBorrador } from '@data/borrador-store';
import { paraPaso } from '@data/normas-catalogo';
import { AVISO_NO_ASESORIA } from '@domain/norma/aviso';
import { elegirFoto as elegirDeLaGaleria, tomarFoto as tomarConLaCamara } from '@platform/camara';
import { BotonVolver } from '@shared/boton-volver/boton-volver';
import { NormaCard } from '@shared/norma-card/norma-card';

/** Línea de apoyo del paso 1 (copia funcional: enlaza el comprobante con el paso 3). */
const APOYO_COMPROBANTE = 'Pida también el número del comprobante: puede anotarlo en el paso 3.';

/** Línea de apoyo del paso 2: aprobada verbatim (decisión Daniel, 2026-10-14; copy actualizado 2026-10-22, Bloque 5). */
const APOYO_DOMICILIO =
  'Si usted autoriza, la EPS debe entregar el medicamento en su casa dentro de las 48 horas. Pídelo en la farmacia o dispensario antes de irte.';

/** Aviso no bloqueante del paso 3: la foto es opcional y el botón final sigue activo. */
const AVISO_FOTO = 'No se pudo tomar la foto. Puede elegir de la galería o anotar el número.';

/**
 * Guía de ventanilla (spec `ventanilla` · "Guía de ventanilla" y "Guía sin
 * conexión"): pantalla única con 3 pasos en scroll, la norma que respalda el
 * paso 2 (texto legal por input, D6) y las tres salidas no bloqueantes del
 * paso 3 (cámara, galería o número anotado), todo escrito en el borrador en
 * memoria (`@data/borrador`) para que el formulario de registro lo retome.
 * Funciona sin conexión: no consulta red.
 */
@Component({
  selector: 'app-ventanilla',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, NormaCard, BotonVolver],
  templateUrl: './ventanilla.html',
  styleUrl: './ventanilla.scss',
})
export class Ventanilla {
  private readonly router = inject(Router);

  readonly avisoNoAsesoria = AVISO_NO_ASESORIA;
  readonly apoyoComprobante = APOYO_COMPROBANTE;
  readonly apoyoDomicilio = APOYO_DOMICILIO;

  /** Norma del paso 2, desde el catálogo empaquetado (`normas.json`). */
  readonly norma = paraPaso('ventanilla')[0];

  /** Estado del paso 3: ninguna salida es bloqueante (spec "tres salidas"). */
  readonly fotoEnCurso = signal(false);
  readonly fotoLista = signal(leerBorrador().foto !== undefined);
  readonly avisoFoto = signal<string | null>(null);
  readonly mostrandoNumero = signal(leerBorrador().numeroComprobante !== undefined);
  readonly numeroComprobante = signal(leerBorrador().numeroComprobante ?? '');

  async tomarFoto(): Promise<void> {
    await this.capturar(() => tomarConLaCamara());
  }

  async elegirFoto(): Promise<void> {
    await this.capturar(() => elegirDeLaGaleria());
  }

  /** Quita la foto del borrador (la guía y el formulario vuelven a "sin foto"). */
  quitarFoto(): void {
    guardarBorrador({ ...leerBorrador(), foto: undefined });
    this.fotoLista.set(false);
    this.avisoFoto.set(null);
  }

  alternarNumero(): void {
    this.mostrandoNumero.update((visible) => !visible);
  }

  /** Escribe el número anotado en el borrador (vacío ⇒ se olvida). */
  escribirNumero(evento: Event): void {
    const valor = (evento.target as HTMLInputElement).value;
    this.numeroComprobante.set(valor);
    guardarBorrador({
      ...leerBorrador(),
      numeroComprobante: valor.trim() === '' ? undefined : valor,
    });
  }

  /** Al final de la guía: el formulario retoma el borrador (spec "al final"). */
  registrar(): void {
    void this.router.navigateByUrl('/pendientes/nuevo').catch(() => undefined);
  }

  /**
   * Ejecuta una de las dos salidas de foto. Éxito ⇒ foto en el borrador;
   * rechazo (cancelación del usuario o del plugin) ⇒ aviso no bloqueante:
   * el usuario puede probar otra salida o registrar sin foto.
   */
  private async capturar(obtener: () => Promise<Blob>): Promise<void> {
    if (this.fotoEnCurso()) return; // evita doble toque mientras procesa
    this.fotoEnCurso.set(true);
    this.avisoFoto.set(null);
    try {
      const foto = await obtener();
      guardarBorrador({ ...leerBorrador(), foto });
      this.fotoLista.set(true);
    } catch {
      this.avisoFoto.set(AVISO_FOTO);
    } finally {
      this.fotoEnCurso.set(false);
    }
  }
}
