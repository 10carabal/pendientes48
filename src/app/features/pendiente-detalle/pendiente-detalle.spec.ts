import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router, type ParamMap } from '@angular/router';
import { ErrorDeEscritura } from '@data/app-db';
import type { Paciente } from '@domain/paciente/paciente.model';
import type { Pendiente } from '@domain/pendiente/pendiente.model';
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

const fs = vi.hoisted(() => ({
  Directory: { Documents: 'DOCUMENTS', Cache: 'CACHE' },
  Encoding: { UTF8: 'UTF-8' },
  Filesystem: { writeFile: vi.fn((_opciones: unknown) => Promise.resolve({ uri: 'archivo' })) },
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

describe('PendienteDetalle', () => {
  beforeEach(() => {
    memoria.clear();
    vi.clearAllMocks();
    capacitor.Capacitor.isNativePlatform.mockReturnValue(true);
    cap.checkPermissions.mockResolvedValue({ display: 'denied' } as never);
    cap.requestPermissions.mockResolvedValue({ display: 'granted' } as never);
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
});
