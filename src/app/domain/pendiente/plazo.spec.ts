import type { Pendiente } from './pendiente.model';
import { PLAZO_HORAS, estado, textoContador, validarHoraReclamo, vencimiento } from './plazo';

/** Base mínimo para construir casos con un solo cambio. */
function pendiente(horaReclamo: string, extra: Partial<Pendiente> = {}): Pendiente {
  return {
    id: 'pen-1',
    pacienteId: 'pac-1',
    medicamentos: ['Metformina 850 mg'],
    farmacia: 'Farmacia de la esquina',
    horaReclamo,
    autorizoDomicilio: true,
    direccionEntrega: 'Calle 1 # 2-3, Cali',
    bitacora: [],
    ...extra,
  };
}

const HORA_RECLAMO = '2026-10-05T09:00:00.000Z';
const VENCIMIENTO = '2026-10-07T09:00:00.000Z';

describe('plazo', () => {
  describe('vencimiento()', () => {
    it('suma exactamente 48 horas a la hora de reclamo', () => {
      expect(vencimiento(HORA_RECLAMO).toISOString()).toBe(VENCIMIENTO);
      expect(PLAZO_HORAS).toBe(48);
    });

    it('cruza el cambio de día', () => {
      const v = vencimiento('2026-10-05T23:30:00.000Z');
      expect(v.toISOString()).toBe('2026-10-07T23:30:00.000Z');
      expect(v.getUTCDate()).toBe(7);
    });

    it('cruza el cambio de mes (y de año en diciembre)', () => {
      expect(vencimiento('2026-10-31T23:00:00.000Z').toISOString()).toBe(
        '2026-11-02T23:00:00.000Z'
      );
      expect(vencimiento('2026-12-31T08:00:00.000Z').toISOString()).toBe(
        '2027-01-02T08:00:00.000Z'
      );
    });
  });

  describe('estado() — las 5 reglas en orden', () => {
    it('regla 1: entregado a tiempo si entregadoEn <= vencimiento, si no entregado tarde', () => {
      const aTiempo = pendiente(HORA_RECLAMO, { entregadoEn: '2026-10-06T09:00:00.000Z' });
      const tarde = pendiente(HORA_RECLAMO, { entregadoEn: '2026-10-07T10:00:00.000Z' });
      // una entrega justo en el vencimiento sigue siendo a tiempo
      const justo = pendiente(HORA_RECLAMO, { entregadoEn: VENCIMIENTO });
      const ahora = new Date('2026-11-01T00:00:00.000Z');

      expect(estado(aTiempo, ahora)).toBe('entregado-a-tiempo');
      expect(estado(justo, ahora)).toBe('entregado-a-tiempo');
      expect(estado(tarde, ahora)).toBe('entregado-tarde');
    });

    it('regla 1 gana sobre las quejas: un pendiente entregado deja de estar escalado', () => {
      const p = pendiente(HORA_RECLAMO, {
        entregadoEn: VENCIMIENTO,
        quejaEps: { radicadaEn: VENCIMIENTO },
        quejaSupersalud: { radicadaEn: VENCIMIENTO },
      });

      expect(estado(p, new Date('2026-10-10T00:00:00.000Z'))).toBe('entregado-a-tiempo');
    });

    it('regla 2: queja en Supersalud manda sobre queja en EPS', () => {
      const p = pendiente(HORA_RECLAMO, {
        quejaEps: { radicadaEn: '2026-10-08T10:00:00.000Z' },
        quejaSupersalud: { radicadaEn: '2026-10-09T10:00:00.000Z' },
      });

      expect(estado(p, new Date('2026-10-10T00:00:00.000Z'))).toBe('escalado-supersalud');
    });

    it('regla 3: queja en EPS aunque aún no venza el plazo', () => {
      const p = pendiente(HORA_RECLAMO, { quejaEps: { radicadaEn: '2026-10-05T12:00:00.000Z' } });

      expect(estado(p, new Date('2026-10-06T00:00:00.000Z'))).toBe('escalado-eps');
    });

    it('regla 4: vencido cuando ahora > vencimiento, regla 5: en plazo antes', () => {
      const p = pendiente(HORA_RECLAMO);

      expect(estado(p, new Date(VENCIMIENTO))).toBe('en-plazo'); // exacto: aún no vence
      expect(estado(p, new Date('2026-10-07T09:00:00.001Z'))).toBe('vencido');
      expect(estado(p, new Date('2026-10-07T08:59:00.000Z'))).toBe('en-plazo');
    });
  });

  describe('textoContador() — las 5 ramas', () => {
    it('falta 1 h o más: "Faltan X h" con redondeo hacia abajo', () => {
      const p = pendiente(HORA_RECLAMO);

      expect(textoContador(p, new Date('2026-10-06T09:00:00.000Z'))).toBe('Faltan 24 h');
      expect(textoContador(p, new Date('2026-10-07T06:30:00.000Z'))).toBe('Faltan 2 h');
      expect(textoContador(p, new Date('2026-10-07T06:59:59.000Z'))).toBe('Faltan 2 h');
    });

    it('falta menos de 1 h: "Faltan X min"', () => {
      const p = pendiente(HORA_RECLAMO);

      expect(textoContador(p, new Date('2026-10-07T08:30:00.000Z'))).toBe('Faltan 30 min');
      expect(textoContador(p, new Date('2026-10-07T08:59:30.000Z'))).toBe('Faltan 0 min');
    });

    it('vencido hace menos de 1 h: "Vencido hace X min"', () => {
      const p = pendiente(HORA_RECLAMO);

      expect(textoContador(p, new Date('2026-10-07T09:30:00.000Z'))).toBe('Vencido hace 30 min');
      expect(textoContador(p, new Date('2026-10-07T09:59:00.000Z'))).toBe('Vencido hace 59 min');
    });

    it('vencido 1 h o más pero menos de 48 h: "Vencido hace X h"', () => {
      const p = pendiente(HORA_RECLAMO);

      expect(textoContador(p, new Date('2026-10-07T10:00:00.000Z'))).toBe('Vencido hace 1 h');
      expect(textoContador(p, new Date('2026-10-09T08:59:00.000Z'))).toBe('Vencido hace 47 h');
    });

    it('vencido 48 h o más: "Vencido hace X días" (días completos de 24 h)', () => {
      const p = pendiente(HORA_RECLAMO);

      expect(textoContador(p, new Date('2026-10-09T09:00:00.000Z'))).toBe('Vencido hace 2 días');
      expect(textoContador(p, new Date('2026-10-11T09:00:00.000Z'))).toBe('Vencido hace 4 días');
    });

    it('en el instante exacto del vencimiento sigue contando como faltante', () => {
      const p = pendiente(HORA_RECLAMO);

      expect(textoContador(p, new Date(VENCIMIENTO))).toBe('Faltan 0 min');
      expect(estado(p, new Date(VENCIMIENTO))).toBe('en-plazo'); // coherente con estado()
    });

    it('un pendiente entregado no muestra contador', () => {
      const p = pendiente(HORA_RECLAMO, { entregadoEn: VENCIMIENTO });

      expect(textoContador(p, new Date('2026-10-10T00:00:00.000Z'))).toBe('');
    });
  });

  describe('validarHoraReclamo()', () => {
    it('rechaza una hora futura', () => {
      const ahora = new Date('2026-10-05T09:00:00.000Z');

      expect(validarHoraReclamo('2026-10-05T09:00:01.000Z', ahora)).toBe('futura');
      expect(validarHoraReclamo('2026-10-06T09:00:00.000Z', ahora)).toBe('futura');
    });

    it('acepta la hora actual y cualquier hora pasada', () => {
      const ahora = new Date('2026-10-05T09:00:00.000Z');

      expect(validarHoraReclamo('2026-10-05T09:00:00.000Z', ahora)).toBe('ok');
      expect(validarHoraReclamo('2026-10-04T23:59:00.000Z', ahora)).toBe('ok');
    });
  });
});
