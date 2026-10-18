import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ResponsableParamsSchema = z.object({
  organismoId: z.coerce
    .number()
    .int()
    .positive('El ID del organismo debe ser válido')
    .max(2147483647, 'El ID del organismo está fuera de rango'),
});

export class ResponsableParamsDto extends createZodDto(
  ResponsableParamsSchema,
) {}
