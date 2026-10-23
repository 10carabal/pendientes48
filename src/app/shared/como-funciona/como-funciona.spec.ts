import { TestBed } from '@angular/core/testing';
import { ComoFunciona } from './como-funciona';

/** Copy literal aprobado (memory.md · "Copy aprobado de la introducción"). */
const TITULOS = ['¿Qué es Pendientes48?', 'Qué puede hacer', 'Cómo funciona'];
const PARRAFO =
  'Pendientes48 es una aplicación que lleva el control de los medicamentos pendientes en la ' +
  'farmacia o dispensario. Cuenta 48 horas desde el reclamo y muestra al paciente el plazo que le queda.';
const PUEDE = [
  'Registrar cada pendiente con sus medicamentos, la farmacia o dispensario y la hora del reclamo',
  'Mostrar el tiempo que queda y la fecha de vencimiento',
  'Avisar al paciente cuando se acaben las 48 horas',
  'Preparar el texto y el PDF para reclamar ante la EPS o Supersalud',
  'Guardar los datos del paciente para no volver a pedirlos.',
];
const PASOS = [
  'El paciente registra su pendiente con la hora del reclamo.',
  'La aplicación descuenta las 48 horas y avisa cuando el plazo vence.',
  'Si el plazo vence sin entrega, la aplicación prepara la queja ante la EPS o Supersalud.',
];

/** Texto visible de las secciones, en orden (anti-drift entre modos). */
const copia = (raiz: ParentNode): (string | undefined)[] => {
  const nodos = raiz.querySelectorAll('.seccion-titulo, .seccion-texto, li');
  return [...nodos].map((n) => n.textContent?.trim());
};

describe('ComoFunciona', () => {
  function crear(hoja: boolean, visible = false) {
    const fixture = TestBed.createComponent(ComoFunciona);
    fixture.componentRef.setInput('hoja', hoja);
    fixture.componentRef.setInput('visible', visible);
    fixture.detectChanges();
    TestBed.flushEffects();
    return fixture;
  }

  it('se crea', () => {
    expect(TestBed.createComponent(ComoFunciona).componentInstance).toBeTruthy();
  });

  it('la hoja cerrada no muestra role="dialog"', () => {
    const el: HTMLElement = crear(true, false).nativeElement;
    expect(el.querySelector('[role="dialog"]')).toBeNull();
    expect(el.querySelector('.hoja-fondo')).toBeNull();
  });

  it('la hoja abierta es un diálogo con aria-modal y labelledby al título', () => {
    const el: HTMLElement = crear(true, true).nativeElement;

    const dialogo = el.querySelector('[role="dialog"]');
    expect(dialogo).toBeTruthy();
    expect(dialogo?.getAttribute('aria-modal')).toBe('true');

    const id = dialogo?.getAttribute('aria-labelledby');
    expect(id).toBe('como-funciona-titulo');
    expect(el.querySelector(`#${id}`)?.textContent?.trim()).toBe('¿Cómo funciona?');
  });

  it('en la hoja el copy es verbatim: h2 del título + h3 de las 3 secciones + listas de 5 y 3', () => {
    const el: HTMLElement = crear(true, true).nativeElement;

    expect([...el.querySelectorAll('h2')].map((h) => h.textContent?.trim())).toEqual([
      '¿Cómo funciona?',
    ]);
    expect([...el.querySelectorAll('h3')].map((h) => h.textContent?.trim())).toEqual(TITULOS);

    expect(el.querySelector('.seccion-texto')?.textContent?.trim()).toBe(PARRAFO);
    expect([...el.querySelectorAll('ul li')].map((li) => li.textContent?.trim())).toEqual(PUEDE);
    expect([...el.querySelectorAll('ol li')].map((li) => li.textContent?.trim())).toEqual(PASOS);
  });

  it('en línea las secciones llevan h2 (no h3 tras el h1) y no hay scrim ni diálogo', () => {
    const el: HTMLElement = crear(false).nativeElement;

    expect(el.querySelector('[role="dialog"]')).toBeNull();
    expect(el.querySelector('.hoja-fondo')).toBeNull();
    expect([...el.querySelectorAll('h2')].map((h) => h.textContent?.trim())).toEqual(TITULOS);
    expect(el.querySelector('h3')).toBeNull();
    expect([...el.querySelectorAll('ul li')].map((li) => li.textContent?.trim())).toEqual(PUEDE);
    expect([...el.querySelectorAll('ol li')].map((li) => li.textContent?.trim())).toEqual(PASOS);
  });

  it('el texto es el mismo en línea y en la hoja (una sola fuente de copy)', () => {
    const enLinea = crear(false).nativeElement;
    const enHoja = crear(true, true).nativeElement.querySelector('[role="dialog"]')!;

    expect(copia(enHoja)).toEqual(copia(enLinea));
  });

  it('el botón terciario "Cerrar" emite cerrado y no es sólido', () => {
    const fixture = crear(true, true);
    const el: HTMLElement = fixture.nativeElement;

    let emitido = 0;
    fixture.componentRef.instance.cerrado.subscribe(() => emitido++);

    const cerrar = el.querySelector<HTMLButtonElement>('.hoja-cerrar');
    expect(cerrar?.textContent?.trim()).toBe('Cerrar');
    expect(cerrar?.classList.contains('p48-boton-terciario')).toBe(true);
    cerrar?.click();

    expect(emitido).toBe(1);
  });

  it('Escape emite cerrado', () => {
    const fixture = crear(true, true);
    const el: HTMLElement = fixture.nativeElement;

    let emitido = 0;
    fixture.componentRef.instance.cerrado.subscribe(() => emitido++);

    el.querySelector<HTMLElement>('[role="dialog"]')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );

    expect(emitido).toBe(1);
  });

  it('el toque en el scrim emite cerrado; el toque dentro de la caja, no', () => {
    const fixture = crear(true, true);
    const el: HTMLElement = fixture.nativeElement;

    let emitido = 0;
    fixture.componentRef.instance.cerrado.subscribe(() => emitido++);

    // Seleccionar texto o tocar dentro de la hoja nunca la cierra.
    el.querySelector<HTMLElement>('.hoja-caja')!.click();
    expect(emitido).toBe(0);

    el.querySelector<HTMLElement>('.hoja-fondo')!.click();
    expect(emitido).toBe(1);
  });

  it('el foco entra al abrir, Tab y Shift+Tab ciclan y al cerrar vuelve al disparador', () => {
    const disparador = document.createElement('button');
    document.body.appendChild(disparador);
    disparador.focus();
    expect(document.activeElement).toBe(disparador);

    const fixture = crear(true, true);
    const el: HTMLElement = fixture.nativeElement;
    const enlace = el.querySelector<HTMLAnchorElement>('.hoja-pie a')!;
    const cerrar = el.querySelector<HTMLButtonElement>('.hoja-cerrar')!;

    expect(document.activeElement).toBe(cerrar);

    // Tab desde el último focable (Cerrar) vuelve al primero (el enlace)
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    expect(cerrar.dispatchEvent(tab)).toBe(false);
    expect(document.activeElement).toBe(enlace);

    // Shift+Tab desde el primero va al último
    const shiftTab = new KeyboardEvent('keydown', {
      key: 'Tab',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    expect(enlace.dispatchEvent(shiftTab)).toBe(false);
    expect(document.activeElement).toBe(cerrar);

    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(document.activeElement).toBe(disparador);

    disparador.remove();
  });

  it('el pie enlaza a la guía con el label exacto, el crédito exacto y sin botón principal', () => {
    const fixture = crear(true, true);
    const el: HTMLElement = fixture.nativeElement;

    const enlace = el.querySelector<HTMLAnchorElement>('.hoja-pie a')!;
    expect(enlace.getAttribute('href')).toBe('/ventanilla');
    expect(enlace.textContent?.trim()).toBe('Ver la guía: Me dejaron un pendiente');
    expect(el.querySelector('.hoja-credito')?.textContent?.trim()).toBe(
      'Pendientes48 fue desarrollada por 10carabal.',
    );
    // El crédito va a tamaño base (--p48-tam-base): sin letra pequeña.

    let guias = 0;
    fixture.componentRef.instance.abrirGuia.subscribe(() => guias++);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    enlace.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true); // navega en la app, sin recarga
    expect(guias).toBe(1);

    // Dentro de la hoja no hay un segundo botón sólido (un principal por capa)
    expect(el.querySelectorAll('.p48-boton-principal')).toHaveLength(0);
  });
});
