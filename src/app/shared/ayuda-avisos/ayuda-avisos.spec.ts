import { TestBed } from '@angular/core/testing';
import { AyudaAvisos } from './ayuda-avisos';

describe('AyudaAvisos', () => {
  function crear(visible = true) {
    const fixture = TestBed.createComponent(AyudaAvisos);
    fixture.componentRef.setInput('visible', visible);
    fixture.detectChanges();
    TestBed.flushEffects();
    return fixture;
  }

  it('se crea', () => {
    expect(TestBed.createComponent(AyudaAvisos).componentInstance).toBeTruthy();
  });

  it('sin activar no muestra nada', () => {
    const el: HTMLElement = crear(false).nativeElement;
    expect(el.querySelector('[role="dialog"]')).toBeNull();
  });

  it('muestra la hoja con el título, el enlace a dontkillmyapp y cierra al tocar "Entendido"', () => {
    const fixture = crear();
    const el: HTMLElement = fixture.nativeElement;

    const dialogo = el.querySelector('[role="dialog"]');
    expect(dialogo).toBeTruthy();
    expect(dialogo?.textContent).toContain('¿Cómo asegurar que te llegue el aviso?');

    const enlace = el.querySelector('a');
    expect(enlace?.getAttribute('href')).toBe('https://dontkillmyapp.com/');
    expect(enlace?.getAttribute('target')).toBe('_blank');

    let emitido = false;
    fixture.componentRef.instance.cerrado.subscribe(() => (emitido = true));

    const boton = el.querySelector('button');
    expect(boton?.textContent?.trim()).toBe('Entendido');
    boton!.click();
    fixture.detectChanges();

    expect(emitido).toBe(true);
  });

  it('al abrir lleva el foco al botón "Entendido"', () => {
    const fixture = crear();
    expect(document.activeElement?.textContent?.trim()).toBe('Entendido');
  });

  it('Tab y Shift+Tab ciclan dentro de la hoja', () => {
    const fixture = crear();
    const el: HTMLElement = fixture.nativeElement;
    const enlace = el.querySelector<HTMLAnchorElement>('a')!;
    const boton = el.querySelector<HTMLButtonElement>('button')!;

    boton.focus();

    // Tab desde el último focable vuelve al primero (el enlace)
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    expect(boton.dispatchEvent(tab)).toBe(false);
    expect(document.activeElement).toBe(enlace);

    // Shift+Tab desde el primero va al último (el botón)
    const shiftTab = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    expect(enlace.dispatchEvent(shiftTab)).toBe(false);
    expect(document.activeElement).toBe(boton);
  });

  it('Escape cierra la hoja', () => {
    const fixture = crear();
    const el: HTMLElement = fixture.nativeElement;
    const dialogo = el.querySelector<HTMLElement>('[role="dialog"]')!;

    let emitido = false;
    fixture.componentRef.instance.cerrado.subscribe(() => (emitido = true));
    dialogo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(emitido).toBe(true);
  });
});
