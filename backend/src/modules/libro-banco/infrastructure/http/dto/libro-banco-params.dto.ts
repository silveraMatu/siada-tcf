import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const LibroBancoParamsSchema = z.object({
  cuentaMensualId: z.coerce.number().int().positive('El ID de la cuenta mensual debe ser valido').max(2147483647, 'El ID de la cuenta mensual esta fuera de rango'),
});

export class LibroBancoParamsDto extends createZodDto(LibroBancoParamsSchema) {}