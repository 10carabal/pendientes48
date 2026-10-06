import type { Paciente } from '@domain/paciente/paciente.model';
import { borrar, guardar, leer, leerClaves } from './app-db';

const PREFIJO = 'paciente:';

const claveDe = (id: string): string => PREFIJO + id;

/** Guarda un perfil (crear o editar, según ya exista o no su `id`). */
export async function guardarPaciente(paciente: Paciente): Promise<void> {
  await guardar(claveDe(paciente.id), paciente);
}

export async function leerPaciente(id: string): Promise<Paciente | undefined> {
  return await leer<Paciente>(claveDe(id));
}

/** Todos los perfiles guardados, para reutilizarlos en cada pendiente. */
export async function listarPacientes(): Promise<Paciente[]> {
  const claves = (await leerClaves()).filter((c) => c.startsWith(PREFIJO));
  const pacientes = await Promise.all(claves.map((c) => leer<Paciente>(c)));
  return pacientes.filter((p): p is Paciente => p !== undefined);
}

export async function borrarPaciente(id: string): Promise<void> {
  await borrar(claveDe(id));
}

/**
 * Escenario "Perfil duplicado" de la spec `pendientes`: mismo tipo y número de
 * documento que uno ya guardado. `excluirId` permite editar un perfil sin que
 * se marque a sí mismo como duplicado.
 */
export async function encontrarPorDocumento(
  tipoDocumento: Paciente['tipoDocumento'],
  numeroDocumento: string,
  excluirId?: string,
): Promise<Paciente | undefined> {
  const numero = numeroDocumento.trim();
  const pacientes = await listarPacientes();
  return pacientes.find(
    (p) =>
      p.tipoDocumento === tipoDocumento &&
      p.numeroDocumento.trim() === numero &&
      p.id !== excluirId,
  );
}
