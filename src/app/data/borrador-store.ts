/**
 * Borrador en memoria de la guía de ventanilla (spec `ventanilla` · "Guía de
 * ventanilla"): lo que el usuario tomó o anotó en el paso 3 viaja hasta el
 * formulario de registro.
 *
 * Handoff guía → formulario (decisión Daniel, 2026-10-14): `features/ventanilla`
 * escribe y `features/pendiente-form` lee en modo registro, ambas vía `@data/`
 * (una feature nunca importa de otra). No se persiste: si la app se cierra se
 * pierde y el usuario repite el paso; en edición el borrador no se lee ni se toca.
 */

/** Lo mínimo que la guía puede dejar listo para el formulario. */
export interface Borrador {
  foto?: Blob; // sin procesar aquí: la reduce `platform/camara.ts`
  numeroComprobante?: string;
}

let borrador: Borrador = {};

/** Reemplaza el borrador completo (para quitar un valor, pásalo como `undefined`). */
export function guardarBorrador(nuevo: Borrador): void {
  borrador = { ...nuevo };
}

/** Síncrono: el borrador vive en memoria, no hay red ni almacenamiento. */
export function leerBorrador(): Readonly<Borrador> {
  return borrador;
}

/** Tras registrar con éxito (o cuando ya no aplica). */
export function limpiarBorrador(): void {
  borrador = {};
}
