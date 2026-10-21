import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Pendiente } from '@domain/pendiente/pendiente.model';
import { Contador } from './contador';
import { fechaLegible } from './fechas';

/** Hace cuánto (en horas) ocurrió algo, en ISO. */
const hace = (horas: number): string => new Date(Date.now() - horas * 3_600_000).toISOString();

function pendiente(sobrescribe: Partial<Pendiente> = {}): Pendiente {
  return {
    id: 'p1',
    pacienteId: 'px',
    medicamentos: ['Losartán 50 mg', 'Metformina 850 mg'],
    farmacia: 'Droguería La 12',
    horaReclamo: hace(46.5), // vence en 1 h 30 min
    autorizoDomicilio: true,
    direccionEntrega: 'Calle 1 # 2-3',
    bitacora: [],
    ...sobrescribe,
  };
}

function crear(p: Pendiente, ahora = new Date()): ComponentFixture<Contador> {
  const fixture = TestBed.createComponent(Contador);
  fixture.componentRef.setInput('pendiente', p);
  fixture.componentRef.setInput('ahora', ahora);
  fixture.detectChanges();
  return fixture;
}

describe('Contador', () => {
  it('muestra medicamentos, farmacia, el contador con horas y minutos y el chip "En plazo"', () => {
    const p = pendiente();
    // `ahora` se deriva de la hora de reclamo: quedan 1 h 30 min exactos y el
    // string no depende de cuántos ms tarde el test en renderizar.
    const fixture = crear(p, new Date(Date.parse(p.horaReclamo) + 46.5 * 3_600_000));
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Losartán 50 mg, Metformina 850 mg');
    expect(el.textContent).toContain('Droguería La 12');
    expect(el.textContent).toContain('Faltan 1 h 30 min');
    expect(el.textContent).toContain('En plazo');
    // El color siempre va con la etiqueta (D14).
    expect(el.querySelector('.p48-etiqueta-estado--en-plazo')).toBeTruthy();
  });

  it('con menos de una hora muestra el contador en minutos', () => {
    // `ahora` y la hora de reclamo salen del mismo instante: el contador no
    // depende de cuántos ms tarde el test en renderizar.
    const ahora = new Date();
    const horaReclamo = new Date(ahora.getTime() - 47.9 * 3_600_000).toISOString();
    const el = crear(pendiente({ horaReclamo }), ahora).nativeElement as HTMLElement;

    expect(el.textContent).toContain('Faltan 6 min');
    expect(el.textContent).toContain('En plazo');
  });

  it('vencido muestra "Vencido hace X h Y min" con la etiqueta "Vencido"', () => {
    const ahora = new Date();
    const horaReclamo = new Date(ahora.getTime() - 49.1 * 3_600_000).toISOString();
    const el = crear(pendiente({ horaReclamo }), ahora).nativeElement as HTMLElement;

    expect(el.textContent).toContain('Vencido hace 1 h 6 min');
    expect(el.textContent).toContain('Vencido');
    expect(el.querySelector('.p48-etiqueta-estado--vencido')).toBeTruthy();
  });

  it('un pendiente entregado no muestra contador: su estado ya lo dice (D9)', () => {
    const el = crear(pendiente({ entregadoEn: hace(20) })).nativeElement as HTMLElement;

    expect(el.textContent).not.toContain('Faltan');
    expect(el.textContent).not.toContain('Vencido hace');
    expect(el.textContent).toContain('Entregado a tiempo');
  });

  it('muestra las fechas de reclamo y de vencimiento, y se recalcula con el reloj', () => {
    const p = pendiente();
    const fixture = crear(p, new Date(Date.parse(p.horaReclamo)));
    const el: HTMLElement = fixture.nativeElement;

    const vence = new Date(Date.parse(p.horaReclamo) + 48 * 3_600_000);
    expect(el.textContent).toContain(`Reclamaste el ${fechaLegible(p.horaReclamo)}`);
    expect(el.textContent).toContain(`Vence el ${fechaLegible(vence.toISOString())}`);
    expect(el.textContent).toContain('Faltan 48 h'); // a la hora exacta del reclamo

    // Un minuto después la pantalla refresca con su señal `ahora`.
    fixture.componentRef.setInput('ahora', new Date(Date.parse(p.horaReclamo) + 60_000));
    fixture.detectChanges();

    expect(el.textContent).toContain('Faltan 47 h 59 min');
  });
});
