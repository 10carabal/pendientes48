import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { BotonVolver } from './boton-volver';

/** Ver `retroceder.spec.ts`: jsdom arranca con historia de 1. */
function forzarHistorial(largo: number): void {
  Object.defineProperty(window.history, 'length', { configurable: true, value: largo });
}

describe('BotonVolver', () => {
  afterEach(() => {
    delete (window.history as unknown as Record<string, unknown>)['length'];
    vi.restoreAllMocks();
  });

  it('es un botón "Volver" secundario con tipo button (el color nunca va solo)', () => {
    const el: HTMLElement = TestBed.createComponent(BotonVolver).nativeElement;

    const b = el.querySelector('button');
    expect(b?.textContent?.trim()).toBe('Volver');
    expect(b?.getAttribute('type')).toBe('button');
    expect(b?.classList.contains('p48-boton-secundario')).toBe(true);
    expect(b?.classList.contains('p48-boton-principal')).toBe(false); // no compite con el sólido
  });

  it('al tocarlo retrocede dentro de la app con location.back()', () => {
    forzarHistorial(2);
    const fixture = TestBed.createComponent(BotonVolver);
    fixture.detectChanges();
    const atras = vi.spyOn(TestBed.inject(Location), 'back');
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    fixture.nativeElement.querySelector('button')!.click();

    expect(atras).toHaveBeenCalledTimes(1);
    expect(navegar).not.toHaveBeenCalled();
  });

  it('sin historia navega a la raíz (nunca deja la app en un callejón)', () => {
    forzarHistorial(1);
    const fixture = TestBed.createComponent(BotonVolver);
    fixture.detectChanges();
    const atras = vi.spyOn(TestBed.inject(Location), 'back');
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    fixture.nativeElement.querySelector('button')!.click();

    expect(navegar).toHaveBeenCalledWith('/');
    expect(atras).not.toHaveBeenCalled();
  });
});
