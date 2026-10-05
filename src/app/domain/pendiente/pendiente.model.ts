import type { Paciente } from '@domain/paciente/paciente.model';

export interface Pendiente {
  id: string;
  pacienteId: string;
  gestion?: Gestion; // si alguien gestiona por el paciente
  medicamentos: string[];
  farmacia: string; // farmacia o gestor farmacéutico
  horaReclamo: string; // ISO; inicia el plazo; nunca futura
  numeroComprobante?: string;
  fotoComprobanteKey?: string; // clave del Blob en IndexedDB
  autorizoDomicilio: boolean;
  direccionEntrega: string; // siempre obligatoria
  entregadoEn?: string; // ISO
  quejaEps?: Queja; // una sola; registrarla de nuevo la reemplaza
  quejaSupersalud?: Queja; // una sola; registrarla de nuevo la reemplaza
  icsAgregadoEn?: string; // ISO; para el aviso "Ya agregaste este recordatorio"
  bitacora: EventoGuardado[];
}

export interface Queja {
  radicadaEn: string; // ISO
  radicado?: string;
}

export interface Gestion {
  // todos los campos son obligatorios cuando existe
  nombre: string;
  tipoDocumento: Paciente['tipoDocumento'];
  numeroDocumento: string;
  parentesco: string; // "hijo", "hija", "cuidador", etc.
}

/** Eventos que SÍ se guardan en IndexedDB. */
export type TipoEventoGuardado =
  | 'creado'
  | 'queja-eps'
  | 'queja-supersalud'
  | 'entregado'
  | 'nota';

export interface EventoGuardado {
  en: string; // ISO
  tipo: TipoEventoGuardado;
  texto: string;
}

/**
 * Solo para pantalla y PDF. 'vencido' NUNCA se guarda: lo inserta bitacoraVista()
 * a la hora de vencimiento (ver "Bitácora derivada").
 */
export type TipoEventoVista = TipoEventoGuardado | 'vencido';

export interface EventoVista {
  en: string;
  tipo: TipoEventoVista;
  texto: string;
}

/** Estado derivado (Signals). Se calcula, nunca se guarda (D9). */
export type EstadoPendiente =
  | 'en-plazo'
  | 'vencido'
  | 'escalado-eps'
  | 'escalado-supersalud'
  | 'entregado-a-tiempo'
  | 'entregado-tarde';
