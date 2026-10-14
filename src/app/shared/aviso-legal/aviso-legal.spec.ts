import { TestBed } from '@angular/core/testing';
import { AVISO_NO_ASESORIA } from '@domain/norma/aviso';
import { AvisoLegal } from './aviso-legal';

describe('AvisoLegal', () => {
  function crear(modal = false) {
    const fixture = TestBed.createComponent(AvisoLegal);
    fixture.componentRef.setInput('texto', AVISO_NO_ASESORIA);
    fixture.componentRef.setInput('modal', modal);
    fixture.detectChanges();
    TestBed.flushEffects();
    return fixture;
  }

  it('se crea', () => {
    expect(TestBed.createComponent(AvisoLegal).componentInstance).toBeTruthy();
  });

  it('en modo línea muestra la línea fija con el texto y la barra de aviso', () => {
    const el: HTMLElement = crear().nativeElement;

    expect(el.querySelector('[role="dialog"]')).toBeNull();
    const linea = el.querySelector('p');
    expect(linea?.textContent?.trim()).toBe(AVISO_NO_ASESORIA);
    expect(linea?.className).toContain('p48-barra-acento--aviso');
  });

  it('en modo modal muestra el diálogo con el texto y emite al tocar "Entiendo"', () => {
    const fixture = crear(true);
    const el: HTMLElement = fixture.nativeElement;

    const dialogo = el.querySelector('[role="dialog"]');
    expect(dialogo).toBeTruthy();
    expect(dialogo?.getAttribute('aria-modal')).toBe('true');
    expect(dialogo?.getAttribute('aria-labelledby')).toBe('aviso-titulo');
    expect(dialogo?.textContent).toContain(AVISO_NO_ASESORIA);

    let emitido = false;
    fixture.componentRef.instance.entendido.subscribe(() => (emitido = true));

    const boton = el.querySelector('button');
    expect(boton?.textContent?.trim()).toBe('Entiendo');
    boton!.click();
    fixture.detectChanges();

    expect(emitido).toBe(true);
  });

  it('al abrir el modal lleva el foco al botón "Entiendo"', () => {
    const fixture = crear(true);
    expect(document.activeElement?.textContent?.trim()).toBe('Entiendo');
    expect(fixture.nativeElement.querySelector('[role="dialog"]')).toBeTruthy();
  });

  it('el foco no sale del diálogo con Tab y Escape no lo cierra', () => {
    const fixture = crear(true);
    const el: HTMLElement = fixture.nativeElement;
    const dialogo = el.querySelector<HTMLElement>('[role="dialog"]')!;
    const boton = el.querySelector<HTMLButtonElement>('button')!;
    boton.focus();

    // Tab desde el único focable: preventDefault = foco atrapado dentro del diálogo
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    expect(boton.dispatchEvent(tab)).toBe(false);
    expect(document.activeElement).toBe(boton);

    // Escape no cierra: el spec exige tocar "Entiendo"
    let emitido = false;
    fixture.componentRef.instance.entendido.subscribe(() => (emitido = true));
    dialogo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(emitido).toBe(false);
    expect(el.querySelector('[role="dialog"]')).toBeTruthy();
  });

  it('al cerrar devuelve el foco a quien lo tenía', () => {
    const disparador = document.createElement('button');
    document.body.appendChild(disparador);
    disparador.focus();

    const fixture = crear(true);
    expect(document.activeElement?.textContent?.trim()).toBe('Entiendo');

    fixture.componentRef.setInput('modal', false);
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(document.activeElement).toBe(disparador);
    disparador.remove();
  });
});
