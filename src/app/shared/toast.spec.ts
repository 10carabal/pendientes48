import type { ToastController } from '@ionic/angular';
import { mostrarToast, type ToastDe } from './toast';

/** Los 6 literales exactos de la spec (tarea 5.3), espejo del mapa de `toast.ts`. */
const LITERALES: Record<ToastDe, string> = {
  'pendiente-guardado': 'Pendiente guardado',
  'cambios-guardados': 'Cambios guardados',
  'pendiente-borrado': 'Pendiente borrado',
  'perfil-guardado': 'Perfil guardado',
  'perfil-borrado': 'Perfil borrado',
  'nota-guardada': 'Nota guardada',
};

/**
 * Toast falso: extiende `EventTarget` real para que el `click` del helper
 * llegue al listener y se pueda comprobar que cierra con `dismiss()`.
 */
class Falso extends EventTarget {
  present = vi.fn(() => Promise.resolve());
  dismiss = vi.fn(() => Promise.resolve(true));
  constructor(readonly opciones: Record<string, unknown>) {
    super();
  }
}

function controlador(): { controller: ToastController; creados: Falso[] } {
  const creados: Falso[] = [];
  const controller = {
    create: vi.fn((opciones: Record<string, unknown>) => {
      const el = new Falso(opciones);
      creados.push(el);
      return Promise.resolve(el);
    }),
  };
  return { controller: controller as unknown as ToastController, creados };
}

describe('mostrarToast', () => {
  it('muestra el texto literal de las 6 confirmaciones', async () => {
    for (const accion of Object.keys(LITERALES) as ToastDe[]) {
      const { controller } = controlador();

      await mostrarToast(controller, accion);

      expect(controller.create).toHaveBeenCalledTimes(1);
      expect(controller.create).toHaveBeenCalledWith(
        expect.objectContaining({ message: LITERALES[accion] }),
      );
    }
  });

  it('lo crea con la duración y la posición de la spec y luego lo presenta', async () => {
    const { controller, creados } = controlador();

    await mostrarToast(controller, 'pendiente-guardado');

    expect(controller.create).toHaveBeenCalledWith({
      message: 'Pendiente guardado',
      duration: 3000,
      position: 'bottom',
    });
    expect(creados[0].present).toHaveBeenCalledTimes(1);
  });

  it('tocar el toast lo cierra con dismiss()', async () => {
    const { controller, creados } = controlador();
    await mostrarToast(controller, 'nota-guardada');

    creados[0].dispatchEvent(new Event('click'));

    expect(creados[0].dismiss).toHaveBeenCalledTimes(1);
  });

  it('un create rechazado NO se propaga (el toast nunca rompe la acción)', async () => {
    const controller = {
      create: vi.fn(() => Promise.reject(new Error('sin overlay'))),
    } as unknown as ToastController;

    await expect(mostrarToast(controller, 'pendiente-guardado')).resolves.toBeUndefined();
  });

  it('un present rechazado TAMPOCO se propaga', async () => {
    const creados: Falso[] = [];
    const controller = {
      create: vi.fn(() => {
        const el = new Falso({});
        el.present = vi.fn(() => Promise.reject(new Error('sin presentación')));
        creados.push(el);
        return Promise.resolve(el);
      }),
    } as unknown as ToastController;

    await expect(mostrarToast(controller, 'pendiente-guardado')).resolves.toBeUndefined();
    expect(creados).toHaveLength(1);
  });
});
