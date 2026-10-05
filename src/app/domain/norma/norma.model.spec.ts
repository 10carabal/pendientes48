import type { Norma } from './norma.model';

describe('norma.model', () => {
  it('acepta una Norma con los 5 pasos en aplicaA', () => {
    const norma: Norma = {
      id: 'norma-ejemplo',
      nombre: 'Norma de prueba',
      articulo: 'Artículo de prueba',
      resumen: 'Resumen de ejemplo para el test, no es contenido legal.',
      urlFuente: 'https://example.com/norma',
      verificadoEl: '2026-10-05',
      aplicaA: ['ventanilla', 'plazo', 'queja-eps', 'queja-supersalud', 'red-alterna'],
    };

    expect(norma.aplicaA).toHaveLength(5);
    expect(norma.aplicaA).toContain('plazo');
  });

  it('acepta una Norma sin artículo y con un solo paso', () => {
    const norma: Norma = {
      id: 'norma-minima',
      nombre: 'Norma mínima de prueba',
      resumen: 'Otro resumen de ejemplo.',
      urlFuente: 'https://example.com/otra',
      verificadoEl: '2026-10-05',
      aplicaA: ['ventanilla'],
    };

    expect(norma.articulo).toBeUndefined();
    expect(norma.aplicaA).toEqual(['ventanilla']);
  });

  describe('unhappy path (lo valida tsc, no el runtime)', () => {
    it('el compilador rechaza un paso en aplicaA que no existe', () => {
      const invalida: Norma = {
        id: 'norma-x',
        nombre: 'Norma de prueba',
        resumen: 'Resumen de ejemplo.',
        urlFuente: 'https://example.com/norma',
        verificadoEl: '2026-10-05',
        // @ts-expect-error 'tutela' no es un paso válido de aplicaA
        aplicaA: ['tutela'],
      };

      expect(invalida.aplicaA).toEqual(['tutela']); // en runtime TS no valida nada
    });

    it('el compilador rechaza una Norma sin campos obligatorios', () => {
      // @ts-expect-error faltan resumen, urlFuente, verificadoEl y aplicaA
      const incompleta: Norma = { id: 'norma-vacia', nombre: 'Norma de prueba' };

      expect(incompleta.id).toBe('norma-vacia');
      expect(incompleta.resumen).toBeUndefined(); // en runtime TS no valida nada
    });
  });
});
