import { guardarBorrador, leerBorrador, limpiarBorrador } from './borrador-store';

describe('borrador-store', () => {
  beforeEach(() => {
    limpiarBorrador();
  });

  it('guardar y leer devuelven la foto y el número del comprobante', () => {
    const foto = new Blob([new Uint8Array([1])], { type: 'image/jpeg' });

    expect(leerBorrador()).toEqual({}); // arranca vacío

    guardarBorrador({ foto, numeroComprobante: '7788' });

    expect(leerBorrador().foto).toBe(foto); // el mismo Blob, sin copias
    expect(leerBorrador().numeroComprobante).toBe('7788');
  });

  it('guardar reemplaza el borrador completo (no hace merge)', () => {
    const foto = new Blob([new Uint8Array([1])], { type: 'image/jpeg' });
    guardarBorrador({ foto, numeroComprobante: '7788' });

    guardarBorrador({ foto: undefined });

    expect(leerBorrador().foto).toBeUndefined(); // quitar la foto no deja residuo
    expect(leerBorrador().numeroComprobante).toBeUndefined();
  });

  it('limpiar deja el borrador vacío para el próximo registro', () => {
    guardarBorrador({ numeroComprobante: '7788' });

    limpiarBorrador();

    expect(leerBorrador()).toEqual({});
  });
});
