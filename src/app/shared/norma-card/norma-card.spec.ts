import { TestBed } from '@angular/core/testing';
import { AVISO_NO_ASESORIA } from '@domain/norma/aviso';
import type { Norma } from '@domain/norma/norma.model';
import { NormaCard } from './norma-card';

/** Fixture local: el spec no depende del orden ni de los datos de `normas.json`. */
const norma: Norma = {
  id: 'resolucion-muestra',
  nombre: 'Resolución de muestra',
  articulo: 'Artículo 131',
  resumen: 'Explicación de ejemplo para la prueba.',
  urlFuente: 'https://example.com/norma',
  verificadoEl: '2026-10-04',
  aplicaA: ['plazo'],
};

describe('NormaCard', () => {
  function crear(normaElegida = norma) {
    const fixture = TestBed.createComponent(NormaCard);
    fixture.componentRef.setInput('norma', normaElegida);
    fixture.componentRef.setInput('aviso', AVISO_NO_ASESORIA);
    fixture.detectChanges();
    return fixture;
  }

  it('muestra los 5 elementos de la spec más el aviso de no asesoría', () => {
    const el: HTMLElement = crear().nativeElement;

    // 1 · nombre
    expect(el.textContent).toContain(norma.nombre);
    // 2 · artículo
    expect(el.textContent).toContain(norma.articulo);
    // 3 · explicación en lenguaje sencillo
    expect(el.textContent).toContain(norma.resumen);
    // 4 · enlace a la fuente oficial
    const enlace = el.querySelector('a');
    expect(enlace?.textContent?.trim()).toBe('Ver norma oficial');
    expect(enlace?.getAttribute('href')).toBe(norma.urlFuente);
    expect(enlace?.getAttribute('target')).toBe('_blank');
    // 5 · "Verificado el DD/MM/AAAA"
    expect(el.textContent).toContain('Verificado el 04/10/2026');
    // aviso de no asesoría legal
    expect(el.textContent).toContain(AVISO_NO_ASESORIA);
  });

  it('oculta el artículo cuando la norma no lo trae', () => {
    const el: HTMLElement = crear({ ...norma, articulo: undefined }).nativeElement;
    expect(el.textContent).toContain(norma.nombre);
    expect(el.textContent).not.toContain('Artículo');
  });

  it('muestra la fecha verificada en DD/MM/AAAA aunque la ISO traiga hora', () => {
    const conHora = { ...norma, verificadoEl: '2026-01-05T08:30:00.000Z' };
    const el: HTMLElement = crear(conHora).nativeElement;
    expect(el.textContent).toContain('Verificado el 05/01/2026');
  });

  it('sin conexión solo el enlace queda inactivo y la tarjeta se muestra completa', () => {
    const fixture = crear();
    const el: HTMLElement = fixture.nativeElement;
    const enlace = el.querySelector('a');

    expect(enlace?.getAttribute('href')).toBe(norma.urlFuente);

    window.dispatchEvent(new Event('offline'));
    fixture.detectChanges();

    expect(enlace?.getAttribute('href')).toBeNull();
    expect(enlace?.getAttribute('aria-disabled')).toBe('true');
    expect(enlace?.className).toContain('norma-enlace--inactivo');
    // el resto de la tarjeta sigue visible
    expect(el.textContent).toContain(norma.nombre);
    expect(el.textContent).toContain(norma.resumen);
    expect(el.textContent).toContain('Verificado el 04/10/2026');
    expect(el.textContent).toContain(AVISO_NO_ASESORIA);

    window.dispatchEvent(new Event('online'));
    fixture.detectChanges();

    expect(enlace?.getAttribute('href')).toBe(norma.urlFuente);
    expect(enlace?.getAttribute('aria-disabled')).toBeNull();
  });
});
