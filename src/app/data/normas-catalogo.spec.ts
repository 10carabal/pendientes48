import type { Norma } from '@domain/norma/norma.model';
import { NORMAS, VERSION_NORMAS, paraPaso } from './normas-catalogo';

const SIGLAS_PERMITIDAS = ['EPS'];
/** Última verificación manual de las fuentes (tarea 1.5); obliga a refrescarla. */
const VERIFICACION_MINIMA = '2026-10-04';

const PASOS: Array<Norma['aplicaA'][number]> = [
  'ventanilla',
  'plazo',
  'queja-eps',
  'queja-supersalud',
  'red-alterna',
];

function oraciones(texto: string): string[] {
  return texto.split(/(?<=[.!?])\s+/).filter((o) => o.length > 0);
}

describe('normas-catalogo', () => {
  describe('criterio de lenguaje sencillo (spec normas)', () => {
    it('cada resumen tiene como máximo 2 oraciones y 45 palabras', () => {
      for (const n of NORMAS) {
        expect(oraciones(n.resumen).length, n.id).toBeLessThanOrEqual(2);
        const palabras = n.resumen.split(/\s+/).filter((p) => p.length > 0);
        expect(palabras.length, n.id).toBeLessThanOrEqual(45);
      }
    });

    it('cada resumen se dirige al usuario como "usted"', () => {
      for (const n of NORMAS) {
        expect(n.resumen, n.id).toContain('usted');
      }
    });

    it('ningún resumen usa siglas salvo "EPS"', () => {
      for (const n of NORMAS) {
        const siglas = n.resumen.match(/\b[A-ZÁÉÍÓÚÑ]{2,}\b/g) ?? [];
        for (const sigla of siglas) {
          expect(SIGLAS_PERMITIDAS, `${n.id}: ${sigla}`).toContain(sigla);
        }
      }
    });
  });

  describe('datos del catálogo', () => {
    it('las fechas verificadoEl tienen formato AAAA-MM-DD y están actualizadas', () => {
      for (const n of NORMAS) {
        expect(n.verificadoEl, n.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        // comparación lexicográfica válida para fechas ISO; si una norma se
        // queda vieja, este test obliga a reverificar la fuente y actualizarla
        expect(n.verificadoEl >= VERIFICACION_MINIMA, n.id).toBe(true);
      }
    });

    it('cada urlFuente es https y los id son únicos', () => {
      for (const n of NORMAS) {
        expect(n.urlFuente, n.id).toMatch(/^https:\/\/\S+$/);
      }
      expect(new Set(NORMAS.map((n) => n.id)).size).toBe(NORMAS.length);
    });

    it('la versión del catálogo tiene formato AAAA.MM.DD', () => {
      expect(VERSION_NORMAS).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
    });

    it('toda norma aplica al menos a un paso', () => {
      for (const n of NORMAS) {
        expect(n.aplicaA.length, n.id).toBeGreaterThan(0);
      }
    });
  });

  describe('paraPaso()', () => {
    it('solo devuelve normas cuyo aplicaA contiene el paso', () => {
      for (const paso of PASOS) {
        const lista = paraPaso(paso);
        expect(lista.length, paso).toBeGreaterThan(0);
        for (const n of lista) {
          expect(n.aplicaA, `${n.id} → ${paso}`).toContain(paso);
        }
      }
    });

    it('refleja el reparto real del archivo (casos de la spec)', () => {
      // "Fundamento legal en documentos": el paso 1 usa aplicaA "queja-eps"
      expect(paraPaso('queja-eps').map((n) => n.id)).toContain('dl-019-2012-art131');
      expect(paraPaso('queja-eps').map((n) => n.id)).toContain('res-1604-2013');
      expect(paraPaso('ventanilla').map((n) => n.id)).toContain('dl-019-2012-art131');
      expect(paraPaso('red-alterna').map((n) => n.id)).toContain('ce-017-2026');
      expect(paraPaso('plazo').map((n) => n.id)).toContain('res-1604-2013');
    });

    it('cada norma aparece en al menos un paso', () => {
      const vistas = new Set(PASOS.flatMap((paso) => paraPaso(paso).map((n) => n.id)));
      for (const n of NORMAS) {
        expect(vistas.has(n.id), n.id).toBe(true);
      }
    });
  });
});
