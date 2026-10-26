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
  //qué libro originó el hallazgo; en los cruces entre libros es INGRESOS_EGRESOS
  libroOrigen: z.enum(LibroOrigen),
  estado: z.enum(EstadoObservacion),
  ejecucionId: z
    .number()
    .int()
    .describe('Ejecución de auditoría que la produjo'),
  valorInformado: z
    .number()
    .nullable()
    .describe('Lo que informa el libro auditado (saldo o total)'),
  valorCalculado: z
    .number()
    .nullable()
    .describe('Lo que debería ser (saldo calculado o total del otro libro)'),
  diferencia: z.number().nullable().describe('Valor absoluto de la diferencia'),
  motivoDescarte: z.string().nullable(),
  revisadaPorId: z.number().int().nullable(),
  revisadaEn: z.iso.datetime().nullable(),
  transaccionId: z
    .number()
    .int()
    .nullable()
    .describe(
      'Id de la transacción del libro banco (GET .../libro-banco, transacciones[].id); null si el hallazgo es de otro libro o de toda la cuenta',
    ),
  transaccionIngresoEgresoId: z
    .number()
    .int()
    .nullable()
    .describe(
      'Id de la transacción del libro de ingresos y egresos (GET .../ingresos-egresos, transacciones[].id, que también trae su fila); null si el hallazgo es de otro libro o de toda la cuenta',
    ),
});

export class ObservacionResponseDto extends createZodDto(
  ObservacionResponseSchema,
) {}
