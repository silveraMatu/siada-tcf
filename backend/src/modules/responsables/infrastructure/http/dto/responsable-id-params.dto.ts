import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const ResponsableIdParamsSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive('El ID del responsable debe ser válido')
    .max(2147483647, 'El ID del responsable está fuera de rango'),
});

export class ResponsableIdParamsDto extends createZodDto(
  ResponsableIdParamsSchema,
) {}
