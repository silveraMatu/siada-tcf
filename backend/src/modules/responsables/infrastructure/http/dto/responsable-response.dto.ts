import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ResponsableResponseSchema = z.object({
  id: z.number().int(),
  usuarioId: z.number().int(),
  active: z.boolean(),
  organismoId: z.number().int().nullable(),
  fechaCreacion: z.iso.datetime(),
});

export class ResponsableResponseDto extends createZodDto(
  ResponsableResponseSchema,
) {}
