import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ResponsableResponseSchema } from './responsable-response.dto.js';

export const ResponsableConUsuarioResponseSchema =
  ResponsableResponseSchema.extend({
    usuario: z.object({
      id: z.number().int(),
      nombre: z.string(),
      apellido: z.string(),
      email: z.string(),
    }),
  });

export class ResponsableConUsuarioResponseDto extends createZodDto(
  ResponsableConUsuarioResponseSchema,
) {}
