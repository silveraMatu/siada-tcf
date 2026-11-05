import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { ResumenPersonaSchema } from '../../../../../common/resumen-persona.js';

export const TransaccionRaciResponseSchema = z.object({
  id: z.number().int(),
  asiento: z.number().int(),
  fecha: z.string(),
  expediente: z.string().nullable(),
  concepto: z.string(),
  compromisoInstrumentoLegal: z.string().nullable(),
  compromisoDelMes: z.number(),
  compromisoAcumulado: z.number(),
  compromisoOrdenProvision: z.string().nullable(),
  devengadoDelMes: z.number(),
  devengadoAcumulado: z.number(),
  devengadoSaldo: z.number(),
  devengadoOrdenPago: z.string().nullable(),
  pagoNumeroCheque: z.string().nullable(),
  pagoDelMes: z.number(),
  pagoAcumulado: z.number(),
  pagoSaldoAPagar: z.number(),
});

export const RaciResponseSchema = z.object({
  id: z.number().int(),
  cuentaMensualId: z.number().int(),
  fechaCreacion: z.iso.datetime(),
  subidoPorId: z.number().int(),
  subidoPor: ResumenPersonaSchema.nullable().describe(
    'Quién lo subió (nombre y apellido)',
  ),
  hashContenido: z.string().describe('sha256 del contenido cargado'),
  transacciones: z.array(TransaccionRaciResponseSchema),
});

export class RaciResponseDto extends createZodDto(RaciResponseSchema) {}
