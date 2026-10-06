import type { Paciente } from '@domain/paciente/paciente.model';
import {
  borrarPaciente,
  encontrarPorDocumento,
  guardarPaciente,
  leerPaciente,
  listarPacientes,
} from './pacientes-store';

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

const ana: Paciente = {
  id: 'p1',
  nombre: 'Ana Torres',
  tipoDocumento: 'CC',
  numeroDocumento: '10203040',
  eps: 'Sura',
  telefono: '3001234567',
  correo: 'ana@ejemplo.com',
  direccion: 'Calle 1 # 2-3, Barrio Nuevo',
};

const luis: Paciente = {
  id: 'p2',
  nombre: 'Luis Gómez',
  tipoDocumento: 'CE',
  numeroDocumento: '888777',
  eps: 'Salud Total',
  telefono: '3109876543',
  direccion: 'Carrera 4 # 5-6',
};

describe('pacientes-store', () => {
  beforeEach(() => {
    memoria.clear();
  });

  it('guarda y lee un perfil completo', async () => {
    await guardarPaciente(ana);
    expect(await leerPaciente('p1')).toEqual(ana);
    expect(await leerPaciente('no-existe')).toBeUndefined();
  });

  it('lista todos los perfiles guardados', async () => {
    await guardarPaciente(ana);
    await guardarPaciente(luis);

    const perfiles = await listarPacientes();

    expect(perfiles.map((p) => p.id).sort()).toEqual(['p1', 'p2']);
    expect(perfiles.find((p) => p.id === 'p2')).toEqual(luis);
  });

  it('detecta un perfil duplicado por tipo y número de documento', async () => {
    await guardarPaciente(ana);

    expect(await encontrarPorDocumento('CC', '10203040')).toEqual(ana);
    // mismos dígitos pero otro tipo de documento no es duplicado
    expect(await encontrarPorDocumento('CE', '10203040')).toBeUndefined();
    expect(await encontrarPorDocumento('CC', '99999999')).toBeUndefined();
    // al editar el mismo perfil no se marca como duplicado de sí mismo
    expect(await encontrarPorDocumento('CC', '10203040', 'p1')).toBeUndefined();
  });

  it('borra un perfil guardado', async () => {
    await guardarPaciente(ana);
    await guardarPaciente(luis);

    await borrarPaciente('p1');

    expect(await leerPaciente('p1')).toBeUndefined();
    expect(await listarPacientes()).toEqual([luis]);
  });
});
