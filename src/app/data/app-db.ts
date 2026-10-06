import { clear, createStore, del, get, keys, set } from 'idb-keyval';

/**
 * Base propia (`pendientes48`): solo esta app escribe en ella y se abre de forma
 * perezosa en la primera operación (D3: IndexedDB vía `idb-keyval`, el mismo
 * camino en Android y en la PWA; las fotos van como `Blob`, sin el límite de
 * ~5 MB de localStorage).
 */
const almacen = createStore('pendientes48', 'datos');

/**
 * Error de escritura controlado: la capa de datos no silencia el fallo ni
 * traza detalles; la pantalla muestra `message` tal cual (spec `pendientes` ·
 * "Fallo al guardar": "No se pudo guardar. Libera espacio e intenta de nuevo").
 */
export class ErrorDeEscritura extends Error {
  constructor(operacion: 'guardar' | 'borrar', causa?: unknown) {
    super(`No se pudo ${operacion}. Libera espacio e intenta de nuevo`, { cause: causa });
    this.name = 'ErrorDeEscritura';
  }
}

/** Lee una clave; `undefined` si no existe. */
export async function leer<T>(clave: string): Promise<T | undefined> {
  return await get<T>(clave, almacen);
}

/** Escribe una clave; falla con `ErrorDeEscritura`. */
export async function guardar(clave: string, valor: unknown): Promise<void> {
  try {
    await set(clave, valor, almacen);
  } catch (causa) {
    throw new ErrorDeEscritura('guardar', causa);
  }
}

/** Borra una clave; falla con `ErrorDeEscritura`. */
export async function borrar(clave: string): Promise<void> {
  try {
    await del(clave, almacen);
  } catch (causa) {
    throw new ErrorDeEscritura('borrar', causa);
  }
}

/** Todas las claves del almacén; cada store las filtra por su prefijo. */
export async function leerClaves(): Promise<string[]> {
  return await keys<string>(almacen);
}

/**
 * "Borrar todos mis datos" (spec `pendientes`): vacía el almacén completo —
 * perfiles, pendientes, fotos y preferencias — dejando IndexedDB sin nada.
 * (El cancelar los avisos programados lo hace `platform/` al invocarlo.)
 */
export async function borrarTodo(): Promise<void> {
  try {
    await clear(almacen);
  } catch (causa) {
    throw new ErrorDeEscritura('borrar', causa);
  }
}
