import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ErrorDeEscritura } from '@data/app-db';
import type { Paciente } from '@domain/paciente/paciente.model';
import { clear, set } from 'idb-keyval';
import { Pacientes } from './pacientes';

/** Almacén falso en memoria: mismo patrón que `app-db.spec.ts`. */
const memoria = vi.hoisted(() => new Map<string, unknown>());

const capacitor = vi.hoisted(() => ({
  Capacitor: { isNativePlatform: vi.fn(() => true) },
}));

const cap = vi.hoisted(() => ({
  cancel: vi.fn((_opciones: { notifications: Array<{ id: number }> }) => Promise.resolve()),
  getPending: vi.fn(() => Promise.resolve({ notifications: [] as Array<{ id: number }> })),
  schedule: vi.fn(() => Promise.resolve({ notifications: [] as Array<{ id: number }> })),
}));

vi.mock('idb-keyval', () => ({
  createStore: vi.fn(() => () => Promise.resolve(undefined)),
  get: vi.fn((clave: string) => Promise.resolve(memoria.get(clave))),
  set: vi.fn((clave: string, valor: unknown) => {
    memoria.set(clave, valor);
    return Promise.resolve();
  }),
  del: vi.fn((clave: string) => {
    memoria.delete(clave);
    return Promise.resolve();
  }),
  keys: vi.fn(() => Promise.resolve([...memoria.keys()])),
  clear: vi.fn(() => {
    memoria.clear();
    return Promise.resolve();
  }),
}));
vi.mock('@capacitor/core', () => capacitor);
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: cap }));

const perfil: Paciente = {
  id: 'px',
  nombre: 'Ana Pérez',
  tipoDocumento: 'CC',
  numeroDocumento: '123',
  eps: 'Salud Total',
  telefono: '3001234567',
  correo: 'ana@ejemplo.com',
  direccion: 'Calle 1 # 2-3',
};

/**
 * El entorno de pruebas corre sin zone.js (no hay `fakeAsync`/`tick`): estas
 * cadenas de promesas mockeadas ya resueltas se asientan con vueltas de
 * microtareas, suficientes para las rutas async de la pantalla.
 */
async function asentar(turnos = 20): Promise<void> {
  for (let i = 0; i < turnos; i++) {
    await Promise.resolve();
  }
}

async function crear(): Promise<ComponentFixture<Pacientes>> {
  const fixture = TestBed.createComponent(Pacientes);
  fixture.detectChanges();
  await asentar(); // la carga inicial del listado
  fixture.detectChanges();
  TestBed.flushEffects();
  return fixture;
}

function boton(el: HTMLElement, texto: string): HTMLButtonElement {
  const b = [...el.querySelectorAll('button')].find((x) => x.textContent?.trim() === texto);
  expect(b, `botón "${texto}"`).toBeTruthy();
  return b as HTMLButtonElement;
}

function escribir(el: HTMLElement, etiqueta: string, valor: string): void {
  const etiquetaEl = [...el.querySelectorAll('label')].find((l) =>
    l.textContent?.includes(etiqueta),
  );
  const campo = etiquetaEl?.querySelector('input, select, textarea') as
    | HTMLInputElement
    | HTMLSelectElement
    | HTMLTextAreaElement
    | null;
  expect(campo, `campo "${etiqueta}"`).toBeTruthy();
  campo!.value = valor;
  campo!.dispatchEvent(new Event('input', { bubbles: true }));
}

function llenarRequeridos(el: HTMLElement): void {
  escribir(el, 'Nombre completo', 'Ana Pérez');
  escribir(el, 'Número de documento', '123');
  escribir(el, 'EPS', 'Salud Total');
  escribir(el, 'Teléfono', '3001234567');
  escribir(el, 'Correo', 'ana@ejemplo.com');
  escribir(el, 'Dirección', 'Calle 1 # 2-3');
}

describe('Pacientes', () => {
  beforeEach(() => {
    memoria.clear();
    vi.clearAllMocks();
    capacitor.Capacitor.isNativePlatform.mockReturnValue(true);
  });

  it('sin perfiles explica qué hacer y ofrece crear el primero', async () => {
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.textContent).toContain('Aún no tiene perfiles');
    expect(boton(el, 'Crear perfil')).toBeTruthy();
    expect(boton(el, 'Borrar todos mis datos')).toBeTruthy();
  });

  it('crea un perfil y lo guarda en el almacén', async () => {
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    boton(el, 'Crear perfil').click();
    fixture.detectChanges();
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Nuevo perfil');

    llenarRequeridos(el);
    boton(el, 'Guardar').click();
    await asentar();
    fixture.detectChanges();

    const claves = [...memoria.keys()].filter((c) => c.startsWith('paciente:'));
    expect(claves).toHaveLength(1);
    expect(memoria.get(claves[0])).toMatchObject({
      nombre: 'Ana Pérez',
      tipoDocumento: 'CC',
      numeroDocumento: '123',
      eps: 'Salud Total',
      telefono: '3001234567',
      correo: 'ana@ejemplo.com',
      direccion: 'Calle 1 # 2-3',
    });
    expect(el.textContent).toContain('Guardado');
    expect(el.textContent).toContain('Ana Pérez');
  });

  it('no guarda sin los campos obligatorios y señala lo que falta', async () => {
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    boton(el, 'Crear perfil').click();
    fixture.detectChanges();
    escribir(el, 'Nombre completo', 'Ana');
    boton(el, 'Guardar').click();
    await asentar();
    fixture.detectChanges();

    expect(el.textContent).toContain(
      'Falta completar: número de documento, EPS, teléfono, dirección',
    );
    expect([...memoria.keys()]).toHaveLength(0);
  });

  it('el correo vacío se guarda como ausente (campo opcional)', async () => {
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    boton(el, 'Crear perfil').click();
    fixture.detectChanges();
    escribir(el, 'Nombre completo', 'Ana Pérez');
    escribir(el, 'Número de documento', '123');
    escribir(el, 'EPS', 'Salud Total');
    escribir(el, 'Teléfono', '3001234567');
    escribir(el, 'Dirección', 'Calle 1 # 2-3');
    boton(el, 'Guardar').click();
    await asentar();
    fixture.detectChanges();

    const clave = [...memoria.keys()].find((c) => c.startsWith('paciente:'))!;
    expect((memoria.get(clave) as Paciente).correo).toBeUndefined();
  });

  it('si falla el guardado muestra el error y conserva lo escrito', async () => {
    vi.mocked(set).mockRejectedValueOnce(new ErrorDeEscritura('guardar'));
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    boton(el, 'Crear perfil').click();
    fixture.detectChanges();
    llenarRequeridos(el);
    boton(el, 'Guardar').click();
    await asentar();
    fixture.detectChanges();

    expect(el.textContent).toContain('No se pudo guardar. Libera espacio e intenta de nuevo');
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Nuevo perfil'); // sigue en el form
    expect((el.querySelector('input') as HTMLInputElement).value).toBe('Ana Pérez');
    expect([...memoria.keys()]).toHaveLength(0);
  });

  it('si falla el borrado avisa y los datos quedan intactos', async () => {
    memoria.set('paciente:px', perfil);
    vi.mocked(clear).mockRejectedValueOnce(new ErrorDeEscritura('borrar'));
    cap.getPending.mockResolvedValueOnce({ notifications: [{ id: 11 }] });

    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    boton(el, 'Borrar todos mis datos').click();
    fixture.detectChanges();
    boton(el, 'Borrar todo').click();
    fixture.detectChanges();
    boton(el, 'Sí, borrar todo').click();
    await asentar();
    fixture.detectChanges();

    expect(el.textContent).toContain('No se pudo borrar. Libera espacio e intenta de nuevo');
    expect(memoria.size).toBe(1); // el almacén no se tocó
    expect(el.querySelector('[role="dialog"]')).toBeNull(); // la confirmación quedó cerrada
    expect(cap.cancel).toHaveBeenCalledWith({ notifications: [{ id: 11 }] }); // los avisos sí se cancelaron (van primero)
  });

  it('la última confirmación también puede cancelarse sin borrar nada', async () => {
    memoria.set('paciente:px', perfil);
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    // con Escape en la segunda etapa
    boton(el, 'Borrar todos mis datos').click();
    fixture.detectChanges();
    boton(el, 'Borrar todo').click();
    fixture.detectChanges();
    el
      .querySelector<HTMLElement>('[role="dialog"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(el.querySelector('[role="dialog"]')).toBeNull();
    expect(memoria.size).toBe(1);
    expect(cap.cancel).not.toHaveBeenCalled();

    // y con el botón "Cancelar" de la segunda etapa
    boton(el, 'Borrar todos mis datos').click();
    fixture.detectChanges();
    boton(el, 'Borrar todo').click();
    fixture.detectChanges();
    boton(el, 'Cancelar').click();
    fixture.detectChanges();

    expect(el.querySelector('[role="dialog"]')).toBeNull();
    expect(memoria.size).toBe(1);
    expect(cap.cancel).not.toHaveBeenCalled();
  });

  it('edita un perfil existente', async () => {
    memoria.set('paciente:px', perfil);
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.textContent).toContain('Ana Pérez');
    boton(el, 'Editar').click();
    fixture.detectChanges();
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Editar perfil');

    escribir(el, 'Teléfono', '3001112233');
    boton(el, 'Guardar').click();
    await asentar();
    fixture.detectChanges();

    expect(memoria.get('paciente:px')).toMatchObject({
      nombre: perfil.nombre,
      telefono: '3001112233',
    });
    expect(el.textContent).toContain('Guardado');
  });

  it('un documento duplicado ofrece "Usar el perfil existente"', async () => {
    memoria.set('paciente:px', perfil);
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    boton(el, 'Crear perfil').click();
    fixture.detectChanges();
    escribir(el, 'Nombre completo', 'Ana María Pérez');
    escribir(el, 'Número de documento', perfil.numeroDocumento);
    escribir(el, 'EPS', 'Salud Total');
    escribir(el, 'Teléfono', '3009998877');
    escribir(el, 'Dirección', 'Carrera 9 # 8-7');
    boton(el, 'Guardar').click();
    await asentar();
    fixture.detectChanges();
    TestBed.flushEffects();

    const dialogo = el.querySelector('[role="dialog"]');
    expect(dialogo?.textContent).toContain('Este documento ya existe');
    expect(dialogo?.textContent).toContain('Ana Pérez');
    expect(document.activeElement?.textContent?.trim()).toBe('Usar el perfil existente');

    // Escape cierra la oferta sin perder lo escrito
    dialogo!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(el.querySelector('[role="dialog"]')).toBeNull();

    // "Seguir editando" cierra la oferta y conserva el formulario tal cual
    boton(el, 'Guardar').click();
    await asentar();
    fixture.detectChanges();
    boton(el, 'Seguir editando').click();
    fixture.detectChanges();

    expect(el.querySelector('[role="dialog"]')).toBeNull();
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Nuevo perfil');
    expect([...memoria.keys()]).toHaveLength(1);

    // se ofrece de nuevo y, al aceptarla, carga el perfil existente para editarlo
    boton(el, 'Guardar').click();
    await asentar();
    fixture.detectChanges();
    boton(el, 'Usar el perfil existente').click();
    await asentar();
    fixture.detectChanges();

    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Editar perfil');
    expect((el.querySelector('input') as HTMLInputElement).value).toBe(perfil.nombre);
    expect([...memoria.keys()]).toHaveLength(1);

    // sin cambios, guardar no crea un duplicado
    boton(el, 'Guardar').click();
    await asentar();
    fixture.detectChanges();
    expect([...memoria.keys()]).toHaveLength(1);
    expect(memoria.get('paciente:px')).toMatchObject({
      nombre: perfil.nombre,
      telefono: perfil.telefono,
    });
  });

  it('"Borrar todos mis datos" pide doble confirmación, cancela los avisos y vacía la app', async () => {
    memoria.set('paciente:px', perfil);
    memoria.set('pendiente:pd1', { id: 'pd1' });
    memoria.set('foto:f1', new Blob(['x'], { type: 'image/jpeg' }));
    memoria.set('preferencias', { avisoLegalAceptado: true });
    cap.getPending.mockResolvedValueOnce({ notifications: [{ id: 11 }, { id: 22 }] });

    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    boton(el, 'Borrar todos mis datos').click();
    fixture.detectChanges();
    TestBed.flushEffects();

    const primera = el.querySelector('[role="dialog"]');
    expect(primera?.getAttribute('aria-modal')).toBe('true');
    expect(primera?.getAttribute('aria-labelledby')).toBe('borrar-titulo');
    expect(primera?.textContent).toContain('¿Borrar todos sus datos?');
    expect(primera?.textContent).toContain('perfiles, pendientes, fotos, bitácoras');
    expect(primera?.textContent).toContain('avisos programados');
    expect(primera?.textContent).toContain('no se puede deshacer');
    expect(document.activeElement?.textContent?.trim()).toBe('Borrar todo');

    boton(el, 'Borrar todo').click();
    fixture.detectChanges();

    const ultima = el.querySelector('[role="dialog"]');
    expect(ultima?.textContent).toContain('Última confirmación');
    expect(ultima?.textContent).toContain('No hay forma de recuperar');

    boton(el, 'Sí, borrar todo').click();
    await asentar();
    fixture.detectChanges();

    expect(memoria.size).toBe(0); // perfiles, pendientes, fotos y preferencias
    expect(cap.cancel).toHaveBeenCalledWith({ notifications: [{ id: 11 }, { id: 22 }] });
    expect(navegar).toHaveBeenCalledWith('/');
    // los avisos se cancelan antes de vaciar el almacén (sin avisos huérfanos)
    expect(cap.cancel.mock.invocationCallOrder.at(-1)!).toBeLessThan(
      vi.mocked(clear).mock.invocationCallOrder.at(-1)!,
    );
  });

  it('la primera confirmación puede cancelarse sin borrar nada', async () => {
    memoria.set('paciente:px', perfil);
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    const disparador = boton(el, 'Borrar todos mis datos');
    disparador.focus();
    disparador.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    const dialogo = el.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialogo.getAttribute('aria-modal')).toBe('true');
    expect(dialogo.getAttribute('aria-labelledby')).toBe('borrar-titulo');
    expect(document.activeElement?.textContent?.trim()).toBe('Borrar todo');

    // la trampa de foco no deja salir el Tab del diálogo
    dialogo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(dialogo.contains(document.activeElement)).toBe(true);

    boton(el, 'Cancelar').click();
    fixture.detectChanges();

    expect(el.querySelector('[role="dialog"]')).toBeNull();
    expect(memoria.size).toBe(1);
    expect(cap.cancel).not.toHaveBeenCalled();
    // el foco vuelve al botón que abrió el diálogo
    expect(document.activeElement).toBe(disparador);
  });

  it('Escape cierra los diálogos sin borrar nada', async () => {
    memoria.set('paciente:px', perfil);
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    boton(el, 'Borrar todos mis datos').click();
    fixture.detectChanges();
    el
      .querySelector<HTMLElement>('[role="dialog"]')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();

    expect(el.querySelector('[role="dialog"]')).toBeNull();
    expect(memoria.size).toBe(1);
    expect(cap.cancel).not.toHaveBeenCalled();
  });
});
