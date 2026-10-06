import type { Norma } from '@domain/norma/norma.model';
import normasJson from '../../assets/data/normas.json';

/** Forma del archivo empaquetado `src/assets/data/normas.json`. */
interface CatalogoNormas {
  version: string;
  normas: Norma[];
}

const catalogo = normasJson as CatalogoNormas;

/** Versión del catálogo empaquetado; cambia al editar `normas.json`. */
export const VERSION_NORMAS: string = catalogo.version;

/** Todas las normas del catálogo (para el PDF: fundamento legal por paso). */
export const NORMAS: Norma[] = catalogo.normas;

/**
 * Normas marcadas como aplicables a un paso (`aplicaA` en `normas.json`):
 * 'ventanilla' | 'plazo' | 'queja-eps' | 'queja-supersalud' | 'red-alterna'.
 * Leer el catálogo desde el archivo empaquetado permite actualizar una norma
 * sin tocar componentes (spec "Catálogo de normas como datos").
 */
export function paraPaso(paso: Norma['aplicaA'][number]): Norma[] {
  return NORMAS.filter((n) => n.aplicaA.includes(paso));
}
