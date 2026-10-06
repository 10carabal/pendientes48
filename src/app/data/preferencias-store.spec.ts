import {
  PREFERENCIAS_POR_DEFECTO,
  actualizarPreferencias,
  guardarPreferencias,
  leerPreferencias,
} from './preferencias-store';

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

describe('preferencias-store', () => {
  beforeEach(() => {
    memoria.clear();
  });

  it('devuelve los valores por defecto si todavía no hay nada guardado', async () => {
    expect(await leerPreferencias()).toEqual(PREFERENCIAS_POR_DEFECTO);
    expect(PREFERENCIAS_POR_DEFECTO).toEqual({
      avisoLegalAceptado: false,
      ayudaAvisosVista: false,
    });
  });

  it('guarda y lee las preferencias', async () => {
    await guardarPreferencias({ avisoLegalAceptado: true, ayudaAvisosVista: true });

    expect(await leerPreferencias()).toEqual({ avisoLegalAceptado: true, ayudaAvisosVista: true });
  });

  it('actualizarPreferencias aplica cambios parciales sin tocar el resto', async () => {
    await guardarPreferencias({ avisoLegalAceptado: true, ayudaAvisosVista: false });

    const guardadas = await actualizarPreferencias({ ayudaAvisosVista: true });

    expect(guardadas).toEqual({ avisoLegalAceptado: true, ayudaAvisosVista: true });
    expect(await leerPreferencias()).toEqual({ avisoLegalAceptado: true, ayudaAvisosVista: true });
  });
});
