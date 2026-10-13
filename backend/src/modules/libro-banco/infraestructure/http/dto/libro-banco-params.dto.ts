import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const LibroBancoParamsSchema = z.object({
  cuentaMensualId: z.int('El ID de la cuenta mensual debe ser valido'),
});

export class LibroBancoParamsDto extends createZodDto(LibroBancoParamsSchema) {}