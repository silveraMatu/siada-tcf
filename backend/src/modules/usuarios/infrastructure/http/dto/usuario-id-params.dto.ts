import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const UsuarioIdParamsSchema = z.object({
  id: z.coerce
    .number()
    .int()
    .positive('El ID del usuario debe ser válido')
    .max(2147483647, 'El ID del usuario está fuera de rango'),
});

export class UsuarioIdParamsDto extends createZodDto(UsuarioIdParamsSchema) {}
