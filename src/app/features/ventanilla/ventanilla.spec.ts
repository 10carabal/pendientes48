import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { CameraErrorCode } from '@capacitor/camera';
import { guardarBorrador, leerBorrador, limpiarBorrador } from '@data/borrador-store';
import { AVISO_NO_ASESORIA } from '@domain/norma/aviso';
import { Ventanilla } from './ventanilla';

/** `platform/plataforma.ts` delega en `Capacitor.isNativePlatform()` (mockeado aquí). */
const core = vi.hoisted(() => ({
  Capacitor: { isNativePlatform: vi.fn(() => true) },
}));

const camara = vi.hoisted(() => ({
  Camera: {
    takePhoto: vi.fn(),
    chooseFromGallery: vi.fn(),
    checkPermissions: vi.fn(),
    requestPermissions: vi.fn(),
  },
  CameraErrorCode: { CameraPermissionDenied: 'OS-PLUG-CAMR-0003' },
  MediaTypeSelection: { Photo: 0 },
}));

const fs = vi.hoisted(() => ({
  Filesystem: { readFile: vi.fn((_opciones: { path: string }) => Promise.resolve({ data: 'AAAA' })) },
}));

// Mismos mocks de paquete (y solo de paquetes) que `camara.spec.ts`: el
// `platform/camara.ts` real corre sobre ellos (vi.mock de rutas relativas o
// alias falla en `ng test`).
vi.mock('@capacitor/core', () => core);
vi.mock('@capacitor/camera', () => camara);
vi.mock('@capacitor/filesystem', () => fs);

/** Dimensiones que "carga" la imagen simulada. */
let dimsImagen = { ancho: 4000, alto: 3000 };

class FalsaImagen {
  naturalWidth = 0;
  naturalHeight = 0;
  onload: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  set src(_valor: string) {
    queueMicrotask(() => {
      this.naturalWidth = dimsImagen.ancho;
      this.naturalHeight = dimsImagen.alto;
      this.onload?.();
    });
  }
}

/** jsdom no tiene canvas: se simulan `getContext` y `toBlob`. */
function prepararCanvas() {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: dibujar,
  } as unknown as CanvasRenderingContext2D);
  toBlob = vi.fn((callback: BlobCallback) =>
    callback(new Blob([new Uint8Array([1])], { type: 'image/jpeg' })),
  );
  (HTMLCanvasElement.prototype as unknown as Record<string, unknown>)['toBlob'] = toBlob;
}

function stubUrls() {
  Object.defineProperty(URL, 'createObjectURL', {
    value: vi.fn(() => 'blob:p48'),
    configurable: true,
    writable: true,
  });
  Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true, writable: true });
}

const dibujar = vi.fn();
let toBlob: ReturnType<typeof vi.fn>;

/**
 * El entorno corre sin zone.js (no hay `fakeAsync`/`tick`): estas cadenas de
 * promesas mockeadas ya resueltas se asientan con vueltas de microtareas.
 */
async function asentar(turnos = 20): Promise<void> {
  for (let i = 0; i < turnos; i++) {
    await Promise.resolve();
  }
}

async function crear(): Promise<ComponentFixture<Ventanilla>> {
  const fixture = TestBed.createComponent(Ventanilla);
  fixture.detectChanges();
  await asentar();
  fixture.detectChanges();
  TestBed.flushEffects();
  return fixture;
}

function boton(el: HTMLElement, texto: string): HTMLButtonElement {
  const b = [...el.querySelectorAll('button')].find((x) => x.textContent?.trim() === texto);
  expect(b, `botón "${texto}"`).toBeTruthy();
  return b as HTMLButtonElement;
}

function navegarAPrueba(): ReturnType<typeof vi.spyOn> {
  return vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
}

describe('Ventanilla', () => {
  beforeEach(() => {
    limpiarBorrador();
    vi.clearAllMocks();
    dimsImagen = { ancho: 4000, alto: 3000 };
    core.Capacitor.isNativePlatform.mockReturnValue(true);
    fs.Filesystem.readFile.mockResolvedValue({ data: 'AAAA' });
    camara.Camera.checkPermissions.mockResolvedValue({ camera: 'granted', photos: 'granted' });
    camara.Camera.takePhoto.mockResolvedValue({ uri: 'file:///cache/foto.jpg' });
    camara.Camera.chooseFromGallery.mockResolvedValue({
      results: [{ webPath: 'blob:elegida' }],
    });
    stubUrls();
    prepararCanvas();
    vi.stubGlobal('Image', FalsaImagen);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ blob: () => Promise.resolve(new Blob([new Uint8Array([2])])) })),
    );
  });

  afterEach(() => {
    limpiarBorrador();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete (URL as Partial<typeof URL>).createObjectURL;
    delete (URL as Partial<typeof URL>).revokeObjectURL;
    delete (HTMLCanvasElement.prototype as unknown as Record<string, unknown>)['toBlob'];
  });

  it('muestra los 3 pasos en orden y al final el botón "Registrar este pendiente"', async () => {
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    const texto = el.textContent ?? '';

    const i1 = texto.indexOf('Pida el comprobante del pendiente con fecha y hora.');
    const i2 = texto.indexOf('Autorice la entrega a domicilio y dé su dirección.');
    const i3 = texto.indexOf('Tome una foto del comprobante.');
    const i4 = texto.indexOf('Registrar este pendiente');
    expect(i1).toBeGreaterThanOrEqual(0);
    expect(i2).toBeGreaterThan(i1);
    expect(i3).toBeGreaterThan(i2);
    expect(i4).toBeGreaterThan(i3); // el botón cierra la guía

    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Me dejaron un pendiente');
    expect(el.querySelectorAll('.ventanilla-paso')).toHaveLength(3);
  });

  it('tiene un único botón sólido y navega al formulario de registro', async () => {
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    const navegar = navegarAPrueba();

    expect(el.querySelectorAll('.p48-boton-principal')).toHaveLength(1); // un solo sólido por pantalla

    boton(el, 'Registrar este pendiente').click();

    expect(navegar).toHaveBeenCalledWith('/pendientes/nuevo');
  });

  it('el paso 2 muestra la norma de ventanilla con el aviso de no asesoría inyectado', async () => {
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    const tarjeta = el.querySelector('app-norma-card');
    expect(tarjeta).toBeTruthy();
    expect(tarjeta?.querySelector('.norma-nombre')?.textContent).toContain('Decreto-Ley 019 de 2012');
    // El texto legal no está hardcodeado: llega por input (D6).
    expect(tarjeta?.querySelector('.norma-aviso')?.textContent?.trim()).toBe(AVISO_NO_ASESORIA);
    expect(el.textContent).toContain(
      'Si usted autoriza, la EPS debe entregar el medicamento en su casa dentro de las 48 horas. Pídelo en la farmacia o dispensario antes de irte.',
    );
  });

  it('sin conexión la guía y la tarjeta se muestran completas', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    try {
      const fixture = await crear();
      const el: HTMLElement = fixture.nativeElement;

      expect(el.textContent).toContain('Tome una foto del comprobante.'); // la guía se ve completa
      const tarjeta = el.querySelector('app-norma-card');
      expect(tarjeta?.querySelector('.norma-resumen')?.textContent).toContain(
        'La EPS debe entregar los medicamentos completos',
      );
      expect(tarjeta?.querySelector('.norma-verificado')?.textContent).toContain(
        'Verificado el 04/10/2026',
      );
      // Solo el enlace queda inactivo (spec normas); el resto de la tarjeta sí se ve.
      expect(tarjeta?.querySelector('.norma-enlace--inactivo')).toBeTruthy();
      expect(tarjeta?.querySelector('.norma-enlace')?.getAttribute('href')).toBeNull();
    } finally {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    }
  });

  it('tomar foto deja la foto en el borrador, muestra "Foto lista" y permite quitarla', async () => {
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    boton(el, 'Tomar foto').click();
    await asentar();
    fixture.detectChanges();

    expect(camara.Camera.takePhoto).toHaveBeenCalledTimes(1);
    expect(leerBorrador().foto).toBeInstanceOf(Blob);
    expect(el.textContent).toContain('Foto lista');

    boton(el, 'Quitar foto').click();
    fixture.detectChanges();

    expect(leerBorrador().foto).toBeUndefined();
    expect(el.textContent).not.toContain('Foto lista');
  });

  it('las regiones vivas del paso 3 existen antes que su contenido', async () => {
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    // "Foto lista" y el aviso viven siempre en el DOM y muestran contenido dentro
    // (hallazgo menor 2): los lectores de pantalla anuncian el cambio fiablemente.
    const regionFoto = el.querySelector('.ventanilla-foto');
    const regionAviso = el.querySelector('.ventanilla-aviso');
    expect(regionFoto?.getAttribute('role')).toBe('status');
    expect(regionAviso?.getAttribute('role')).toBe('status');
    expect(regionFoto?.textContent?.trim()).toBe('');
    expect(regionAviso?.textContent?.trim()).toBe('');
  });

  it('elegir de la galería deja la foto en el borrador', async () => {
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    boton(el, 'Elegir de la galería').click();
    await asentar();
    fixture.detectChanges();

    expect(camara.Camera.chooseFromGallery).toHaveBeenCalledTimes(1);
    expect(leerBorrador().foto).toBeInstanceOf(Blob);
    expect(el.textContent).toContain('Foto lista');
  });

  it('anotar el número deja el número en el borrador', async () => {
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('#ventanilla-numero')).toBeNull(); // la tercera salida se abre al tocarla

    boton(el, 'Anote el número del comprobante').click();
    fixture.detectChanges();

    const campo = el.querySelector('#ventanilla-numero') as HTMLInputElement;
    expect(campo.getAttribute('inputmode')).toBe('numeric');
    campo.value = '7788';
    campo.dispatchEvent(new Event('input', { bubbles: true }));

    expect(leerBorrador().numeroComprobante).toBe('7788');
  });

  it('al cancelar la cámara muestra el aviso no bloqueante y aun así se puede registrar', async () => {
    camara.Camera.takePhoto.mockRejectedValue({ code: 'OS-PLUG-CAMR-0006', message: 'canceló' });
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    const navegar = navegarAPrueba();

    const regionAviso = el.querySelector('.ventanilla-aviso');
    expect(regionAviso?.textContent?.trim()).toBe(''); // la región vive vacía antes del fallo

    boton(el, 'Tomar foto').click();
    await asentar();
    fixture.detectChanges();

    // La región viva existía vacía antes del fallo y ahora lleva el texto dentro.
    expect(el.querySelector('.ventanilla-aviso')).toBe(regionAviso);
    expect(regionAviso?.textContent).toContain('No se pudo tomar la foto');
    expect(el.textContent).not.toContain('Foto lista');

    // No bloquea: el botón final sigue activo y navega al formulario.
    boton(el, 'Registrar este pendiente').click();
    expect(navegar).toHaveBeenCalledWith('/pendientes/nuevo');
  });

  it('con la cámara denegada cae en la galería, deja la foto y permite llegar al registro', async () => {
    camara.Camera.takePhoto.mockRejectedValue({
      code: CameraErrorCode.CameraPermissionDenied,
      message: 'denegado',
    });
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;
    const navegar = navegarAPrueba();

    boton(el, 'Tomar foto').click();
    await asentar();
    fixture.detectChanges();

    expect(camara.Camera.chooseFromGallery).toHaveBeenCalledTimes(1); // sin error, con galería
    expect(leerBorrador().foto).toBeInstanceOf(Blob);
    expect(el.querySelector('.p48-barra-acento--aviso')).toBeNull();

    boton(el, 'Registrar este pendiente').click();
    expect(navegar).toHaveBeenCalledWith('/pendientes/nuevo');
  });

  it('mientras la foto se procesa, los dos botones de foto quedan deshabilitados', async () => {
    let liberarFoto!: (resultado: unknown) => void;
    camara.Camera.takePhoto.mockImplementation(
      () => new Promise((resolver) => (liberarFoto = resolver)),
    );
    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    boton(el, 'Tomar foto').click();
    await asentar(); // los permisos se resuelven antes de abrir la cámara
    fixture.detectChanges();

    expect(el.querySelectorAll('button:disabled')).toHaveLength(2); // "Tomar foto" y la galería
    expect(fixture.debugElement.componentInstance.fotoEnCurso()).toBe(true);

    liberarFoto({ uri: 'file:///cache/foto.jpg' });
    await asentar();
    fixture.detectChanges();

    expect(el.querySelectorAll('button:disabled')).toHaveLength(0);
    expect(el.textContent).toContain('Foto lista');
  });

  it('retoma el borrador previo al volver de la guía (foto lista y número visibles)', async () => {
    const foto = new Blob([new Uint8Array([1])], { type: 'image/jpeg' });
    guardarBorrador({ foto, numeroComprobante: '7788' });

    const fixture = await crear();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.textContent).toContain('Foto lista');
    expect((el.querySelector('#ventanilla-numero') as HTMLInputElement).value).toBe('7788');
  });
});
