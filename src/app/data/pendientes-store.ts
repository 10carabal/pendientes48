import type { Pendiente } from '@domain/pendiente/pendiente.model';
import { borrar, guardar, leer, leerClaves } from './app-db';

const PREFIJO = 'pendiente:';
const PREFIJO_FOTO = 'foto:';

const claveDe = (id: string): string => PREFIJO + id;
const claveFotoDe = (claveFoto: string): string => PREFIJO_FOTO + claveFoto;

/** Guarda un pendiente con su bitácora (crear o editar, según su `id`). */
export async function guardarPendiente(pendiente: Pendiente): Promise<void> {
  await guardar(claveDe(pendiente.id), pendiente);
}

export async function leerPendiente(id: string): Promise<Pendiente | undefined> {
  return await leer<Pendiente>(claveDe(id));
}

export async function listarPendientes(): Promise<Pendiente[]> {
  const claves = (await leerClaves()).filter((c) => c.startsWith(PREFIJO));
  const pendientes = await Promise.all(claves.map((c) => leer<Pendiente>(c)));
  return pendientes.filter((p): p is Pendiente => p !== undefined);
}

/**
 * Guarda la foto del comprobante como `Blob` en IndexedDB y devuelve su clave
 * para `Pendiente.fotoComprobanteKey` (D3: Blobs sin el límite de localStorage).
 */
export async function guardarFoto(foto: Blob): Promise<string> {
  const claveFoto = crypto.randomUUID();
  await guardar(claveFotoDe(claveFoto), foto);
  return claveFoto;
}

export async function leerFoto(claveFoto: string): Promise<Blob | undefined> {
  return await leer<Blob>(claveFotoDe(claveFoto));
}

export async function borrarFoto(claveFoto: string): Promise<void> {
  await borrar(claveFotoDe(claveFoto));
}

/**
 * Escenario "Borrar un pendiente": además del pendiente elimina su foto del
 * comprobante. (La cancelación del aviso programado la hace `platform/`.)
 */
export async function borrarPendiente(id: string): Promise<void> {
  const pendiente = await leerPendiente(id);
  if (pendiente?.fotoComprobanteKey !== undefined) {
    await borrar(claveFotoDe(pendiente.fotoComprobanteKey));
  }
  await borrar(claveDe(id));
}
