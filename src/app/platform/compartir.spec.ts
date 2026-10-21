import { compartirPdf, comparteArchivosPdf, copiarTexto } from './compartir';

/** `platform/plataforma.ts` delega en `Capacitor.isNativePlatform()` (mockeado aquí). */
const capacitor = vi.hoisted(() => ({
  Capacitor: { isNativePlatform: vi.fn(() => true) },
}));

const clipboard = vi.hoisted(() => ({
  Clipboard: { write: vi.fn((_opciones: { string?: string }) => Promise.resolve()) },
}));

const fs = vi.hoisted(() => ({
  Directory: { Documents: 'DOCUMENTS', Cache: 'CACHE' },
  Encoding: { UTF8: 'UTF-8' },
  Filesystem: {
    writeFile: vi.fn((_opciones: unknown) => Promise.resolve({ uri: 'file:///cache/archivo' })),
    deleteFile: vi.fn((_opciones: unknown) => Promise.resolve()),
  },
}));

const share = vi.hoisted(() => ({
  Share: {
    share: vi.fn((_opciones: unknown) => Promise.resolve({})),
    canShare: vi.fn(() => Promise.resolve({ value: true })),
  },
}));

vi.mock('@capacitor/core', () => capacitor);
vi.mock('@capacitor/clipboard', () => clipboard);
vi.mock('@capacitor/filesystem', () => fs);
vi.mock('@capacitor/share', () => share);

/** jsdom no trae `URL.createObjectURL`; se reemplaza y se restaura tras cada prueba. */
function stubUrls() {
  Object.defineProperty(URL, 'createObjectURL', {
    value: vi.fn(() => 'blob:p48'),
    configurable: true,
    writable: true,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: vi.fn(),
    configurable: true,
    writable: true,
  });
}

function restaurarUrls() {
  delete (URL as Partial<typeof URL>).createObjectURL;
  delete (URL as Partial<typeof URL>).revokeObjectURL;
}

describe('compartir', () => {
  let click: ReturnType<typeof vi.spyOn> | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    capacitor.Capacitor.isNativePlatform.mockReturnValue(true);
  });

  afterEach(() => {
    click?.mockRestore();
    click = undefined;
    restaurarUrls();
    vi.unstubAllGlobals();
  });

  describe('copiarTexto()', () => {
    it('copia el texto sin formato al portapapeles', async () => {
      await copiarTexto('Texto para pegar en el formulario');

      expect(clipboard.Clipboard.write).toHaveBeenCalledTimes(1);
      expect(clipboard.Clipboard.write).toHaveBeenCalledWith({
        string: 'Texto para pegar en el formulario',
      });
    });
  });

  describe('comparteArchivosPdf()', () => {
    it('en Android siempre (la hoja nativa comparte el archivo)', () => {
      expect(comparteArchivosPdf()).toBe(true);
    });

    it('en la PWA depende de canShare con archivos', () => {
      capacitor.Capacitor.isNativePlatform.mockReturnValue(false);
      vi.stubGlobal('navigator', { canShare: vi.fn(() => true), share: vi.fn() });
      expect(comparteArchivosPdf()).toBe(true);

      vi.stubGlobal('navigator', { canShare: vi.fn(() => false), share: vi.fn() });
      expect(comparteArchivosPdf()).toBe(false);

      vi.stubGlobal('navigator', {}); // sin Web Share
      expect(comparteArchivosPdf()).toBe(false);
    });
  });

  describe('compartirPdf() en Android', () => {
    it('escribe el PDF en caché y abre el menú nativo con el archivo adjunto', async () => {
      fs.Filesystem.writeFile.mockResolvedValue({ uri: 'file:///cache/queja.pdf' });

      const resultado = await compartirPdf(new Uint8Array([1, 2, 3]), 'queja.pdf');

      expect(resultado).toBe('compartido');
      expect(fs.Filesystem.writeFile).toHaveBeenCalledWith({
        path: 'queja.pdf',
        data: 'AQID', // base64 de los bytes, como exige el Filesystem nativo
        directory: fs.Directory.Cache,
      });
      expect(share.Share.share).toHaveBeenCalledWith({
        files: ['file:///cache/queja.pdf'],
        dialogTitle: 'Compartir PDF',
      });
      expect(fs.Filesystem.deleteFile).toHaveBeenCalledWith({
        path: 'queja.pdf',
        directory: fs.Directory.Cache,
      });
    });

    it('borra el archivo temporal aunque el menú de compartir falle', async () => {
      share.Share.share.mockRejectedValueOnce(new Error('compartir falló'));

      await expect(compartirPdf(new Uint8Array([9]), 'q.pdf')).rejects.toThrow('compartir falló');

      expect(fs.Filesystem.deleteFile).toHaveBeenCalledTimes(1);
    });
  });

  describe('compartirPdf() en la PWA', () => {
    it('si el navegador no soporta compartir archivos, el PDF se descarga', async () => {
      capacitor.Capacitor.isNativePlatform.mockReturnValue(false);
      stubUrls();
      let enlace: HTMLAnchorElement | undefined;
      click = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(function (this: HTMLAnchorElement) {
          enlace = this;
        });

      const resultado = await compartirPdf(new Uint8Array([7, 7]), 'queja.pdf');

      expect(resultado).toBe('descargado');
      expect(enlace?.download).toBe('queja.pdf');
      expect(enlace?.href).toContain('blob:p48');
      expect(share.Share.share).not.toHaveBeenCalled();
      expect(fs.Filesystem.writeFile).not.toHaveBeenCalled();
    });

    it('si el navegador soporta compartir archivos, usa Web Share', async () => {
      capacitor.Capacitor.isNativePlatform.mockReturnValue(false);
      const compartir = vi.fn((_datos: { files: File[] }) => Promise.resolve());
      vi.stubGlobal('navigator', { canShare: vi.fn(() => true), share: compartir });

      const resultado = await compartirPdf(new Uint8Array([7, 7]), 'queja.pdf');

      expect(resultado).toBe('compartido');
      expect(compartir).toHaveBeenCalledTimes(1);
      const datos = compartir.mock.calls[0][0];
      expect(datos.files).toHaveLength(1);
      expect(datos.files[0].name).toBe('queja.pdf');
      expect(datos.files[0].type).toBe('application/pdf');
      expect(fs.Filesystem.writeFile).not.toHaveBeenCalled();
    });

    it('si canShare falla, se descarga como respaldo', async () => {
      capacitor.Capacitor.isNativePlatform.mockReturnValue(false);
      vi.stubGlobal('navigator', {
        canShare: vi.fn(() => {
          throw new Error('no soportado');
        }),
      });
      stubUrls();
      click = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(function (this: HTMLAnchorElement) {
          /* no navega en jsdom */
        });

      await expect(compartirPdf(new Uint8Array([1]), 'queja.pdf')).resolves.toBe('descargado');
    });

    it('si share() falla o no hay UI, se descarga como respaldo', async () => {
      capacitor.Capacitor.isNativePlatform.mockReturnValue(false);
      vi.stubGlobal('navigator', {
        canShare: vi.fn(() => true),
        share: vi.fn(() => Promise.reject(new DOMException('cancelado', 'AbortError'))),
      });
      stubUrls();
      click = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(function (this: HTMLAnchorElement) {
          /* no navega en jsdom */
        });

      const resultado = await compartirPdf(new Uint8Array([1]), 'queja.pdf');

      expect(resultado).toBe('descargado');
      expect(click).toHaveBeenCalledTimes(1);
      expect(fs.Filesystem.writeFile).not.toHaveBeenCalled();
    });
  });
});
