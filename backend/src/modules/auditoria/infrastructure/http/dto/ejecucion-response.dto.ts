import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ResultadoValidacionResponseSchema } from './resultado-validacion-response.dto.js';

export const EjecucionResponseSchema = z.object({
  id: z.number().int(),
  cuentaMensualId: z.number().int(),
  versionReglas: z
    .string()
    .describe('Versión del conjunto de reglas que corrió'),
  ejecutadaPorId: z.number().int(),
  ejecutadaEn: z.iso.datetime(),
  cerradaEn: z.iso.datetime().nullable(),
  cerradaPorId: z.number().int().nullable(),
  conclusion: z.string().nullable(),
  estadoFinal: z
    .enum(['AUDITADA', 'CON_OBSERVACIONES'])
    .nullable()
    .describe('Estado en que quedó la rendición al cerrar la auditoría'),
  resultados: z.array(ResultadoValidacionResponseSchema),
  observaciones: z
    .object({
      abiertas: z.number().int(),
      confirmadas: z.number().int(),
      descartadas: z.number().int(),
    })
    .describe('Cuántas observaciones hay en cada estado'),
});

export class EjecucionResponseDto extends createZodDto(
  EjecucionResponseSchema,
) {}
