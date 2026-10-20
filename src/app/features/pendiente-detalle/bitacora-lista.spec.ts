import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Pendiente } from '@domain/pendiente/pendiente.model';
import { BitacoraLista } from './bitacora-lista';
import { fechaHoraLegible } from './fechas';

/** Hace cuánto (en horas) ocurrió algo, en ISO. */
const hace = (horas: number): string => new Date(Date.now() - horas * 3_600_000).toISOString();

function pendiente(sobrescribe: Partial<Pendiente> = {}): Pendiente {
  return {
    id: 'p1',
    pacienteId: 'px',
    medicamentos: ['Losartán 50 mg'],
    farmacia: 'Droguería La 12',
    horaReclamo: hace(49), // vencido hace 1 h
    autorizoDomicilio: true,
    direccionEntrega: 'Calle 1 # 2-3',
    bitacora: [
      { en: hace(49), tipo: 'creado', texto: 'Registraste el pendiente' },
      { en: hace(2), tipo: 'nota', texto: 'Llamé a la línea, dijeron que mañana' },
    ],
    ...sobrescribe,
  };
}

function crear(p: Pendiente): ComponentFixture<BitacoraLista> {
  const fixture = TestBed.createComponent(BitacoraLista);
  fixture.componentRef.setInput('pendiente', p);
  fixture.componentRef.setInput('ahora', new Date());
  fixture.detectChanges();
  return fixture;
}

function boton(el: HTMLElement, texto: string): HTMLButtonElement {
  const b = [...el.querySelectorAll('button')].find((x) => x.textContent?.trim() === texto);
  expect(b, `botón "${texto}"`).toBeTruthy();
  return b as HTMLButtonElement;
}

describe('BitacoraLista', () => {
  it('lista los eventos en orden ascendente con su fecha y hora', () => {
    // En plazo no hay evento derivado: solo los dos guardados.
    const p = pendiente({ horaReclamo: hace(46.5) });
    const el = crear(p).nativeElement as HTMLElement;

    const eventos = [...el.querySelectorAll('.bitacora-evento')];
    expect(eventos).toHaveLength(2);
    expect(eventos[0].textContent).toContain(fechaHoraLegible(p.bitacora[0].en));
    expect(eventos[0].textContent).toContain('Registraste el pendiente');
    expect(eventos[1].textContent).toContain('Llamé a la línea, dijeron que mañana');
    // Ascendente: el evento más viejo va primero.
    const texto = el.textContent ?? '';
    expect(texto.indexOf('Registraste el pendiente')).toBeLessThan(
      texto.indexOf('Llamé a la línea'),
    );
  });

  it('muestra el evento derivado "Venció el plazo" con la barra de alerta', () => {
    const p = pendiente();
    const el = crear(p).nativeElement as HTMLElement;

    const alerta = el.querySelector('.p48-barra-acento--alerta');
    expect(alerta?.textContent).toContain('Venció el plazo de 48 horas');
    expect(alerta?.classList.contains('p48-barra-acento')).toBe(true);
    // El evento lleva la hora del vencimiento, no la de ahora.
    const vencimiento = new Date(Date.parse(p.horaReclamo) + 48 * 3_600_000);
    expect(alerta?.textContent).toContain(fechaHoraLegible(vencimiento.toISOString()));
  });

  it('no muestra "Venció el plazo" si el pendiente se entregó antes de vencer', () => {
    const el = crear(pendiente({ entregadoEn: hace(47) })).nativeElement as HTMLElement;

    expect(el.textContent).not.toContain('Venció el plazo');
    expect(el.querySelector('.p48-barra-acento--alerta')).toBeNull();
  });

  it('al guardar emite el texto recortado y conserva el campo hasta la confirmación', () => {
    // El campo lo vacía la pantalla recién cuando el guardado sale bien (M2, QA 3.5).
    const fixture = crear(pendiente({ bitacora: [] }));
    const el: HTMLElement = fixture.nativeElement;
    const emitidas: string[] = [];
    fixture.componentInstance.notaPedida.subscribe((t) => emitidas.push(t));

    const campo = el.querySelector('input') as HTMLInputElement;
    campo.value = '  Hablé con la farmacia  ';
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    boton(el, 'Guardar nota').click();
    fixture.detectChanges();

    expect(emitidas).toEqual(['Hablé con la farmacia']);
    expect(campo.value).toBe('  Hablé con la farmacia  '); // aún sin confirmación se conserva

    fixture.componentRef.setInput('nota', ''); // la pantalla lo vacía tras persistir
    fixture.detectChanges();
    expect(campo.value).toBe('');
  });

  it('no deja guardar una nota vacía', () => {
    const fixture = crear(pendiente({ bitacora: [] }));
    const el: HTMLElement = fixture.nativeElement;
    const emitidas: string[] = [];
    fixture.componentInstance.notaPedida.subscribe((t) => emitidas.push(t));

    expect(boton(el, 'Guardar nota').disabled).toBe(true);
    fixture.componentInstance.enviar();
    expect(emitidas).toHaveLength(0);
  });

  it('anuncia "Nota guardada" en una región viva siempre presente', () => {
    const fixture = crear(pendiente({ bitacora: [] }));
    const el: HTMLElement = fixture.nativeElement;

    const aviso = el.querySelector('[role="status"]');
    expect(aviso).toBeTruthy(); // el nodo existe antes que su texto (hallazgo menor 2)
    expect(aviso?.textContent?.trim()).toBe('');

    fixture.componentRef.setInput('notaGuardada', true);
    fixture.detectChanges();

    expect(el.querySelector('[role="status"]')?.textContent?.trim()).toBe('Nota guardada');
  });
});
