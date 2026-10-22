import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const AuditoriaParamsSchema = z.object({
  cuentaMensualId: z.coerce
    .number()
    .int()
    .positive('El ID de la cuenta mensual debe ser válido')
    .max(2147483647, 'El ID de la cuenta mensual está fuera de rango'),
});

export class AuditoriaParamsDto extends createZodDto(AuditoriaParamsSchema) {}
