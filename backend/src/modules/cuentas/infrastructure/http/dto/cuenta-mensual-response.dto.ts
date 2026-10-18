import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CuentaMensualResponseSchema = z.object({
  id: z.number().int(),
  mes: z.number().int(),
  cuentaAnualId: z.number().int(),
  estado: z.string(),
  fechaCreacion: z.iso.datetime(),
});

export class CuentaMensualResponseDto extends createZodDto(
  CuentaMensualResponseSchema,
) {}
