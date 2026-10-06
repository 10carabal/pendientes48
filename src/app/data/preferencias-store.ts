import { guardar, leer } from './app-db';

/** Clave única `preferencias` en IndexedDB (design · "Modelo de datos"). */
const CLAVE = 'preferencias';

export interface Preferencias {
  avisoLegalAceptado: boolean;
  ayudaAvisosVista: boolean;
}

export const PREFERENCIAS_POR_DEFECTO: Preferencias = {
  avisoLegalAceptado: false,
  ayudaAvisosVista: false,
};

/** Las preferencias guardadas, o las de por defecto si todavía no hay nada. */
export async function leerPreferencias(): Promise<Preferencias> {
  return (await leer<Preferencias>(CLAVE)) ?? { ...PREFERENCIAS_POR_DEFECTO };
}

export async function guardarPreferencias(preferencias: Preferencias): Promise<void> {
  await guardar(CLAVE, preferencias);
}

/** Aplica cambios parciales sin tocar el resto (p. ej. aceptar el aviso legal). */
export async function actualizarPreferencias(
  cambios: Partial<Preferencias>,
): Promise<Preferencias> {
  const actuales = await leerPreferencias();
  const nuevas: Preferencias = { ...actuales, ...cambios };
  await guardarPreferencias(nuevas);
  return nuevas;
}
