import { In, type EntityManager } from 'typeorm';
import { z } from 'zod';
import { UsuarioEntity } from '../modules/usuarios/infrastructure/entities/usuario.entity.js';

//de quién se trata cuando una respuesta dice «lo subió / lo presentó / lo cerró…»: lo mínimo para mostrarlo,
//sin DNI, email ni contraseña
export interface ResumenPersona {
  id: number;
  nombre: string;
  apellido: string;
}

export const ResumenPersonaSchema = z.object({
  id: z.number().int(),
  nombre: z.string(),
  apellido: z.string(),
});

//busca de una sola vez a las personas de una lista de ids (los nulos y repetidos se ignoran); las columnas
//van en lista blanca para no traer nunca la contraseña
export async function cargarResumenesPersona(
  manager: EntityManager,
  ids: readonly (number | null | undefined)[],
): Promise<Map<number, ResumenPersona>> {
  const unicos = [
    ...new Set(ids.filter((id): id is number => typeof id === 'number')),
  ];
  if (unicos.length === 0) return new Map();

  const usuarios = await manager.find(UsuarioEntity, {
    select: { id: true, nombre: true, apellido: true },
    where: { id: In(unicos) },
  });
  return new Map(
    usuarios.map((u) => [
      u.id,
      { id: u.id, nombre: u.nombre, apellido: u.apellido },
    ]),
  );
}
