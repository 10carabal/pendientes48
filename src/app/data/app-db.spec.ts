import { del, set } from 'idb-keyval';
import {
  ErrorDeEscritura,
  borrar,
  borrarTodo,
  guardar,
  leer,
  leerClaves,
} from './app-db';

/** Almacén falso en memoria: mismo contrato que `idb-keyval` sin IndexedDB real. */
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

describe('app-db', () => {
  beforeEach(() => {
    memoria.clear();
  });

  it('guarda y lee valores por clave', async () => {
    await guardar('paciente:1', { nombre: 'Ana' });
    expect(await leer('paciente:1')).toEqual({ nombre: 'Ana' });
  });

  it('lee undefined para una clave inexistente', async () => {
    expect(await leer('no-existe')).toBeUndefined();
  });

  it('lista las claves guardadas y borra una clave', async () => {
    await guardar('paciente:1', { nombre: 'Ana' });
    await guardar('pendiente:9', { medicamentos: [] });
    expect(await leerClaves()).toEqual(['paciente:1', 'pendiente:9']);

    await borrar('paciente:1');

    expect(await leerClaves()).toEqual(['pendiente:9']);
    expect(await leer('paciente:1')).toBeUndefined();
  });

  it('un fallo de escritura se convierte en ErrorDeEscritura con el mensaje de la spec', async () => {
    vi.mocked(set).mockRejectedValueOnce(new Error('QuotaExceededError'));

    const rechazo = guardar('clave', 'valor');
    await expect(rechazo).rejects.toThrow(ErrorDeEscritura);
    await expect(rechazo).rejects.toThrow(
      'No se pudo guardar. Libera espacio e intenta de nuevo',
    );
    expect(memoria.has('clave')).toBe(false);

    // la siguiente escritura vuelve a funcionar (el error no deja la base bloqueada)
    await guardar('clave', 'valor');
    expect(await leer('clave')).toBe('valor');
  });

  it('un fallo al borrar también es ErrorDeEscritura', async () => {
    await guardar('clave', 'valor');
    vi.mocked(del).mockRejectedValueOnce(new Error('fallo'));

    await expect(borrar('clave')).rejects.toBeInstanceOf(ErrorDeEscritura);
    expect(await leer('clave')).toBe('valor');
  });

  it('borrarTodo() deja IndexedDB vacío (perfiles, pendientes, fotos y preferencias)', async () => {
    await guardar('paciente:1', { nombre: 'Ana' });
    await guardar('pendiente:7', { medicamentos: ['A'] });
    await guardar('foto:abc', new Blob(['x'], { type: 'image/jpeg' }));
    await guardar('preferencias', { avisoLegalAceptado: true, ayudaAvisosVista: true });

    await borrarTodo();

    expect(await leerClaves()).toEqual([]);
    expect(memoria.size).toBe(0);
  });
});
