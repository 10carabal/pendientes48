import type { EventoGuardado, Pendiente } from './pendiente.model';
import { bitacoraVista, registrarQueja } from './bitacora';

const HORA_RECLAMO = '2026-10-05T09:00:00.000Z';
const VENCIMIENTO = '2026-10-07T09:00:00.000Z';

function pendiente(extra: Partial<Pendiente> = {}): Pendiente {
  return {
    id: 'pen-1',
    pacienteId: 'pac-1',
    medicamentos: ['Metformina 850 mg'],
    farmacia: 'Farmacia de la esquina',
    horaReclamo: HORA_RECLAMO,
    autorizoDomicilio: true,
    direccionEntrega: 'Calle 1 # 2-3, Cali',
    bitacora: [],
    ...extra,
  };
}

function evento(en: string, texto: string): EventoGuardado {
  return { en, tipo: 'creado', texto };
}

describe('bitacora', () => {
  describe('bitacoraVista()', () => {
    it('sin vencimiento: devuelve solo los eventos guardados', () => {
      const p = pendiente({ bitacora: [evento(HORA_RECLAMO, 'Pendiente registrado')] });

      const vista = bitacoraVista(p, new Date('2026-10-06T00:00:00.000Z'));

      expect(vista).toHaveLength(1);
      expect(vista.some((e) => e.tipo === 'vencido')).toBe(false);
    });

    it('vencido sin entrega: inserta el evento a la hora exacta del vencimiento', () => {
      const p = pendiente({ bitacora: [evento(HORA_RECLAMO, 'Pendiente registrado')] });

      const vista = bitacoraVista(p, new Date('2026-10-08T00:00:00.000Z'));

      expect(vista).toHaveLength(2);
      expect(vista[1]).toEqual({
        en: VENCIMIENTO,
        tipo: 'vencido',
        texto: 'Venció el plazo de 48 horas',
      });
    });

    it('con entrega previa al vencimiento: no inserta el evento vencido', () => {
      const p = pendiente({
        entregadoEn: '2026-10-06T15:00:00.000Z',
        bitacora: [evento(HORA_RECLAMO, 'Pendiente registrado')],
      });

      const vista = bitacoraVista(p, new Date('2026-10-20T00:00:00.000Z'));

      expect(vista.some((e) => e.tipo === 'vencido')).toBe(false);
      expect(vista).toHaveLength(1);
    });

    it('entrega después de vencer: el vencimiento sí ocurrió y se inserta', () => {
      const p = pendiente({
        entregadoEn: '2026-10-09T12:00:00.000Z',
        bitacora: [evento(HORA_RECLAMO, 'Pendiente registrado')],
      });

      const vista = bitacoraVista(p, new Date('2026-10-20T00:00:00.000Z'));

      expect(vista.map((e) => e.tipo)).toEqual(['creado', 'vencido']);
    });

    it('devuelve todo ordenado por fecha, con el vencido en su lugar', () => {
      const p = pendiente({
        bitacora: [
          { en: '2026-10-08T10:00:00.000Z', tipo: 'queja-eps', texto: 'Queja ante la EPS' },
          evento(HORA_RECLAMO, 'Pendiente registrado'),
          { en: '2026-10-06T08:00:00.000Z', tipo: 'nota', texto: 'Nota: llamé a la línea' },
        ],
      });

      const vista = bitacoraVista(p, new Date('2026-10-10T00:00:00.000Z'));

      expect(vista.map((e) => e.en)).toEqual([
        HORA_RECLAMO,
        '2026-10-06T08:00:00.000Z',
        VENCIMIENTO,
        '2026-10-08T10:00:00.000Z',
      ]);
      expect(vista.map((e) => e.tipo)).toEqual(['creado', 'nota', 'vencido', 'queja-eps']);
    });

    it('en el instante exacto del vencimiento aún no aparece el evento', () => {
      const vista = bitacoraVista(pendiente(), new Date(VENCIMIENTO));

      expect(vista.some((e) => e.tipo === 'vencido')).toBe(false);
    });
  });

  describe('registrarQueja()', () => {
    it('primera queja: guarda la queja y agrega el evento con su fecha y radicado', () => {
      const p = pendiente();
      const q = { radicadaEn: '2026-10-08T10:00:00.000Z', radicado: 'RAD-001' };

      const conQueja = registrarQueja(p, 'eps', q);

      expect(conQueja.quejaEps).toEqual(q);
      expect(conQueja.bitacora).toHaveLength(1);
      expect(conQueja.bitacora[0]).toEqual({
        en: '2026-10-08T10:00:00.000Z',
        tipo: 'queja-eps',
        texto: 'Queja ante la EPS (radicado n.° RAD-001)',
      });
      expect(p.quejaEps).toBeUndefined(); // pura: no muta el original
      expect(p.bitacora).toHaveLength(0);
    });

    it('registrada dos veces: reemplaza fecha y radicado sin duplicar el evento', () => {
      const p = pendiente();
      const primera = registrarQueja(p, 'eps', {
        radicadaEn: '2026-10-08T10:00:00.000Z',
        radicado: 'RAD-001',
      });
      const segunda = registrarQueja(primera, 'eps', {
        radicadaEn: '2026-10-09T15:30:00.000Z',
        radicado: 'RAD-999',
      });

      expect(segunda.bitacora).toHaveLength(1);
      expect(segunda.bitacora[0].en).toBe('2026-10-09T15:30:00.000Z');
      expect(segunda.bitacora[0].texto).toBe('Queja ante la EPS (radicado n.° RAD-999)');
      expect(segunda.quejaEps?.radicado).toBe('RAD-999');
      expect(primera.bitacora[0].texto).toContain('RAD-001'); // la primera quedó intacta
    });

    it('los dos pasos conviven como eventos distintos', () => {
      let p = registrarQueja(pendiente(), 'eps', {
        radicadaEn: '2026-10-08T10:00:00.000Z',
      });
      p = registrarQueja(p, 'supersalud', {
        radicadaEn: '2026-10-10T09:00:00.000Z',
        radicado: 'SUP-01',
      });

      expect(p.bitacora).toHaveLength(2);
      expect(p.quejaEps).toBeDefined();
      expect(p.quejaSupersalud?.radicado).toBe('SUP-01');
      expect(p.bitacora.map((e) => e.tipo)).toEqual(['queja-eps', 'queja-supersalud']);
      expect(p.bitacora[1].texto).toBe('Queja ante la Supersalud (radicado n.° SUP-01)');
    });

    it('sin radicado: el evento queda solo con la etiqueta', () => {
      const p = registrarQueja(pendiente(), 'eps', { radicadaEn: '2026-10-08T10:00:00.000Z' });

      expect(p.bitacora[0].texto).toBe('Queja ante la EPS');
    });
  });
});
