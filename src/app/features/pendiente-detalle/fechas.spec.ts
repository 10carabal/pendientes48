import { aFechaInput, deFechaInput, esFechaPasada, fechaHoraLegible, fechaLegible } from './fechas';

describe('fechas de la pantalla de detalle', () => {
  it('fechaLegible convierte ISO a dd/mm/aaaa en la hora local', () => {
    expect(fechaLegible(new Date(2026, 9, 7, 15, 20).toISOString())).toBe('07/10/2026');
    expect(fechaLegible('no-es-fecha')).toBe('');
  });

  it('fechaHoraLegible agrega la hora en dos dígitos (la bitácora la usa en el PDF)', () => {
    const local = new Date(2026, 9, 20, 9, 15); // 20/10/2026 09:15 local
    expect(fechaHoraLegible(local.toISOString())).toBe('20/10/2026 09:15');
    expect(fechaHoraLegible('no-es-fecha')).toBe('');
  });

  it('aFechaInput y deFechaInput se deshacen entre sí (día local)', () => {
    expect(aFechaInput(new Date(2026, 9, 20))).toBe('2026-10-20');
    expect(deFechaInput('2026-10-20')).toBe(new Date(2026, 9, 20).toISOString());
  });

  describe('esFechaPasada() (queja fuera de temporada, tarea 3.6)', () => {
    const hoy = new Date(2026, 9, 25, 10, 0);

    it('la fecha de hoy no es futura', () => {
      expect(esFechaPasada(new Date(2026, 9, 25, 23, 30).toISOString(), hoy)).toBe(true);
    });

    it('una fecha anterior es de esta temporada', () => {
      expect(esFechaPasada(new Date(2026, 9, 20, 8, 0).toISOString(), hoy)).toBe(true);
    });

    it('una fecha futura queda fuera de temporada (mismo día de la semana siguiente no cuenta)', () => {
      expect(esFechaPasada(new Date(2026, 9, 26, 0, 1).toISOString(), hoy)).toBe(false);
    });

    it('una fecha ilegible no bloquea con excepción', () => {
      expect(esFechaPasada('no-es-fecha', hoy)).toBe(false);
    });
  });
});
