import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

//nombre, apellido y email salen del usuario; active y organismoId no se aceptan
export const CrearResponsableSchema = z.object({
  usuarioId: z.number().int().positive().max(2147483647),
});

export class CrearResponsableDto extends createZodDto(CrearResponsableSchema) {}
