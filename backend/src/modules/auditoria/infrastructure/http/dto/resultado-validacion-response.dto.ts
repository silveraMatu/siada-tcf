import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { validationsCode } from '../../../domain/rules/validations.js';
import {
  EstadoValidacion,
  NOMBRES_LIBRO,
} from '../../../domain/types/auditoria.types.js';
import { ObservacionResponseSchema } from './observacion-response.dto.js';

export const ResultadoValidacionResponseSchema = z.object({
  codigoRegla: z.enum(validationsCode),
  descripcion: z.string(),
  estado: z.enum(EstadoValidacion),
  mensaje: z
    .string()
    .optional()
    .describe('Solo en FALTAN_LIBROS: «Faltan libros requeridos: A, B»'),
  observaciones: z.array(ObservacionResponseSchema),
  filasEvaluadas: z
    .number()
    .int()
    .nullable()
    .describe(
      'Controles que hizo la regla: filas validadas (la primera de cada libro es la base y no cuenta) o 1 en los cruces entre libros; null si no corrió (FALTAN_LIBROS)',
    ),
  librosFaltantes: z
    .array(z.enum(NOMBRES_LIBRO))
    .describe(
      'Libros requeridos que faltan para correr la regla; vacío si corrió',
    ),
});

export class ResultadoValidacionResponseDto extends createZodDto(
  ResultadoValidacionResponseSchema,
) {}
