import { TestBed } from '@angular/core/testing';
import { SalidaApp } from './salida-app';

/** Mismo patrón que `como-funciona.spec.ts`: setInput + flushEffects. */
function crear(visible = false) {
  const fixture = TestBed.createComponent(SalidaApp);
  fixture.componentRef.setInput('visible', visible);
  fixture.detectChanges();
  TestBed.flushEffects();
  return fixture;
}

function boton(el: HTMLElement, texto: string): HTMLButtonElement {
  const b = [...el.querySelectorAll('button')].find((x) => x.textContent?.trim() === texto);
  expect(b, `botón "${texto}"`).toBeTruthy();
  return b as HTMLButtonElement;
}

describe('SalidaApp', () => {
  it('cerrado no muestra role="dialog"', () => {
    const el: HTMLElement = crear(false).nativeElement;
    expect(el.querySelector('[role="dialog"]')).toBeNull();
    expect(el.querySelector('.salida-fondo')).toBeNull();
  });

  it('abierto es un diálogo con aria-modal y labelledby al título', () => {
    const el: HTMLElement = crear(true).nativeElement;

    const dialogo = el.querySelector('[role="dialog"]');
    expect(dialogo).toBeTruthy();
    expect(dialogo?.getAttribute('aria-modal')).toBe('true');

    const id = dialogo?.getAttribute('aria-labelledby');
    expect(id).toBe('salida-titulo');
    expect(el.querySelector(`#${id}`)?.textContent?.trim()).toBe('¿Salir de la app?');
  });

  it('"Salir" es principal sólido y "Cancelar" secundario (un sólido por capa)', () => {
    const el: HTMLElement = crear(true).nativeElement;

    const salir = boton(el, 'Salir');
    expect(salir.classList.contains('p48-boton-principal')).toBe(true);
    expect(salir.classList.contains('p48-boton-secundario')).toBe(false);

    const cancelar = boton(el, 'Cancelar');
    expect(cancelar.classList.contains('p48-boton-secundario')).toBe(true);
    expect(cancelar.classList.contains('p48-boton-principal')).toBe(false);
  });

  it('"Salir" emite salir y "Cancelar" emite cancelar', () => {
    const fixture = crear(true);
    const el: HTMLElement = fixture.nativeElement;

    let salidos = 0;
    let cancelados = 0;
    fixture.componentRef.instance.salir.subscribe(() => salidos++);
    fixture.componentRef.instance.cancelar.subscribe(() => cancelados++);

    boton(el, 'Salir').click();
    expect(salidos).toBe(1);
    expect(cancelados).toBe(0);

    boton(el, 'Cancelar').click();
    expect(cancelados).toBe(1);
    expect(salidos).toBe(1);
  });

  it('Escape emite cancelar (cancelar es la salida segura)', () => {
    const fixture = crear(true);
    const el: HTMLElement = fixture.nativeElement;

    let cancelados = 0;
    fixture.componentRef.instance.cancelar.subscribe(() => cancelados++);

    el
      .querySelector<HTMLElement>('[role="dialog"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(cancelados).toBe(1);
  });

  it('el toque en el scrim emite cancelar; dentro de la caja, no', () => {
    const fixture = crear(true);
    const el: HTMLElement = fixture.nativeElement;

    let cancelados = 0;
    fixture.componentRef.instance.cancelar.subscribe(() => cancelados++);

    // Seleccionar texto o tocar dentro de la caja nunca la cierra.
    el.querySelector<HTMLElement>('.salida-caja')!.click();
    expect(cancelados).toBe(0);

    el.querySelector<HTMLElement>('.salida-fondo')!.click();
    expect(cancelados).toBe(1);
  });

  it('el foco entra a "Salir", Tab y Shift+Tab ciclan y al cerrar vuelve al disparador', () => {
    const disparador = document.createElement('button');
    document.body.appendChild(disparador);
    disparador.focus();
    expect(document.activeElement).toBe(disparador);

    const fixture = crear(true);
    const el: HTMLElement = fixture.nativeElement;
    const salir = boton(el, 'Salir');
    const cancelar = boton(el, 'Cancelar');

    expect(document.activeElement).toBe(salir);

    // Tab desde el último focable (Cancelar) vuelve al primero (Salir)
    cancelar.focus();
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    expect(cancelar.dispatchEvent(tab)).toBe(false);
    expect(document.activeElement).toBe(salir);

    // Shift+Tab desde el primero va al último
    const shiftTab = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    expect(salir.dispatchEvent(shiftTab)).toBe(false);
    expect(document.activeElement).toBe(cancelar);

    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(document.activeElement).toBe(disparador);

    disparador.remove();
  });
});
