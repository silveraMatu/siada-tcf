import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

//lo mínimo para elegir a quién asignar: sin DNI ni contraseña
export const AuditorResponseSchema = z.object({
  id: z.number().int(),
  nombre: z.string(),
  apellido: z.string(),
  email: z.string(),
});

export class AuditorResponseDto extends createZodDto(AuditorResponseSchema) {}
