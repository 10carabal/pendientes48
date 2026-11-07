import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { provideRouter, Router } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular';
import { App as PluginApp } from '@capacitor/app';
import { App } from './app';

/** Rutas dummy para poder estar "fuera de la raíz" en los tests de retroceso. */
@Component({ standalone: true, template: '' })
class PantallaVacia {}

/** Mismo patrón de mocks de paquete que `camara.spec.ts` (solo paquetes). */
const core = vi.hoisted(() => ({ Capacitor: { isNativePlatform: vi.fn(() => true) } }));
const capApp = vi.hoisted(() => ({ App: { exitApp: vi.fn(() => Promise.resolve()) } }));

vi.mock('@capacitor/core', () => core);
vi.mock('@capacitor/app', () => capApp);

/** Sin zone.js: las promesas mockeadas se asientan con vueltas de microtareas. */
async function asentar(turnos = 20): Promise<void> {
  for (let i = 0; i < turnos; i++) {
    await Promise.resolve();
  }
}

/**
 * jsdom no modela el stack de historia (siempre 1): para ejercitar la rama de
 * `location.back()` se fija el largo de la historia, igual que en las specs de
 * `boton-volver` y `retroceder`.
 */
function forzarHistorial(largo: number): void {
  Object.defineProperty(window.history, 'length', { configurable: true, value: largo });
}

/**
 * Dispara el retroceso del sistema como lo hace `ion-app` de Ionic: colecta
 * los handlers con `register(prioridad, cb)` y luego corre los registrados de
 * mayor a menor prioridad; un handler que no llama al siguiente corta la
 * cadena. Devuelve el mock de `register` y cuántos handlers pasaron la bola
 * (`siguientes`: la raíz siempre la corta, nunca llama `processNextHandler`).
 */
function presionarAtras(): { registro: ReturnType<typeof vi.fn>; siguientes: number } {
  const registrados: Array<{ prioridad: number; handler: (siguiente: () => void) => void }> = [];
  const registro = vi.fn((prioridad: number, handler: (siguiente: () => void) => void) => {
    registrados.push({ prioridad, handler });
  });
  document.dispatchEvent(new CustomEvent('ionBackButton', { detail: { register: registro } }));

  let siguientes = 0;
  const correrDesde = (indice: number): void => {
    const actual = [...registrados].sort((a, b) => b.prioridad - a.prioridad)[indice];
    if (!actual) return;
    try {
      actual.handler(() => {
        siguientes++;
        correrDesde(indice + 1);
      });
    } catch {
      // El despachador real de Ionic también atrapa errores handler por handler.
    }
  };
  correrDesde(0);
  return { registro, siguientes };
}

function crear(): ComponentFixture<App> {
  const fixture = TestBed.createComponent(App);
  fixture.detectChanges();
  TestBed.flushEffects();
  return fixture;
}

function boton(el: HTMLElement, texto: string): HTMLButtonElement {
  const b = [...el.querySelectorAll('button')].find((x) => x.textContent?.trim() === texto);
  expect(b, `botón "${texto}"`).toBeTruthy();
  return b as HTMLButtonElement;
}

function dialogo(el: HTMLElement): HTMLElement | null {
  return el.querySelector('[role="dialog"]');
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    core.Capacitor.isNativePlatform.mockReturnValue(true);
    // La URL de jsdom persiste entre tests: cada uno arranca en la raíz.
    window.history.replaceState({}, '', '/');
  });

  afterEach(() => {
    delete (window.history as unknown as Record<string, unknown>)['length'];
    vi.restoreAllMocks();
  });

  function configurar() {
    return TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([
          { path: '', component: PantallaVacia },
          { path: 'pacientes', component: PantallaVacia },
        ]),
        provideIonicAngular({}),
      ],
    });
  }

  it('should create the app', async () => {
    await configurar().compileComponents();
    expect(TestBed.createComponent(App).componentInstance).toBeTruthy();
  });

  it('en la raíz el retroceso abre el diálogo "¿Salir de la app?" sin ceder el manejo', async () => {
    await configurar().compileComponents();
    const fixture = crear();
    const el: HTMLElement = fixture.nativeElement;

    const { registro, siguientes } = presionarAtras();
    // Ionic registra varios handlers en el mismo evento (overlays, menú,
    // plataforma); el de la raíz es el que entra con prioridad 50.
    expect(registro.mock.calls.some(([prioridad]) => prioridad === 50)).toBe(true);
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.salidaAbierta()).toBe(true);
    expect(dialogo(el)?.textContent).toContain('¿Salir de la app?');
    expect(siguientes).toBe(0); // nunca processNextHandler
  });

  it('el retroceso en una pantalla que no es la raíz retrocede dentro de la app', async () => {
    await configurar().compileComponents();
    const fixture = crear();
    const el: HTMLElement = fixture.nativeElement;
    await TestBed.inject(Router).navigateByUrl('/pacientes');
    expect(TestBed.inject(Router).url).toBe('/pacientes'); // la navegación sí pegó
    forzarHistorial(2); // en un navegador real navegar apila historia
    const atras = vi.spyOn(TestBed.inject(Location), 'back').mockImplementation(() => undefined);

    const { siguientes } = presionarAtras();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(atras).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.salidaAbierta()).toBe(false);
    expect(dialogo(el)).toBeNull();
    expect(siguientes).toBe(0);
  });

  it('con el diálogo abierto, el retroceso lo cierra en lugar de navegar', async () => {
    await configurar().compileComponents();
    const fixture = crear();
    const el: HTMLElement = fixture.nativeElement;
    const atras = vi.spyOn(TestBed.inject(Location), 'back').mockImplementation(() => undefined);

    presionarAtras();
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(fixture.componentInstance.salidaAbierta()).toBe(true);

    presionarAtras();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(fixture.componentInstance.salidaAbierta()).toBe(false);
    expect(dialogo(el)).toBeNull();
    expect(atras).not.toHaveBeenCalled();
  });

  it('el diálogo tiene "Salir" sólido y "Cancelar" secundario', async () => {
    await configurar().compileComponents();
    const fixture = crear();
    const el: HTMLElement = fixture.nativeElement;

    presionarAtras();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(boton(el, 'Salir').classList.contains('p48-boton-principal')).toBe(true);
    expect(boton(el, 'Cancelar').classList.contains('p48-boton-secundario')).toBe(true);
    expect(el.querySelectorAll('.p48-boton-principal')).toHaveLength(1); // un sólido por capa
  });

  it('"Salir" cierra la app en la APK con App.exitApp()', async () => {
    await configurar().compileComponents();
    const fixture = crear();
    const el: HTMLElement = fixture.nativeElement;

    presionarAtras();
    fixture.detectChanges();
    TestBed.flushEffects();

    boton(el, 'Salir').click();
    await asentar();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(PluginApp.exitApp).toHaveBeenCalledTimes(1);
    // La Activity termina: no se cierra el diálogo ni se repinta nada.
    expect(fixture.componentInstance.salidaAbierta()).toBe(true);
  });

  it('en la PWA "Salir" no puede cerrar la pestaña: cierra el diálogo y se queda en la raíz', async () => {
    core.Capacitor.isNativePlatform.mockReturnValue(false);
    await configurar().compileComponents();
    const fixture = crear();
    const el: HTMLElement = fixture.nativeElement;
    const cerrar = vi.spyOn(window, 'close').mockImplementation(() => undefined);

    presionarAtras();
    fixture.detectChanges();
    TestBed.flushEffects();

    boton(el, 'Salir').click();
    await asentar();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(cerrar).toHaveBeenCalledTimes(1);
    expect(PluginApp.exitApp).not.toHaveBeenCalled();
    expect(fixture.componentInstance.salidaAbierta()).toBe(false);
  });

  it('"Cancelar" solo cierra el diálogo (no sale de la app)', async () => {
    await configurar().compileComponents();
    const fixture = crear();
    const el: HTMLElement = fixture.nativeElement;

    presionarAtras();
    fixture.detectChanges();
    TestBed.flushEffects();

    boton(el, 'Cancelar').click();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(PluginApp.exitApp).not.toHaveBeenCalled();
    expect(fixture.componentInstance.salidaAbierta()).toBe(false);
    expect(dialogo(el)).toBeNull();
  });
});
