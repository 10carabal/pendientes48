import type { Gestion, Pendiente } from '@domain/pendiente/pendiente.model';
import type { Norma } from '@domain/norma/norma.model';
import type { Paciente } from '@domain/paciente/paciente.model';
import { NOTA_AUTORIZACION_DOMICILIO, fechaLarga, hora12, textoCorto } from './plantillas';
import { PIE_PDF, pdfReclamo } from './plantillas-pdf';

const paciente: Paciente = {
  id: 'pac-1',
  nombre: 'María López',
  tipoDocumento: 'CC',
  numeroDocumento: '1234567890',
  eps: 'EPS Salud',
  telefono: '3001234567',
  correo: 'maria@correo.com',
  direccion: 'Calle 1 # 2-3, Cali',
};

const gestion: Gestion = {
  nombre: 'Ana Pérez',
  tipoDocumento: 'CC',
  numeroDocumento: '987654321',
  parentesco: 'hija',
};

// 3:15 p. m. en la hora local de la máquina: el texto sale igual en cualquier zona horaria
const HORA_RECLAMO = new Date(2026, 9, 5, 15, 15).toISOString();
const RADICACION_EPS = new Date(2026, 9, 8, 10, 30).toISOString();

function pendiente(extra: Partial<Pendiente> = {}): Pendiente {
  return {
    id: 'pen-1',
    pacienteId: 'pac-1',
    medicamentos: ['Metformina 850 mg'],
    farmacia: 'Droguería central',
    horaReclamo: HORA_RECLAMO,
    autorizoDomicilio: true,
    direccionEntrega: 'Calle 1 # 2-3, Cali',
    bitacora: [],
    ...extra,
  };
}

const normas: Norma[] = [
  {
    id: 'n-eps',
    nombre: 'Norma para la queja ante la EPS',
    articulo: 'Artículo 1',
    resumen: 'Explicación para el paso 1 en lenguaje sencillo.',
    urlFuente: 'https://example.com/eps',
    verificadoEl: '2026-10-04',
    aplicaA: ['queja-eps'],
  },
  {
    id: 'n-sup',
    nombre: 'Norma para la queja ante la Supersalud',
    resumen: 'Explicación para el paso 2 en lenguaje sencillo.',
    urlFuente: 'https://example.com/sup',
    verificadoEl: '2026-10-04',
    aplicaA: ['queja-supersalud'],
  },
  {
    id: 'n-ven',
    nombre: 'Norma de ventanilla',
    resumen: 'Explicación de la guía de ventanilla.',
    urlFuente: 'https://example.com/ven',
    verificadoEl: '2026-10-04',
    aplicaA: ['ventanilla'],
  },
];

describe('plantillas', () => {
  describe('textoCorto() — los 4 casos de prueba de plantillas.md', () => {
    // Caso 1: paso 1 · paciente · autorizó · comprobante · 1 medicamento
    const caso1 = textoCorto({
      paso: 1,
      paciente,
      pendiente: pendiente({ numeroComprobante: 'C-1' }),
    });

    // Caso 2: paso 1 · gestor · no autorizó · sin comprobante · 2 medicamentos
    const caso2 = textoCorto({
      paso: 1,
      paciente,
      pendiente: pendiente({
        gestion,
        autorizoDomicilio: false,
        medicamentos: ['Losartán 50 mg', 'Metformina 850 mg'],
      }),
    });

    // Caso 3: paso 2 · paciente · no autorizó · comprobante · radicado · 1 medicamento
    const caso3 = textoCorto({
      paso: 2,
      paciente,
      pendiente: pendiente({
        autorizoDomicilio: false,
        numeroComprobante: 'C-1',
        quejaEps: { radicadaEn: RADICACION_EPS, radicado: 'RAD-2026-001' },
      }),
    });

    // Caso 4: paso 2 · gestor · autorizó · sin comprobante · sin radicado · 3 medicamentos
    const caso4 = textoCorto({
      paso: 2,
      paciente,
      pendiente: pendiente({
        gestion,
        quejaEps: { radicadaEn: RADICACION_EPS },
        medicamentos: ['Losartán 50 mg', 'Metformina 850 mg', 'Vitamina D'],
      }),
    });

    it('caso 1: paso 1, paciente, autorizó, con comprobante, 1 medicamento', () => {
      expect(caso1.startsWith('Señores EPS Salud:')).toBe(true);
      expect(caso1).toContain(
        'Yo, María López, con CC n.° 1234567890, afiliado a EPS Salud, presento queja ' +
          'por no entrega de medicamento pendiente.'
      );
      expect(caso1).not.toContain('contra EPS Salud');
      expect(caso1).toContain(
        '1. El 5 de octubre de 2026 a las 3:15 p. m. se reclamó en Droguería central ' +
          'el medicamento Metformina 850 mg, ordenado por el médico tratante.'
      );
      expect(caso1).toContain(
        '2. La farmacia no realizó la entrega completa y quedó pendiente (comprobante n.° C-1).'
      );
      expect(caso1).toContain('3. Se autorizó la entrega a domicilio en Calle 1 # 2-3, Cali.');
      expect(caso1).not.toContain('Por medio de este escrito');
      expect(caso1).toContain(
        '4. El plazo de 48 horas venció el 7 de octubre de 2026 a las 3:15 p. m. y a la ' +
          'fecha no se ha recibido el medicamento.'
      );
      expect(caso1).toContain('red alterna de dispensación');
      expect(caso1).toContain('responder por escrito');
      expect(caso1).toContain('Contacto: 3001234567 – maria@correo.com');
    });

    it('caso 2: paso 1, gestor, no autorizó, sin comprobante, 2 medicamentos', () => {
      expect(caso2.startsWith('Señores EPS Salud:')).toBe(true);
      expect(caso2).toContain(
        'Yo, Ana Pérez, con CC n.° 987654321, en calidad de hija de María López (CC n.° ' +
          '1234567890, afiliado a EPS Salud), presento queja por no entrega de medicamento ' +
          'pendiente.'
      );
      expect(caso2).toContain(
        '1. El 5 de octubre de 2026 a las 3:15 p. m. se reclamó en Droguería central los ' +
          'medicamentos Losartán 50 mg, Metformina 850 mg, ordenado por el médico tratante.'
      );
      expect(caso2).toContain('2. La farmacia no realizó la entrega completa y quedó pendiente.');
      expect(caso2).not.toContain('comprobante n.°');
      expect(caso2).toContain(
        '3. Por medio de este escrito autorizo la entrega a domicilio en Calle 1 # 2-3, Cali.'
      );
      expect(caso2).not.toContain('Se autorizó la entrega a domicilio');
      expect(caso2).toContain('Contacto: 3001234567 – maria@correo.com');
    });

    it('caso 3: paso 2, paciente, no autorizó, con comprobante y radicado, 1 medicamento', () => {
      expect(caso3.startsWith('Señores Superintendencia Nacional de Salud:')).toBe(true);
      expect(caso3).toContain(
        'Yo, María López, con CC n.° 1234567890, afiliado a EPS Salud, presento queja ' +
          'contra EPS Salud por no entrega de medicamento pendiente.'
      );
      expect(caso3).toContain(
        '3. En la queja presentada ante EPS Salud se autorizó por escrito la entrega a ' +
          'domicilio en Calle 1 # 2-3, Cali.'
      );
      expect(caso3).not.toContain('Por medio de este escrito');
      expect(caso3).toContain('4. El plazo de 48 horas venció el 7 de octubre de 2026 a las 3:15 p. m.');
      expect(caso3).not.toContain(
        '4. El plazo de 48 horas venció el 7 de octubre de 2026 a las 3:15 p. m. y a la fecha'
      );
      expect(caso3).toContain(
        '5. El 8 de octubre de 2026 se presentó queja ante EPS Salud con radicado n.° ' +
          'RAD-2026-001 y a la fecha no se ha recibido el medicamento.'
      );
      expect(caso3).toContain('(comprobante n.° C-1)');
      expect(caso3).toContain('Indicar el número de radicado de esta queja.');
      expect(caso3).not.toContain('responder por escrito');
    });

    it('caso 4: paso 2, gestor, autorizó, sin comprobante ni radicado, 3 medicamentos', () => {
      expect(caso4.startsWith('Señores Superintendencia Nacional de Salud:')).toBe(true);
      expect(caso4).toContain(
        'Yo, Ana Pérez, con CC n.° 987654321, en calidad de hija de María López (CC n.° ' +
          '1234567890, afiliado a EPS Salud), presento queja contra EPS Salud por no entrega ' +
          'de medicamento pendiente.'
      );
      expect(caso4).toContain(
        '1. El 5 de octubre de 2026 a las 3:15 p. m. se reclamó en Droguería central los ' +
          'medicamentos Losartán 50 mg, Metformina 850 mg, Vitamina D, ordenado por el ' +
          'médico tratante.'
      );
      expect(caso4).toContain('3. Se autorizó la entrega a domicilio en Calle 1 # 2-3, Cali.');
      expect(caso4).not.toContain('comprobante n.°');
      expect(caso4).not.toContain('con radicado n.°');
      expect(caso4).toContain(
        '5. El 8 de octubre de 2026 se presentó queja ante EPS Salud y a la fecha no se ha ' +
          'recibido el medicamento.'
      );
      expect(caso4).toContain(
        '1. Ordenar a EPS Salud la entrega inmediata del medicamento en la dirección indicada.'
      );
    });

    it('verificación: el texto corto no contiene el aviso de no asesoría', () => {
      for (const texto of [caso1, caso2, caso3, caso4]) {
        expect(texto.toLowerCase()).not.toContain('asesoría');
      }
      // el aviso vive en la pantalla y en el pie del PDF, nunca en lo que se copia
      expect(PIE_PDF).toContain('No constituye asesoría legal');
    });

    it('el paso 2 requiere la queja ante la EPS registrada', () => {
      expect(() => textoCorto({ paso: 2, paciente, pendiente: pendiente() })).toThrow(
        /queja ante la EPS/
      );
    });

    it('el correo desaparece por completo de la línea de contacto si no existe', () => {
      const sinCorreo: Paciente = {
        id: 'pac-2',
        nombre: 'Luis Gómez',
        tipoDocumento: 'CC',
        numeroDocumento: '1122334455',
        eps: 'EPS Salud',
        telefono: '3209876543',
        direccion: 'Carrera 2 # 3-4, Cali',
      };
      const texto = textoCorto({ paso: 1, paciente: sinCorreo, pendiente: pendiente() });

      expect(texto).toContain('Contacto: 3209876543');
      expect(texto).not.toContain('–');
    });
  });

  describe('formato de fechas y horas', () => {
    it('fechaLarga escribe en formato largo en español', () => {
      expect(fechaLarga(new Date(2026, 0, 4))).toBe('4 de enero de 2026');
      expect(fechaLarga(new Date(2026, 9, 5))).toBe('5 de octubre de 2026');
    });

    it('hora12 usa formato 12 h con los extremos correctos', () => {
      expect(hora12(new Date(2026, 9, 5, 15, 15))).toBe('3:15 p. m.');
      expect(hora12(new Date(2026, 9, 5, 0, 30))).toBe('12:30 a. m.');
      expect(hora12(new Date(2026, 9, 5, 12, 0))).toBe('12:00 p. m.');
      expect(hora12(new Date(2026, 9, 5, 9, 5))).toBe('9:05 a. m.');
    });
  });

  it('la nota de la vista previa es el texto aprobado de plantillas.md', () => {
    expect(NOTA_AUTORIZACION_DOMICILIO).toBe(
      'Este texto incluye tu autorización de entrega a domicilio'
    );
  });

  describe('pdfReclamo()', () => {
    const ahora = new Date(2026, 9, 9, 10, 0); // pasado el vencimiento: hay evento vencido

    it('arma el documento con encabezado, asunto, datos, anexos y firma', () => {
      const pdf = pdfReclamo({
        paso: 1,
        paciente,
        pendiente: pendiente({
          bitacora: [{ en: HORA_RECLAMO, tipo: 'creado', texto: 'Pendiente registrado en la farmacia' }],
        }),
        ahora,
        normas,
        ciudad: 'Cali',
      });

      expect(Array.isArray(pdf.content)).toBe(true);
      expect(pdf.defaultStyle?.fontSize).toBeGreaterThanOrEqual(14); // ≈18 px mínimo

      const json = JSON.stringify(pdf);
      expect(json).toContain('Cali, 9 de octubre de 2026');
      expect(json).toContain('Asunto: Queja por no entrega de medicamento pendiente');
      expect(json).toContain('Datos del paciente');
      expect(json).toContain('Paciente: María López, CC n.° 1234567890');
      expect(json).toContain('Teléfono: 3001234567');
      expect(json).toContain('Dirección de entrega: Calle 1 # 2-3, Cali');
      expect(json).toContain('se reclamó en Droguería central el medicamento Metformina 850 mg');
      expect(json).toContain('Anexo 1. Bitácora');
      expect(json).toContain('Pendiente registrado en la farmacia');
      expect(json).toContain('Venció el plazo de 48 horas'); // derivado de bitacoraVista()
      expect(json).toContain('Espacio para firma de quien presenta la queja');
      expect(String(pdf.footer)).toBe(PIE_PDF);
      expect(String(pdf.footer)).toContain('No constituye asesoría legal');
    });

    it('filtra el fundamento legal por el paso', () => {
      const pdf1 = pdfReclamo({
        paso: 1,
        paciente,
        pendiente: pendiente({ numeroComprobante: 'C-1' }),
        ahora,
        normas,
      });
      const json1 = JSON.stringify(pdf1);
      expect(json1).toContain('Norma para la queja ante la EPS');
      expect(json1).toContain('Artículo 1');
      expect(json1).not.toContain('Norma para la queja ante la Supersalud');
      expect(json1).not.toContain('Norma de ventanilla');

      const pdf2 = pdfReclamo({
        paso: 2,
        paciente,
        pendiente: pendiente({
          gestion,
          quejaEps: { radicadaEn: RADICACION_EPS, radicado: 'RAD-1' },
        }),
        ahora,
        normas,
      });
      const json2 = JSON.stringify(pdf2);
      expect(json2).toContain('Norma para la queja ante la Supersalud');
      expect(json2).not.toContain('Norma para la queja ante la EPS');
      expect(json2).not.toContain('Norma de ventanilla');
      expect(json2).toContain('Presenta: Ana Pérez, CC n.° 987654321 (hija)');
      expect(json2).toContain('en calidad de hija de María López');
    });

    it('sin ciudad solo queda la fecha; sin foto no existe el anexo 2', () => {
      const sinCiudad = JSON.stringify(
        pdfReclamo({ paso: 1, paciente, pendiente: pendiente(), ahora, normas })
      );
      expect(sinCiudad).toContain('9 de octubre de 2026');
      expect(sinCiudad).not.toContain('Cali, 9 de octubre');
      expect(sinCiudad).not.toContain('Anexo 2. Foto del comprobante');
    });

    it('con foto adjunta incluye el anexo 2 con la imagen', () => {
      const conFoto = JSON.stringify(
        pdfReclamo({
          paso: 1,
          paciente,
          pendiente: pendiente(),
          ahora,
          normas,
          fotoBase64: 'data:image/jpeg;base64,AAAA',
        })
      );
      expect(conFoto).toContain('Anexo 2. Foto del comprobante');
      expect(conFoto).toContain('data:image/jpeg;base64,AAAA');
    });

    it('el PDF sí incluye el aviso de no asesoría (a diferencia del texto corto)', () => {
      const pdf = pdfReclamo({ paso: 1, paciente, pendiente: pendiente(), ahora, normas });
      expect(String(pdf.footer)).toContain('No constituye asesoría legal');
    });
  });
});
