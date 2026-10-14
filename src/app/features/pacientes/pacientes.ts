import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { Router } from '@angular/router';
import { borrarTodo } from '@data/app-db';
import { encontrarPorDocumento, guardarPaciente, listarPacientes } from '@data/pacientes-store';
import type { Paciente } from '@domain/paciente/paciente.model';
import { cancelarTodos } from '@platform/notificaciones';
import { atraparFoco } from '@shared/foco-dialogo';

/** Campos del formulario de perfil (spec `pendientes` · "Perfil de paciente"). */
interface Campos {
  nombre: string;
  tipoDocumento: Paciente['tipoDocumento'];
  numeroDocumento: string;
  eps: string;
  telefono: string;
  correo: string;
  direccion: string;
}

const VACIOS: Campos = {
  nombre: '',
  tipoDocumento: 'CC',
  numeroDocumento: '',
  eps: '',
  telefono: '',
  correo: '',
  direccion: '',
};

const REQUERIDOS: ReadonlyArray<{ campo: keyof Campos; etiqueta: string }> = [
  { campo: 'nombre', etiqueta: 'nombre' },
  { campo: 'numeroDocumento', etiqueta: 'número de documento' },
  { campo: 'eps', etiqueta: 'EPS' },
  { campo: 'telefono', etiqueta: 'teléfono' },
  { campo: 'direccion', etiqueta: 'dirección' },
];

const mensajeDe = (causa: unknown): string =>
  causa instanceof Error ? causa.message : 'Ocurrió un error inesperado';

/** Fallo de lectura (IndexedDB no disponible); `ErrorDeEscritura` cubre las escrituras. */
const ERROR_LECTURA = 'No se pudo leer la información. Intenta de nuevo.';

/**
 * Pantalla de perfiles de paciente (spec `pendientes` · "Perfil de paciente"):
 * crear, editar, aviso de duplicado ("Usar el perfil existente") y
 * "Borrar todos mis datos" con doble confirmación, que además cancela todos
 * los avisos programados (`platform/notificaciones.cancelarTodos`) y vacía el
 * almacén, devolviendo la app a su primera apertura (D10: sin pantalla de
 * Ajustes; la acción vive al final de esta pantalla).
 */
@Component({
  selector: 'app-pacientes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
  templateUrl: './pacientes.html',
  styleUrl: './pacientes.scss',
})
export class Pacientes {
  private readonly router = inject(Router);

  readonly pacientes = signal<Paciente[]>([]);
  readonly cargando = signal(true);
  /** Formulario abierto (null = se ve la lista). */
  readonly campos = signal<Campos | null>(null);
  readonly editandoId = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly aviso = signal<string | null>(null);
  /** Perfil existente en conflicto (escenario "Perfil duplicado"). */
  readonly duplicado = signal<Paciente | null>(null);
  /** "Borrar todos mis datos": doble confirmación (1 = primera, 2 = última). */
  readonly confirmacion = signal<0 | 1 | 2>(0);

  readonly atraparFoco = atraparFoco;
  readonly tiposDocumento: ReadonlyArray<Paciente['tipoDocumento']> = ['CC', 'CE', 'TI', 'PA', 'PPT'];

  private readonly botonUsarExistente = viewChild<ElementRef<HTMLButtonElement>>('botonUsarExistente');
  private readonly botonBorrarTodo = viewChild<ElementRef<HTMLButtonElement>>('botonBorrarTodo');
  private elementoPrevio: HTMLElement | null = null;

  constructor() {
    effect(() => {
      if (this.duplicado() !== null) {
        this.enfocarDialogo(this.botonUsarExistente());
      } else if (this.confirmacion() !== 0) {
        this.enfocarDialogo(this.botonBorrarTodo());
      } else if (this.elementoPrevio !== null) {
        this.elementoPrevio.focus();
        this.elementoPrevio = null;
      }
    });
    void this.recargar(); // recargar atrapa sus fallos: la promesa nunca rechaza
  }

  private async recargar(): Promise<void> {
    try {
      this.pacientes.set(await listarPacientes());
    } catch {
      this.error.set(ERROR_LECTURA);
    } finally {
      this.cargando.set(false);
    }
  }

  nuevo(): void {
    this.campos.set({ ...VACIOS });
    this.editandoId.set(null);
    this.error.set(null);
    this.aviso.set(null);
  }

  editar(paciente: Paciente): void {
    this.campos.set({
      nombre: paciente.nombre,
      tipoDocumento: paciente.tipoDocumento,
      numeroDocumento: paciente.numeroDocumento,
      eps: paciente.eps,
      telefono: paciente.telefono,
      correo: paciente.correo ?? '',
      direccion: paciente.direccion,
    });
    this.editandoId.set(paciente.id);
    this.error.set(null);
    this.aviso.set(null);
  }

  cancelarFormulario(): void {
    this.campos.set(null);
    this.error.set(null);
  }

  actualizar(campo: keyof Campos, evento: Event): void {
    const valor = (evento.target as HTMLInputElement | HTMLSelectElement).value;
    this.campos.update((c) => (c === null ? c : { ...c, [campo]: valor }));
  }

  async guardar(): Promise<void> {
    const campos = this.campos();
    if (campos === null) return;

    const faltantes = REQUERIDOS.filter((r) => campos[r.campo].trim() === '').map((r) => r.etiqueta);
    if (faltantes.length > 0) {
      this.error.set(`Falta completar: ${faltantes.join(', ')}`);
      return;
    }

    // Escenario "Perfil duplicado": mismo tipo y número de documento.
    let existente: Paciente | undefined;
    try {
      existente = await encontrarPorDocumento(
        campos.tipoDocumento,
        campos.numeroDocumento,
        this.editandoId() ?? undefined,
      );
    } catch {
      this.error.set(ERROR_LECTURA);
      return;
    }
    if (existente !== undefined) {
      this.duplicado.set(existente);
      return;
    }

    await this.guardarCampos();
  }

  /** "Usar el perfil existente": carga ese perfil en el formulario para editarlo. */
  async usarExistente(): Promise<void> {
    const existente = this.duplicado();
    this.duplicado.set(null);
    if (existente !== null) this.editar(existente);
  }

  private async guardarCampos(): Promise<void> {
    const campos = this.campos();
    if (campos === null) return;
    const id = this.editandoId() ?? crypto.randomUUID();
    // recorta como al comparar en la detección de duplicados, para no
    // almacenar espacios de más
    const limpio = {
      nombre: campos.nombre.trim(),
      tipoDocumento: campos.tipoDocumento,
      numeroDocumento: campos.numeroDocumento.trim(),
      eps: campos.eps.trim(),
      telefono: campos.telefono.trim(),
      direccion: campos.direccion.trim(),
    };
    try {
      await guardarPaciente({ id, ...limpio, correo: campos.correo.trim() || undefined });
    } catch (causa) {
      this.error.set(mensajeDe(causa));
      return;
    }
    await this.recargar();
    this.campos.set(null);
    this.aviso.set('Guardado');
  }

  pedirBorrado(): void {
    this.error.set(null);
    this.confirmacion.set(1);
  }

  cancelarBorrado(): void {
    this.confirmacion.set(0);
  }

  async borrarTodos(): Promise<void> {
    // Primero los avisos y luego los datos: nunca quedan avisos huérfanos.
    try {
      await cancelarTodos();
      await borrarTodo();
    } catch (causa) {
      this.confirmacion.set(0);
      this.error.set(mensajeDe(causa));
      return;
    }
    this.confirmacion.set(0);
    this.pacientes.set([]);
    // los datos ya quedaron borrados: aunque la navegación falle, el listado queda vacío
    await this.router.navigateByUrl('/').catch(() => undefined);
  }

  private enfocarDialogo(boton: ElementRef<HTMLButtonElement> | undefined): void {
    if (this.elementoPrevio === null) {
      this.elementoPrevio = document.activeElement as HTMLElement | null;
    }
    boton?.nativeElement.focus();
  }
}
