import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { listarPacientes } from '@data/pacientes-store';
import { guardarPendiente, leerPendiente } from '@data/pendientes-store';
import { actualizarPreferencias, leerPreferencias } from '@data/preferencias-store';
import type { Paciente } from '@domain/paciente/paciente.model';
import type { Pendiente } from '@domain/pendiente/pendiente.model';
import { validarHoraReclamo, vencimiento } from '@domain/pendiente/plazo';
import { programarAviso } from '@platform/notificaciones';
import { ayudaAvisosAplica } from '@platform/plataforma';
import { AyudaAvisos } from '@shared/ayuda-avisos/ayuda-avisos';

/** Fallo de lectura (IndexedDB no disponible), igual que en `pacientes` e `inicio`. */
const ERROR_LECTURA = 'No se pudo leer la información. Intenta de nuevo.';

/** Texto aprobado de la spec `pendientes` · "Fallo al guardar". */
const ERROR_GUARDAR = 'No se pudo guardar. Libera espacio e intenta de nuevo';

/** Campos del formulario (spec `pendientes` · "Registro de pendiente"). */
interface Campos {
  pacienteId: string;
  direccionEntrega: string;
  /** Un solo campo de texto: se parte en líneas al guardar (`medicamentos` es `string[]`). */
  medicamentos: string;
  farmacia: string;
  /** `datetime-local` en hora local (`YYYY-MM-DDTHH:MM`); al guardar pasa a ISO. */
  horaReclamo: string;
  numeroComprobante: string;
  autorizoDomicilio: 'si' | 'no';
  gestionando: boolean;
  gestionNombre: string;
  gestionTipoDocumento: Paciente['tipoDocumento'];
  gestionNumeroDocumento: string;
  gestionParentesco: string;
}

/** Todo campo de texto; el único booleano (`gestionando`) tiene su propio manejador. */
type CampoTexto = Exclude<keyof Campos, 'gestionando'>;

const REQUERIDOS: ReadonlyArray<{ campo: CampoTexto; etiqueta: string }> = [
  { campo: 'pacienteId', etiqueta: 'paciente' },
  { campo: 'direccionEntrega', etiqueta: 'dirección de entrega' },
  { campo: 'medicamentos', etiqueta: 'medicamento' },
  { campo: 'farmacia', etiqueta: 'farmacia o gestor' },
  { campo: 'horaReclamo', etiqueta: 'hora de reclamo' },
];

/** Escenario "Datos de quien gestiona incompletos": obligatorios solo con el toggle activo. */
const REQUERIDOS_GESTION: ReadonlyArray<{ campo: CampoTexto; etiqueta: string }> = [
  { campo: 'gestionNombre', etiqueta: 'nombre de quien gestiona' },
  { campo: 'gestionTipoDocumento', etiqueta: 'tipo de documento' },
  { campo: 'gestionNumeroDocumento', etiqueta: 'número de documento' },
  { campo: 'gestionParentesco', etiqueta: 'parentesco' },
];

/** El orden en que se marcan (y se enfocan) los campos al enviar con faltantes. */
const ORDEN_CAMPOS: ReadonlyArray<CampoTexto> = [
  ...REQUERIDOS.map((r) => r.campo),
  ...REQUERIDOS_GESTION.map((r) => r.campo),
];

const dosDigitos = (n: number): string => String(n).padStart(2, '0');

/** `Date` → valor de input `datetime-local` en hora local (`YYYY-MM-DDTHH:MM`). */
function aDatetimeLocal(fecha: Date): string {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}T${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
}

/**
 * Pantalla de registro y edición de pendientes (spec `pendientes` · "Registro de
 * pendiente" y "Edición y borrado del pendiente"): dirección obligatoria
 * precargada desde el perfil del paciente, hora de reclamo no futura (validación
 * pura con `validarHoraReclamo`), hora bloqueada si ya hay una queja (D7),
 * aviso si no autorizó el domicilio, datos obligatorios de quien gestiona
 * (escenarios "Gestión para un familiar" y "Datos de quien gestiona
 * incompletos") y la hoja `ayuda-avisos` la primera vez en Android.
 */
@Component({
  selector: 'app-pendiente-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, AyudaAvisos],
  templateUrl: './pendiente-form.html',
  styleUrl: './pendiente-form.scss',
})
export class PendienteForm {
  private readonly router = inject(Router);
  private readonly ruta = inject(ActivatedRoute);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly pacientes = signal<Paciente[]>([]);
  readonly cargando = signal(true);
  readonly campos = signal<Campos | null>(null);
  readonly editandoId = signal<string | null>(null);
  /** Fallo de lectura o de escritura; los fallos por campo van en `erroresCampo`. */
  readonly error = signal<string | null>(null);
  readonly erroresCampo = signal<Partial<Record<keyof Campos, string>>>({});
  readonly ayudaVisible = signal(false);

  /** Con queja registrada la hora queda bloqueada (D7; spec "Editar un pendiente"). */
  readonly horaBloqueada = computed(() => {
    const pendiente = this.pendienteOriginal();
    return (
      pendiente !== null &&
      (pendiente.quejaEps !== undefined || pendiente.quejaSupersalud !== undefined)
    );
  });

  readonly tiposDocumento: ReadonlyArray<Paciente['tipoDocumento']> = [
    'CC',
    'CE',
    'TI',
    'PA',
    'PPT',
  ];

  /** El pendiente tal cual está guardado: en edición se esparce para preservar bitácora, foto, quejas e ICS. */
  private readonly pendienteOriginal = signal<Pendiente | null>(null);

  constructor() {
    this.editandoId.set(this.ruta.snapshot.paramMap.get('id'));
    void this.cargar(); // cargar atrapa sus fallos: la promesa nunca rechaza
  }

  errorDe(campo: CampoTexto): string | null {
    return this.erroresCampo()[campo] ?? null;
  }

  actualizar(campo: CampoTexto, evento: Event): void {
    const valor = (
      evento.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    ).value;
    this.campos.update((c) => (c === null ? c : { ...c, [campo]: valor }));
    this.limpiarError(campo);
    // Escenario "Elegir un perfil existente": al elegir el paciente se
    // precarga su dirección de entrega, que el usuario puede corregir.
    if (campo === 'pacienteId') this.precargarDireccion(valor);
  }

  alternarGestion(evento: Event): void {
    const marcado = (evento.target as HTMLInputElement).checked;
    this.campos.update((c) => (c === null ? c : { ...c, gestionando: marcado }));
  }

  volver(): void {
    void this.router.navigateByUrl('/').catch(() => undefined);
  }

  async guardar(): Promise<void> {
    const campos = this.campos();
    if (campos === null) return;

    const errores: Partial<Record<keyof Campos, string>> = {};
    for (const { campo, etiqueta } of REQUERIDOS) {
      if (campos[campo].trim() === '') errores[campo] = `Falta completar: ${etiqueta}.`;
    }
    if (campos.gestionando) {
      for (const { campo, etiqueta } of REQUERIDOS_GESTION) {
        if (campos[campo].trim() === '') errores[campo] = `Falta completar: ${etiqueta}.`;
      }
    }

    const horaIso = this.horaIso(campos.horaReclamo);
    if (errores.horaReclamo === undefined && horaIso === null) {
      errores.horaReclamo = 'Falta completar: hora de reclamo.';
    } else if (horaIso !== null && validarHoraReclamo(horaIso, new Date()) === 'futura') {
      // Spec "Hora de reclamo futura": la validación la hace la función pura del dominio.
      errores.horaReclamo = 'La hora de reclamo no puede ser futura.';
    }

    if (Object.keys(errores).length > 0) {
      this.erroresCampo.set(errores);
      this.error.set(null);
      this.enfocarPrimero(errores);
      return;
    }

    this.erroresCampo.set({});
    this.error.set(null);
    if (horaIso === null) return; // no ocurre: los errores de arriba lo cubren
    await this.guardarCampos(campos, horaIso);
  }

  /** Cierra la hoja de ayuda: marca la preferencia y termina en el inicio. */
  async cerrarAyuda(): Promise<void> {
    this.ayudaVisible.set(false);
    try {
      await actualizarPreferencias({ ayudaAvisosVista: true });
    } catch {
      /* si falla, la próxima vez se vuelve a mostrar la hoja */
    }
    await this.router.navigateByUrl('/').catch(() => undefined);
  }

  private async cargar(): Promise<void> {
    try {
      this.pacientes.set(await listarPacientes());
      const id = this.editandoId();
      const pendiente = id === null ? undefined : await leerPendiente(id);
      if (id !== null && pendiente === undefined) {
        this.error.set(ERROR_LECTURA);
        return;
      }
      this.pendienteOriginal.set(pendiente ?? null);
      this.campos.set(pendiente === undefined ? this.camposNuevos() : this.camposDe(pendiente));
    } catch {
      this.error.set(ERROR_LECTURA);
    } finally {
      this.cargando.set(false);
    }
  }

  private camposNuevos(): Campos {
    return {
      pacienteId: '',
      direccionEntrega: '',
      medicamentos: '',
      farmacia: '',
      horaReclamo: aDatetimeLocal(new Date()), // spec "Hora de reclamo por defecto"
      numeroComprobante: '',
      autorizoDomicilio: 'si',
      gestionando: false,
      gestionNombre: '',
      gestionTipoDocumento: 'CC',
      gestionNumeroDocumento: '',
      gestionParentesco: '',
    };
  }

  private camposDe(pendiente: Pendiente): Campos {
    return {
      pacienteId: pendiente.pacienteId,
      direccionEntrega: pendiente.direccionEntrega,
      medicamentos: pendiente.medicamentos.join('\n'),
      farmacia: pendiente.farmacia,
      horaReclamo: aDatetimeLocal(new Date(pendiente.horaReclamo)),
      numeroComprobante: pendiente.numeroComprobante ?? '',
      autorizoDomicilio: pendiente.autorizoDomicilio ? 'si' : 'no',
      gestionando: pendiente.gestion !== undefined,
      gestionNombre: pendiente.gestion?.nombre ?? '',
      gestionTipoDocumento: pendiente.gestion?.tipoDocumento ?? 'CC',
      gestionNumeroDocumento: pendiente.gestion?.numeroDocumento ?? '',
      gestionParentesco: pendiente.gestion?.parentesco ?? '',
    };
  }

  private precargarDireccion(pacienteId: string): void {
    const paciente = this.pacientes().find((p) => p.id === pacienteId);
    if (paciente === undefined) return;
    this.campos.update((c) => (c === null ? c : { ...c, direccionEntrega: paciente.direccion }));
  }

  private limpiarError(campo: CampoTexto): void {
    if (this.erroresCampo()[campo] !== undefined) {
      this.erroresCampo.update((e) => ({ ...e, [campo]: undefined }));
    }
  }

  /** Valor del `datetime-local` en ISO, o `null` si quedó vacío o ilegible. */
  private horaIso(valor: string): string | null {
    const limpio = valor.trim();
    if (limpio === '') return null;
    const fecha = new Date(limpio);
    return Number.isNaN(fecha.getTime()) ? null : fecha.toISOString();
  }

  private enfocarPrimero(errores: Partial<Record<keyof Campos, string>>): void {
    const primero = ORDEN_CAMPOS.find((campo) => errores[campo] !== undefined);
    if (primero === undefined) return;
    this.host.nativeElement.querySelector<HTMLElement>(`#campo-${primero}`)?.focus();
  }

  private async guardarCampos(campos: Campos, horaIso: string): Promise<void> {
    const original = this.pendienteOriginal();
    const id = this.editandoId() ?? crypto.randomUUID();
    // En edición se esparce el pendiente original: bitácora, foto, quejas y
    // `icsAgregadoEn` se conservan tal cual.
    const pendiente: Pendiente = {
      ...(original ?? {}),
      id,
      pacienteId: campos.pacienteId,
      gestion: campos.gestionando
        ? {
            nombre: campos.gestionNombre.trim(),
            tipoDocumento: campos.gestionTipoDocumento,
            numeroDocumento: campos.gestionNumeroDocumento.trim(),
            parentesco: campos.gestionParentesco.trim(),
          }
        : undefined,
      medicamentos: campos.medicamentos
        .split('\n')
        .map((m) => m.trim())
        .filter((m) => m !== ''),
      farmacia: campos.farmacia.trim(),
      horaReclamo: horaIso,
      numeroComprobante: campos.numeroComprobante.trim() || undefined,
      autorizoDomicilio: campos.autorizoDomicilio === 'si',
      direccionEntrega: campos.direccionEntrega.trim(),
      bitacora: original?.bitacora ?? [
        { en: new Date().toISOString(), tipo: 'creado', texto: 'Registraste el pendiente' },
      ],
    };

    try {
      await guardarPendiente(pendiente);
    } catch (causa) {
      // Spec "Fallo al guardar": se muestra el mensaje y el formulario conserva todo.
      this.error.set(causa instanceof Error ? causa.message : ERROR_GUARDAR);
      return;
    }

    // Mismo ID ⇒ reprograma el aviso al editar; en la PWA es un no-op.
    await programarAviso({ id, vencimiento: vencimiento(horaIso).toISOString() }).catch(
      () => undefined,
    );

    // "Primera ayuda de avisos en Android" (design.md · "Avisos"): solo en el
    // primer registro, y la navegación termina al cerrar la hoja (marcando la
    // preferencia). La pantalla pregunta a `platform/` vía `ayudaAvisosAplica()`:
    // las pantallas nunca llaman `isNative()` directo (design.md · "Avisos").
    if (this.editandoId() === null && ayudaAvisosAplica() && !(await this.ayudaYaVista())) {
      this.ayudaVisible.set(true);
      return;
    }
    await this.router.navigateByUrl('/').catch(() => undefined);
  }

  /** Sin preferencia legible se asume no vista: la ayuda nunca se salta en silencio. */
  private async ayudaYaVista(): Promise<boolean> {
    return leerPreferencias()
      .then((p) => p.ayudaAvisosVista)
      .catch(() => false);
  }
}
