import type { EventoGuardado, EventoVista, Pendiente, Queja, TipoEventoGuardado } from './pendiente.model';
import { vencimiento } from './plazo';

/** Texto del evento automático de una queja, con radicado si lo tiene. */
function textoQueja(paso: 'eps' | 'supersalud', q: Queja): string {
  const etiqueta = paso === 'eps' ? 'Queja ante la EPS' : 'Queja ante la Supersalud';
  return q.radicado ? `${etiqueta} (radicado n.° ${q.radicado})` : etiqueta;
}

/**
 * Bitácora para pantalla y PDF (D9): los eventos guardados más el evento
 * derivado "Venció el plazo", que se inserta a la hora de vencimiento cuando
 * el plazo ya pasó y el pendiente no se entregó antes de vencer.
 * El resultado queda ordenado por fecha.
 */
export function bitacoraVista(p: Pendiente, ahora: Date): EventoVista[] {
  const ven = vencimiento(p.horaReclamo);
  const eventos: EventoVista[] = [...p.bitacora];

  const entregoAntes = p.entregadoEn !== undefined && Date.parse(p.entregadoEn) <= ven.getTime();
  if (ahora.getTime() > ven.getTime() && !entregoAntes) {
    eventos.push({
      en: ven.toISOString(),
      tipo: 'vencido',
      texto: 'Venció el plazo de 48 horas',
    });
  }

  return eventos.sort((a, b) => Date.parse(a.en) - Date.parse(b.en));
}

/**
 * Registra (o vuelve a registrar) la queja de un paso: reemplaza la queja y,
 * si el evento de ese tipo ya existe, actualiza su fecha y radicado en lugar
 * de agregar otro. Devuelve un pendiente nuevo (función pura).
 */
export function registrarQueja(
  p: Pendiente,
  paso: 'eps' | 'supersalud',
  q: Queja
): Pendiente {
  const tipo: TipoEventoGuardado = paso === 'eps' ? 'queja-eps' : 'queja-supersalud';
  const texto = textoQueja(paso, q);
  const conQueja: Pendiente =
    paso === 'eps' ? { ...p, quejaEps: q } : { ...p, quejaSupersalud: q };

  const yaExiste = conQueja.bitacora.some((e) => e.tipo === tipo);
  const bitacora: EventoGuardado[] = yaExiste
    ? conQueja.bitacora.map((e) => (e.tipo === tipo ? { ...e, en: q.radicadaEn, texto } : e))
    : [...conQueja.bitacora, { en: q.radicadaEn, tipo, texto }];

  return { ...conQueja, bitacora };
}
