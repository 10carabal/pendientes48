import type { Pendiente } from '@domain/pendiente/pendiente.model';
import {
  borrarPendiente,
  guardarFoto,
  guardarPendiente,
  leerFoto,
  leerPendiente,
  listarPendientes,
} from './pendientes-store';

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

const pendiente: Pendiente = {
  id: 'pd1',
  pacienteId: 'p1',
  gestion: {
    nombre: 'Carlos Ruiz',
    tipoDocumento: 'CC',
    numeroDocumento: '9000000',
    parentesco: 'hijo',
  },
  medicamentos: ['Metformina 850 mg', 'Losartán 50 mg'],
  farmacia: 'Farmacia del Barrio',
  horaReclamo: '2026-10-05T15:15:00-05:00',
  numeroComprobante: 'F-00123',
  autorizoDomicilio: true,
  direccionEntrega: 'Calle 1 # 2-3, Barrio Nuevo',
  quejaEps: { radicadaEn: '2026-10-07T09:00:00-05:00', radicado: 'PQR-123' },
  bitacora: [
    { en: '2026-10-05T15:15:00-05:00', tipo: 'creado', texto: 'Registraste el pendiente' },
    { en: '2026-10-07T09:00:00-05:00', tipo: 'queja-eps', texto: 'Radicate la queja ante la EPS' },
  ],
};

const foto = (): Blob => new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' });

describe('pendientes-store', () => {
  beforeEach(() => {
    memoria.clear();
  });

  it('guarda y lee un pendiente con su bitácora', async () => {
    await guardarPendiente(pendiente);

    expect(await leerPendiente('pd1')).toEqual(pendiente);
    expect(await leerPendiente('no-existe')).toBeUndefined();
  });

  it('lista los pendientes guardados', async () => {
    await guardarPendiente(pendiente);
    await guardarPendiente({ ...pendiente, id: 'pd2', quejaEps: undefined });

    const lista = await listarPendientes();

    expect(lista.map((p) => p.id).sort()).toEqual(['pd1', 'pd2']);
  });

  it('guarda la foto del comprobante como Blob y devuelve su clave', async () => {
    const claveFoto = await guardarFoto(foto());

    expect(claveFoto).toBeTruthy();
    const leida = await leerFoto(claveFoto);
    expect(leida).toBeInstanceOf(Blob);
    expect(leida?.type).toBe('image/jpeg');
    expect(leida?.size).toBe(3);
    expect(await leerFoto('no-existe')).toBeUndefined();
  });

  it('borrarPendiente elimina también la foto del comprobante', async () => {
    const claveFoto = await guardarFoto(foto());
    await guardarPendiente({ ...pendiente, fotoComprobanteKey: claveFoto });

    await borrarPendiente('pd1');

    expect(await leerPendiente('pd1')).toBeUndefined();
    expect(await leerFoto(claveFoto)).toBeUndefined();
    expect(await listarPendientes()).toEqual([]);
    expect([...memoria.keys()]).toEqual([]);
  });
});
