import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AVISO_NO_ASESORIA } from '@domain/norma/aviso';
import type { Pendiente } from '@domain/pendiente/pendiente.model';
import { keys, set } from 'idb-keyval';
import { Inicio } from './inicio';

/** Almacén falso en memoria: mismo patrón que `pacientes.spec.ts`. */
const memoria = vi.hoisted(() => new Map<string, unknown>());

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

/** Hace cuánto (en horas) ocurrió algo, en ISO. */
const hace = (horas: number): string => new Date(Date.now() - horas * 3_600_000).toISOString();

function pendiente(sobrescribe: Partial<Pendiente> = {}): Pendiente {
  return {
    id: 'p1',
    pacienteId: 'px',
    medicamentos: ['Losartán 50 mg'],
    farmacia: 'Droguería La 12',
    horaReclamo: hace(46.5), // vence en 1 h: "Faltan 1 h"
    autorizoDomicilio: true,
    direccionEntrega: 'Calle 1 # 2-3',
    bitacora: [],
    ...sobrescribe,
  };
}

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

async function crear(): Promise<ComponentFixture<Inicio>> {
  const fixture = TestBed.createComponent(Inicio);
  fixture.detectChanges();
  await asentar(); // la carga inicial de la lista y de la preferencia
  fixture.detectChanges();
  TestBed.flushEffects();
  return fixture;
}

function boton(el: HTMLElement, texto: string): HTMLButtonElement {
  const b = [...el.querySelectorAll('button')].find((x) => x.textContent?.trim() === texto);
  expect(b, `botón "${texto}"`).toBeTruthy();
  return b as HTMLButtonElement;
}

describe('Inicio', () => {
  beforeEach(() => {
    memoria.clear();
    vi.clearAllMocks();
  });

  it('primera apertura: muestra el modal y exige tocar "Entiendo"', async () => {
    await set('pendiente:p1', pendiente());
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    const dialogo = el.querySelector('[role="dialog"]');
    expect(dialogo).toBeTruthy();
    expect(dialogo?.getAttribute('aria-modal')).toBe('true');
    expect(dialogo?.textContent).toContain(AVISO_NO_ASESORIA);
    expect(el.querySelector('.aviso-linea')).toBeNull();

    boton(el, 'Entiendo').click();
    await asentar();
    fixture.detectChanges();

    expect(el.querySelector('[role="dialog"]')).toBeNull();
    expect(el.querySelector('.aviso-linea')?.textContent).toContain(AVISO_NO_ASESORIA);
    expect(memoria.get('preferencias')).toMatchObject({ avisoLegalAceptado: true });
  });

  it('después de aceptar: sin modal, el aviso queda como línea al pie en cada apertura', async () => {
    await set('preferencias', { avisoLegalAceptado: true, ayudaAvisosVista: false });
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('[role="dialog"]')).toBeNull();
    expect(el.querySelector('.aviso-linea')?.textContent).toContain(AVISO_NO_ASESORIA);
    expect(
      [...el.querySelectorAll('button')].some((b) => b.textContent?.trim() === 'Entiendo'),
    ).toBe(false);

    // El aviso cierra el contenido: es el último bloque de la pantalla.
    const contenido = el.querySelector('.inicio');
    expect(contenido?.lastElementChild?.classList.contains('inicio-aviso')).toBe(true);
  });

  it('lista cada pendiente con su contador y su estado (etiqueta + color)', async () => {
    await set('pendiente:p1', pendiente({ id: 'p1' }));
    await set(
      'pendiente:p2',
      pendiente({ id: 'p2', medicamentos: ['Metformina 850 mg'], horaReclamo: hace(49) }),
    );
    await set(
      'pendiente:p3',
      pendiente({
        id: 'p3',
        medicamentos: ['Ibuprofeno'],
        horaReclamo: hace(46.5),
        entregadoEn: hace(20),
      }),
    );
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    const tarjetas = [...el.querySelectorAll('.inicio-tarjeta')];
    expect(tarjetas).toHaveLength(3);
    const [enPlazo, vencido, entregado] = tarjetas.map((t) => t.textContent ?? '');

    expect(enPlazo).toContain('Losartán 50 mg');
    expect(enPlazo).toContain('Faltan 1 h');
    expect(enPlazo).toContain('En plazo');

    expect(vencido).toContain('Metformina 850 mg');
    expect(vencido).toContain('Vencido hace 1 h');
    expect(vencido).toContain('Vencido');

    expect(entregado).toContain('Ibuprofeno');
    expect(entregado).toContain('Entregado a tiempo');
    expect(entregado).not.toContain('Faltan');
    expect(entregado).not.toContain('Vencido hace');

    // El color va siempre con la etiqueta (D14): una clase de estado por chip.
    const clases = [...el.querySelectorAll('.p48-etiqueta-estado')].map((e) => e.className);
    expect(clases).toEqual([
      'p48-etiqueta-estado p48-etiqueta-estado--en-plazo',
      'p48-etiqueta-estado p48-etiqueta-estado--vencido',
      'p48-etiqueta-estado p48-etiqueta-estado--entregado-a-tiempo',
    ]);
  });

  it('sin pendientes explica qué hacer', async () => {
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.textContent).toContain('Aún no tiene pendientes');
    expect(el.textContent).toContain('plazo de 48 horas');
    expect(el.querySelector('.inicio-tarjeta')).toBeNull();
  });

  it('si falla la lectura, señala el error sin mostrar la lista', async () => {
    vi.mocked(keys).mockRejectedValueOnce(new Error('sin espacio'));
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'No se pudo leer la información',
    );
    expect(el.querySelector('.inicio-tarjeta')).toBeNull();
    expect(el.querySelector('.inicio-vacio')).toBeNull();
  });

  it('el botón "Ver perfiles" abre la pantalla de perfiles', async () => {
    const router = TestBed.inject(Router);
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    boton(el, 'Ver perfiles').click();

    expect(navegar).toHaveBeenCalledWith('/pacientes');
  });

  it('el botón principal "Me dejaron un pendiente" abre la guía y coexiste con la lista', async () => {
    await set('pendiente:p1', pendiente());
    await set('preferencias', { avisoLegalAceptado: true, ayudaAvisosVista: false });
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    expect(el.querySelector('.inicio-tarjeta')).toBeTruthy();
    expect(boton(el, 'Me dejaron un pendiente')).toBeTruthy();
    // un solo botón sólido en pantalla (el "Entiendo" solo existe en el modal de primera apertura)
    expect([...el.querySelectorAll('.p48-boton-principal')]).toHaveLength(1);

    boton(el, 'Me dejaron un pendiente').click();

    expect(navegar).toHaveBeenCalledWith('/ventanilla');
  });
});
