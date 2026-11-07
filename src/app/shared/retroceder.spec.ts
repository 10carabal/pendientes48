import type { Location } from '@angular/common';
import type { Router } from '@angular/router';
import { retroceder } from './retroceder';

/**
 * jsdom arranca con `history.length === 1` (solo la entrada actual): para
 * probar las dos ramas de `retroceder` se fija el largo de la historia en el
 * propio `window.history` y se retira al terminar.
 */
function forzarHistorial(largo: number): void {
  Object.defineProperty(window.history, 'length', { configurable: true, value: largo });
}

/** Fakes: la función solo recibe `Location` y `Router` como valores. */
function fakes(): { location: Location; router: Router } {
  return {
    location: { back: vi.fn() } as unknown as Location,
    router: { navigateByUrl: vi.fn().mockResolvedValue(true) } as unknown as Router,
  };
}

describe('retroceder', () => {
  afterEach(() => {
    delete (window.history as unknown as Record<string, unknown>)['length'];
  });

  it('con historia usa location.back(): re-muestra la misma instancia de pantalla', () => {
    forzarHistorial(2);
    const { location, router } = fakes();

    retroceder(location, router);

    expect(location.back).toHaveBeenCalledTimes(1);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('sin historia (arranque directo en la pantalla) navega a la raíz', () => {
    forzarHistorial(1);
    const { location, router } = fakes();

    retroceder(location, router);

    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
    expect(location.back).not.toHaveBeenCalled();
  });
});
