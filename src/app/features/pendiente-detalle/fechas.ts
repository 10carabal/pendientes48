/**
 * Fechas legibles de la pantalla de detalle (solo presentación; el cálculo del
 * plazo vive en `domain/pendiente/plazo.ts`). Duplica el criterio dd/mm/aaaa de
 * `shared/norma-card` ("Verificado el 04/10/2026"), aquí en local para no
 * acoplar componentes de features con `shared/`.
 */

const dosDigitos = (n: number): string => String(n).padStart(2, '0');

/** ISO → '07/10/2026' (dd/mm/aaaa, en la hora local del dispositivo). */
export function fechaLegible(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return `${dosDigitos(fecha.getDate())}/${dosDigitos(fecha.getMonth() + 1)}/${fecha.getFullYear()}`;
}

/** ISO → '07/10/2026 09:00' (fecha y hora local: la bitácora registra ambas). */
export function fechaHoraLegible(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '';
  return `${fechaLegible(iso)} ${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
}

/** `Date` → '2026-10-07' para los inputs `type="date"` (hora local). */
export function aFechaInput(fecha: Date): string {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

/** '2026-10-07' (input `type="date"`) → ISO de esa fecha a medianoche local. */
export function deFechaInput(valor: string): string {
  return new Date(`${valor}T00:00:00`).toISOString();
}

/**
 * true si la fecha de `iso` ya pasó o es la de hoy (comparación por día local).
 * Sirve para saber si la queja registrada es de esta temporada: una queja con
 * fecha futura todavía no se puede generar (tarea 3.6). Las fechas en formato
 * ISO de `aFechaInput()` se comparan como texto porque comparten el orden
 * cronológico.
 */
export function esFechaPasada(iso: string, ahora: Date): boolean {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return false;
  return aFechaInput(fecha) <= aFechaInput(ahora);
}
