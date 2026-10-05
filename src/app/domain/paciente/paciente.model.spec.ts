import type { Paciente } from './paciente.model';

describe('paciente.model', () => {
  it('acepta un Paciente con todos los campos, incluido correo', () => {
    const paciente: Paciente = {
      id: 'pac-1',
      nombre: 'María López',
      tipoDocumento: 'PPT',
      numeroDocumento: '1098765432',
      eps: 'Nueva EPS',
      telefono: '+57 300 123 4567',
      correo: 'maria@example.com',
      direccion: 'Calle 1 # 2-3, Cali',
    };

    expect(paciente.tipoDocumento).toBe('PPT');
    expect(paciente.correo).toBe('maria@example.com');
  });

  it('acepta un Paciente sin correo (opcional)', () => {
    const paciente: Paciente = {
      id: 'pac-2',
      nombre: 'José Ramírez',
      tipoDocumento: 'CC',
      numeroDocumento: '987654321',
      eps: 'Sura',
      telefono: '+57 311 987 6543',
      direccion: 'Avenida 5 # 6-7, Medellín',
    };

    expect(paciente.correo).toBeUndefined();
    expect(paciente.direccion).toBe('Avenida 5 # 6-7, Medellín');
  });

  describe('unhappy path (lo valida tsc, no el runtime)', () => {
    it('el compilador rechaza un tipo de documento fuera del catálogo', () => {
      const invalido: Paciente = {
        id: 'pac-x',
        nombre: 'Prueba',
        // @ts-expect-error 'XX' no está en 'CC' | 'CE' | 'TI' | 'PA' | 'PPT'
        tipoDocumento: 'XX',
        numeroDocumento: '123',
        eps: 'EPS de prueba',
        telefono: '+57 300 000 0000',
        direccion: 'Calle de prueba # 0-0',
      };

      expect(invalido.tipoDocumento).toBe('XX');
    });

    it('el compilador rechaza un Paciente sin campos obligatorios', () => {
      // @ts-expect-error faltan nombre, tipoDocumento, numeroDocumento, eps, telefono y direccion
      const vacio: Paciente = { id: 'pac-vacio' };

      expect(vacio.id).toBe('pac-vacio');
      expect(vacio.eps).toBeUndefined(); // en runtime TS no valida nada
    });
  });
});
