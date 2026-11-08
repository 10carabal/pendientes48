import type { ToastController } from '@ionic/angular';

/**
 * Confirmación visual de las acciones (spec "Confirmación visual de las
 * acciones", tarea 5.3): el toast de una acción ya completada. Es **aditivo**
 * (D2): complementa el feedback existente ("Guardado" de perfiles, la región
 * viva "Nota guardada" de la bitácora) sin reemplazarlo.
 */
export type ToastDe =
  | 'pendiente-guardado'
  | 'cambios-guardados'
  | 'pendiente-borrado'
  | 'perfil-guardado'
  | 'perfil-borrado'
  | 'nota-guardada';

/** Texto literal de cada toast, aprobado en la spec de la tarea 5.3. */
const TEXTO: Record<ToastDe, string> = {
  'pendiente-guardado': 'Pendiente guardado',
  'cambios-guardados': 'Cambios guardados',
  'pendiente-borrado': 'Pendiente borrado',
  'perfil-guardado': 'Perfil guardado',
  'perfil-borrado': 'Perfil borrado',
  'nota-guardada': 'Nota guardada',
};

/**
 * Muestra el toast de confirmación de `accion`: 3 s, abajo, con el texto
 * exacto de la spec. Toca el toast para cerrarlo antes (`ion-toast` no trae
 * `dismissOnClick`).
 *
 * `'perfil-borrado'` queda en el mapa SIN disparador (D1): no existe borrar un
 * perfil individual; "Borrar todos mis datos" es otra acción y no muestra toast.
 *
 * Un toast jamás puede romper la acción que acaba de completarse: cualquier
 * fallo al crearlo o presentarlo se traga en silencio.
 */
export async function mostrarToast(toast: ToastController, accion: ToastDe): Promise<void> {
  try {
    const el = await toast.create({ message: TEXTO[accion], duration: 3000, position: 'bottom' });
    el.addEventListener('click', () => void el.dismiss()); // ion-toast NO tiene dismissOnClick
    await el.present();
  } catch {
    // Un toast jamás puede romper la acción que acaba de completarse.
  }
}
