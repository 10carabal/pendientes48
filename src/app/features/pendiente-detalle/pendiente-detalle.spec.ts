import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router, type ParamMap } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { ErrorDeEscritura } from '@data/app-db';
import { AVISO_NO_ASESORIA } from '@domain/norma/aviso';
import type { Paciente } from '@domain/paciente/paciente.model';
import type { Pendiente } from '@domain/pendiente/pendiente.model';
import { NOTA_AUTORIZACION_DOMICILIO, textoCorto } from '@domain/reclamo/plantillas';
import { PIE_PDF } from '@domain/reclamo/plantillas-pdf';
import { keys, set, get } from 'idb-keyval';
import { BehaviorSubject, of, type Observable } from 'rxjs';
import { PendienteDetalle } from './pendiente-detalle';
import { fechaLegible } from './fechas';

/** Almacén falso en memoria: mismo patrón que `pendiente-form.spec.ts`. */
const memoria = vi.hoisted(() => new Map<string, unknown>());

const capacitor = vi.hoisted(() => ({
  Capacitor: { isNativePlatform: vi.fn(() => true) },
}));

const cap = vi.hoisted(() => ({
  cancel: vi.fn((_opciones: { notifications: Array<{ id: number }> }) => Promise.resolve()),
  getPending: vi.fn(() => Promise.resolve({ notifications: [] as Array<{ id: number }> })),
  schedule: vi.fn((_opciones: unknown) => Promise.resolve({ notifications: [] })),
  checkPermissions: vi.fn(() => Promise.resolve({ display: 'granted' })),
  requestPermissions: vi.fn(() => Promise.resolve({ display: 'granted' })),
}));

/** Toast falso por provider (patrón de doble, sin `vi.mock`): `EventTarget` real para el tap. */
const toasts = vi.hoisted(() => {
  class Falso extends EventTarget {
    present = vi.fn(() => Promise.resolve());
    dismiss = vi.fn(() => Promise.resolve(true));
    constructor(readonly opciones: Record<string, unknown>) {
      super();
    }
  }
  const creados: Falso[] = [];
  return {
    creados,
    controller: {
      create: vi.fn((o: Record<string, unknown>) => {
        const t = new Falso(o);
        creados.push(t);
        return Promise.resolve(t);
      }),
    },
  };
});

const fs = vi.hoisted(() => ({
  Directory: { Documents: 'DOCUMENTS', Cache: 'CACHE' },
  Encoding: { UTF8: 'UTF-8' },
  Filesystem: {
    writeFile: vi.fn((_opciones: unknown) => Promise.resolve({ uri: 'archivo' })),
    deleteFile: vi.fn((_opciones: unknown) => Promise.resolve()),
  },
}));

const clipboard = vi.hoisted(() => ({
  Clipboard: { write: vi.fn((_opciones: { string: string }) => Promise.resolve()) },
}));

const share = vi.hoisted(() => ({
  Share: { share: vi.fn((_opciones: unknown) => Promise.resolve()) },
}));

/** pdfmake se reemplaza por su interfaz: el documento capturado es la prueba. */
const pdf = vi.hoisted(() => ({
  docs: [] as Array<{ footer?: unknown } & Record<string, unknown>>,
  createPdf: vi.fn(),
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
vi.mock('@capacitor/filesystem', () => fs);
vi.mock('@capacitor/clipboard', () => clipboard);
vi.mock('@capacitor/share', () => share);
vi.mock('pdfmake/build/pdfmake', () => ({
  default: { addVirtualFileSystem: vi.fn(), createPdf: pdf.createPdf },
}));
vi.mock('pdfmake/build/vfs_fonts', () => ({ default: {} }));

const paciente: Paciente = {
  id: 'px',
  nombre: 'Ana Pérez',
  tipoDocumento: 'CC',
  numeroDocumento: '123',
  eps: 'Salud Total',
  telefono: '3001234567',
  correo: 'ana@ejemplo.com',
  direccion: 'Calle 1 # 2-3',
};

/** Hace cuánto (en horas) ocurrió algo, en ISO. */
const hace = (horas: number): string => new Date(Date.now() - horas * 3_600_000).toISOString();

function pendiente(sobrescribe: Partial<Pendiente> = {}): Pendiente {
  return {
    id: 'p1',
    pacienteId: 'px',
    medicamentos: ['Losartán 50 mg'],
    farmacia: 'Droguería La 12',
    horaReclamo: hace(46.5), // vence en 1 h 30 min
    autorizoDomicilio: true,
    direccionEntrega: 'Calle 1 # 2-3',
    bitacora: [{ en: hace(46.5), tipo: 'creado', texto: 'Registraste el pendiente' }],
    ...sobrescribe,
  };
}

function pendienteGuardado(id = 'p1'): Pendiente | undefined {
  return memoria.get(`pendiente:${id}`) as Pendiente | undefined;
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

async function crear(
  id = 'p1',
  parametros: Observable<ParamMap> = of(convertToParamMap({ id })),
): Promise<ComponentFixture<PendienteDetalle>> {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: ActivatedRoute,
        // Ruta viva (m1): la pantalla se suscribe, no lee el snapshot.
        useValue: { paramMap: parametros },
      },
      { provide: ToastController, useValue: toasts.controller },
    ],
  });
  const fixture = TestBed.createComponent(PendienteDetalle);
  fixture.detectChanges();
  await asentar(); // la carga del pendiente, del perfil y del permiso
  fixture.detectChanges();
  TestBed.flushEffects();
  return fixture;
}

function boton(el: HTMLElement, texto: string): HTMLButtonElement {
  const b = [...el.querySelectorAll('button')].find((x) => x.textContent?.trim() === texto);
  expect(b, `botón "${texto}"`).toBeTruthy();
  return b as HTMLButtonElement;
}

function campoNota(el: HTMLElement, etiqueta = 'Agregar una nota'): HTMLInputElement {
  const etiquetaEl = [...el.querySelectorAll('label')].find((l) =>
    l.textContent?.includes(etiqueta),
  );
  const campo = etiquetaEl?.querySelector('input') as HTMLInputElement | null;
  expect(campo, `campo "${etiqueta}"`).toBeTruthy();
  return campo as HTMLInputElement;
}

function escribir(el: HTMLElement, etiqueta: string, valor: string): void {
  const campo = campoNota(el, etiqueta);
  campo.value = valor;
  campo.dispatchEvent(new Event('input', { bubbles: true }));
}

function navegarAPrueba(): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
}

/** jsdom no trae `URL.createObjectURL`: se captura el Blob descargado. */
let ultimoBlob: Blob | undefined;
let enlaces: HTMLAnchorElement[] = [];
let click: ReturnType<typeof vi.spyOn> | undefined;

function stubearUrls(): void {
  ultimoBlob = undefined;
  Object.defineProperty(URL, 'createObjectURL', {
    value: vi.fn((b: Blob) => {
      ultimoBlob = b;
      return 'blob:p48';
    }),
    configurable: true,
    writable: true,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: vi.fn(),
    configurable: true,
    writable: true,
  });
}

/** Pendiente vencido con la queja de la EPS ya registrada (puerta del paso 3). */
function conQueja(sobrescribe: Partial<Pendiente> = {}): Pendiente {
  return pendiente({
    id: 'pv',
    horaReclamo: hace(49),
    quejaEps: { radicadaEn: hace(2), radicado: 'PQR-123' },
    bitacora: [
      { en: hace(49), tipo: 'creado', texto: 'Registraste el pendiente' },
      { en: hace(2), tipo: 'queja-eps', texto: 'Queja ante la EPS (radicado n.° PQR-123)' },
    ],
    ...sobrescribe,
  });
}

/** Toca el paso 3 de la escalera y deja la hoja lista (con su foco). */
async function abrirHoja(fixture: ComponentFixture<PendienteDetalle>): Promise<void> {
  boton(fixture.nativeElement, 'Generar queja ante la EPS').click();
  fixture.detectChanges();
  TestBed.flushEffects();
  fixture.detectChanges();
}

/** La hoja del documento abierta, buscada por su propio contenedor. */
function hoja(el: HTMLElement): HTMLElement {
  const dialogo = el.querySelector('.hoja-fondo [role="dialog"]') as HTMLElement | null;
  expect(dialogo, 'la hoja del documento está abierta').toBeTruthy();
  return dialogo as HTMLElement;
}

describe('PendienteDetalle', () => {
  beforeEach(() => {
    memoria.clear();
    vi.clearAllMocks();
    capacitor.Capacitor.isNativePlatform.mockReturnValue(true);
    cap.checkPermissions.mockResolvedValue({ display: 'denied' } as never);
    cap.requestPermissions.mockResolvedValue({ display: 'granted' } as never);
    pdf.docs = [];
    pdf.createPdf.mockImplementation((doc) => {
      pdf.docs.push(doc);
      return {
        getBlob: () => Promise.resolve(new Blob(['pdf'], { type: 'application/pdf' })),
      };
    });
    memoria.set('paciente:px', paciente);
    stubearUrls();
    enlaces = [];
    click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        enlaces.push(this);
      });
  });

  afterEach(() => {
    click?.mockRestore();
    click = undefined;
  });

  it('muestra el contador, los datos del pendiente y la norma del plazo', async () => {
    memoria.set(
      'pendiente:p1',
      pendiente({
        numeroComprobante: '7788',
        gestion: {
          nombre: 'Carlos Ruiz',
          tipoDocumento: 'CC',
          numeroDocumento: '9000000',
          parentesco: 'hijo',
        },
      }),
    );
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Losartán 50 mg');
    expect(el.textContent).toContain('Faltan 1 h');
    expect(el.textContent).toContain('En plazo');

    expect(el.textContent).toContain('Ana Pérez (CC 123)');
    expect(el.textContent).toContain('Carlos Ruiz');
    expect(el.textContent).toContain('hijo');
    expect(el.textContent).toContain('Calle 1 # 2-3');
    expect(el.textContent).toContain('Autorizó entrega a domicilio');
    expect(el.textContent).toContain('Número de comprobante');
    expect(el.textContent).toContain('7788');

    // Norma del plazo desde normas.json, con el aviso por input (D6).
    expect(el.querySelector('.detalle-norma')?.textContent).toContain(
      'Decreto-Ley 019 de 2012 (Ley Antitrámites)',
    );
    expect(el.querySelector('.detalle-norma .norma-aviso')?.textContent?.trim()).toBe(
      'Esta app no es asesoría legal',
    );
  });

  it('la ruta sin pendiente ofrece volver al inicio', async () => {
    const fixture = await crear('no-existe');
    const el: HTMLElement = fixture.nativeElement;
    const navegar = navegarAPrueba();

    // La región viva del fallo de escritura va vacía antes; la de lectura es la del error.
    expect(el.querySelector('.detalle-error.p48-barra-acento')?.textContent).toContain(
      'No se pudo leer la información. Intenta de nuevo.',
    );
    expect(el.querySelector('.detalle-datos')).toBeNull();

    boton(el, 'Volver al inicio').click();

    expect(navegar).toHaveBeenCalledWith('/');
  });

  it('si falla la lectura muestra el error y permite volver', async () => {
    vi.mocked(keys).mockRejectedValueOnce(new Error('sin índice'));
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    const navegar = navegarAPrueba();

    expect(el.querySelector('.detalle-error.p48-barra-acento')?.textContent).toContain(
      'No se pudo leer la información. Intenta de nuevo.',
    );

    boton(el, 'Volver al inicio').click();
    expect(navegar).toHaveBeenCalledWith('/');
  });

  it('el banner de permiso denegado sale con sus dos opciones', async () => {
    memoria.set('pendiente:p1', pendiente());
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('.detalle-banner')).toBeTruthy();
    expect(el.textContent).toContain('Los avisos de vencimiento están apagados');
    expect(boton(el, 'Activar notificaciones')).toBeTruthy();
    expect(boton(el, 'Agregar a mi calendario')).toBeTruthy();
  });

  it('con el permiso concedido el banner no aparece', async () => {
    cap.checkPermissions.mockResolvedValue({ display: 'granted' } as never);
    memoria.set('pendiente:p1', pendiente());
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('.detalle-banner')).toBeNull();
    expect(boton(el, 'Agregar recordatorio a mi calendario')).toBeTruthy(); // el .ics sí se ofrece siempre
  });

  it('"Activar notificaciones" pide el permiso y anuncia el resultado', async () => {
    memoria.set('pendiente:p1', pendiente());
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    boton(el, 'Activar notificaciones').click();
    await asentar();
    fixture.detectChanges();

    expect(cap.requestPermissions).toHaveBeenCalledTimes(1);
    expect(el.querySelector('.detalle-banner')).toBeNull(); // concedido: el banner se va
    expect(el.querySelector('[role="status"]')?.textContent).toContain(
      'Notificaciones activadas',
    );
  });

  it('el banner de permiso denegado ofrece el mismo .ics, guardado en Documentos', async () => {
    memoria.set('pendiente:p1', pendiente());
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    boton(el, 'Agregar a mi calendario').click();
    await asentar();
    fixture.detectChanges();

    expect(fs.Filesystem.writeFile).toHaveBeenCalledTimes(1);
    const llamada = fs.Filesystem.writeFile.mock.calls[0][0] as { path: string; data: string };
    expect(llamada.path).toBe('pendiente-p1.ics');
    expect(llamada.data).toContain('UID:pendiente-p1@pendientes48');
    expect(pendienteGuardado()?.icsAgregadoEn).toBeTruthy();
  });

  it('"Ya me llegó" cierra el pendiente: entrega, evento, aviso cancelado y chip final', async () => {
    memoria.set('pendiente:p1', pendiente());
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    boton(el, 'Ya me llegó').click();
    await asentar();
    fixture.detectChanges();

    const guardado = pendienteGuardado();
    expect(guardado?.entregadoEn).toBeTruthy();
    expect(guardado?.bitacora.at(-1)).toMatchObject({
      tipo: 'entregado',
      texto: 'Marcaste el pendiente como entregado',
    });
    // D9: el estado se deriva, no se guarda.
    expect(guardado).not.toHaveProperty('estado');
    expect(cap.cancel).toHaveBeenCalledTimes(1); // el aviso programado se cancela

    expect(el.textContent).toContain('Entregado a tiempo');
    expect(el.querySelector('.p48-etiqueta-estado--entregado-a-tiempo')).toBeTruthy();
    expect([...el.querySelectorAll('button')].some((b) => b.textContent?.trim() === 'Ya me llegó')).toBe(false);
  });

  it('un doble toque en "Ya me llegó" entrega UNA sola vez', async () => {
    // La primera escritura queda pendiente: ensancha la ventana del doble toque.
    let liberarEscritura!: () => void;
    vi.mocked(set).mockImplementationOnce(
      (clave, valor) =>
        new Promise<void>((resolver) => {
          liberarEscritura = () => {
            memoria.set(clave as string, valor);
            resolver();
          };
        }),
    );
    memoria.set('pendiente:p1', pendiente());
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    boton(el, 'Ya me llegó').click();
    await asentar();
    fixture.detectChanges();

    expect(boton(el, 'Ya me llegó').disabled).toBe(true); // el botón se desactiva
    await fixture.componentInstance.entregar(); // segundo toque mientras guarda
    liberarEscritura();
    await asentar();
    fixture.detectChanges();

    const guardado = pendienteGuardado();
    const entregas = guardado?.bitacora.filter((e) => e.tipo === 'entregado') ?? [];
    expect(entregas).toHaveLength(1);
  });

  it('el evento "Venció el plazo" se ve en la bitácora pero nunca se guarda', async () => {
    const vencido = pendiente({
      id: 'pv',
      horaReclamo: hace(49),
      bitacora: [{ en: hace(49), tipo: 'creado', texto: 'Registraste el pendiente' }],
    });
    memoria.set('pendiente:pv', vencido);
    const fixture = await crear('pv');
    const el: HTMLElement = fixture.nativeElement;

    const alerta = el.querySelector('.p48-barra-acento--alerta');
    expect(alerta?.textContent).toContain('Venció el plazo de 48 horas');

    // Registrar una nota no arrastra el evento derivado al almacén (D9).
    escribir(el, 'Agregar una nota', 'Llamé a la línea');
    fixture.detectChanges();
    boton(el, 'Guardar nota').click();
    await asentar();
    fixture.detectChanges();

    const guardado = pendienteGuardado('pv');
    expect(guardado?.bitacora.map((e) => e.tipo)).toEqual(['creado', 'nota']);
    expect(guardado).not.toHaveProperty('estado');
  });

  it('agrega una nota a la bitácora y anuncia "Nota guardada"', async () => {
    memoria.set('pendiente:p1', pendiente());
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    escribir(el, 'Agregar una nota', 'Llamé a la línea, dijeron que mañana');
    fixture.detectChanges();
    boton(el, 'Guardar nota').click();
    await asentar();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(toasts.controller.create).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Nota guardada' }),
    );
    expect(pendienteGuardado()?.bitacora.at(-1)).toMatchObject({
      tipo: 'nota',
      texto: 'Llamé a la línea, dijeron que mañana',
    });
    expect(el.textContent).toContain('Llamé a la línea, dijeron que mañana');
    expect(el.querySelector('.bitacora-aviso')?.textContent?.trim()).toBe('Nota guardada');
    expect(campoNota(el).value).toBe(''); // éxito: el campo se vacía al terminar
  });

  it('si guardar la nota falla, el texto se conserva y el fallo se anuncia', async () => {
    // M2 (QA 3.5): el texto no se pierde si el guardado no termina bien.
    vi.mocked(set).mockRejectedValueOnce(new ErrorDeEscritura('guardar'));
    memoria.set('pendiente:p1', pendiente());
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    escribir(el, 'Agregar una nota', 'Hablé con la EPS');
    fixture.detectChanges();
    boton(el, 'Guardar nota').click();
    await asentar();
    fixture.detectChanges();

    expect(campoNota(el).value).toBe('Hablé con la EPS'); // el texto sigue ahí
    TestBed.flushEffects();
    expect(toasts.controller.create).not.toHaveBeenCalled(); // sin toast en fallo de nota
    expect(el.querySelector('.detalle-error')?.textContent).toContain(
      'No se pudo guardar. Libera espacio e intenta de nuevo',
    );
    expect(el.querySelector('.bitacora-aviso')?.textContent?.trim()).toBe(''); // sin confirmación
    expect(pendienteGuardado()?.bitacora).toHaveLength(1); // solo el evento "creado"
    expect(boton(el, 'Guardar nota').disabled).toBe(false); // se puede reintentar
  });

  it('una segunda nota vuelve a anunciar "Nota guardada"', async () => {
    // m2 (QA 3.5): la región viva se vacía antes de cada guardado nuevo.
    memoria.set('pendiente:p1', pendiente());
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    escribir(el, 'Agregar una nota', 'Primera nota');
    fixture.detectChanges();
    boton(el, 'Guardar nota').click();
    await asentar();
    fixture.detectChanges();
    expect(el.querySelector('.bitacora-aviso')?.textContent?.trim()).toBe('Nota guardada');

    // La 2.ª escritura queda en pausa: mientras guarda, la región está vacía.
    let liberarEscritura!: () => void;
    vi.mocked(set).mockImplementationOnce(
      (clave, valor) =>
        new Promise<void>((resolver) => {
          liberarEscritura = () => {
            memoria.set(clave as string, valor);
            resolver();
          };
        }),
    );
    escribir(el, 'Agregar una nota', 'Segunda nota');
    fixture.detectChanges();
    boton(el, 'Guardar nota').click();
    await asentar();
    fixture.detectChanges();
    expect(el.querySelector('.bitacora-aviso')?.textContent?.trim()).toBe('');

    liberarEscritura();
    await asentar();
    fixture.detectChanges();

    expect(el.querySelector('.bitacora-aviso')?.textContent?.trim()).toBe('Nota guardada');
    expect(campoNota(el).value).toBe('');
    expect(pendienteGuardado()?.bitacora.map((e) => e.tipo)).toEqual(['creado', 'nota', 'nota']);
  });

  it('si cambia el id de la ruta, la pantalla recarga el otro pendiente', async () => {
    // m1 (QA 3.5): la ruta se suscribe, no se lee una sola vez del snapshot.
    memoria.set('pendiente:p1', pendiente());
    memoria.set('pendiente:p2', pendiente({ id: 'p2', farmacia: 'Droguería La 2' }));
    const ruta$ = new BehaviorSubject(convertToParamMap({ id: 'p1' }));
    const fixture = await crear('p1', ruta$.asObservable());
    const el: HTMLElement = fixture.nativeElement;

    expect(el.textContent).toContain('Droguería La 12');

    ruta$.next(convertToParamMap({ id: 'p2' }));
    await asentar();
    fixture.detectChanges();

    expect(el.textContent).toContain('Droguería La 2');
    expect(el.textContent).not.toContain('Droguería La 12');
  });

  it('registra la queja de la escalera: paso 1 "Completado" y paso 2 habilitado', async () => {
    // Verificación de la tarea 3.5: tras registrar la queja, el paso 1 queda visible.
    const vencido = pendiente({
      id: 'pv',
      horaReclamo: hace(49),
      bitacora: [{ en: hace(49), tipo: 'creado', texto: 'Registraste el pendiente' }],
    });
    memoria.set('pendiente:pv', vencido);
    const fixture = await crear('pv');
    const el: HTMLElement = fixture.nativeElement;

    boton(el, 'Registrar queja ante la EPS').click();
    fixture.detectChanges();
    escribir(el, 'Número de radicado', 'PQR-123');
    fixture.detectChanges();
    boton(el, 'Guardar').click();
    await asentar();
    fixture.detectChanges();

    const guardado = pendienteGuardado('pv');
    expect(guardado?.quejaEps).toMatchObject({ radicado: 'PQR-123' });
    expect(guardado?.bitacora.at(-1)).toMatchObject({
      tipo: 'queja-eps',
      texto: 'Queja ante la EPS (radicado n.° PQR-123)',
    });
    expect(guardado).not.toHaveProperty('estado'); // el estado sigue derivado

    expect(el.textContent).toContain('Completado');
    expect(el.textContent).toContain('radicado n.° PQR-123');
    expect(el.textContent).toContain(
      'Si la EPS no responde o no entrega, puedes quejarte ante la Supersalud',
    );
  });

  it('el primer toque al recorditorio descarga el .ics y marca la descarga', async () => {
    capacitor.Capacitor.isNativePlatform.mockReturnValue(false); // camino de la PWA
    const p = pendiente();
    memoria.set('pendiente:p1', p);
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    boton(el, 'Agregar recordatorio a mi calendario').click();
    await asentar();
    fixture.detectChanges();

    expect(enlaces[0]?.download).toBe('pendiente-p1.ics');
    const ics = await ultimoBlob!.text();
    expect(ics).toContain('UID:pendiente-p1@pendientes48');
    expect(ics).toContain('DTSTART:');
    // DTSTART en UTC a la hora de vencimiento (hora de reclamo + 48 h).
    const ven = new Date(Date.parse(p.horaReclamo) + 48 * 3_600_000);
    const dos = (n: number): string => String(n).padStart(2, '0');
    const utc =
      `${ven.getUTCFullYear()}${dos(ven.getUTCMonth() + 1)}${dos(ven.getUTCDate())}` +
      `T${dos(ven.getUTCHours())}${dos(ven.getUTCMinutes())}${dos(ven.getUTCSeconds())}Z`;
    expect(ics).toContain(`DTSTART:${utc}`);

    expect(pendienteGuardado()?.icsAgregadoEn).toBeTruthy();
  });

  it('el segundo toque avisa con la fecha y permite descargar de nuevo', async () => {
    // Verificación de la tarea 3.5: el segundo toque muestra el aviso primero.
    capacitor.Capacitor.isNativePlatform.mockReturnValue(false);
    const p = pendiente({ icsAgregadoEn: hace(40) });
    memoria.set('pendiente:p1', p);
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    boton(el, 'Agregar recordatorio a mi calendario').click();
    await asentar();
    fixture.detectChanges();

    const dialogo = el.querySelector('[role="dialog"]');
    expect(dialogo?.textContent).toContain(
      `Ya agregaste este recordatorio el ${fechaLegible(p.icsAgregadoEn!)}`,
    );
    expect(ultimoBlob).toBeUndefined(); // aún no descarga nada

    boton(el, 'Descargar de nuevo').click();
    await asentar();
    fixture.detectChanges();

    expect(el.querySelector('[role="dialog"]')).toBeNull();
    expect(enlaces).toHaveLength(1);
    expect(await ultimoBlob!.text()).toContain('UID:pendiente-p1@pendientes48');

    // "Cerrar" deja el diálogo sin descargar.
    boton(el, 'Agregar recordatorio a mi calendario').click();
    fixture.detectChanges();
    boton(el, 'Cerrar').click();
    fixture.detectChanges();
    expect(el.querySelector('[role="dialog"]')).toBeNull();
    expect(enlaces).toHaveLength(1);
  });

  it('al borrar se confirma primero y luego se cancela el aviso, se borra la foto y el pendiente', async () => {
    // Verificación de la tarea 3.5: borrar desaparece de inicio, con su aviso y su foto.
    const conFoto = pendiente({ fotoComprobanteKey: 'foto-abc' });
    memoria.set('pendiente:p1', conFoto);
    memoria.set('foto:foto-abc', new Blob(['foto']));
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    const navegar = navegarAPrueba();

    boton(el, 'Borrar').click();
    fixture.detectChanges();

    const dialogo = el.querySelector('[role="dialog"]');
    expect(dialogo?.textContent).toContain('¿Borrar este pendiente?');
    expect(dialogo?.textContent).toContain(
      'Se cancelará su aviso y se eliminará su foto del comprobante. Esta acción no se puede deshacer.',
    );
    expect(document.activeElement?.textContent?.trim()).toBe('Borrar'); // foco inicial
    expect(pendienteGuardado()).toBeTruthy(); // aún no borra nada

    // El botón destructivo es el del diálogo (el de la lista de acciones dice igual).
    const confirmar = el.querySelector<HTMLButtonElement>(
      '[role="dialog"] .p48-boton-principal',
    );
    expect(confirmar?.textContent?.trim()).toBe('Borrar');
    expect(confirmar?.classList.contains('p48-boton-principal--destructivo')).toBe(true);
    confirmar!.click();
    await asentar();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(toasts.controller.create).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Pendiente borrado' }),
    );
    expect(cap.cancel).toHaveBeenCalledTimes(1); // el aviso programado se cancela
    expect(pendienteGuardado()).toBeUndefined();
    expect(memoria.has('foto:foto-abc')).toBe(false); // la foto también se elimina
    expect(navegar).toHaveBeenCalledWith('/');
  });

  it('cancelar la confirmación de borrado no borra nada', async () => {
    memoria.set('pendiente:p1', pendiente());
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    const navegar = navegarAPrueba();

    boton(el, 'Borrar').click();
    fixture.detectChanges();
    boton(el, 'Cancelar').click();
    fixture.detectChanges();

    expect(el.querySelector('[role="dialog"]')).toBeNull();
    expect(pendienteGuardado()).toBeTruthy();
    expect(cap.cancel).not.toHaveBeenCalled();
    expect(navegar).not.toHaveBeenCalled();
  });

  it('la foto del comprobante se ve y su URL se revoca al salir de la pantalla', async () => {
    memoria.set('pendiente:p1', pendiente({ fotoComprobanteKey: 'foto-abc' }));
    memoria.set('foto:foto-abc', new Blob(['foto'], { type: 'image/jpeg' }));
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    const foto = el.querySelector('img.detalle-foto') as HTMLImageElement | null;
    expect(foto?.getAttribute('src')).toBe('blob:p48');
    expect(foto?.alt).toBe('Foto del comprobante de compra');

    fixture.destroy();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:p48');
  });

  it('si la foto no se puede leer, el pendiente se ve igual sin ella', async () => {
    memoria.set('pendiente:p1', pendiente({ fotoComprobanteKey: 'foto-abc' }));
    memoria.set('foto:foto-abc', new Blob(['foto']));
    // El get de la foto rechaza (IndexedDB incompleto); el pendiente y el perfil sí se leen.
    vi.mocked(get)
      .mockImplementationOnce(
        () => Promise.resolve(memoria.get('pendiente:p1')) as never,
      )
      .mockImplementationOnce(() => Promise.resolve(paciente) as never)
      .mockRejectedValueOnce(new Error('foto ilegible'));
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('img.detalle-foto')).toBeNull();
    expect(el.textContent).toContain('Droguería La 12'); // el pendiente se ve completo
    expect(el.querySelector('[role="alert"]')?.textContent?.trim()).toBe(''); // sin error en pantalla
  });

  it('"Editar" abre el formulario de edición del pendiente', async () => {
    memoria.set('pendiente:p1', pendiente());
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    const navegar = navegarAPrueba();

    boton(el, 'Editar').click();

    expect(navegar).toHaveBeenCalledWith('/pendientes/p1/editar');
  });

  it('hay un solo botón sólido y ningún botón fuera del catálogo de acciones', async () => {
    capacitor.Capacitor.isNativePlatform.mockReturnValue(false); // sin banner de permiso
    memoria.set('pendiente:p1', pendiente());
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    expect([...el.querySelectorAll('.p48-boton-principal')]).toHaveLength(1);
    expect(boton(el, 'Ya me llegó')).toBeTruthy();

    const permitidos = [
      'Ya me llegó',
      'Agregar recordatorio a mi calendario',
      'Editar',
      'Regenerar documento',
      'Borrar',
      'Registrar queja ante la EPS',
      'Registrar queja ante la Supersalud',
      'Guardar nota',
    ];
    const textos = [...el.querySelectorAll('button')].map((b) => b.textContent?.trim());
    expect(textos.every((t) => t !== undefined && permitidos.includes(t))).toBe(true);
    expect(textos.length).toBeGreaterThan(3);
  });

  it('si una acción de escritura falla, el fallo se anuncia sin romper la pantalla', async () => {
    vi.mocked(set).mockRejectedValueOnce(new ErrorDeEscritura('guardar'));
    memoria.set('pendiente:p1', pendiente());
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    boton(el, 'Ya me llegó').click();
    await asentar();
    fixture.detectChanges();

    expect(el.querySelector('.detalle-error')?.textContent).toContain(
      'No se pudo guardar. Libera espacio e intenta de nuevo',
    );
    expect(pendienteGuardado()?.entregadoEn).toBeUndefined();
    expect(boton(el, 'Ya me llegó')).toBeTruthy(); // la pantalla sigue usable
  });

  /* — Tarea 3.6 · hoja del documento, copia, PDF y compartir — — — — — — */

  it('el paso 3 abre la hoja con la plantilla aprobada y el aviso en pantalla', async () => {
    const p = conQueja();
    memoria.set('pendiente:pv', p);
    const fixture = await crear('pv');
    const el: HTMLElement = fixture.nativeElement;

    await abrirHoja(fixture);
    const dialogo = hoja(el);

    expect(dialogo.textContent).toContain('Generar queja ante la EPS');
    expect(dialogo.textContent).toContain('Nada por corregir.');
    expect(dialogo.textContent).toContain(AVISO_NO_ASESORIA);
    // Con domicilio autorizado en la farmacia no sale la nota del paso 1.
    expect(dialogo.textContent).not.toContain(NOTA_AUTORIZACION_DOMICILIO);
    const area = dialogo.querySelector('textarea') as HTMLTextAreaElement;
    expect(area.value).toBe(textoCorto({ paso: 1, paciente, pendiente: p }));
    // Único sólido de la hoja abierta: su acción de compartir.
    expect(dialogo.querySelectorAll('.p48-boton-principal')).toHaveLength(1);
  });

  it('la nota de autorización aparece en la vista previa si NO autorizó el domicilio', async () => {
    memoria.set('pendiente:pv', conQueja({ autorizoDomicilio: false }));
    const fixture = await crear('pv');
    const el: HTMLElement = fixture.nativeElement;

    await abrirHoja(fixture);
    expect(hoja(el).textContent).toContain(NOTA_AUTORIZACION_DOMICILIO);
  });

  it('"Copiar texto" copia la plantilla sin el aviso y anuncia "Texto copiado"', async () => {
    const p = conQueja();
    memoria.set('pendiente:pv', p);
    const fixture = await crear('pv');
    const el: HTMLElement = fixture.nativeElement;

    await abrirHoja(fixture);
    boton(el, 'Copiar texto').click();
    await asentar();
    fixture.detectChanges();

    expect(clipboard.Clipboard.write).toHaveBeenCalledTimes(1);
    const escrito = clipboard.Clipboard.write.mock.calls[0][0].string;
    expect(escrito).toBe(textoCorto({ paso: 1, paciente, pendiente: p }));
    expect(escrito).not.toContain(AVISO_NO_ASESORIA);
    expect(hoja(el).querySelector('[role="status"]')?.textContent).toContain('Texto copiado');
  });

  it('cada acción anuncia lo suyo: tras "PDF descargado", copiar anuncia "Texto copiado"', async () => {
    capacitor.Capacitor.isNativePlatform.mockReturnValue(false);
    const p = conQueja();
    memoria.set('pendiente:pv', p);
    const fixture = await crear('pv');
    const el: HTMLElement = fixture.nativeElement;

    await abrirHoja(fixture);
    boton(el, 'PDF').click();
    await asentar();
    fixture.detectChanges();
    expect(hoja(el).querySelector('[role="status"]')?.textContent).toContain('PDF descargado');

    // La copia reemplaza el aviso del PDF (el aviso tenía prioridad en la región viva).
    boton(el, 'Copiar texto').click();
    await asentar();
    fixture.detectChanges();
    const estado = () => hoja(el).querySelector('[role="status"]')?.textContent ?? '';
    expect(estado()).toContain('Texto copiado');
    expect(estado()).not.toContain('PDF descargado');

    // Y al revés: el 2.º PDF (confirmado) reemplaza "Texto copiado".
    boton(el, 'PDF').click();
    fixture.detectChanges();
    boton(el, 'Generar otra').click();
    await asentar();
    fixture.detectChanges();
    expect(estado()).toContain('PDF descargado');
    expect(estado()).not.toContain('Texto copiado');
    expect(pdf.docs).toHaveLength(2);
  });

  it('en la PWA "PDF" genera con pdfmake: fundamento legal, bitácora, foto y pie', async () => {
    capacitor.Capacitor.isNativePlatform.mockReturnValue(false);
    const p = conQueja({ fotoComprobanteKey: 'foto-abc' });
    memoria.set('pendiente:pv', p);
    memoria.set('foto:foto-abc', new Blob(['foto'], { type: 'image/jpeg' }));
    const fixture = await crear('pv');
    const el: HTMLElement = fixture.nativeElement;

    await abrirHoja(fixture);
    boton(el, 'PDF').click();
    await asentar();
    fixture.detectChanges();

    expect(pdf.docs).toHaveLength(1);
    const documento = JSON.stringify(pdf.docs[0]);
    expect(documento).toContain('Con fundamento en el artículo 131');
    expect(documento).toContain('Anexo 1. Bitácora');
    expect(documento).toContain('data:image/jpeg;base64,');
    expect(pdf.docs[0].footer).toBe(PIE_PDF);
    expect(enlaces[0]?.download).toBe('queja-eps-pv.pdf');
    expect(hoja(el).querySelector('[role="status"]')?.textContent).toContain('PDF descargado');
  });

  it('compartir usa la hoja nativa con el PDF y lo borra de la caché al terminar', async () => {
    const p = conQueja();
    memoria.set('pendiente:pv', p);
    const fixture = await crear('pv');
    const el: HTMLElement = fixture.nativeElement;

    await abrirHoja(fixture);
    boton(el, 'Descargar y compartir').click();
    await asentar();
    fixture.detectChanges();

    expect(pdf.docs).toHaveLength(1);
    const escritura = fs.Filesystem.writeFile.mock.calls.at(-1)?.[0] as {
      path: string;
      directory: string;
    };
    expect(escritura.path).toBe('queja-eps-pv.pdf');
    expect(escritura.directory).toBe('CACHE');
    expect(share.Share.share).toHaveBeenCalledTimes(1);
    const opciones = share.Share.share.mock.calls[0][0] as { files: string[] };
    expect(opciones.files).toEqual(['archivo']);
    expect(fs.Filesystem.deleteFile).toHaveBeenCalledTimes(1);
    // Compartido: la hoja nativa ya fue el feedback, sin error.
    expect(hoja(el).querySelector('[role="alert"]')?.textContent?.trim()).toBe('');
  });

  it('el 2.º PDF de la misma queja pide confirmación antes de generar', async () => {
    capacitor.Capacitor.isNativePlatform.mockReturnValue(false);
    memoria.set('pendiente:pv', conQueja());
    const fixture = await crear('pv');
    const el: HTMLElement = fixture.nativeElement;

    await abrirHoja(fixture);
    boton(el, 'PDF').click();
    await asentar();
    fixture.detectChanges();
    expect(pdf.docs).toHaveLength(1);

    boton(el, 'PDF').click();
    fixture.detectChanges();
    expect(hoja(el).textContent).toContain('Ya habías generado una queja. ¿Generar otra?');
    expect(pdf.docs).toHaveLength(1); // aún no genera nada

    boton(el, 'Generar otra').click();
    await asentar();
    fixture.detectChanges();
    expect(pdf.docs).toHaveLength(2);
    expect(hoja(el).textContent).not.toContain('¿Generar otra?');
  });

  it('cancelar la confirmación del 2.º PDF no vuelve a generar', async () => {
    capacitor.Capacitor.isNativePlatform.mockReturnValue(false);
    memoria.set('pendiente:pv', conQueja());
    const fixture = await crear('pv');
    const el: HTMLElement = fixture.nativeElement;

    await abrirHoja(fixture);
    boton(el, 'PDF').click();
    await asentar();
    fixture.detectChanges();

    boton(el, 'PDF').click();
    fixture.detectChanges();
    expect(hoja(el).textContent).toContain('¿Generar otra?');

    boton(el, 'Cancelar').click();
    fixture.detectChanges();
    expect(hoja(el).textContent).not.toContain('¿Generar otra?');
    expect(pdf.docs).toHaveLength(1);
    expect(boton(el, 'PDF').disabled).toBe(false);
  });

  it('un doble toque en "PDF" genera UNA sola vez', async () => {
    capacitor.Capacitor.isNativePlatform.mockReturnValue(false);
    memoria.set('pendiente:pv', conQueja());
    const fixture = await crear('pv');
    const el: HTMLElement = fixture.nativeElement;
    await abrirHoja(fixture);

    let liberarPdf!: (b: Blob) => void;
    pdf.createPdf.mockImplementationOnce(
      () => ({
        getBlob: () =>
          new Promise<Blob>((resolver) => {
            liberarPdf = resolver;
          }),
      }),
    );

    boton(el, 'PDF').click();
    fixture.detectChanges();
    expect(boton(el, 'PDF').disabled).toBe(true); // el botón se desactiva
    await fixture.componentInstance.pedirPdf('descargar'); // segundo toque
    liberarPdf(new Blob(['pdf'], { type: 'application/pdf' }));
    await asentar();
    fixture.detectChanges();

    expect(pdf.createPdf).toHaveBeenCalledTimes(1);
  });

  it('el PDF editable web descarga el texto corregido con su nombre editable', async () => {
    capacitor.Capacitor.isNativePlatform.mockReturnValue(false);
    memoria.set('pendiente:pv', conQueja());
    const fixture = await crear('pv');
    const el: HTMLElement = fixture.nativeElement;
    await abrirHoja(fixture);

    const area = hoja(el).querySelector('textarea') as HTMLTextAreaElement;
    area.value = 'Cuerpo corregido por la persona';
    area.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();

    boton(el, 'PDF editable').click();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    const doc = el.querySelector('.doc-fondo') as HTMLElement;
    expect(doc).toBeTruthy();
    expect(doc.textContent).toContain('Esta versión es editable');

    boton(doc, 'Descargar PDF editable').click();
    await asentar();
    fixture.detectChanges();

    expect(pdf.docs).toHaveLength(1);
    expect(JSON.stringify(pdf.docs[0])).toContain('Cuerpo corregido por la persona');
    expect(pdf.docs[0].footer).toBe(PIE_PDF);
    expect(enlaces[0]?.download).toBe('queja-eps-pv-editable.pdf');
  });

  it('re-registrar la queja permite generar el PDF nuevo sin confirmar', async () => {
    capacitor.Capacitor.isNativePlatform.mockReturnValue(false);
    memoria.set('pendiente:pv', conQueja());
    const fixture = await crear('pv');
    const el: HTMLElement = fixture.nativeElement;

    await abrirHoja(fixture);
    boton(el, 'PDF').click();
    await asentar();
    fixture.detectChanges();
    expect(pdf.docs).toHaveLength(1);

    // La hoja se cierra, se corrige la queja y se vuelve a abrir.
    boton(el, 'Cerrar').click();
    fixture.detectChanges();
    boton(el, 'Corregir queja ante la EPS').click();
    fixture.detectChanges();
    boton(el, 'Guardar').click();
    await asentar();
    fixture.detectChanges();

    await abrirHoja(fixture);
    boton(el, 'PDF').click();
    await asentar();
    fixture.detectChanges();

    expect(pdf.docs).toHaveLength(2); // otra queja: sin panel de confirmación
    expect(hoja(el).textContent).not.toContain('¿Generar otra?');
  });

  it('en Android la hoja solo ofrece compartir y copiar (sin descarga directa)', async () => {
    memoria.set('pendiente:pv', conQueja());
    const fixture = await crear('pv');
    const el: HTMLElement = fixture.nativeElement;

    await abrirHoja(fixture);
    expect(boton(el, 'Descargar y compartir')).toBeTruthy();
    expect(boton(el, 'Copiar texto')).toBeTruthy();
    expect([...el.querySelectorAll('.hoja-fondo button')].some((b) => b.textContent?.trim() === 'PDF')).toBe(
      false,
    );
    expect(
      [...el.querySelectorAll('.hoja-fondo button')].some(
        (b) => b.textContent?.trim() === 'PDF editable',
      ),
    ).toBe(false);
  });

  it('una queja con fecha futura bloquea el paso 3 y anuncia su fecha', async () => {
    const futura = new Date(Date.now() + 24 * 3_600_000).toISOString();
    memoria.set('pendiente:pv', conQueja({ quejaEps: { radicadaEn: futura } }));
    const fixture = await crear('pv');
    const el: HTMLElement = fixture.nativeElement;

    expect(boton(el, 'Generar queja ante la EPS').disabled).toBe(true);
    expect(el.querySelector('.escalera-aviso')?.textContent).toContain(
      'Tu queja ante la EPS es para el',
    );
    expect(el.querySelector('.hoja-fondo')).toBeNull();
  });

  it('la guarda es por queja: con la EPS en orden solo el paso 4 queda bloqueado y anuncia SU fecha', async () => {
    const futura = new Date(Date.now() + 24 * 3_600_000).toISOString();
    memoria.set(
      'pendiente:pv',
      conQueja({ quejaSupersalud: { radicadaEn: futura, radicado: 'SUP-9' } }),
    );
    const fixture = await crear('pv');
    const el: HTMLElement = fixture.nativeElement;

    expect(boton(el, 'Generar queja ante la EPS').disabled).toBe(false);
    expect(boton(el, 'Generar queja ante la Supersalud').disabled).toBe(true);
    const aviso = el.querySelector('.escalera-aviso')?.textContent ?? '';
    expect(aviso).toContain('Tu queja ante la Supersalud es para el');
    expect(aviso).not.toContain('ante la EPS');
  });

  it('«Regenerar documento» se deshabilita con la fecha futura de SU queja y el aviso la anuncia', async () => {
    const futura = new Date(Date.now() + 24 * 3_600_000).toISOString();
    memoria.set(
      'pendiente:pv',
      conQueja({ entregadoEn: hace(2), quejaSupersalud: { radicadaEn: futura, radicado: 'SUP-9' } }),
    );
    const fixture = await crear('pv');
    const el: HTMLElement = fixture.nativeElement;

    // Regenera la queja más avanzada (Supersalud), cuya fecha todavía es futura.
    expect(boton(el, 'Regenerar documento').disabled).toBe(true);
    expect(el.querySelector('.escalera-aviso')?.textContent).toContain(
      'Tu queja ante la Supersalud es para el',
    );
  });

  it('cerrar la hoja no copia ni genera nada', async () => {
    memoria.set('pendiente:pv', conQueja());
    const fixture = await crear('pv');
    const el: HTMLElement = fixture.nativeElement;

    await abrirHoja(fixture);
    boton(el, 'Cerrar').click();
    fixture.detectChanges();

    expect(el.querySelector('.hoja-fondo')).toBeNull();
    expect(pdf.createPdf).not.toHaveBeenCalled();
    expect(clipboard.Clipboard.write).not.toHaveBeenCalled();
    expect(share.Share.share).not.toHaveBeenCalled();
  });

  /* — "Regenerar documento" (decisión de Daniel, vuelta 2 de 3.6) ————————— */

  it('«Regenerar documento» es un terciario visible con queja registrada y pendiente entregado', async () => {
    memoria.set('pendiente:pv', conQueja({ entregadoEn: hace(2) }));
    const fixture = await crear('pv');
    const el: HTMLElement = fixture.nativeElement;

    const regenerar = boton(el, 'Regenerar documento');
    expect(regenerar.className).toContain('p48-boton-terciario');
    expect(regenerar.className).not.toContain('p48-boton-principal');
    expect(regenerar.disabled).toBe(false);
  });

  it('tocar «Regenerar documento» abre la hoja del documento de la EPS', async () => {
    const p = conQueja({ entregadoEn: hace(2) });
    memoria.set('pendiente:pv', p);
    const fixture = await crear('pv');
    const el: HTMLElement = fixture.nativeElement;

    boton(el, 'Regenerar documento').click();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    const dialogo = hoja(el);
    expect(dialogo.textContent).toContain('Generar queja ante la EPS');
    const area = dialogo.querySelector('textarea') as HTMLTextAreaElement;
    expect(area.value).toBe(textoCorto({ paso: 1, paciente, pendiente: p }));
  });

  it('con las dos quejas registradas, regenerar usa la de la Supersalud (la más avanzada)', async () => {
    const p = conQueja({
      entregadoEn: hace(2),
      quejaSupersalud: { radicadaEn: hace(1), radicado: 'SUP-9' },
    });
    memoria.set('pendiente:pv', p);
    const fixture = await crear('pv');
    const el: HTMLElement = fixture.nativeElement;

    boton(el, 'Regenerar documento').click();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    const dialogo = hoja(el);
    expect(dialogo.textContent).toContain('Generar queja ante la Supersalud');
    const area = dialogo.querySelector('textarea') as HTMLTextAreaElement;
    expect(area.value).toBe(textoCorto({ paso: 2, paciente, pendiente: p }));
  });

  it('sin queja registrada no hay «Regenerar documento» aunque el pendiente esté entregado', async () => {
    memoria.set('pendiente:p1', pendiente({ entregadoEn: hace(1) }));
    const fixture = await crear('p1');

    expect(
      [...fixture.nativeElement.querySelectorAll('button')].some(
        (b) => b.textContent?.trim() === 'Regenerar documento',
      ),
    ).toBe(false);
  });

  it('sin queja registrada no hay «Regenerar documento» con el pendiente en plazo', async () => {
    memoria.set('pendiente:p1', pendiente());
    const fixture = await crear('p1');

    expect(
      [...fixture.nativeElement.querySelectorAll('button')].some(
        (b) => b.textContent?.trim() === 'Regenerar documento',
      ),
    ).toBe(false);
  });

  it('con la escalera visible (vencido, escalado) el botón no aparece: regeneran los pasos 3–4', async () => {
    memoria.set('pendiente:pv', conQueja()); // escalado-eps, sin entregar
    const escalado = await crear('pv');
    expect(
      [...escalado.nativeElement.querySelectorAll('button')].some(
        (b) => b.textContent?.trim() === 'Regenerar documento',
      ),
    ).toBe(false);
  });

  it('una queja registrada escala el estado: nunca hay plazo con la escalera oculta', async () => {
    // `estado()` revisa las quejas antes que el tiempo: una queja en plazo
    // sigue siendo "escalado" (escalera visible). Este caso documenta que la
    // combinación "queja + en-plazo" no existe en el modelo.
    memoria.set(
      'pendiente:p1',
      pendiente({
        horaReclamo: hace(2),
        quejaEps: { radicadaEn: hace(1), radicado: 'PQR-1' },
      }),
    );
    const fixture = await crear('p1');

    expect(boton(fixture.nativeElement, 'Generar queja ante la EPS')).toBeTruthy();
    expect(
      [...fixture.nativeElement.querySelectorAll('button')].some(
        (b) => b.textContent?.trim() === 'Regenerar documento',
      ),
    ).toBe(false);
  });
});
