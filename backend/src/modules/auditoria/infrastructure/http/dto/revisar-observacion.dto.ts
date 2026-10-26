import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const RevisarObservacionSchema = z
  .object({
    decision: z.enum(['CONFIRMAR', 'DESCARTAR', 'REABRIR']),
    motivo: z
      .string()
      .trim()
      .max(2000, { message: 'El motivo no puede superar los 2000 caracteres' })
      .optional()
      .describe('Obligatorio al descartar: por qué el hallazgo no corresponde'),
  })
  .refine((cuerpo) => cuerpo.decision !== 'DESCARTAR' || !!cuerpo.motivo, {
    message: 'Para descartar una observación hay que indicar el motivo',
    path: ['motivo'],
  });

export class RevisarObservacionDto extends createZodDto(
  RevisarObservacionSchema,
) {}

export const ObservacionParamsSchema = z.object({
  observacionId: z.coerce
    .number()
    .int()
    .positive('El ID de la observación debe ser válido')
    .max(2147483647, 'El ID de la observación está fuera de rango'),
});

export class ObservacionParamsDto extends createZodDto(
  ObservacionParamsSchema,
) {}
