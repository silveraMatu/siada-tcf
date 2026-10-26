import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { validationsCode } from '../../../domain/rules/validations.js';
import { EstadoValidacion } from '../../../domain/types/auditoria.types.js';
import { ObservacionResponseSchema } from './observacion-response.dto.js';

export const ResultadoValidacionResponseSchema = z.object({
  codigoRegla: z.enum(validationsCode),
  descripcion: z.string(),
  estado: z.enum(EstadoValidacion),
  mensaje: z.string().optional(),
  observaciones: z.array(ObservacionResponseSchema),
});

export class ResultadoValidacionResponseDto extends createZodDto(
  ResultadoValidacionResponseSchema,
) {}
