import type {
  EstadoPendiente,
  EventoGuardado,
  EventoVista,
  Gestion,
  Pendiente,
  Queja,
  TipoEventoGuardado,
} from './pendiente.model';

describe('pendiente.model', () => {
  it('acepta un Pendiente completo con gestión, queja, icsAgregadoEn y bitácora', () => {
    const queja: Queja = { radicadaEn: '2026-10-05T10:00:00.000Z', radicado: 'RAD-2026-001' };
    const gestion: Gestion = {
      nombre: 'Ana Pérez',
      tipoDocumento: 'CC',
      numeroDocumento: '1098765432',
      parentesco: 'hija',
    };
    const evento: EventoGuardado = {
      en: '2026-10-05T09:00:00.000Z',
      tipo: 'creado',
      texto: 'Pendiente registrado en la farmacia',
    };
    const pendiente: Pendiente = {
      id: 'pen-1',
      pacienteId: 'pac-1',
      gestion,
      medicamentos: ['Metformina 850 mg'],
      farmacia: 'Farmacia de la esquina',
      horaReclamo: '2026-10-05T09:00:00.000Z',
      numeroComprobante: 'C-4567',
      autorizoDomicilio: true,
      direccionEntrega: 'Calle 1 # 2-3, Cali',
      quejaEps: queja,
      icsAgregadoEn: '2026-10-05T10:00:00.000Z',
      bitacora: [evento],
    };

    expect(pendiente.bitacora).toHaveLength(1);
    expect(pendiente.icsAgregadoEn).toBe('2026-10-05T10:00:00.000Z');
    expect(pendiente.quejaEps?.radicado).toBe('RAD-2026-001');
  });

  it('acepta un Pendiente mínimo: solo campos obligatorios', () => {
    const pendiente: Pendiente = {
      id: 'pen-2',
      pacienteId: 'pac-1',
      medicamentos: ['Losartán 50 mg'],
      farmacia: 'Droguería central',
      horaReclamo: '2026-10-05T09:00:00.000Z',
      autorizoDomicilio: false,
      direccionEntrega: 'Carrera 10 # 20-30, Cali',
      bitacora: [],
    };

    expect(pendiente.gestion).toBeUndefined();
    expect(pendiente.entregadoEn).toBeUndefined();
    expect(pendiente.bitacora).toEqual([]);
  });

  it('cubre los 6 estados, los 5 tipos guardados y el evento derivado', () => {
    const estados: EstadoPendiente[] = [
      'en-plazo',
      'vencido',
      'escalado-eps',
      'escalado-supersalud',
      'entregado-a-tiempo',
      'entregado-tarde',
    ];
    const tiposGuardado: TipoEventoGuardado[] = [
      'creado',
      'queja-eps',
      'queja-supersalud',
      'entregado',
      'nota',
    ];
    const vista: EventoVista = {
      en: '2026-10-07T09:00:00.000Z',
      tipo: 'vencido',
      texto: 'Venció el plazo',
    };

    expect(estados).toHaveLength(6);
    expect(tiposGuardado).toHaveLength(5);
    expect(vista.tipo).toBe('vencido');
  });

  describe('unhappy path (lo valida tsc, no el runtime)', () => {
    it('el compilador rechaza un Pendiente sin campos obligatorios', () => {
      // @ts-expect-error faltan medicamentos, farmacia, horaReclamo, autorizoDomicilio,
      // direccionEntrega y bitacora; si el modelo los relaja, tsc marca este directive sin usar
      const incompleto: Pendiente = { id: 'pen-x', pacienteId: 'pac-1' };

      expect(incompleto.id).toBe('pen-x');
      expect(Array.isArray(incompleto.bitacora)).toBe(false); // en runtime TS no valida nada
    });

    it('el compilador rechaza tipos incorrectos (bitácora y gestión)', () => {
      const invalido: Pendiente = {
        id: 'pen-y',
        pacienteId: 'pac-1',
        medicamentos: [],
        farmacia: 'Farmacia de prueba',
        horaReclamo: '2026-10-05T09:00:00.000Z',
        autorizoDomicilio: false,
        direccionEntrega: 'Calle 1 # 2-3, Cali',
        gestion: {
          nombre: 'Ana Pérez',
          // @ts-expect-error 'XX' no está en 'CC' | 'CE' | 'TI' | 'PA' | 'PPT'
          tipoDocumento: 'XX',
          numeroDocumento: '1098765432',
          parentesco: 'hija',
        },
        // @ts-expect-error bitacora debe ser EventoGuardado[], no string
        bitacora: 'no-es-bitacora',
      };

      expect(invalido.gestion?.tipoDocumento).toBe('XX');
      expect(Array.isArray(invalido.bitacora)).toBe(false);
    });
  });
});
