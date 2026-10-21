import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AVISO_NO_ASESORIA } from '@domain/norma/aviso';
import { DocPdf } from './doc-pdf';

/** Mismo copy que la hoja compone y acá se inyecta por input. */
const TEXTO_DE_PRUEBA =
  'Esta versión es editable con cualquier lector de PDF; ábrela y ajusta el texto ' +
  '(no disponible en Android).';

interface Extra {
  etiquetaCompartir?: string;
  textoEditable?: string;
  generando?: boolean;
  compartiendo?: boolean;
  error?: string;
}

function crear(extra: Extra = {}): ComponentFixture<DocPdf> {
  const fixture = TestBed.createComponent(DocPdf);
  fixture.componentRef.setInput('avisoNoAsesoria', AVISO_NO_ASESORIA);
  fixture.componentRef.setInput('textoEditable', extra.textoEditable ?? TEXTO_DE_PRUEBA);
  if (extra.etiquetaCompartir !== undefined) {
    fixture.componentRef.setInput('etiquetaCompartir', extra.etiquetaCompartir);
  }
  if (extra.generando !== undefined) fixture.componentRef.setInput('generando', extra.generando);
  if (extra.compartiendo !== undefined) {
    fixture.componentRef.setInput('compartiendo', extra.compartiendo);
  }
  if (extra.error !== undefined) fixture.componentRef.setInput('error', extra.error);
  fixture.detectChanges();
  TestBed.flushEffects(); // el foco entra al botón principal
  fixture.detectChanges();
  return fixture;
}

function boton(el: HTMLElement, texto: string): HTMLButtonElement {
  const b = [...el.querySelectorAll('button')].find((x) => x.textContent?.trim() === texto);
  expect(b, `botón "${texto}"`).toBeTruthy();
  return b as HTMLButtonElement;
}

describe('DocPdf', () => {
  it('ofrece descargar el PDF editable con su copy y el aviso de no asesoría', () => {
    const el = crear().nativeElement as HTMLElement;
    const dialogo = el.querySelector('[role="dialog"]');

    expect(dialogo?.getAttribute('aria-modal')).toBe('true');
    expect(dialogo?.getAttribute('aria-labelledby')).toBe('doc-pdf-titulo');
    expect(dialogo?.textContent).toContain('PDF editable');
    expect(dialogo?.textContent).toContain('Esta versión es editable');
    expect(dialogo?.textContent).toContain('(no disponible en Android)');
    expect(dialogo?.textContent).toContain(AVISO_NO_ASESORIA);

    // Único sólido de este subdiálogo y etiqueta por defecto de compartir.
    expect(el.querySelectorAll('.p48-boton-principal')).toHaveLength(1);
    expect(boton(el, 'Descargar PDF editable').classList.contains('p48-boton-principal')).toBe(
      true,
    );
    expect(boton(el, 'Descargar y compartir')).toBeTruthy();
    // Región viva SIEMPRE presente.
    expect(el.querySelector('[role="alert"]')).toBeTruthy();
  });

  it('la etiqueta de compartir se inyecta por input (p. ej. "Descargar")', () => {
    const el = crear({ etiquetaCompartir: 'Descargar' }).nativeElement as HTMLElement;

    expect(boton(el, 'Descargar')).toBeTruthy();
    expect([...el.querySelectorAll('button')].some((b) => b.textContent?.trim() === 'Descargar y compartir')).toBe(
      false,
    );
  });

  it('el texto editable se inyecta por input (lo compone la hoja, que sabe la plataforma)', () => {
    const el = crear({ textoEditable: 'Texto compuesto por la hoja' }).nativeElement as HTMLElement;

    expect(el.querySelector('[role="dialog"]')?.textContent).toContain(
      'Texto compuesto por la hoja',
    );
  });

  it('sus tres botones emiten sus salidas', () => {
    const fixture = crear();
    const el: HTMLElement = fixture.nativeElement;
    let descargas = 0;
    let compartidos = 0;
    let cierres = 0;
    fixture.componentInstance.descargarEditable.subscribe(() => descargas++);
    fixture.componentInstance.compartir.subscribe(() => compartidos++);
    fixture.componentInstance.cerrar.subscribe(() => cierres++);

    boton(el, 'Descargar PDF editable').click();
    boton(el, 'Descargar y compartir').click();
    boton(el, 'Cerrar').click();

    expect(descargas).toBe(1);
    expect(compartidos).toBe(1);
    expect(cierres).toBe(1);
  });

  it('Escape cierra solo el subdiálogo', () => {
    const fixture = crear();
    const el: HTMLElement = fixture.nativeElement;
    let cierres = 0;
    fixture.componentInstance.cerrar.subscribe(() => cierres++);

    (el.querySelector('[role="dialog"]') as Element).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );

    expect(cierres).toBe(1);
  });

  it('mientras la pantalla genera o comparte, sus botones quedan deshabilitados', () => {
    const generando = crear({ generando: true });
    expect(boton(generando.nativeElement, 'Descargar PDF editable').disabled).toBe(true);
    expect(boton(generando.nativeElement, 'Descargar y compartir').disabled).toBe(true);

    const compartiendo = crear({ compartiendo: true });
    expect(boton(compartiendo.nativeElement, 'Descargar PDF editable').disabled).toBe(true);
  });

  it('anuncia el fallo del PDF editable en su región alert', () => {
    const el = crear({ error: 'No se pudo generar el PDF' }).nativeElement as HTMLElement;

    expect(el.querySelector('[role="alert"]')?.textContent).toContain(
      'No se pudo generar el PDF',
    );
  });

  it('el foco entra al botón principal y vuelve al que lo abrió', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    const fixture = crear();
    expect(document.activeElement).toBe(boton(fixture.nativeElement, 'Descargar PDF editable'));

    fixture.destroy();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});
