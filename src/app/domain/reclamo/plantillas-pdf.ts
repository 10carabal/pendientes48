import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import type { Norma } from '@domain/norma/norma.model';
import { bitacoraVista } from '@domain/pendiente/bitacora';
import type { DatosReclamo } from './plantillas';
import {
  ASUNTO_RECLAMO,
  FUNDAMENTO_FRASE,
  fechaLarga,
  hechos,
  hora12,
  introduccion,
  lineaDestinatario,
  solicitud,
} from './plantillas';

/** Todo lo que necesita el PDF además de los datos básicos del reclamo. */
export interface DatosPdf extends DatosReclamo {
  ahora: Date; // fecha de generación (encabezado)
  normas: Norma[]; // se filtran por paso: queja-eps / queja-supersalud
  ciudad?: string; // para el encabezado "ciudad, fecha"
  fotoBase64?: string; // anexo 2, si el usuario adjuntó la foto
}

/** Pie de página en TODAS las hojas (texto aprobado de plantillas.md). */
export const PIE_PDF = 'Documento generado con Pendientes48. No constituye asesoría legal.';

const numerado = (items: string[]): string =>
  items.map((item, i) => `${i + 1}. ${item}`).join('\n');

/**
 * Documento pdfmake del reclamo (D4: pdfmake en el dispositivo). Reutiliza las
 * mismas piezas de texto que `textoCorto()` para que las dos salidas no se
 * diverjan; el fundamento legal se filtra desde `normas.json` según el paso.
 */
export function pdfReclamo(datos: DatosPdf): TDocumentDefinitions {
  const aplica: Norma['aplicaA'][number] = datos.paso === 1 ? 'queja-eps' : 'queja-supersalud';
  const normas = datos.normas.filter((n) => n.aplicaA.includes(aplica));
  const encabezado = datos.ciudad
    ? `${datos.ciudad}, ${fechaLarga(datos.ahora)}`
    : fechaLarga(datos.ahora);

  const { paciente, pendiente } = datos;
  const datosPaciente = [
    `Paciente: ${paciente.nombre}, ${paciente.tipoDocumento} n.° ${paciente.numeroDocumento}` +
      (pendiente.gestion
        ? `\nPresenta: ${pendiente.gestion.nombre}, ${pendiente.gestion.tipoDocumento} n.° ` +
          `${pendiente.gestion.numeroDocumento} (${pendiente.gestion.parentesco})`
        : ''),
    `EPS: ${paciente.eps}`,
    `Teléfono: ${paciente.telefono}`,
    ...(paciente.correo ? [`Correo: ${paciente.correo}`] : []),
    `Dirección de entrega: ${pendiente.direccionEntrega}`,
  ].join('\n');

  const eventos = bitacoraVista(pendiente, datos.ahora);
  const bitacoraTabla: Content = {
    table: {
      widths: ['38%', '62%'],
      body: [
        [{ text: 'Fecha y hora', bold: true }, { text: 'Evento', bold: true }],
        ...eventos.map((e) => {
          const fecha = new Date(e.en);
          return [`${fechaLarga(fecha)} ${hora12(fecha)}`, e.texto];
        }),
      ],
    },
    layout: 'lightHorizontalLines',
  };

  const content: Content[] = [
    { text: encabezado, alignment: 'right' },
    { text: lineaDestinatario(datos), margin: [0, 12, 0, 0] },
    { text: `Asunto: ${ASUNTO_RECLAMO}`, bold: true, margin: [0, 8, 0, 0] },
    { text: 'Datos del paciente', bold: true, margin: [0, 12, 0, 4] },
    { text: datosPaciente },
    { text: introduccion(datos), margin: [0, 12, 0, 0] },
    { text: 'Hechos:', bold: true, margin: [0, 8, 0, 4] },
    { text: numerado(hechos(datos)) },
    { text: FUNDAMENTO_FRASE, margin: [0, 8, 0, 4] },
    { text: numerado(solicitud(datos)) },
  ];

  for (const n of normas) {
    content.push(
      { text: `${n.nombre}${n.articulo ? ` — ${n.articulo}` : ''}`, bold: true, margin: [0, 8, 0, 2] },
      { text: n.resumen, margin: [0, 0, 0, 4] }
    );
  }

  content.push(
    { text: 'Anexo 1. Bitácora', bold: true, margin: [0, 12, 0, 4] },
    bitacoraTabla
  );

  if (datos.fotoBase64) {
    content.push(
      { text: 'Anexo 2. Foto del comprobante', bold: true, margin: [0, 12, 0, 4] },
      { image: datos.fotoBase64, width: 240 }
    );
  }

  content.push(
    { text: '________________________________________', alignment: 'right', margin: [0, 32, 0, 2] },
    { text: 'Espacio para firma de quien presenta la queja', alignment: 'right' }
  );

  return {
    info: { title: ASUNTO_RECLAMO },
    content,
    footer: PIE_PDF,
    defaultStyle: { fontSize: 14 }, // ≈18.7 px: cumple el mínimo de 18 px del sistema de diseño
  };
}
