import type { Paciente } from '@domain/paciente/paciente.model';
import type { Pendiente } from '@domain/pendiente/pendiente.model';
import { vencimiento } from '@domain/pendiente/plazo';

/** Datos mínimos para generar cualquier documento de reclamo. */
export interface DatosReclamo {
  paso: 1 | 2;
  paciente: Paciente;
  pendiente: Pendiente;
}

/** Nota que la vista previa muestra si la entrega no se autorizó en la farmacia. */
export const NOTA_AUTORIZACION_DOMICILIO =
  'Este texto incluye tu autorización de entrega a domicilio';

export const ASUNTO_RECLAMO = 'Queja por no entrega de medicamento pendiente';

/** Fundamento legal literal; el texto fijo no se edita en la app (plantillas.md). */
export const FUNDAMENTO_FRASE =
  'Con fundamento en el artículo 131 del Decreto-Ley 019 de 2012, la Resolución 1604 de 2013 ' +
  'y la Circular Externa 017 de 2026 del Ministerio de Salud y Protección Social, solicito:';

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Fecha en formato largo: "4 de octubre de 2026" (hora local). */
export function fechaLarga(fecha: Date): string {
  return `${fecha.getDate()} de ${MESES[fecha.getMonth()]} de ${fecha.getFullYear()}`;
}

/** Hora en formato 12 h: "3:15 p. m." (hora local). */
export function hora12(fecha: Date): string {
  const h = fecha.getHours();
  const sufijo = h < 12 ? 'a. m.' : 'p. m.';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(fecha.getMinutes()).padStart(2, '0')} ${sufijo}`;
}

/** "Señores {{eps}}:" o "Señores Superintendencia Nacional de Salud:". */
export function lineaDestinatario(datos: DatosReclamo): string {
  return datos.paso === 1
    ? `Señores ${datos.paciente.eps}:`
    : 'Señores Superintendencia Nacional de Salud:';
}

/** Presentante (paciente o gestor) + objeto según el paso (plantillas.md). */
export function introduccion(datos: DatosReclamo): string {
  const { paciente, pendiente } = datos;
  const g = pendiente.gestion;
  const presentante = g
    ? `Yo, ${g.nombre}, con ${g.tipoDocumento} n.° ${g.numeroDocumento}, en calidad de ` +
      `${g.parentesco} de ${paciente.nombre} (${paciente.tipoDocumento} n.° ` +
      `${paciente.numeroDocumento}, afiliado a ${paciente.eps})`
    : `Yo, ${paciente.nombre}, con ${paciente.tipoDocumento} n.° ` +
      `${paciente.numeroDocumento}, afiliado a ${paciente.eps}`;
  const objeto = datos.paso === 2 ? `contra ${paciente.eps} ` : '';
  return `${presentante}, presento queja ${objeto}por no entrega de medicamento pendiente.`;
}

/**
 * Los hechos del documento. Las condiciones entre [ ] de plantillas.md se
 * resuelven aquí; el número lo agrega quien ensambla (texto y PDF comparten
 * esta misma lista).
 */
export function hechos(datos: DatosReclamo): string[] {
  const { paciente, pendiente } = datos;
  const reclamo = new Date(pendiente.horaReclamo);
  const vence = vencimiento(pendiente.horaReclamo);
  const articulo = pendiente.medicamentos.length === 1 ? 'el medicamento' : 'los medicamentos';
  const lista = pendiente.medicamentos.join(', ');
  const comprobante = pendiente.numeroComprobante
    ? ` (comprobante n.° ${pendiente.numeroComprobante})`
    : '';

  const autorizado = pendiente.autorizoDomicilio
    ? `Se autorizó la entrega a domicilio en ${pendiente.direccionEntrega}.`
    : datos.paso === 1
      ? `Por medio de este escrito autorizo la entrega a domicilio en ${pendiente.direccionEntrega}.`
      : `En la queja presentada ante ${paciente.eps} se autorizó por escrito la entrega a ` +
        `domicilio en ${pendiente.direccionEntrega}.`;

  const listaHechos = [
    `El ${fechaLarga(reclamo)} a las ${hora12(reclamo)} se reclamó en ${pendiente.farmacia} ` +
      `${articulo} ${lista}, ordenado por el médico tratante.`,
    `La farmacia no realizó la entrega completa y quedó pendiente${comprobante}.`,
    autorizado,
    datos.paso === 1
      ? `El plazo de 48 horas venció el ${fechaLarga(vence)} a las ${hora12(vence)} y a la ` +
        'fecha no se ha recibido el medicamento.'
      : `El plazo de 48 horas venció el ${fechaLarga(vence)} a las ${hora12(vence)}.`,
  ];

  if (datos.paso === 2) {
    const q = pendiente.quejaEps;
    if (!q) {
      throw new Error('El paso 2 requiere la queja ante la EPS registrada en la bitácora');
    }
    const radicado = q.radicado ? ` con radicado n.° ${q.radicado}` : '';
    listaHechos.push(
      `El ${fechaLarga(new Date(q.radicadaEn))} se presentó queja ante ${paciente.eps}` +
        `${radicado} y a la fecha no se ha recibido el medicamento.`
    );
  }

  return listaHechos;
}

/** Solicitud numerada según el paso. */
export function solicitud(datos: DatosReclamo): string[] {
  return datos.paso === 1
    ? [
        'La entrega inmediata del medicamento en la dirección indicada o, en su defecto, la ' +
          'indicación de un punto de la red alterna de dispensación donde pueda reclamarlo.',
        'Indicar el número de radicado de esta queja y responder por escrito.',
      ]
    : [
        `Ordenar a ${datos.paciente.eps} la entrega inmediata del medicamento en la dirección ` +
          'indicada.',
        'Indicar el número de radicado de esta queja.',
      ];
}

/** Línea de contacto; desaparece el correo si no existe (plantillas.md). */
export function contacto(datos: DatosReclamo): string {
  const correo = datos.paciente.correo ? ` – ${datos.paciente.correo}` : '';
  return `Contacto: ${datos.paciente.telefono}${correo}`;
}

/**
 * Texto corto completo (la misma letra que va al portapapeles). No incluye el
 * aviso de no asesoría: eso vive en la pantalla y en el pie del PDF.
 */
export function textoCorto(datos: DatosReclamo): string {
  const numerado = (items: string[]): string =>
    items.map((item, i) => `${i + 1}. ${item}`).join('\n');

  return [
    lineaDestinatario(datos),
    '',
    introduccion(datos),
    '',
    'Hechos:',
    numerado(hechos(datos)),
    '',
    FUNDAMENTO_FRASE,
    numerado(solicitud(datos)),
    '',
    contacto(datos),
  ].join('\n');
}
