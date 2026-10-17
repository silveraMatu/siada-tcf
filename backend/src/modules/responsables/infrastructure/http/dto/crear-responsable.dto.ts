import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

//`activo` y `organismoId` no se aceptan en el body: el estado lo define el dominio y el organismo viene por la ruta
export const CrearResponsableSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, { message: 'El nombre es obligatorio' })
    .max(255, { message: 'El nombre no puede superar los 255 caracteres' }),
  apellido: z
    .string()
    .trim()
    .min(1, { message: 'El apellido es obligatorio' })
    .max(255, { message: 'El apellido no puede superar los 255 caracteres' }),
  email: z
    .string()
    .trim()
    .max(255, { message: 'El email no puede superar los 255 caracteres' })
    .pipe(z.email({ message: 'El email no es válido' })),
});

export class CrearResponsableDto extends createZodDto(CrearResponsableSchema) {}
