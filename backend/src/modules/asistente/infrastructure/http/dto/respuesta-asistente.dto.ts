import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const RespuestaAsistenteSchema = z.object({
  respuesta: z.string().describe('Respuesta del copiloto'),
  organismoId: z
    .number()
    .int()
    .nullable()
    .describe(
      'Organismo sobre el que se consultó; null si el auditor no tiene ninguno asignado',
    ),
});

export class RespuestaAsistenteDto extends createZodDto(
  RespuestaAsistenteSchema,
) {}
