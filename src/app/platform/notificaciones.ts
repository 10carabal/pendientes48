import { LocalNotifications, type ScheduleOptions } from '@capacitor/local-notifications';
import { isNative } from './plataforma';

/**
 * Avisos de vencimiento (`design.md` · "Avisos"): en Android se programa una
 * notificación local a la hora de vencimiento con un ID numérico derivado del
 * ID del pendiente; se cancela al entregar o borrar, se reprograma al editar
 * la hora y, al iniciar la app, se reprograman los pendientes abiertos.
 * En la PWA todo es un no-op: allí el aviso depende del `.ics` (D1).
 */
export interface AvisoVencimiento {
  /** ID del pendiente. */
  id: string;
  /** Hora de vencimiento en ISO; la calcula quien llama (platform no usa la lógica de domain). */
  vencimiento: string;
}

/** 'no-aplica' en la PWA (allí no hay notificaciones locales, solo calendario). */
export type PermisoAvisos = 'concedido' | 'denegado' | 'no-aplica';

const TITULO = 'Ya pasaron las 48 horas';
const CUERPO = 'Su medicamento sigue pendiente. Ya puede presentar la queja.';

/** ID numérico estable derivado del ID del pendiente (32 bits, rango de Android). */
function idNumerico(pendienteId: string): number {
  let h = 0;
  for (let i = 0; i < pendienteId.length; i++) {
    h = (Math.imul(h, 31) + pendienteId.charCodeAt(i)) | 0;
  }
  return h === -2147483648 ? 0 : Math.abs(h);
}

/**
 * La notificación a programar, o `null` si el vencimiento ya pasó (nunca se
 * reprograma un aviso vencido: eso dispararía una ráfaga al abrir la app; el
 * estado "Vencido" ya lo muestra el pendiente).
 */
function notificacionDe(aviso: AvisoVencimiento): ScheduleOptions['notifications'][number] | null {
  const cuando = new Date(aviso.vencimiento).getTime();
  if (!Number.isFinite(cuando) || cuando <= Date.now()) {
    return null;
  }
  return {
    id: idNumerico(aviso.id),
    title: TITULO,
    body: CUERPO,
    schedule: { at: new Date(cuando), allowWhileIdle: true },
    extra: { pendienteId: aviso.id },
    autoCancel: true,
  };
}

/**
 * Programa (o reprograma, con el mismo ID) el aviso al vencimiento. Si el
 * vencimiento ya pasó, cancela el aviso anterior y no programa nada.
 */
export async function programarAviso(aviso: AvisoVencimiento): Promise<void> {
  if (!isNative()) return;
  await LocalNotifications.cancel({ notifications: [{ id: idNumerico(aviso.id) }] });
  const notificacion = notificacionDe(aviso);
  if (notificacion === null) return;
  await LocalNotifications.schedule({ notifications: [notificacion] });
}

/** Cancela el aviso de un pendiente (entregado o borrado); no falla si no había. */
export async function cancelarAviso(pendienteId: string): Promise<void> {
  if (!isNative()) return;
  await LocalNotifications.cancel({ notifications: [{ id: idNumerico(pendienteId) }] });
}

/**
 * "Reprogramación al abrir la app": cancela los avisos de estos pendientes y
 * programa solo los que aún no vencieron.
 */
export async function reprogramarAvisos(avisos: AvisoVencimiento[]): Promise<void> {
  if (!isNative() || avisos.length === 0) return;
  await LocalNotifications.cancel({
    notifications: avisos.map((a) => ({ id: idNumerico(a.id) })),
  });
  const notificaciones = avisos
    .map(notificacionDe)
    .filter((n): n is ScheduleOptions['notifications'][number] => n !== null);
  if (notificaciones.length > 0) {
    await LocalNotifications.schedule({ notifications: notificaciones });
  }
}

/** Consulta el permiso de notificaciones; solo se pregunta en Android. */
export async function permisoAvisos(): Promise<PermisoAvisos> {
  if (!isNative()) return 'no-aplica';
  const estado = await LocalNotifications.checkPermissions();
  return estado.display === 'granted' ? 'concedido' : 'denegado';
}

/** Pide el permiso (botón "Activar notificaciones"); solo en Android. */
export async function solicitarPermisoAvisos(): Promise<PermisoAvisos> {
  if (!isNative()) return 'no-aplica';
  const estado = await LocalNotifications.requestPermissions();
  return estado.display === 'granted' ? 'concedido' : 'denegado';
}

export interface AvisoPendiente {
  id: number;
  programadoPara?: string; // ISO
}

/**
 * El puente de Android devuelve las fechas del plugin en formato
 * `Date.toString()` ("Tue Oct 06 17:43:26 GMT-05:00 2026"); se normalizan a ISO.
 */
function aIso(valor: unknown): string | undefined {
  if (valor instanceof Date) return valor.toISOString();
  if (typeof valor === 'string') {
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? valor : fecha.toISOString();
  }
  return undefined;
}

/** Consulta los avisos programados, p. ej. tras cerrar y abrir la app. */
export async function avisosPendientes(): Promise<AvisoPendiente[]> {
  if (!isNative()) return [];
  const { notifications } = await LocalNotifications.getPending();
  return notifications.map((n) => ({ id: n.id, programadoPara: aIso(n.schedule?.at) }));
}
