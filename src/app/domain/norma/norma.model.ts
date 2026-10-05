export interface Norma {
  id: string;
  nombre: string; // ej. "Decreto-Ley 019 de 2012"
  articulo?: string; // ej. "Artículo 131"
  resumen: string; // ver "Criterio de lenguaje sencillo" en design.md
  urlFuente: string;
  verificadoEl: string; // "2026-10-04"
  aplicaA: Array<'ventanilla' | 'plazo' | 'queja-eps' | 'queja-supersalud' | 'red-alterna'>;
}
