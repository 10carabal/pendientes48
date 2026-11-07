import { App } from '@capacitor/app';
import { salirDeLaApp } from './salida';

/** Mismo patrón de mocks de paquete que `camara.spec.ts` (solo paquetes). */
const core = vi.hoisted(() => ({ Capacitor: { isNativePlatform: vi.fn(() => true) } }));
const capApp = vi.hoisted(() => ({ App: { exitApp: vi.fn(() => Promise.resolve()) } }));

vi.mock('@capacitor/core', () => core);
vi.mock('@capacitor/app', () => capApp);

describe('salirDeLaApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    core.Capacitor.isNativePlatform.mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('en la APK termina la Activity con App.exitApp() y no intenta cerrar la ventana', async () => {
    const cerrar = vi.spyOn(window, 'close').mockImplementation(() => undefined);

    const cerro = await salirDeLaApp();

    expect(App.exitApp).toHaveBeenCalledTimes(1);
    expect(cerrar).not.toHaveBeenCalled();
    expect(cerro).toBe(true);
  });

  it('en la PWA intenta window.close() y devuelve false si no cerró', async () => {
    core.Capacitor.isNativePlatform.mockReturnValue(false);
    const cerrar = vi.spyOn(window, 'close').mockImplementation(() => undefined);

    const cerro = await salirDeLaApp();

    expect(cerrar).toHaveBeenCalledTimes(1);
    expect(App.exitApp).not.toHaveBeenCalled();
    expect(cerro).toBe(false); // la raíz cierra el diálogo y se queda en la raíz
  });
});
