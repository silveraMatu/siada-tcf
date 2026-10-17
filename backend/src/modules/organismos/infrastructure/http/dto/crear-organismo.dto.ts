import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

//los largos maximos replican los de la columna en OrganismoEntity
//`active` no se acepta: el estado inicial lo define el dominio
export const CrearOrganismoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, { message: 'El nombre es obligatorio' })
    .max(255, { message: 'El nombre no puede superar los 255 caracteres' }),
  rubro: z
    .string()
    .trim()
    .min(1, { message: 'El rubro es obligatorio' })
    .max(255, { message: 'El rubro no puede superar los 255 caracteres' }),
});

export class CrearOrganismoDto extends createZodDto(CrearOrganismoSchema) {}
