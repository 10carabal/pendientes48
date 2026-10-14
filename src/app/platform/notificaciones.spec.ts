import type { ScheduleOptions } from '@capacitor/local-notifications';
import {
  avisosPendientes,
  cancelarAviso,
  cancelarTodos,
  permisoAvisos,
  programarAviso,
  reprogramarAvisos,
  solicitarPermisoAvisos,
} from './notificaciones';

/** `platform/plataforma.ts` delega en `Capacitor.isNativePlatform()` (mockeado aquí). */
const capacitor = vi.hoisted(() => ({
  Capacitor: { isNativePlatform: vi.fn(() => true) },
}));

const cap = vi.hoisted(() => ({
  schedule: vi.fn(
    (_opciones: ScheduleOptions) =>
      Promise.resolve({ notifications: [] as Array<{ id: number }> }),
  ),
  cancel: vi.fn((_opciones: { notifications: Array<{ id: number }> }) => Promise.resolve()),
  getPending: vi.fn(() =>
    Promise.resolve({
      notifications: [] as Array<{ id: number; schedule?: { at?: unknown } }>,
    }),
  ),
  checkPermissions: vi.fn((): Promise<{ display: string }> => Promise.resolve({ display: 'granted' })),
  requestPermissions: vi.fn((): Promise<{ display: string }> => Promise.resolve({ display: 'granted' })),
}));

vi.mock('@capacitor/core', () => capacitor);
vi.mock('@capacitor/local-notifications', () => ({ LocalNotifications: cap }));

const enSegundos = (segundos: number, id = 'pd-1') => ({
  id,
  vencimiento: new Date(Date.now() + segundos * 1000).toISOString(),
});

const ultimaNotificacion = (llamada = 0): ScheduleOptions['notifications'][number] =>
  cap.schedule.mock.calls[llamada][0].notifications[0];

describe('notificaciones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capacitor.Capacitor.isNativePlatform.mockReturnValue(true);
  });

  describe('programarAviso()', () => {
    it('cancela el aviso anterior y programa la notificación al vencimiento', async () => {
      const aviso = enSegundos(120);
      await programarAviso(aviso);

      expect(cap.cancel).toHaveBeenCalledWith({ notifications: [{ id: expect.any(Number) }] });
      expect(cap.schedule).toHaveBeenCalledTimes(1);

      const n = ultimaNotificacion();
      expect(n.title).toBe('Ya pasaron las 48 horas');
      expect(n.body).toBe('Su medicamento sigue pendiente. Ya puede presentar la queja.');
      expect(n.schedule?.at?.getTime()).toBe(new Date(aviso.vencimiento).getTime());
      expect(n.schedule?.allowWhileIdle).toBe(true); // debe sonar incluso en Doze
      expect(n.extra).toEqual({ pendienteId: 'pd-1' });
      expect(n.autoCancel).toBe(true);
      expect(typeof n.id).toBe('number');
      expect(n.id).toBeGreaterThanOrEqual(-2147483648);
      expect(n.id).toBeLessThanOrEqual(2147483647);
    });

    it('al editar la hora reprograma: mismo ID numérico y hora nueva', async () => {
      await programarAviso(enSegundos(3600, 'pd-9'));
      const horaOriginal = ultimaNotificacion().schedule?.at?.getTime();

      await programarAviso(enSegundos(7200, 'pd-9'));

      expect(cap.cancel).toHaveBeenCalledTimes(2); // limpia el aviso anterior
      expect(cap.schedule).toHaveBeenCalledTimes(2);
      expect(ultimaNotificacion(1).id).toBe(ultimaNotificacion(0).id);
      expect(ultimaNotificacion(1).schedule?.at?.getTime()).not.toBe(horaOriginal);
    });

    it('si el vencimiento ya pasó, cancela y no programa nada', async () => {
      await programarAviso({
        id: 'pd-2',
        vencimiento: new Date(Date.now() - 60_000).toISOString(),
      });

      expect(cap.cancel).toHaveBeenCalledTimes(1);
      expect(cap.schedule).not.toHaveBeenCalled();
    });
  });

  describe('cancelarAviso()', () => {
    it('cancela con el mismo ID con el que se habría programado', async () => {
      await programarAviso(enSegundos(60, 'pd-3'));
      const idProgramado = ultimaNotificacion().id;

      await cancelarAviso('pd-3');

      expect(cap.cancel).toHaveBeenLastCalledWith({ notifications: [{ id: idProgramado }] });
    });
  });

  describe('cancelarTodos()', () => {
    it('cancela todos los avisos programados (escenario "Borrar todos mis datos")', async () => {
      cap.getPending.mockResolvedValueOnce({
        notifications: [
          { id: 11, schedule: { at: new Date(Date.now() + 60_000) } },
          { id: 22, schedule: { at: new Date(Date.now() + 120_000) } },
        ],
      });

      await cancelarTodos();

      expect(cap.cancel).toHaveBeenCalledWith({ notifications: [{ id: 11 }, { id: 22 }] });
      expect(cap.schedule).not.toHaveBeenCalled();
    });

    it('con nada programado no cancela nada', async () => {
      cap.getPending.mockResolvedValueOnce({ notifications: [] });

      await cancelarTodos();

      expect(cap.cancel).not.toHaveBeenCalled();
    });
  });

  describe('reprogramarAvisos()', () => {
    it('cancela los avisos de la lista y programa solo los que aún no vencieron', async () => {
      const futuro = enSegundos(600, 'f-1');
      const pasado = { id: 'p-1', vencimiento: new Date(Date.now() - 600_000).toISOString() };

      await reprogramarAvisos([futuro, pasado]);

      expect(cap.cancel).toHaveBeenCalledTimes(1);
      const cancelados = cap.cancel.mock.calls[0][0].notifications.map((n) => n.id);
      expect(cancelados).toHaveLength(2);
      expect(cap.schedule).toHaveBeenCalledTimes(1);
      const programados = cap.schedule.mock.calls[0][0].notifications;
      expect(programados).toHaveLength(1);
      expect(programados[0].extra).toEqual({ pendienteId: 'f-1' });
    });

    it('con lista vacía no toca el plugin', async () => {
      await reprogramarAvisos([]);
      expect(cap.cancel).not.toHaveBeenCalled();
      expect(cap.schedule).not.toHaveBeenCalled();
    });
  });

  describe('permiso (solo nativo)', () => {
    it('permisoAvisos() traduce el estado del sistema', async () => {
      expect(await permisoAvisos()).toBe('concedido');

      cap.checkPermissions.mockResolvedValueOnce({ display: 'denied' });
      expect(await permisoAvisos()).toBe('denegado');

      cap.checkPermissions.mockResolvedValueOnce({ display: 'prompt' });
      expect(await permisoAvisos()).toBe('denegado');
    });

    it('solicitarPermisoAvisos() pide el permiso y traduce la respuesta', async () => {
      expect(await solicitarPermisoAvisos()).toBe('concedido');
      expect(cap.requestPermissions).toHaveBeenCalledTimes(1);

      cap.requestPermissions.mockResolvedValueOnce({ display: 'denied' });
      expect(await solicitarPermisoAvisos()).toBe('denegado');
    });
  });

  describe('avisosPendientes()', () => {
    it('devuelve los avisos programados con su fecha en ISO', async () => {
      cap.getPending.mockResolvedValueOnce({
        notifications: [
          { id: 7, schedule: { at: '2026-10-08T10:00:00.000Z' } },
          { id: 8, schedule: { at: new Date('2026-10-09T10:00:00.000Z') } },
          // el puente de Android entrega fechas en formato Date.toString()
          { id: 9, schedule: { at: 'Tue Oct 06 17:43:26 GMT-05:00 2026' } },
        ],
      });

      expect(await avisosPendientes()).toEqual([
        { id: 7, programadoPara: '2026-10-08T10:00:00.000Z' },
        { id: 8, programadoPara: '2026-10-09T10:00:00.000Z' },
        { id: 9, programadoPara: '2026-10-06T22:43:26.000Z' },
      ]);
    });
  });

  describe('en la PWA (no nativo)', () => {
    beforeEach(() => {
      capacitor.Capacitor.isNativePlatform.mockReturnValue(false);
    });

    it('no toca el plugin de notificaciones', async () => {
      await programarAviso(enSegundos(60));
      await cancelarAviso('pd-1');
      await cancelarTodos();
      await reprogramarAvisos([enSegundos(60)]);

      expect(cap.schedule).not.toHaveBeenCalled();
      expect(cap.cancel).not.toHaveBeenCalled();
      expect(cap.getPending).not.toHaveBeenCalled();
    });

    it('el permiso no aplica y no hay avisos pendientes', async () => {
      expect(await permisoAvisos()).toBe('no-aplica');
      expect(await solicitarPermisoAvisos()).toBe('no-aplica');
      expect(await avisosPendientes()).toEqual([]);
      expect(cap.checkPermissions).not.toHaveBeenCalled();
      expect(cap.requestPermissions).not.toHaveBeenCalled();
    });
  });
});
