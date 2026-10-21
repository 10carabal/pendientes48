import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AVISO_NO_ASESORIA } from '@domain/norma/aviso';
import type { Paciente } from '@domain/paciente/paciente.model';
import type { Pendiente } from '@domain/pendiente/pendiente.model';
import { NOTA_AUTORIZACION_DOMICILIO, textoCorto } from '@domain/reclamo/plantillas';
import { ANEXO_BITACORA, AVISO_ANEXO } from '@domain/reclamo/plantillas-pdf';
import { Documento, componerQueja } from './documento';

const capacitor = vi.hoisted(() => ({
  Capacitor: { isNativePlatform: vi.fn(() => true) },
}));

// `documento.ts` consume `platform/compartir.ts`, que usa estos plugins.
const clipboard = vi.hoisted(() => ({
  Clipboard: { write: vi.fn((_opciones: { string: string }) => Promise.resolve()) },
}));
const share = vi.hoisted(() => ({
  Share: { share: vi.fn((_opciones: unknown) => Promise.resolve()) },
}));
const fs = vi.hoisted(() => ({
  Directory: { Documents: 'DOCUMENTS', Cache: 'CACHE' },
  Encoding: { UTF8: 'UTF-8' },
  Filesystem: {
    writeFile: vi.fn((_opciones: unknown) => Promise.resolve({ uri: 'archivo' })),
    deleteFile: vi.fn((_opciones: unknown) => Promise.resolve()),
  },
}));

vi.mock('@capacitor/core', () => capacitor);
vi.mock('@capacitor/clipboard', () => clipboard);
vi.mock('@capacitor/share', () => share);
vi.mock('@capacitor/filesystem', () => fs);
// pdfmake solo se usa en la pantalla; aquí nunca se genera un PDF.
vi.mock('pdfmake/build/pdfmake', () => ({
  default: { addVirtualFileSystem: vi.fn(), createPdf: vi.fn() },
}));
vi.mock('pdfmake/build/vfs_fonts', () => ({ default: {} }));

const paciente: Paciente = {
  id: 'px',
  nombre: 'Ana Pérez',
  tipoDocumento: 'CC',
  numeroDocumento: '123',
  eps: 'Salud Total',
  telefono: '3001234567',
  correo: 'ana@ejemplo.com',
  direccion: 'Calle 1 # 2-3',
};

const hace = (horas: number): string => new Date(Date.now() - horas * 3_600_000).toISOString();

function pendiente(sobrescribe: Partial<Pendiente> = {}): Pendiente {
  return {
    id: 'p1',
    pacienteId: 'px',
    medicamentos: ['Losartán 50 mg'],
    farmacia: 'Droguería La 12',
    horaReclamo: hace(49),
    autorizoDomicilio: true,
    direccionEntrega: 'Calle 1 # 2-3',
    bitacora: [{ en: hace(49), tipo: 'creado', texto: 'Registraste el pendiente' }],
    ...sobrescribe,
  };
}

interface Ajustes {
  pendiente?: Partial<Pendiente>;
  paso?: 1 | 2;
  copiado?: boolean;
  aviso?: string;
  error?: string;
  copiando?: boolean;
  generandoPdf?: boolean;
  compartiendo?: boolean;
  confirmandoPdf?: boolean;
}

function crear(ajustes: Ajustes = {}): ComponentFixture<Documento> {
  const fixture = TestBed.createComponent(Documento);
  fixture.componentRef.setInput(
    'pendiente',
    pendiente(ajustes.pendiente),
  );
  fixture.componentRef.setInput('paciente', paciente);
  fixture.componentRef.setInput('avisoNoAsesoria', AVISO_NO_ASESORIA);
  fixture.componentRef.setInput('avisoAnexo', AVISO_ANEXO);
  if (ajustes.paso !== undefined) fixture.componentRef.setInput('paso', ajustes.paso);
  if (ajustes.copiado !== undefined) fixture.componentRef.setInput('copiado', ajustes.copiado);
  if (ajustes.aviso !== undefined) fixture.componentRef.setInput('aviso', ajustes.aviso);
  if (ajustes.error !== undefined) fixture.componentRef.setInput('error', ajustes.error);
  if (ajustes.copiando !== undefined) fixture.componentRef.setInput('copiando', ajustes.copiando);
  if (ajustes.generandoPdf !== undefined) {
    fixture.componentRef.setInput('generandoPdf', ajustes.generandoPdf);
  }
  if (ajustes.compartiendo !== undefined) {
    fixture.componentRef.setInput('compartiendo', ajustes.compartiendo);
  }
  if (ajustes.confirmandoPdf !== undefined) {
    fixture.componentRef.setInput('confirmandoPdf', ajustes.confirmandoPdf);
  }
  fixture.detectChanges();
  TestBed.flushEffects(); // el foco entra al textarea de la hoja
  fixture.detectChanges();
  return fixture;
}

function boton(el: HTMLElement, texto: string): HTMLButtonElement {
  const b = [...el.querySelectorAll('button')].find((x) => x.textContent?.trim() === texto);
  expect(b, `botón "${texto}"`).toBeTruthy();
  return b as HTMLButtonElement;
}

function campoDe(el: HTMLElement, etiqueta: string): HTMLInputElement | HTMLTextAreaElement {
  const etiquetaEl = [...el.querySelectorAll('label')].find((l) =>
    l.textContent?.includes(etiqueta),
  );
  expect(etiquetaEl, `etiqueta "${etiqueta}"`).toBeTruthy();
  // El campo va envuelto o colgado del label por su `for`.
  const campo =
    etiquetaEl?.querySelector('input, textarea') ??
    (etiquetaEl?.htmlFor ? el.querySelector(`#${etiquetaEl.htmlFor}`) : null);
  expect(campo, `campo "${etiqueta}"`).toBeTruthy();
  return campo as HTMLInputElement | HTMLTextAreaElement;
}

function escribirCampo(el: HTMLElement, etiqueta: string, valor: string): void {
  const campo = campoDe(el, etiqueta);
  campo.value = valor;
  campo.dispatchEvent(new Event('input', { bubbles: true }));
}

function escapeEn(dialogo: Element): void {
  dialogo.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
}

describe('Documento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capacitor.Capacitor.isNativePlatform.mockReturnValue(true);
  });

  it('abre la hoja con el título del paso y la plantilla aprobada en el textarea', () => {
    const fixture = crear();
    const el: HTMLElement = fixture.nativeElement;
    const dialogo = el.querySelector('[role="dialog"]');

    expect(dialogo?.getAttribute('aria-modal')).toBe('true');
    expect(dialogo?.getAttribute('aria-labelledby')).toBe('documento-titulo');
    expect(dialogo?.textContent).toContain('Generar queja ante la EPS');

    const area = campoDe(el, 'Texto de la queja') as HTMLTextAreaElement;
    expect(area.value).toBe(textoCorto({ paso: 1, paciente, pendiente: pendiente() }));
    expect(el.textContent).toContain('Puedes corregir el texto antes de copiarlo');
    expect(el.textContent).toContain('Nada por corregir.');
    // Aviso de no asesoría en pantalla, junto a "Copiar texto" (D6).
    expect(el.textContent).toContain(AVISO_NO_ASESORIA);
    // Aviso del anexo con los títulos EXACTOS del PDF (D6, inyectado).
    expect(el.textContent).toContain(AVISO_ANEXO);
    expect(el.textContent).toContain(ANEXO_BITACORA);
    // Regiones vivas SIEMPRE presentes: el nodo existe antes que su texto.
    expect(el.querySelector('[role="status"]')).toBeTruthy();
    expect(el.querySelector('[role="alert"]')).toBeTruthy();
  });

  it('el título y el texto del paso 2 son los de la Supersalud', () => {
    const quejaEps = { radicadaEn: hace(2), radicado: 'PQR-1' };
    const fixture = crear({ paso: 2, pendiente: { quejaEps } });
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('[role="dialog"]')?.textContent).toContain(
      'Generar queja ante la Supersalud',
    );
    expect((campoDe(el, 'Texto de la queja') as HTMLTextAreaElement).value).toBe(
      textoCorto({ paso: 2, paciente, pendiente: pendiente({ quejaEps }) }),
    );
  });

  it('anuncia la fecha de radicación de la queja registrada', () => {
    const radicada = new Date(2026, 9, 18, 10, 0, 0); // 18 de octubre de 2026 (hora local)
    const fixture = crear({ pendiente: { quejaEps: { radicadaEn: radicada.toISOString() } } });
    const el: HTMLElement = fixture.nativeElement;

    expect(el.textContent).toContain('La solicitud se registró el 18 de octubre de 2026');
  });

  it('la nota de autorización solo aparece en el paso 1 sin domicilio autorizado', () => {
    const sinAutorizar = crear({ pendiente: { autorizoDomicilio: false } });
    expect(sinAutorizar.nativeElement.textContent).toContain(NOTA_AUTORIZACION_DOMICILIO);

    const autorizado = crear();
    expect(autorizado.nativeElement.textContent).not.toContain(NOTA_AUTORIZACION_DOMICILIO);

    // El paso 2 siempre trae la autorización escrita en su texto: sin nota.
    const paso2 = crear({
      paso: 2,
      pendiente: {
        autorizoDomicilio: false,
        quejaEps: { radicadaEn: hace(2) },
      },
    });
    expect(paso2.nativeElement.textContent).not.toContain(NOTA_AUTORIZACION_DOMICILIO);
  });

  it('el aviso de radicación solo existe con la queja ya registrada', () => {
    const fixture = crear();
    expect(fixture.nativeElement.textContent).not.toContain('La solicitud se registró el');
  });

  it('"Copiar texto" emite SOLO el cuerpo de la queja, sin el aviso', () => {
    const fixture = crear();
    const el: HTMLElement = fixture.nativeElement;
    const copiados: string[] = [];
    fixture.componentInstance.copiar.subscribe((t) => copiados.push(t));

    boton(el, 'Copiar texto').click();

    expect(copiados).toHaveLength(1);
    expect(copiados[0]).toBe(textoCorto({ paso: 1, paciente, pendiente: pendiente() }));
    expect(copiados[0]).not.toContain(AVISO_NO_ASESORIA);
    expect(copiados[0]).not.toContain('Esta app no es asesoría legal');
  });

  it('con copia hecha la región viva muestra "Texto copiado"', () => {
    const fixture = crear({ copiado: true });
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain(
      'Texto copiado',
    );
  });

  it('el aviso y el error de la pantalla se reflejan en las regiones vivas', () => {
    const fixture = crear({ aviso: 'PDF descargado', error: 'No se pudo generar' });
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('[role="status"]')?.textContent).toContain('PDF descargado');
    const alerta = el.querySelector('[role="alert"]');
    expect(alerta?.textContent).toContain('No se pudo generar');
    expect(alerta?.classList.contains('p48-barra-acento--alerta')).toBe(true);
  });

  it('corregir el texto cambia la nota y lo que se copia', () => {
    const fixture = crear();
    const el: HTMLElement = fixture.nativeElement;
    const copiados: string[] = [];
    fixture.componentInstance.copiar.subscribe((t) => copiados.push(t));

    escribirCampo(el, 'Texto de la queja', 'Texto corregido por la persona');
    fixture.detectChanges();

    expect(el.textContent).not.toContain('Nada por corregir.');
    expect(el.textContent).toContain('Tus cambios locales');

    boton(el, 'Copiar texto').click();
    expect(copiados[0]).toBe('Texto corregido por la persona');
  });

  it('la herramienta de reemplazo cambia el texto y anuncia el recuento', () => {
    const fixture = crear();
    const el: HTMLElement = fixture.nativeElement;

    boton(el, 'Reemplazar…').click();
    fixture.detectChanges();
    expect(campoDe(el, 'Buscar')).toBeTruthy();

    // Reemplazo literal y case-sensitive: sin expresiones regulares (D5).
    escribirCampo(el, 'Buscar', 'Droguería La 12');
    fixture.detectChanges();
    escribirCampo(el, 'Reemplazar por', 'Droguería La 2');
    fixture.detectChanges();
    boton(el, 'Reemplazar').click();
    fixture.detectChanges();

    expect(el.querySelector('[role="status"]')?.textContent).toContain('1 texto reemplazado');
    expect((campoDe(el, 'Texto de la queja') as HTMLTextAreaElement).value).toContain(
      'Droguería La 2',
    );
    expect((campoDe(el, 'Texto de la queja') as HTMLTextAreaElement).value).not.toContain(
      'Droguería La 12',
    );

    // Sin coincidencias y búsqueda vacía también se explican.
    escribirCampo(el, 'Buscar', 'no aparece esto');
    boton(el, 'Reemplazar').click();
    fixture.detectChanges();
    expect(el.querySelector('[role="status"]')?.textContent).toContain('Sin coincidencias.');

    boton(el, 'Ocultar herramienta').click();
    fixture.detectChanges();
    expect(el.querySelector('#reemplazar-buscar')).toBeNull();
    expect(fixture.componentInstance.reemplazando()).toBe(false);
  });

  it('la confirmación del 2.º PDF se acepta y se cancela', () => {
    const fixture = crear({ confirmandoPdf: true });
    const el: HTMLElement = fixture.nativeElement;
    let confirmaciones = 0;
    let cancelaciones = 0;
    fixture.componentInstance.confirmar.subscribe(() => confirmaciones++);
    fixture.componentInstance.cancelarConfirmacion.subscribe(() => cancelaciones++);

    expect(el.textContent).toContain('Ya habías generado una queja. ¿Generar otra?');
    expect(boton(el, 'Descargar y compartir').disabled).toBe(true); // la principal, a la espera
    expect(document.activeElement).toBe(boton(el, 'Generar otra')); // el foco entra a confirmar

    boton(el, 'Generar otra').click();
    boton(el, 'Cancelar').click();
    expect(confirmaciones).toBe(1);
    expect(cancelaciones).toBe(1);
  });

  it('en Android solo se ofrecen compartir y copiar (sin descarga directa)', () => {
    const fixture = crear(); // Capacitor.isNativePlatform → true
    const el: HTMLElement = fixture.nativeElement;

    expect(boton(el, 'Descargar y compartir')).toBeTruthy();
    expect(boton(el, 'Copiar texto')).toBeTruthy();
    expect([...el.querySelectorAll('button')].some((b) => b.textContent?.trim() === 'PDF')).toBe(
      false,
    );
    expect(
      [...el.querySelectorAll('button')].some((b) => b.textContent?.trim() === 'PDF editable'),
    ).toBe(false);
  });

  it('en la PWA sin compartir archivos la etiqueta es "Descargar" y sí hay PDF', () => {
    capacitor.Capacitor.isNativePlatform.mockReturnValue(false);
    const fixture = crear();
    const el: HTMLElement = fixture.nativeElement;

    expect(boton(el, 'Descargar')).toBeTruthy();
    expect(boton(el, 'PDF')).toBeTruthy();
    expect(boton(el, 'PDF editable')).toBeTruthy();
  });

  it('el PDF editable se abre como subdiálogo y emite el texto corregido', () => {
    capacitor.Capacitor.isNativePlatform.mockReturnValue(false);
    const fixture = crear();
    const el: HTMLElement = fixture.nativeElement;
    const descargados: string[] = [];
    const compartidos: string[] = [];
    fixture.componentInstance.descargarEditable.subscribe((t) => descargados.push(t));
    fixture.componentInstance.compartirEditable.subscribe((t) => compartidos.push(t));

    escribirCampo(el, 'Texto de la queja', 'Cuerpo corregido');
    fixture.detectChanges();
    boton(el, 'PDF editable').click();
    fixture.detectChanges();
    TestBed.flushEffects(); // el foco entra al subdiálogo
    fixture.detectChanges();

    // Dos diálogos: la hoja y su subdiálogo del PDF editable.
    expect(el.querySelectorAll('[role="dialog"]')).toHaveLength(2);
    const doc = el.querySelector('.doc-fondo') as HTMLElement;
    expect(doc.textContent).toContain('Esta versión es editable');
    expect(doc.textContent).toContain('(no disponible en Android)');
    expect(doc.textContent).toContain(AVISO_NO_ASESORIA);
    expect(document.activeElement).toBe(boton(doc, 'Descargar PDF editable'));

    boton(doc, 'Descargar PDF editable').click();
    boton(doc, 'Descargar').click(); // etiqueta de la PWA sin compartir archivos
    expect(descargados).toEqual(['Cuerpo corregido']);
    expect(compartidos).toEqual(['Cuerpo corregido']);

    // Escape cierra SOLO el subdiálogo; la hoja sigue abierta.
    escapeEn(doc);
    fixture.detectChanges();
    expect(el.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    expect(fixture.componentInstance.pdfEditableAbierto()).toBe(false);
  });

  it('Escape cierra la hoja y el foco vuelve al que la abrió', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const fixture = crear();
    const el: HTMLElement = fixture.nativeElement;
    let cierres = 0;
    fixture.componentInstance.cerrar.subscribe(() => cierres++);

    expect(document.activeElement).toBe(campoDe(el, 'Texto de la queja'));

    escapeEn(el.querySelector('[role="dialog"]') as Element);
    fixture.detectChanges();
    expect(cierres).toBe(1);

    fixture.destroy();
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it('con una acción en curso los botones quedan deshabilitados', () => {
    const copiando = crear({ copiando: true });
    expect(boton(copiando.nativeElement, 'Copiar texto').disabled).toBe(true);
    expect(boton(copiando.nativeElement, 'Descargar y compartir').disabled).toBe(true);

    const generando = crear({ generandoPdf: true, confirmandoPdf: false });
    expect(boton(generando.nativeElement, 'Descargar y compartir').disabled).toBe(true);

    const compartiendo = crear({ compartiendo: true });
    expect(boton(compartiendo.nativeElement, 'Descargar y compartir').disabled).toBe(true);
    expect(boton(compartiendo.nativeElement, 'Copiar texto').disabled).toBe(true);
  });
});
