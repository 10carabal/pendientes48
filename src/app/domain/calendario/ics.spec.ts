import type { Pendiente } from '@domain/pendiente/pendiente.model';
import { generarIcs } from './ics';

const HORA_RECLAMO = '2026-10-05T09:00:00.000Z';

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

describe('ics', () => {
  it('pasa la verificación: DTSTART en UTC (termina en Z)', () => {
    const ics = generarIcs(pendiente(), new Date('2026-10-06T10:00:00.000Z'));

    expect(ics).toContain('DTSTART:20261007T090000Z');
    expect(ics.match(/^DTSTART:\S+Z$/m)).not.toBeNull();
  });

  it('pasa la verificación: UID idéntico en dos generaciones del mismo pendiente', () => {
    const p = pendiente();
    const uno = generarIcs(p, new Date('2026-10-06T10:00:00.000Z'));
    const dos = generarIcs(p, new Date('2026-10-09T23:59:00.000Z'));

    const uidDe = (ics: string): string => ics.match(/^UID:\S+$/m)![0];
    expect(uidDe(uno)).toBe(uidDe(dos));
    expect(uidDe(uno)).toBe('UID:pendiente-pen-1@pendientes48');
  });

  it('UID distinto para pendientes distintos', () => {
    const otro = generarIcs(pendiente({ id: 'pen-2' }));

    expect(otro).toContain('UID:pendiente-pen-2@pendientes48');
  });

  it('el DTSTAMP refleja la hora de generación pero el DTSTART no cambia', () => {
    const p = pendiente();
    const uno = generarIcs(p, new Date('2026-10-06T10:00:00.000Z'));
    const dos = generarIcs(p, new Date('2026-10-06T11:30:00.000Z'));

    expect(uno).toContain('DTSTAMP:20261006T100000Z');
    expect(dos).toContain('DTSTAMP:20261006T113000Z');
    expect(uno).toContain('DTSTART:20261007T090000Z');
    expect(dos).toContain('DTSTART:20261007T090000Z');
  });

  it('arma un VCALENDAR/VEVENT completo con VALARM a la misma hora del evento', () => {
    const ics = generarIcs(pendiente());

    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('TRIGGER:PT0S'); // alarma en el mismo instante de DTSTART
    expect(ics).toContain('ACTION:DISPLAY');
    expect(ics.match(/^DTSTART:/gm)).toHaveLength(1);
  });

  it('usa solo CRLF entre líneas y termina con uno', () => {
    const ics = generarIcs(pendiente());
    const lineas = ics.split('\r\n');

    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n');
    expect(lineas[lineas.length - 1]).toBe('');
  });

  it('escapa comas, punto y coma y saltos de línea de los textos', () => {
    const ics = generarIcs(
      pendiente({ medicamentos: ['A, 10 mg; comprimido', 'B\nsegunda línea'] })
    );

    expect(ics).toContain('A\\, 10 mg\\; comprimido');
    expect(ics).toContain('B\\nsegunda línea');
  });

  it('incluye resumen, detalle y ubicación con los datos del pendiente', () => {
    const ics = generarIcs(
      pendiente({ farmacia: 'Droguería central', medicamentos: ['Losartán 50 mg', 'Metformina'] })
    );

    expect(ics).toContain('SUMMARY:Vence el plazo de 48 horas - Droguería central');
    expect(ics).toContain('LOCATION:Droguería central');
    expect(ics).toContain('Medicamentos: Losartán 50 mg\\, Metformina.');
    expect(ics).toContain('Farmacia o dispensario: Droguería central.');
  });
});
