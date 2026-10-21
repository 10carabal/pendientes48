import type { EstadoPendiente, Pendiente } from './pendiente.model';

/** El plazo cuenta desde la hora de reclamo: 48 horas corridas (D7). */
export const PLAZO_HORAS = 48;

const HORA_MS = 60 * 60 * 1000;
const MINUTO_MS = 60 * 1000;
const DIA_MS = 24 * HORA_MS;

/** Hora de reclamo + 48 horas corridas. */
export function vencimiento(horaReclamo: string): Date {
  return new Date(Date.parse(horaReclamo) + PLAZO_HORAS * HORA_MS);
}

/**
 * Estado derivado; se calcula al consultar, nunca se guarda (D9).
 * Reglas en orden (design.md): entrega, queja Supersalud, queja EPS, vencido, en plazo.
 */
export function estado(p: Pendiente, ahora: Date): EstadoPendiente {
  const ven = vencimiento(p.horaReclamo).getTime();
  if (p.entregadoEn !== undefined) {
    return Date.parse(p.entregadoEn) <= ven ? 'entregado-a-tiempo' : 'entregado-tarde';
  }
  if (p.quejaSupersalud !== undefined) return 'escalado-supersalud';
  if (p.quejaEps !== undefined) return 'escalado-eps';
  if (ahora.getTime() > ven) return 'vencido';
  return 'en-plazo';
}

/** "2 h" o "2 h 30 min": piso en las dos unidades; sin minutos cuando son 0. */
function horasConMinutos(ms: number): string {
  const h = Math.floor(ms / HORA_MS);
  const min = Math.floor((ms % HORA_MS) / MINUTO_MS);
  return min > 0 ? `${h} h ${min} min` : `${h} h`;
}

/**
 * Texto del contador. Solo aplica a pendientes sin entregar: un pendiente
 * cerrado no muestra contador en pantalla, así que devuelve ''.
 * En el instante exacto del vencimiento sigue "en plazo" (estado() usa `>`),
 * por eso los 0 restantes se cuentan como faltantes.
 *
 * Con 1 h o más se escriben las dos unidades, con piso en cada una: si los
 * minutos restantes son 0 se omiten (`Faltan 2 h`, `Vencido hace 1 h`); si no,
 * van juntos (`Faltan 2 h 30 min`, `Vencido hace 1 h 5 min`). La rama de menos
 * de 1 h y la de vencido con días (48 h o más) no llevan minutos.
 */
export function textoContador(p: Pendiente, ahora: Date): string {
  if (p.entregadoEn !== undefined) return '';

  const resta = vencimiento(p.horaReclamo).getTime() - ahora.getTime();
  if (resta >= 0) {
    if (resta >= HORA_MS) return `Faltan ${horasConMinutos(resta)}`;
    return `Faltan ${Math.floor(resta / MINUTO_MS)} min`;
  }

  const vencido = -resta;
  if (vencido >= PLAZO_HORAS * HORA_MS) return `Vencido hace ${Math.floor(vencido / DIA_MS)} días`;
  if (vencido >= HORA_MS) return `Vencido hace ${horasConMinutos(vencido)}`;
  return `Vencido hace ${Math.floor(vencido / MINUTO_MS)} min`;
}

/** La hora de reclamo nunca puede ser futura; validación pura testeable. */
export function validarHoraReclamo(hora: string, ahora: Date): 'ok' | 'futura' {
  return Date.parse(hora) > ahora.getTime() ? 'futura' : 'ok';
}
