import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const ID_MAXIMO = 2147483647;

export const ConsultarAsistenteSchema = z.object({
  pregunta: z
    .string()
    .trim()
    .min(1, { message: 'La pregunta es obligatoria' })
    .max(4000, { message: 'La pregunta no puede superar los 4000 caracteres' })
    .describe('Pregunta del auditor al copiloto'),
  organismoId: z
    .number()
    .int()
    .positive('El ID del organismo debe ser válido')
    .max(ID_MAXIMO, 'El ID del organismo está fuera de rango')
    .optional()
    .describe(
      'Organismo sobre el que se consulta; si falta se usa el único que tenga asignado el auditor',
    ),
  cuentaMensualId: z
    .number()
    .int()
    .positive('El ID de la cuenta mensual debe ser válido')
    .max(ID_MAXIMO, 'El ID de la cuenta mensual está fuera de rango')
    .optional()
    .describe('Rendición del organismo a la que se ancla la consulta'),
});

export class ConsultarAsistenteDto extends createZodDto(
  ConsultarAsistenteSchema,
) {}
