import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { EstadoCuentaMensual } from '../../../domain/enums/estado-cuenta-mensual.enum.js';
import { TipoLibro } from '../../../domain/enums/tipo-libro.enum.js';

export const CuentaMensualResponseSchema = z.object({
  id: z.number().int(),
  mes: z.number().int(),
  cuentaAnualId: z.number().int(),
  estado: z.enum(EstadoCuentaMensual),
  fechaCreacion: z.iso.datetime(),
});

export class CuentaMensualResponseDto extends createZodDto(
  CuentaMensualResponseSchema,
) {}

export const ResumenLibroResponseSchema = z.object({
  //el id es único solo dentro de su tipo: un libro banco y el de ingresos y egresos pueden compartir número
  id: z.number().int(),
  tipo: z.enum(TipoLibro),
  numeroCuentaCte: z.string().nullable(),
  cantidadTransacciones: z.number().int(),
  fechaDesde: z
    .string()
    .nullable()
    .describe('Fecha mínima de sus transacciones (YYYY-MM-DD)'),
  fechaHasta: z
    .string()
    .nullable()
    .describe('Fecha máxima de sus transacciones (YYYY-MM-DD)'),
});

//listado: la cuenta con el organismo y el ejercicio a los que pertenece y el resumen de sus libros
export const CuentaMensualListadaResponseSchema =
  CuentaMensualResponseSchema.extend({
    organismoId: z.number().int(),
    organismoNombre: z.string(),
    ejercicioFiscal: z.number().int(),
    libros: z.array(ResumenLibroResponseSchema),
  });

export class CuentaMensualListadaResponseDto extends createZodDto(
  CuentaMensualListadaResponseSchema,
) {}
