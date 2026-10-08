import { construirIcs, descargarArchivo, descargarIcs } from './calendario-descarga';

const capacitor = vi.hoisted(() => ({
  Capacitor: { isNativePlatform: vi.fn(() => true) },
}));

const fs = vi.hoisted(() => ({
  Directory: { Documents: 'DOCUMENTS', Cache: 'CACHE' },
  Encoding: { UTF8: 'UTF-8' },
  Filesystem: {
    writeFile: vi.fn((_opciones: unknown) => Promise.resolve({ uri: 'file:///doc/archivo' })),
  },
}));

vi.mock('@capacitor/core', () => capacitor);
vi.mock('@capacitor/filesystem', () => fs);

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

describe('calendario-descarga', () => {
  let click: ReturnType<typeof vi.spyOn> | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    capacitor.Capacitor.isNativePlatform.mockReturnValue(true);
    vi.useRealTimers();
  });

  afterEach(() => {
    click?.mockRestore();
    click = undefined;
    restaurarUrls();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe('construirIcs()', () => {
    it('arma el VEVENT con UID fijo, DTSTART al vencimiento y VALARM a la misma hora', () => {
      const ics = construirIcs(
        { id: 'abc-123', vencimiento: '2026-10-08T10:00:00.000Z', titulo: 'Medicina' },
        new Date('2026-10-06T12:00:00.000Z'),
      );

      expect(ics).toBe(
        [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//Pendientes48//Recordatorio//ES',
          'BEGIN:VEVENT',
          'UID:pendiente-abc-123@pendientes48',
          'DTSTAMP:20261006T120000Z',
          'DTSTART:20261008T100000Z',
          'SUMMARY:Medicina',
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          'TRIGGER:PT0S', // a la misma hora que DTSTART
          'DESCRIPTION:Medicina',
          'END:VALARM',
          'END:VEVENT',
          'END:VCALENDAR',
        ].join('\r\n') + '\r\n',
      );
    });

    it('usa un texto por defecto si el pendiente no tiene título', () => {
      const ics = construirIcs({
        id: 'sin-titulo',
        vencimiento: '2026-10-08T10:00:00.000Z',
      });

      expect(ics).toContain('SUMMARY:Recordatorio Pendientes48\r\n');
      expect(ics).toContain('DESCRIPTION:Recordatorio Pendientes48\r\n');
    });

    it('escapa los caracteres especiales de los valores TEXT', () => {
      const ics = construirIcs({
        id: 'x',
        vencimiento: '2026-10-08T10:00:00.000Z',
        titulo: 'a\\b;c,d\ne',
      });

      expect(ics).toContain('SUMMARY:a\\\\b\\;c\\,d\\ne\r\n');
      expect(ics).toContain('DESCRIPTION:a\\\\b\\;c\\,d\\ne\r\n');
    });

    it('pliega las líneas de más de 75 octetos sin partir caracteres multibyte', () => {
      const titulo = `T${'Á'.repeat(60)}`;
      const ics = construirIcs({ id: 'x', vencimiento: '2026-10-08T10:00:00.000Z', titulo });

      const lineas = ics.split('\r\n');
      expect(lineas.length).toBeGreaterThan(10);
      expect(lineas.every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
      // al desplegar (quitar CRLF + espacio) vuelve el texto original, sin mojibake
      expect(ics.replace(/\r\n /g, '')).toContain(`SUMMARY:${titulo}`);
    });

    it('lanza un error claro con un vencimiento inválido', () => {
      expect(() =>
        construirIcs({ id: 'x', vencimiento: 'no-es-fecha' }),
      ).toThrow('Fecha inválida para el recordatorio: no-es-fecha');
    });
  });

  describe('descargarIcs()', () => {
    it('en Android guarda el .ics en la carpeta pública Documentos', async () => {
      await descargarIcs({ id: 'abc 123', vencimiento: '2026-10-08T10:00:00.000Z' });

      expect(fs.Filesystem.writeFile).toHaveBeenCalledTimes(1);
      const llamada = fs.Filesystem.writeFile.mock.calls[0][0] as {
        path: string;
        data: string;
        directory: string;
        encoding: string;
      };
      expect(llamada.path).toBe('pendiente-abc-123.ics'); // id apto para nombre de archivo
      expect(llamada.directory).toBe(fs.Directory.Documents);
      expect(llamada.encoding).toBe(fs.Encoding.UTF8);
      expect(llamada.data).toContain('UID:pendiente-abc 123@pendientes48'); // el UID usa el id real
      expect(llamada.data).toContain('DTSTART:20261008T100000Z');
    });

    it('en la PWA descarga el .ics con <a download> y revoca la URL', async () => {
      capacitor.Capacitor.isNativePlatform.mockReturnValue(false);
      stubUrls();
      vi.useFakeTimers();
      let enlace: HTMLAnchorElement | undefined;
      click = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(function (this: HTMLAnchorElement) {
          enlace = this;
        });

      await descargarIcs({ id: 'abc-123', vencimiento: '2026-10-08T10:00:00.000Z' });

      expect(enlace?.download).toBe('pendiente-abc-123.ics');
      expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(60_000);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:p48');
      expect(fs.Filesystem.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('descargarArchivo()', () => {
    it('en Android guarda el contenido en Documentos (el WebView ignora <a download>)', async () => {
      await descargarArchivo('respaldo.txt', new Blob(['hola']));

      expect(fs.Filesystem.writeFile).toHaveBeenCalledWith({
        path: 'respaldo.txt',
        data: 'hola',
        directory: fs.Directory.Documents,
        encoding: fs.Encoding.UTF8,
      });
    });
  });
});
