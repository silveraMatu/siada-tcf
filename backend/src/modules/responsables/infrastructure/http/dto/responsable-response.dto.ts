import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ResponsableResponseSchema = z.object({
  id: z.number().int(),
  nombre: z.string(),
  apellido: z.string(),
  email: z.string(),
  activo: z.boolean(),
  organismoId: z.number().int().nullable(),
  fechaCreacion: z.iso.datetime(),
});

export class ResponsableResponseDto extends createZodDto(
  ResponsableResponseSchema,
) {}
