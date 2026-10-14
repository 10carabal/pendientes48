import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { ErrorDeEscritura } from '@data/app-db';
import type { Paciente } from '@domain/paciente/paciente.model';
import type { Pendiente } from '@domain/pendiente/pendiente.model';
import { keys, set } from 'idb-keyval';
import { PendienteForm } from './pendiente-form';

/** Almacén falso en memoria: mismo patrón que `pacientes.spec.ts` e `inicio.spec.ts`. */
const memoria = vi.hoisted(() => new Map<string, unknown>());

const capacitor = vi.hoisted(() => ({
  Capacitor: { isNativePlatform: vi.fn(() => true) },
}));

const cap = vi.hoisted(() => ({
  cancel: vi.fn((_opciones: { notifications: Array<{ id: number }> }) => Promise.resolve()),
  getPending: vi.fn(() => Promise.resolve({ notifications: [] as Array<{ id: number }> })),
  schedule: vi.fn(
    (_opciones: {
      notifications: Array<{ id: number; schedule: { at: Date } }>;
    }) => Promise.resolve({ notifications: [] as Array<{ id: number }> }),
  ),
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
    horaReclamo: hace(46.5), // vence pronto; nunca futura
    autorizoDomicilio: true,
    direccionEntrega: 'Calle 1 # 2-3',
    bitacora: [{ en: hace(46.5), tipo: 'creado', texto: 'Registraste el pendiente' }],
    ...sobrescribe,
  };
}

const dosDigitos = (n: number): string => String(n).padStart(2, '0');

/** `Date` → valor de input `datetime-local` en hora local (mismo formato que la pantalla). */
function aDatetimeLocal(fecha: Date): string {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}T${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}`;
}

/** ISO a precisión de minuto: es lo que la pantalla guarda tras pasar por `datetime-local`. */
function aIsoMinuto(iso: string): string {
  return new Date(aDatetimeLocal(new Date(iso))).toISOString();
}

/** Un ISO a hora local, una hora antes o después de ahora. */
const horaPasada = (): string => aDatetimeLocal(new Date(Date.now() - 3_600_000));
const horaFutura = (): string => aDatetimeLocal(new Date(Date.now() + 3_600_000));

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

/**
 * TestBed no auto-inicializa la ruta (solo `app.config.ts` la define y otros
 * specs no la cargan): el stub lleva `convertToParamMap` para edición.
 */
async function crear(opciones: { id?: string } = {}): Promise<ComponentFixture<PendienteForm>> {
  TestBed.configureTestingModule({
    providers: [
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { paramMap: convertToParamMap(opciones.id ? { id: opciones.id } : {}) },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(PendienteForm);
  fixture.detectChanges();
  await asentar(); // la carga de perfiles y, en edición, del pendiente
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

function marcar(el: HTMLElement, etiqueta: string): void {
  const etiquetaEl = [...el.querySelectorAll('label')].find((l) =>
    l.textContent?.includes(etiqueta),
  );
  const casilla = etiquetaEl?.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
  expect(casilla, `casilla "${etiqueta}"`).toBeTruthy();
  casilla!.click();
}

/** Los campos obligatorios del registro, con una hora pasada válida. */
function llenar(el: HTMLElement, cambios: Partial<Record<'direccion' | 'hora', string>> = {}): void {
  escribir(el, 'Paciente', 'px');
  escribir(el, 'Dirección de entrega', cambios.direccion ?? 'Cra 9 # 8-7');
  escribir(el, 'Medicamento', 'Losartán 50 mg');
  escribir(el, 'Farmacia o gestor', 'Droguería La 12');
  escribir(el, 'Hora de reclamo', cambios.hora ?? horaPasada());
}

async function enviar(fixture: ComponentFixture<PendienteForm>): Promise<void> {
  boton(fixture.nativeElement as HTMLElement, 'Guardar').click();
  await asentar();
  fixture.detectChanges();
}

function pendienteGuardado(): Pendiente | undefined {
  const clave = [...memoria.keys()].find((c) => c.startsWith('pendiente:'));
  return clave === undefined ? undefined : (memoria.get(clave) as Pendiente);
}

function navegarAPrueba(): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
}

describe('PendienteForm', () => {
  beforeEach(() => {
    memoria.clear();
    vi.clearAllMocks();
    capacitor.Capacitor.isNativePlatform.mockReturnValue(true);
    memoria.set('paciente:px', paciente);
    // Por defecto la ayuda de avisos ya se vio: los tests que estudian la hoja la vacían.
    memoria.set('preferencias', { avisoLegalAceptado: true, ayudaAvisosVista: true });
  });

  it('registra un pendiente: guarda, programa el aviso y navega al inicio', async () => {
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    const navegar = navegarAPrueba();

    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Registrar pendiente');
    llenar(el);
    await enviar(fixture);

    const guardado = pendienteGuardado();
    expect(guardado).toMatchObject({
      pacienteId: 'px',
      medicamentos: ['Losartán 50 mg'],
      farmacia: 'Droguería La 12',
      direccionEntrega: 'Cra 9 # 8-7',
      autorizoDomicilio: true,
    });
    expect(guardado?.id).toBeTruthy();
    expect(guardado?.bitacora).toHaveLength(1);
    expect(guardado?.bitacora[0]).toMatchObject({ tipo: 'creado', texto: 'Registraste el pendiente' });
    expect(Date.parse(guardado!.horaReclamo)).toBeLessThan(Date.now());

    // El aviso se programa al vencimiento (hora de reclamo + 48 h), en nativo.
    expect(cap.schedule).toHaveBeenCalledTimes(1);
    const notificacion = cap.schedule.mock.calls[0][0].notifications[0];
    expect(notificacion.schedule.at.getTime()).toBe(Date.parse(guardado!.horaReclamo) + 48 * 3_600_000);
    expect(navegar).toHaveBeenCalledWith('/');
  });

  it('la hora de reclamo se precarga con la hora actual y admite una hora pasada', async () => {
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    const valor = (el.querySelector('#campo-horaReclamo') as HTMLInputElement).value;
    expect(valor).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/); // formato datetime-local
    expect(Math.abs(Date.now() - new Date(valor).getTime())).toBeLessThan(2 * 60_000);

    // Corregirla a una hora anterior (el reclamo fue antes) sí permite guardar.
    const navegar = navegarAPrueba();
    llenar(el, { hora: horaPasada() });
    await enviar(fixture);

    expect(pendienteGuardado()).toBeTruthy();
    expect(navegar).toHaveBeenCalledWith('/');
  });

  it('no guarda sin los campos obligatorios y señala cada campo faltante', async () => {
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    const navegar = navegarAPrueba();

    await enviar(fixture);

    expect(pendienteGuardado()).toBeUndefined();
    expect(navegar).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Falta completar: dirección de entrega.');
    expect(el.textContent).toContain('Falta completar: medicamento.');
    expect([...el.querySelectorAll('[aria-invalid="true"]')]).toHaveLength(4); // sin paciente, dirección, medicamento ni farmacia
    expect(document.activeElement?.id).toBe('campo-pacienteId'); // el primer faltante recibe el foco
  });

  it('no deja guardar con hora futura y señala el campo (validación pura del dominio)', async () => {
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    const navegar = navegarAPrueba();

    llenar(el, { hora: horaFutura() });
    await enviar(fixture);

    expect(pendienteGuardado()).toBeUndefined();
    expect(navegar).not.toHaveBeenCalled();
    expect(el.textContent).toContain('La hora de reclamo no puede ser futura.');
    expect(el.querySelector('#campo-horaReclamo')?.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement?.id).toBe('campo-horaReclamo');
  });

  it('la dirección de entrega es obligatoria en todos los casos', async () => {
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    llenar(el, { direccion: '   ' });
    await enviar(fixture);

    expect(pendienteGuardado()).toBeUndefined();
    expect(el.querySelector('#campo-direccionEntrega')?.getAttribute('aria-invalid')).toBe('true');
    expect(el.textContent).toContain('Falta completar: dirección de entrega.');
  });

  it('no autorizar el domicilio muestra el aviso y permite registrar igual', async () => {
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    const navegar = navegarAPrueba();

    llenar(el);
    escribir(el, '¿Autorizó la entrega a domicilio?', 'no');
    fixture.detectChanges();

    const aviso = el.querySelector('.pendiente-form-aviso');
    expect(aviso?.textContent).toContain('La entrega a domicilio depende de esa autorización');
    expect(aviso?.classList.contains('p48-barra-acento--aviso')).toBe(true);

    await enviar(fixture);

    expect(pendienteGuardado()?.autorizoDomicilio).toBe(false);
    expect(navegar).toHaveBeenCalledWith('/');
  });

  it('con "Lo gestiono por otra persona" los 4 datos son obligatorios y se guardan', async () => {
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    llenar(el);
    marcar(el, 'Lo gestiono por otra persona');
    fixture.detectChanges();
    expect(el.textContent).toContain('en nombre del paciente');

    await enviar(fixture);
    expect(pendienteGuardado()).toBeUndefined(); // gestión incompleta no deja guardar
    expect(el.textContent).toContain('Falta completar: nombre de quien gestiona.');
    expect(el.textContent).toContain('Falta completar: parentesco.');

    escribir(el, 'Nombre completo', 'Carlos Ruiz');
    escribir(el, 'Tipo de documento', 'CC');
    escribir(el, 'Número de documento', '9000000');
    escribir(el, 'Parentesco', 'hijo');
    await enviar(fixture);

    expect(pendienteGuardado()?.gestion).toEqual({
      nombre: 'Carlos Ruiz',
      tipoDocumento: 'CC',
      numeroDocumento: '9000000',
      parentesco: 'hijo',
    });
  });

  it('elige el paciente y le precarga la dirección del perfil', async () => {
    memoria.set(
      'paciente:py',
      { ...paciente, id: 'py', nombre: 'Luis Gómez', direccion: 'Av. Siempre Viva 742' },
    );
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    escribir(el, 'Paciente', 'py');
    fixture.detectChanges();

    expect((el.querySelector('#campo-direccionEntrega') as HTMLInputElement).value).toBe(
      'Av. Siempre Viva 742',
    );

    // y el usuario puede corregirla antes de guardar
    const navegar = navegarAPrueba();
    escribir(el, 'Dirección de entrega', 'Cra 1 # 2-3');
    escribir(el, 'Medicamento', 'Metformina 850 mg');
    escribir(el, 'Farmacia o gestor', 'Farmacia del Barrio');
    await enviar(fixture);

    expect(pendienteGuardado()).toMatchObject({
      pacienteId: 'py',
      direccionEntrega: 'Cra 1 # 2-3',
      medicamentos: ['Metformina 850 mg'],
    });
    expect(navegar).toHaveBeenCalledWith('/');
  });

  it('al editar conserva la bitácora, la queja, la foto y el ICS, y reprograma el aviso', async () => {
    const original = pendiente({
      id: 'pd1',
      horaReclamo: aIsoMinuto(hace(46.5)),
      quejaEps: { radicadaEn: hace(2), radicado: 'PQR-123' },
      icsAgregadoEn: hace(40),
      fotoComprobanteKey: 'foto-abc',
      gestion: {
        nombre: 'Carlos Ruiz',
        tipoDocumento: 'CC',
        numeroDocumento: '9000000',
        parentesco: 'hijo',
      },
      bitacora: [
        { en: hace(46.5), tipo: 'creado', texto: 'Registraste el pendiente' },
        { en: hace(2), tipo: 'queja-eps', texto: 'Radicate la queja ante la EPS' },
      ],
    });
    memoria.set('pendiente:pd1', original);
    const fixture = await crear({ id: 'pd1' });
    const el: HTMLElement = fixture.nativeElement;
    const navegar = navegarAPrueba();

    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Editar pendiente');
    expect((el.querySelector('#campo-medicamentos') as HTMLTextAreaElement).value).toBe(
      'Losartán 50 mg',
    );
    expect((el.querySelector('#campo-horaReclamo') as HTMLInputElement).value).toBe(
      aDatetimeLocal(new Date(original.horaReclamo)),
    );
    expect((el.querySelector('#campo-gestionNombre') as HTMLInputElement).value).toBe(
      'Carlos Ruiz',
    );

    escribir(el, 'Medicamento', 'Metformina 850 mg');
    await enviar(fixture);

    expect(pendienteGuardado()).toEqual({
      ...original,
      medicamentos: ['Metformina 850 mg'],
    });
    expect(cap.schedule).toHaveBeenCalledTimes(1); // el aviso se reprograma con la misma hora
    expect(navegar).toHaveBeenCalledWith('/');
  });

  it('con una queja registrada la hora aparece bloqueada con su nota', async () => {
    memoria.set(
      'pendiente:pd1',
      pendiente({
        horaReclamo: aIsoMinuto(hace(46.5)),
        quejaEps: { radicadaEn: hace(2), radicado: 'PQR-123' },
      }),
    );
    const fixture = await crear({ id: 'pd1' });
    const el: HTMLElement = fixture.nativeElement;

    const hora = el.querySelector('#campo-horaReclamo') as HTMLInputElement;
    expect(hora.disabled).toBe(true);
    expect(el.textContent).toContain('La hora de reclamo queda bloqueada');

    // el resto del formulario sí se puede editar y guardar
    const navegar = navegarAPrueba();
    escribir(el, 'Dirección de entrega', 'Cra 5 # 6-7');
    await enviar(fixture);
    expect(pendienteGuardado()?.direccionEntrega).toBe('Cra 5 # 6-7');
    expect(navegar).toHaveBeenCalledWith('/');
  });

  it('si falla la escritura muestra el mensaje y conserva todo lo escrito', async () => {
    vi.mocked(set).mockRejectedValueOnce(new ErrorDeEscritura('guardar'));
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    const navegar = navegarAPrueba();

    llenar(el);
    escribir(el, '¿Autorizó la entrega a domicilio?', 'no');
    await enviar(fixture);

    expect(el.textContent).toContain('No se pudo guardar. Libera espacio e intenta de nuevo');
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Registrar pendiente'); // sigue en el form
    expect((el.querySelector('#campo-direccionEntrega') as HTMLInputElement).value).toBe(
      'Cra 9 # 8-7',
    );
    expect((el.querySelector('#campo-autorizoDomicilio') as HTMLSelectElement).value).toBe('no');
    expect(pendienteGuardado()).toBeUndefined();
    expect(navegar).not.toHaveBeenCalled();
  });

  it('la hoja de ayuda de avisos se abre la primera vez en Android y se marca al cerrar', async () => {
    memoria.delete('preferencias'); // primera vez: nunca vista
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    const navegar = navegarAPrueba();

    llenar(el);
    await enviar(fixture);

    expect(pendienteGuardado()).toBeTruthy(); // el pendiente ya quedó guardado
    expect(navegar).not.toHaveBeenCalled(); // la navegación espera a cerrar la hoja
    const hoja = el.querySelector('[role="dialog"]');
    expect(hoja?.textContent).toContain('¿Cómo asegurar que te llegue el aviso?');

    boton(el, 'Entendido').click();
    await asentar();
    fixture.detectChanges();

    expect(el.querySelector('[role="dialog"]')).toBeNull();
    expect(memoria.get('preferencias')).toMatchObject({ ayudaAvisosVista: true });
    expect(navegar).toHaveBeenCalledWith('/');
  });

  it('si la ayuda ya se vio no se vuelve a abrir', async () => {
    await set('preferencias', { avisoLegalAceptado: true, ayudaAvisosVista: true });
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    const navegar = navegarAPrueba();

    llenar(el);
    await enviar(fixture);

    expect(el.querySelector('[role="dialog"]')).toBeNull();
    expect(navegar).toHaveBeenCalledWith('/');
  });

  it('en la PWA la hoja de ayuda no se abre y se navega de inmediato', async () => {
    capacitor.Capacitor.isNativePlatform.mockReturnValue(false);
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    const navegar = navegarAPrueba();

    llenar(el);
    await enviar(fixture);

    expect(cap.schedule).not.toHaveBeenCalled(); // en la PWA el aviso es un no-op
    expect(el.querySelector('[role="dialog"]')).toBeNull();
    expect(navegar).toHaveBeenCalledWith('/');
  });

  it('al editar no se abre la hoja de ayuda (solo en el primer registro)', async () => {
    memoria.delete('preferencias'); // nativo con la ayuda sin ver: aun así no se abre al editar
    memoria.set('pendiente:pd1', pendiente({ horaReclamo: aIsoMinuto(hace(46.5)) }));
    const fixture = await crear({ id: 'pd1' });
    const el: HTMLElement = fixture.nativeElement;
    const navegar = navegarAPrueba();

    escribir(el, 'Farmacia o gestor', 'Farmacia del Barrio');
    await enviar(fixture);

    expect(el.querySelector('[role="dialog"]')).toBeNull();
    expect(navegar).toHaveBeenCalledWith('/');
  });

  it('si falla la lectura ofrece volver al inicio', async () => {
    vi.mocked(keys).mockRejectedValueOnce(new Error('sin índice'));
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    const navegar = navegarAPrueba();

    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'No se pudo leer la información. Intenta de nuevo.',
    );
    expect(el.querySelector('form')).toBeNull();

    boton(el, 'Volver').click();

    expect(navegar).toHaveBeenCalledWith('/');
  });

  it('un pendiente inexistente en la ruta también ofrece volver', async () => {
    const fixture = await crear({ id: 'no-existe' });
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'No se pudo leer la información. Intenta de nuevo.',
    );
    expect(boton(el, 'Volver')).toBeTruthy();
  });
});
