import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import {
  EstadoObservacion,
  LibroOrigen,
  validationsCode,
  validationsType,
} from '../../../domain/rules/validations.js';

export const ObservacionResponseSchema = z.object({
  id: z.number().int(),
  cuentaMensualId: z.number().int(),
  codigoRegla: z.enum(validationsCode),
  tipo: z.enum(validationsType),
  descripcion: z.string(),
  libroOrigen: z.enum(LibroOrigen),
  estado: z.enum(EstadoObservacion),
  //fila del libro banco; null si el hallazgo es de otro libro o de toda la cuenta
  transaccionId: z.number().int().nullable(),
  //fila del libro de ingresos y egresos; null si el hallazgo es de otro libro o de toda la cuenta
  transaccionIngresoEgresoId: z.number().int().nullable(),
});

export class ObservacionResponseDto extends createZodDto(
  ObservacionResponseSchema,
) {}
