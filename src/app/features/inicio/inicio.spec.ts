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
    // Vence en 1 h 30 min con medio minuto de holgura: la pantalla lee su
    // reloj al crearse, y el contador se pinta "Faltan 1 h 30 min" aunque
    // esos ms pasen (mismo cuidado que `contador.spec.ts`).
    horaReclamo: new Date(Date.now() - 46.5 * 3_600_000 + 30_000).toISOString(),
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

/**
 * Simula el regreso con "atrás": `<ion-router-outlet>` re-muestra la **misma**
 * instancia (el constructor no corre de nuevo) y Ionic dispara
 * `ionViewWillEnter`, que es quien vuelve a leer el almacén.
 */
async function reentrar(fixture: ComponentFixture<Inicio>): Promise<void> {
  fixture.componentInstance.ionViewWillEnter();
  await asentar(); // la recarga async se asienta igual que la carga inicial
  fixture.detectChanges();
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
      pendiente({
        id: 'p2',
        medicamentos: ['Metformina 850 mg'],
        // Venció hace 1 h con medio minuto de holgura: la pantalla lee su
        // reloj al crearse, y "Vencido hace 1 h" no depende de cuántos ms.
        horaReclamo: new Date(Date.now() - 49 * 3_600_000 - 30_000).toISOString(),
      }),
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
    expect(enPlazo).toContain('Faltan 1 h 30 min');
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

    expect(el.textContent).toContain('El paciente aún no tiene pendientes');
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

  it('la tarjeta de un pendiente navega a su detalle', async () => {
    await set('pendiente:p1', pendiente());
    await set('preferencias', { avisoLegalAceptado: true, ayudaAvisosVista: false });
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    // La tarjeta entera es un botón (área táctil de 48 px o más).
    const tarjeta = el.querySelector<HTMLButtonElement>('button.inicio-tarjeta');
    expect(tarjeta).toBeTruthy();
    expect(tarjeta?.textContent).toContain('Losartán 50 mg');

    tarjeta?.click();

    expect(navegar).toHaveBeenCalledWith('/pendientes/p1');
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

  it('al re-entrar con "atrás" vuelve a leer: aparece el pendiente guardado mientras tanto', async () => {
    await set('preferencias', { avisoLegalAceptado: true, ayudaAvisosVista: false });
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.inicio-tarjeta')).toBeNull();

    // Se guardó mientras esta pantalla seguía apilada debajo (sin instancia nueva).
    await set('pendiente:p2', pendiente({ id: 'p2', medicamentos: ['Metformina 850 mg'] }));
    await reentrar(fixture);

    expect(el.querySelector('.inicio-tarjeta')?.textContent).toContain('Metformina 850 mg');
    expect(el.querySelector('.inicio-vacio')).toBeNull();
  });

  it('al re-entrar con "atrás" el estado se recalcula: el entregado muestra "Entregado a tiempo"', async () => {
    await set('pendiente:p1', pendiente());
    await set('preferencias', { avisoLegalAceptado: true, ayudaAvisosVista: false });
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.p48-etiqueta-estado--en-plazo')).toBeTruthy();
    expect(el.textContent).toContain('Faltan 1 h 30 min');

    // "Ya me llegó" en el detalle escribe `entregadoEn` en el almacén.
    await set('pendiente:p1', pendiente({ entregadoEn: hace(1) }));
    await reentrar(fixture);

    expect(el.querySelector('.p48-etiqueta-estado--entregado-a-tiempo')).toBeTruthy();
    expect(el.textContent).toContain('Entregado a tiempo');
    expect(el.textContent).not.toContain('Faltan 1 h');
  });

  it('al re-entrar tras "Borrar todos mis datos" la lista vacía y vuelve el modal de primera apertura', async () => {
    await set('pendiente:p1', pendiente());
    await set('preferencias', { avisoLegalAceptado: true, ayudaAvisosVista: false });
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('.inicio-tarjeta')).toBeTruthy();
    expect(el.querySelector('[role="dialog"]')).toBeNull();

    // "Borrar todos mis datos" vacía el almacén completo (preferencias incluidas).
    memoria.clear();
    await reentrar(fixture);

    expect(el.querySelector('.inicio-tarjeta')).toBeNull();
    expect(el.textContent).toContain('El paciente aún no tiene pendientes');
    expect(el.querySelector('.aviso-linea')).toBeNull();
    expect(el.querySelector('[role="dialog"]')?.textContent).toContain(AVISO_NO_ASESORIA);
  });

  it('estado vacío: la introducción completa va después de la línea de vacío', async () => {
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    const texto = el.textContent ?? '';

    const iLinea = texto.indexOf('El paciente aún no tiene pendientes');
    const iIntro = texto.indexOf('¿Qué es Pendientes48?');
    expect(iLinea).toBeGreaterThanOrEqual(0);
    expect(iIntro).toBeGreaterThan(iLinea);

    // Las 3 secciones en línea con h2 (el h1 es de la pantalla: h1 → h3 rompería
    // heading-order) y sus listas verbatim.
    const vacio = el.querySelector<HTMLElement>('.inicio-vacio')!;
    expect([...vacio.querySelectorAll('h2')].map((h) => h.textContent?.trim())).toEqual([
      '¿Qué es Pendientes48?',
      'Qué puede hacer',
      'Cómo funciona',
    ]);
    expect(vacio.querySelector('h3')).toBeNull();
    expect(vacio.querySelectorAll('ul li')).toHaveLength(5);
    expect(vacio.querySelectorAll('ol li')).toHaveLength(3);
    // El crédito vive solo en el pie de la hoja, no en la intro en línea.
    expect(vacio.textContent).not.toContain('Pendientes48 fue desarrollada por 10carabal.');
  });

  it('la introducción no bloquea el estado vacío: la línea y el botón principal siguen', async () => {
    await set('preferencias', { avisoLegalAceptado: true, ayudaAvisosVista: false });
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.textContent).toContain('El paciente aún no tiene pendientes');
    expect(boton(el, 'Me dejaron un pendiente')).toBeTruthy();
    // único sólido de la pantalla: la intro en línea no añade botones
    expect([...el.querySelectorAll('.p48-boton-principal')]).toHaveLength(1);
  });

  it('con pendientes no hay introducción y las tarjetas siguen intactas', async () => {
    await set('pendiente:p1', pendiente());
    await set('preferencias', { avisoLegalAceptado: true, ayudaAvisosVista: false });
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('.inicio-vacio')).toBeNull();
    expect(el.textContent).not.toContain('¿Qué es Pendientes48?');
    expect(el.querySelector('.inicio-tarjeta')?.textContent).toContain('Losartán 50 mg');
  });

  it('en cargando y en error no se muestra la introducción', async () => {
    // Cargando: la lista async aún no se asienta, la pantalla muestra "Cargando…".
    const cargando = TestBed.createComponent(Inicio);
    cargando.detectChanges();
    const elCargando: HTMLElement = cargando.nativeElement;
    expect(elCargando.textContent).toContain('Cargando');
    expect(elCargando.querySelector('.inicio-vacio')).toBeNull();
    expect(elCargando.textContent).not.toContain('¿Qué es Pendientes48?');

    vi.mocked(keys).mockRejectedValueOnce(new Error('sin espacio'));
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[role="alert"]')).toBeTruthy();
    expect(el.querySelector('.inicio-vacio')).toBeNull();
    expect(el.textContent).not.toContain('¿Qué es Pendientes48?');
  });

  it('el botón terciario "¿Cómo funciona?" está en cabecera con y sin pendientes y abre la hoja', async () => {
    await set('preferencias', { avisoLegalAceptado: true, ayudaAvisosVista: false });
    const sinDatos = await crear();
    const el: HTMLElement = sinDatos.nativeElement;

    const abrir = boton(el, '¿Cómo funciona?');
    expect(abrir.classList.contains('p48-boton-terciario')).toBe(true);
    expect(abrir.classList.contains('p48-boton-principal')).toBe(false);
    expect(el.querySelector('[role="dialog"]')).toBeNull();

    abrir.click();
    sinDatos.detectChanges();
    expect(el.querySelector('[role="dialog"]')).toBeTruthy();

    // Con pendientes en la lista, el mismo enlace sigue abriendo la hoja.
    await set('pendiente:p1', pendiente());
    const conDatos = await crear();
    const el2: HTMLElement = conDatos.nativeElement;
    boton(el2, '¿Cómo funciona?').click();
    conDatos.detectChanges();
    expect(el2.querySelector('.inicio-tarjeta')).toBeTruthy();
    expect(el2.querySelector('[role="dialog"]')).toBeTruthy();
  });

  it('Escape y el toque fuera cierran la hoja desde Inicio', async () => {
    await set('preferencias', { avisoLegalAceptado: true, ayudaAvisosVista: false });
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    boton(el, '¿Cómo funciona?').click();
    fixture.detectChanges();
    expect(el.querySelector('[role="dialog"]')).toBeTruthy();

    el.querySelector<HTMLElement>('[role="dialog"]')!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    fixture.detectChanges();
    expect(el.querySelector('[role="dialog"]')).toBeNull();

    boton(el, '¿Cómo funciona?').click();
    fixture.detectChanges();
    expect(el.querySelector('[role="dialog"]')).toBeTruthy();

    el.querySelector<HTMLElement>('.hoja-fondo')!.click();
    fixture.detectChanges();
    expect(el.querySelector('[role="dialog"]')).toBeNull();
  });

  it('la hoja muestra el crédito exacto y el enlace del pie navega a la guía', async () => {
    await set('preferencias', { avisoLegalAceptado: true, ayudaAvisosVista: false });
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    boton(el, '¿Cómo funciona?').click();
    fixture.detectChanges();

    expect(el.textContent).toContain('Pendientes48 fue desarrollada por 10carabal.');
    const enlace = el.querySelector<HTMLAnchorElement>('.hoja-caja a')!;
    expect(enlace.textContent?.trim()).toBe('Ver la guía: Me dejaron un pendiente');
    expect(enlace.getAttribute('href')).toBe('/ventanilla');

    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    enlace.click();

    expect(navegar).toHaveBeenCalledWith('/ventanilla');
  });

  it('con la hoja abierta sigue habiendo exactamente un botón principal sólido en Inicio', async () => {
    await set('pendiente:p1', pendiente());
    await set('preferencias', { avisoLegalAceptado: true, ayudaAvisosVista: false });
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    boton(el, '¿Cómo funciona?').click();
    fixture.detectChanges();

    expect([...el.querySelectorAll('.p48-boton-principal')]).toHaveLength(1);
    expect(el.querySelector('[role="dialog"] .p48-boton-principal')).toBeNull();
  });

  it('al navegar desde el enlace del pie la hoja se cierra: volver de la guía no la reencuentra', async () => {
    await set('preferencias', { avisoLegalAceptado: true, ayudaAvisosVista: false });
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    boton(el, '¿Cómo funciona?').click();
    fixture.detectChanges();
    expect(el.querySelector('[role="dialog"]')).toBeTruthy();

    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    el.querySelector<HTMLAnchorElement>('.hoja-caja a')!.click();
    fixture.detectChanges();

    expect(navegar).toHaveBeenCalledWith('/ventanilla');
    expect(fixture.componentInstance.comoFunciona()).toBe(false);
    expect(el.querySelector('[role="dialog"]')).toBeNull();
  });
});
