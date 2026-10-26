import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { AccionActividad } from '../../../domain/enums/accion-actividad.enum.js';
import { ResultadoActividad } from '../../../domain/enums/resultado-actividad.enum.js';

const entero = z.coerce.number().int().positive().max(2147483647);

//filtros de la bitácora; todos opcionales
export const FiltrosActividadSchema = z.object({
  desde: z.iso
    .datetime({ offset: true, message: 'desde debe ser una fecha y hora ISO' })
    .transform((v) => new Date(v))
    .optional(),
  hasta: z.iso
    .datetime({ offset: true, message: 'hasta debe ser una fecha y hora ISO' })
    .transform((v) => new Date(v))
    .optional(),
  usuarioId: entero.optional(),
  dni: z
    .string()
    .trim()
    .regex(/^\d{7,8}$/, { message: 'El DNI debe tener 7 u 8 dígitos' })
    .optional(),
  accion: z.enum(AccionActividad).optional(),
  resultado: z.enum(ResultadoActividad).optional(),
  organismoId: entero.optional(),
  cuentaMensualId: entero.optional(),
  entidadTipo: z.string().trim().min(1).max(40).optional(),
  entidadId: entero.optional(),
});

export const ListarActividadQuerySchema = FiltrosActividadSchema.extend({
  limite: z.coerce.number().int().min(1).max(200).default(50),
  cursor: entero
    .optional()
    .describe('id del último evento de la página anterior'),
});

export class ListarActividadQueryDto extends createZodDto(
  ListarActividadQuerySchema,
) {}

export class ExportarActividadQueryDto extends createZodDto(
  FiltrosActividadSchema,
) {}
