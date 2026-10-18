import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const ResolverCuentaMensualSchema = z.object({
  organismoId: z.number().int().positive().max(2147483647),
  ejercicioFiscal: z.number().int().min(2000).max(2100),
  mes: z.number().int().min(1).max(12),
});

export class ResolverCuentaMensualDto extends createZodDto(
  ResolverCuentaMensualSchema,
) {}
