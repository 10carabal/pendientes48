import { CameraErrorCode } from '@capacitor/camera';
import { elegirFoto, escalaPara, tomarFoto } from './camara';

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

vi.mock('@capacitor/core', () => core);
vi.mock('@capacitor/camera', () => camara);
vi.mock('@capacitor/filesystem', () => fs);

/** Dimensiones que "carga" la imagen simulada (se cambian por prueba). */
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

describe('camara', () => {
  beforeEach(() => {
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
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete (URL as Partial<typeof URL>).createObjectURL;
    delete (URL as Partial<typeof URL>).revokeObjectURL;
    delete (HTMLCanvasElement.prototype as unknown as Record<string, unknown>)['toBlob'];
  });

  describe('escalaPara()', () => {
    it('deja pasar las fotos que ya caben en el lado máximo', () => {
      expect(escalaPara(800, 600, 1280)).toEqual({ ancho: 800, alto: 600 });
    });

    it('reduce al lado máximo conservando la proporción (horizontal y vertical)', () => {
      expect(escalaPara(4000, 3000, 1280)).toEqual({ ancho: 1280, alto: 960 });
      expect(escalaPara(3000, 4000, 1280)).toEqual({ ancho: 960, alto: 1280 });
      expect(escalaPara(2000, 2000, 1280)).toEqual({ ancho: 1280, alto: 1280 });
    });
  });

  describe('tomarFoto()', () => {
    it('con permiso concedido usa la cámara y devuelve el JPEG reducido a 0.7', async () => {
      const resultado = await tomarFoto();

      expect(camara.Camera.checkPermissions).toHaveBeenCalled();
      expect(camara.Camera.takePhoto).toHaveBeenCalledTimes(1);
      expect(camara.Camera.chooseFromGallery).not.toHaveBeenCalled();
      expect(resultado).toBeInstanceOf(Blob);
      expect(dibujar).toHaveBeenCalledWith(expect.any(Object), 0, 0, 1280, 960);
      expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.7);
      expect(fs.Filesystem.readFile).toHaveBeenCalledWith({ path: 'file:///cache/foto.jpg' });
    });

    it('si la foto ya es pequeña, la re-codifica sin escalar', async () => {
      dimsImagen = { ancho: 800, alto: 600 };

      await tomarFoto();

      expect(dibujar).toHaveBeenCalledWith(expect.any(Object), 0, 0, 800, 600);
      expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.7);
    });

    it('pide el permiso cuando está en prompt y sigue con la cámara si lo conceden', async () => {
      camara.Camera.checkPermissions.mockResolvedValue({ camera: 'prompt', photos: 'prompt' });
      camara.Camera.requestPermissions.mockResolvedValue({ camera: 'granted', photos: 'granted' });

      await tomarFoto();

      expect(camara.Camera.requestPermissions).toHaveBeenCalledWith({ permissions: ['camera'] });
      expect(camara.Camera.takePhoto).toHaveBeenCalledTimes(1);
    });

    it('sin permiso de cámara ofrece la galería sin error (verificación 2.4)', async () => {
      camara.Camera.checkPermissions.mockResolvedValue({ camera: 'denied', photos: 'granted' });

      const resultado = await tomarFoto();

      expect(camara.Camera.takePhoto).not.toHaveBeenCalled();
      expect(camara.Camera.chooseFromGallery).toHaveBeenCalledTimes(1);
      expect(resultado).toBeInstanceOf(Blob);
    });

    it('si Android rechaza el permiso al abrir la cámara, cae en la galería', async () => {
      camara.Camera.takePhoto.mockRejectedValue({
        code: CameraErrorCode.CameraPermissionDenied,
        message: 'denegado',
      });

      const resultado = await tomarFoto();

      expect(camara.Camera.chooseFromGallery).toHaveBeenCalledTimes(1);
      expect(resultado).toBeInstanceOf(Blob);
    });

    it('si el usuario cancela la cámara, el error se propaga (no abre la galería)', async () => {
      camara.Camera.takePhoto.mockRejectedValue({ code: 'OS-PLUG-CAMR-0006', message: 'canceló' });

      await expect(tomarFoto()).rejects.toMatchObject({ code: 'OS-PLUG-CAMR-0006' });
      expect(camara.Camera.chooseFromGallery).not.toHaveBeenCalled();
    });

    it('en la PWA no consulta permisos: el navegador maneja su propio flujo', async () => {
      core.Capacitor.isNativePlatform.mockReturnValue(false);
      camara.Camera.takePhoto.mockResolvedValue({ webPath: 'blob:tomada' });

      await tomarFoto();

      expect(camara.Camera.checkPermissions).not.toHaveBeenCalled();
      expect(camara.Camera.takePhoto).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith('blob:tomada'); // la web solo entrega webPath
    });
  });

  describe('elegirFoto()', () => {
    it('devuelve la foto de la galería reducida como JPEG', async () => {
      const resultado = await elegirFoto();

      expect(camara.Camera.chooseFromGallery).toHaveBeenCalledWith(
        expect.objectContaining({ mediaType: 0, allowMultipleSelection: false }),
      );
      expect(resultado).toBeInstanceOf(Blob);
      expect(dibujar).toHaveBeenCalledWith(expect.any(Object), 0, 0, 1280, 960);
      expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.7);
    });

    it('si no se elige ninguna foto, falla en vez de devolver un blob vacío', async () => {
      camara.Camera.chooseFromGallery.mockResolvedValue({ results: [] });

      await expect(elegirFoto()).rejects.toThrow('No se eligió ninguna foto');
    });
  });
});
