/** `plataforma.ts` delega en `Capacitor.isNativePlatform()` (mockeado aquí). */
const capacitor = vi.hoisted(() => ({
  Capacitor: { isNativePlatform: vi.fn(() => false) },
}));

vi.mock('@capacitor/core', () => capacitor);

import { ayudaAvisosAplica, isNative, pdfDirectoAplica } from './plataforma';

describe('plataforma', () => {
  beforeEach(() => {
    capacitor.Capacitor.isNativePlatform.mockReturnValue(false);
  });

  it('en el navegador no es nativo', () => expect(isNative()).toBe(false));

  it('la ayuda de avisos aplica solo en la app nativa (Android)', () => {
    expect(ayudaAvisosAplica()).toBe(false);

    capacitor.Capacitor.isNativePlatform.mockReturnValue(true);

    expect(isNative()).toBe(true);
    expect(ayudaAvisosAplica()).toBe(true);
  });

  it('el PDF directo (descarga con <a download>) aplica solo en la PWA', () => {
    expect(pdfDirectoAplica()).toBe(true);

    capacitor.Capacitor.isNativePlatform.mockReturnValue(true);

    expect(pdfDirectoAplica()).toBe(false);
  });
});
